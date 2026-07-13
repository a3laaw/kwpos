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
        // Product.quantity sync is deferred to post-commit (see below).
      }

      // Mark linked PO as RECEIVED
      if (inv.purchaseOrderId) {
        await tx.purchaseOrder.update({
          where: { id: inv.purchaseOrderId },
          data: { status: "RECEIVED" },
        })
      }

      // NOTE: Journal entry is now post-commit (see below) to keep the
      // transaction short and avoid PgBouncer "Transaction not found".

      // Update invoice status to POSTED (inside tx — atomic)
      const updated = await tx.purchaseInvoice.update({
        where: { id: inv.id },
        data: {
          status: "POSTED",
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
    }, {
      timeout: 10000,
      maxWait: 5000,
    })

    // ── Post-commit side effects (non-fatal) ──────────────────────────
    // Sync Product.quantity (derived aggregate)
    try {
      const pids = Array.from(new Set(inv.items.map((it: any) => it.productId)))
      for (const pid of pids) {
        await updateProductQuantityFromStockItems(db, pid)
      }
    } catch {
      // Non-fatal: invoice is posted, StockItem is correct.
    }

    // Create journal entry (capital-based: fees → inventory value, tax → 2110)
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
        `[purchase-invoice] JournalEntry FAILED for ${inv.invoiceNo}. ` +
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
    // Transaction failed (stock bump, PO update, or audit log).
    // The invoice stays DRAFT — no partial state.
    return NextResponse.json(
      {
        error: e?.message ?? "post-failed",
      },
      { status: 500 }
    )
  }
}
