import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { createJournalEntry } from "@/lib/journal"
import { logAuditEvent } from "@/lib/audit"
import { incrementStockItem, updateProductQuantityFromStockItems } from "@/lib/db"
import { resolveWarehouseId } from "@/lib/warehouse-resolver"
import { reverseLoyaltyPoints } from "@/lib/loyalty"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * POST /api/sales/[id]/cancel
 *
 * Cancel an ENTIRE sale (full invoice) — NOT delete it. The sale remains
 * in the database for audit and reports, but:
 *   - status → "CANCELLED"
 *   - cancelledAt / cancelledById / cancellationReason are set
 *   - All stock is returned to the warehouse (StockItem increment)
 *   - A reversing journal entry zeroes out the original sale's financial impact
 *   - refundStatus → "FULL"
 *   - Audit log: action = "CANCEL_TXN"
 *
 * Permissions: OWNER + ADMIN + MANAGER (administrative correction).
 * The 14-day refund rule does NOT apply to cancellation — cancellation is
 * an admin operation, not a customer return.
 *
 * Body: { reason: string (required) }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  // Only OWNER / ADMIN / MANAGER can cancel a full invoice.
  const role = user.role as Role
  if (role !== "OWNER" && role !== "ADMIN" && role !== "MANAGER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await params

  // Parse + validate reason
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 })
  }
  const reason = String(body?.reason || "").trim()
  if (!reason || reason.length < 3) {
    return NextResponse.json({ error: "reason-required" }, { status: 400 })
  }

  // Load the sale with items + product
  const sale = await db.sale.findUnique({
    where: { id },
    include: { items: { include: { product: true } } },
  })
  if (!sale) return NextResponse.json({ error: "not-found" }, { status: 404 })

  // Guard: already cancelled
  if (sale.status === "CANCELLED") {
    return NextResponse.json({ error: "already-cancelled" }, { status: 409 })
  }

  // Guard: if the sale was already partially refunded, we can't cancel it
  // cleanly (the refund math would conflict). Require a fresh sale.
  if (sale.refundStatus === "PARTIAL") {
    return NextResponse.json({ error: "has-partial-refund" }, { status: 409 })
  }
  // If already FULLY refunded, no need to cancel again.
  if (sale.refundStatus === "FULL") {
    return NextResponse.json({ error: "already-refunded" }, { status: 409 })
  }

  // Resolve the warehouse to return stock to (same as refund)
  const warehouseId = await resolveWarehouseId(user, null)
  if (!warehouseId) {
    return NextResponse.json({ error: "no-warehouse-available" }, { status: 400 })
  }

  // Compute refund amounts (full invoice)
  const refundSubtotal = sale.subtotal
  const refundTax = sale.taxAmount
  const refundDiscount = sale.discount
  const refundDelivery = sale.deliveryFee
  const refundTotal = sale.total
  const refundCost = sale.items.reduce(
    (sum, it) => sum + (Number(it.product?.costPrice ?? 0) * Number(it.quantity - it.returnedQty)),
    0
  )

  // Determine the payment-credit account based on original payment method.
  // Same logic as the refund route.
  const creditAccCode = sale.paymentMethod === "CASH" ? "1010" : "1020"

  // ── 1) RETURN STOCK (batch, no transaction) ────────────────────────
  // Each incrementStockItem is a single upsert — atomic by itself.
  // We do NOT use $transaction (PgBouncer compatibility).
  const productIds: string[] = []
  for (const it of sale.items) {
    const qtyToReturn = Number(it.quantity) - Number(it.returnedQty)
    if (qtyToReturn > 0) {
      try {
        await incrementStockItem(db, it.productId, warehouseId, qtyToReturn)
        productIds.push(it.productId)
      } catch (e: any) {
        console.error(`[cancel] Stock return FAILED for product ${it.productId}: ${e?.message ?? e}`)
        // Continue — we still want to mark the sale cancelled + journal
      }
    }
  }

  // ── 2) MARK SALE AS CANCELLED ──────────────────────────────────────
  let updatedSale: any
  try {
    updatedSale = await db.sale.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledById: user.id,
        cancellationReason: reason,
        refundStatus: "FULL",
        refundTotal: refundTotal,
      },
      include: { items: { include: { product: true } } },
    })
  } catch (e: any) {
    console.error(`[cancel] Failed to mark sale ${sale.invoiceNo} as cancelled: ${e?.message ?? e}`)
    return NextResponse.json({ error: "cancel-mark-failed" }, { status: 500 })
  }

  // ── 3) REVERSING JOURNAL ENTRY (fire-and-forget, non-fatal) ────────
  // Reverses the original sale's revenue + tax entry.
  void (async () => {
    try {
      // Financial reversal: credit the payment account (give money back),
      // debit the sales revenue + tax payable.
      const lines = [
        { accountCode: creditAccCode, credit: refundTotal, description: `إلغاء فاتورة ${sale.invoiceNo} — استرداد المبلغ` },
        { accountCode: "4010", debit: refundSubtotal - refundDiscount, description: `إلغاء إيراد مبيعات — ${sale.invoiceNo}` },
      ]
      if (refundTax > 0) {
        lines.push({ accountCode: "2010", debit: refundTax, description: `إلغاء ضريبة مستحقة — ${sale.invoiceNo}` })
      }
      await createJournalEntry({
        sourceType: "MANUAL",
        sourceId: sale.id,
        description: `قيد إلغاء فاتورة ${sale.invoiceNo} — ${reason}`,
        date: new Date(),
        lines,
      })
    } catch (e: any) {
      console.error(
        `[cancel] JournalEntry FAILED for cancelled sale ${sale.invoiceNo}. ` +
        `Sale is cancelled but accounting has a gap. Error: ${e?.message ?? e}`
      )
    }
  })()

  // ── 4) SYNC Product.quantity (fire-and-forget, 1 SQL) ──────────────
  if (productIds.length > 0) {
    void (async () => {
      try {
        // Use Prisma.join for proper parameterization (prevents SQL injection).
        // Previously this used $executeRawUnsafe with manual string interpolation
        // of productIds (which originate from the user's cart). Even though the
        // ids were sanitized with a regex replace, that approach is fragile.
        // Prisma.join builds parameterized placeholders ($1, $2, ...) and
        // passes the values as real bound parameters.
        await db.$executeRaw`
          UPDATE "Product"
          SET quantity = COALESCE((
            SELECT SUM(quantity) FROM "StockItem"
            WHERE "StockItem"."productId" = "Product".id
          ), 0)
          WHERE id IN (${Prisma.join(productIds)})
        `
      } catch (e: any) {
        console.warn(`[cancel] Product.quantity sync failed for ${sale.invoiceNo}: ${e?.message ?? e}`)
      }
    })()
  }

  // ── 5) AUDIT LOG (fire-and-forget, non-fatal) ──────────────────────
  void (async () => {
    try {
      await logAuditEvent({
        userId: user.id,
        userName: user.name,
        action: "CANCEL_TXN",
        description: `إلغاء فاتورة ${sale.invoiceNo} — السبب: ${reason}`,
        saleId: sale.id,
      })
    } catch (e: any) {
      console.warn(`[cancel] AuditLog failed for ${sale.invoiceNo}: ${e?.message ?? e}`)
    }
  })()

  // ── 6) LOYALTY POINTS REVERSAL (post-commit, non-fatal) ───────────
  // Full reversal — deduct Math.floor(sale.total) points (same formula
  // as the awarding side, but reversed). Recomputes the loyalty tier.
  // Failures here do NOT roll back the cancellation.
  if (sale.customerId) {
    try {
      const pointsToDeduct = Math.floor(sale.total)
      await reverseLoyaltyPoints(sale.customerId, pointsToDeduct)
    } catch (e: any) {
      console.warn(
        `[cancel] Loyalty reversal failed for ${sale.invoiceNo}: ${e?.message ?? e}`
      )
    }
  }

  return NextResponse.json({
    ok: true,
    sale: updatedSale,
    refundSummary: {
      refundSubtotal,
      refundTax,
      refundTotal,
      refundCost,
      creditNoteNo: `CN-${sale.invoiceNo}`,
      reason,
    },
  })
}
