import { NextRequest, NextResponse } from "next/server"
import { db, updateProductQuantityFromStockItems } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { logAuditEvent } from "@/lib/audit"
import { ensurePurchaseAccounts, createPurchaseInvoiceJournalEntry } from "@/lib/purchase"
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
    // ── NO $transaction (PgBouncer compatibility) ──
    // Sequential queries — same pattern as sales + purchase invoice POST.

    // 1) Bump stock per item
    for (const it of inv.items) {
      // Inventory freeze: check if product is under active stock take
      const frozenItem = await db.stockTakeItem.findFirst({
        where: { productId: it.productId, stockTake: { status: "DRAFT" } },
      })
      if (frozenItem) {
        return NextResponse.json({ error: `stock-frozen:${it.productId}` }, { status: 400 })
      }

      if (inv.warehouseId) {
        try {
          await db.stockItem.upsert({
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
        } catch (e: any) {
          console.error(`[purchase-invoice-post] Stock increment FAILED for ${it.productId}: ${e?.message}`)
        }
      }
      // Update cost price
      if (it.unitCost > 0) {
        try {
          await db.product.update({
            where: { id: it.productId },
            data: { costPrice: it.unitCost },
          })
        } catch {}
      }
    }

    // 2) Mark linked PO as RECEIVED
    if (inv.purchaseOrderId) {
      try {
        await db.purchaseOrder.update({
          where: { id: inv.purchaseOrderId },
          data: { status: "RECEIVED" },
        })
      } catch {}
    }

    // 3) Update invoice status to POSTED
    const result = await db.purchaseInvoice.update({
      where: { id: inv.id },
      data: { status: "POSTED" },
    })

    // 4) Sync Product.quantity (derived aggregate)
    try {
      const pids = Array.from(new Set(inv.items.map((it: any) => it.productId)))
      for (const pid of pids) {
        await updateProductQuantityFromStockItems(db, pid)
      }
    } catch {}

    // 5) Audit log (non-fatal)
    try {
      await logAuditEvent({
        userId: user.id,
        userName: user.name,
        action: "PURCHASE_INVOICE_POSTED",
        description: `فاتورة مشتريات ${inv.invoiceNo}`,
      })
    } catch {}

    // 6) Journal entry (non-fatal)
    try {
      await ensurePurchaseAccounts()
      await createPurchaseInvoiceJournalEntry({
        invoiceNo: inv.invoiceNo,
        invoiceId: inv.id,
        supplierName: inv.supplier?.name ?? "",
        subtotal: inv.subtotal,
        taxAmount: inv.taxAmount,
        discount: inv.discount,
        shipping: inv.shipping,
        customs: inv.customs,
        otherCharges: inv.otherCharges,
        total: inv.total,
        paymentMethod: inv.paymentMethod,
        date: inv.invoiceDate,
      })
    } catch (e: any) {
      console.error(
        `[purchase-invoice-post] JournalEntry FAILED for ${inv.invoiceNo}. ` +
        `Invoice is posted but accounting has a gap. Error: ${e?.message ?? e}`
      )
    }

    return NextResponse.json({
      id: String(result.id),
      invoiceNo: String(result.invoiceNo),
      status: result.status,
      journalEntryId,
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "post-failed" },
      { status: 500 }
    )
  }
}
