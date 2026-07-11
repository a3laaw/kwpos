import { NextRequest, NextResponse } from "next/server"
import { db, updateProductQuantityFromStockItems } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { createJournalEntry } from "@/lib/journal"
import { logAuditEvent } from "@/lib/audit"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * POST /api/purchase-invoices/[id]/post
 * Post a DRAFT invoice:
 *  - set status to POSTED,
 *  - bump stock per item (StockItem upsert + Product.quantity recompute),
 *  - if linked to a PurchaseOrder, mark it RECEIVED,
 *  - create a balanced journal entry (Debit Inventory 1010 / Credit AP 2010),
 *  - write an audit log entry.
 *
 * EVERYTHING runs inside a single db.$transaction so that if the journal
 * entry fails, the stock bump + status change + PO update all roll back.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN", "WAREHOUSE" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await params
  const inv = await db.purchaseInvoice.findUnique({
    where: { id },
    include: {
      supplier: true,
      warehouse: true,
      items: { include: { product: true } },
      createdBy: true,
    },
  })
  if (!inv) return NextResponse.json({ error: "not-found" }, { status: 404 })
  if (inv.status === "POSTED") {
    return NextResponse.json({ error: "already-posted" }, { status: 409 })
  }
  if (inv.status === "CANCELLED") {
    return NextResponse.json({ error: "cannot-post-cancelled" }, { status: 409 })
  }

  let journalEntryId: string | null = null

  try {
    const result = await db.$transaction(async (tx) => {
      // Bump stock per item — StockItem upsert + recompute Product.quantity
      // from StockItems (no direct increment on Product.quantity).
      for (const it of inv.items) {
        // ── Inventory freeze: check if product is under active stock take ──
        const frozenItem = await tx.stockTakeItem.findFirst({
          where: { productId: it.productId, stockTake: { status: "DRAFT" } },
        })
        if (frozenItem) {
          throw new Error(`stock-frozen:${it.productId}`)
        }

        if (inv.warehouseId) {
          await tx.stockItem.upsert({
            where: {
              productId_warehouseId: {
                productId: it.productId,
                warehouseId: inv.warehouseId,
              },
            },
            update: { quantity: { increment: it.quantity } },
            create: {
              productId: it.productId,
              warehouseId: inv.warehouseId,
              quantity: it.quantity,
            },
          })
        }
        // Keep Product.costPrice in sync if the invoice has a real unit cost.
        if (it.unitCost > 0) {
          await tx.product.update({
            where: { id: it.productId },
            data: { costPrice: it.unitCost },
          })
        }
        // Recompute Product.quantity as SUM(StockItem.quantity) so it stays
        // the derived aggregate — no direct increment.
        await updateProductQuantityFromStockItems(tx, it.productId)
      }

      // Mark linked PO as RECEIVED
      if (inv.purchaseOrderId) {
        await tx.purchaseOrder.update({
          where: { id: inv.purchaseOrderId },
          data: { status: "RECEIVED" },
        })
      }

      // ── Journal entry (INSIDE tx — atomic) ──
      // If this throws, the entire transaction rolls back: stock stays
      // unchanged, status stays DRAFT, PO stays unchanged.
      journalEntryId = await createJournalEntry({
        sourceType: "PURCHASE",
        sourceId: inv.id,
        description: `قيد فاتورة مشتريات ${inv.invoiceNo} — ${inv.supplier?.name ?? ""}`,
        date: inv.invoiceDate,
        lines: [
          { accountCode: "1010", debit: +Number(inv.total).toFixed(3), description: `فاتورة مشتريات ${inv.invoiceNo}` },
          { accountCode: "2010", credit: +Number(inv.total).toFixed(3), description: `ذمم دائنة — ${inv.supplier?.name ?? ""}` },
        ],
        tx,
      })

      // Attach journalEntryId to the invoice (inside tx)
      const updated = await tx.purchaseInvoice.update({
        where: { id: inv.id },
        data: {
          status: "POSTED",
          journalEntryId: journalEntryId ?? null,
        },
      })

      // ── Audit log (INSIDE tx — atomic) ──
      await logAuditEvent({
        tx,
        userId: user.id,
        userName: user.name,
        action: "PURCHASE_INVOICE_POSTED",
        description: `فاتورة مشتريات ${inv.invoiceNo}`,
      })

      return updated
    })

    return NextResponse.json({
      id: String(result.id),
      invoiceNo: String(result.invoiceNo),
      status: result.status,
      journalEntryId,
    })
  } catch (e: any) {
    // Journal entry failure (e.g. invalid account code) rolls back the
    // entire transaction — stock is unchanged, invoice stays DRAFT.
    return NextResponse.json(
      {
        error: "فشل تسجيل القيد المحاسبي / Journal entry failed",
        detail: e?.message ?? String(e),
      },
      { status: 500 }
    )
  }
}
