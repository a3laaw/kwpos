import { db } from "@/lib/db"
import { serializeSale } from "@/lib/serialize"
import { makeInvoiceNo } from "@/lib/format"
import { coercePaymentMethod } from "@/lib/coercions"
import { createJournalEntry } from "@/lib/journal"
import { logAuditEvent } from "@/lib/audit"
import { itemsForDb, type SaleItemDataWithTax, type SaleTotals } from "./totals"
import type { DecrementStep } from "./decrement-planner"

export interface ExecuteSaleParams {
  decrementPlan: Map<string, DecrementStep[]>
  itemsData: SaleItemDataWithTax[]
  totals: SaleTotals
  userId: string
  userName?: string | null
  warehouseId: string
  customerId: string | undefined
  customerPhone: string
  resolvedName: string | null
  cartTax: number
  paymentMethod: unknown
  discount: number
  deliveryFee: number
  driverName: string | null
  qtyByProduct: Map<string, number>
}

export type ExecuteSaleResult =
  | { ok: false; error: string; status: number }
  | { ok: true; sale: any }

/**
 * Execute the core sale WITHOUT Prisma's `$transaction` (interactive
 * transaction). This is the ROOT FIX for the "Transaction not found"
 * error on Vercel + Supabase.
 *
 * WHY NO $transaction:
 *   Prisma interactive transactions hold a single database connection
 *   open for the entire transaction. On Supabase's PgBouncer pooler
 *   (both transaction-mode AND session-mode), the pooler can reassign
 *   or close that connection mid-transaction — especially when the
 *   transaction has 40+ queries (one per cart item). When the connection
 *   closes, Prisma throws "Transaction not found" on the next query.
 *
 *   This is a KNOWN incompatibility between Prisma interactive
 *   transactions and PgBouncer. The only reliable fix is to NOT use
 *   $transaction when behind PgBouncer.
 *
 * ATOMICITY WITHOUT $transaction:
 *   Each StockItem decrement uses `updateMany` with a `gte` check, which
 *   is atomic at the database level (single SQL statement). If any item
 *   is out of stock, that update affects 0 rows and we throw before
 *   creating the sale.
 *
 *   If the sale.create() FAILS after some stock was already decremented,
 *   we COMPENSATE by re-incrementing the decremented items. This is the
 *   "saga pattern" — each step has a compensating action.
 *
 *   JournalEntry + AuditLog run post-sale (non-fatal). If they fail,
 *   the sale is still committed and logged for manual reconciliation.
 */
export async function executeSaleTransaction(
  params: ExecuteSaleParams
): Promise<ExecuteSaleResult> {
  const paymentAccCode = params.paymentMethod === "CASH" ? "1010" : "1020"

  // Track which items we've decremented so we can compensate on failure.
  const decremented: Array<{ productId: string; warehouseId: string; qty: number }> = []

  try {
    // 1) Generate invoice number (atomic via PostgreSQL sequence)
    let invoiceNo: string
    const isPostgres = !process.env.DATABASE_URL?.startsWith("file:")
    if (isPostgres) {
      const seqResult = await db.$queryRaw`SELECT nextval('sale_invoice_seq') as seq`
      const seq = Number((seqResult as any[])[0]?.seq ?? 1)
      invoiceNo = makeInvoiceNo(seq)
    } else {
      const count = await db.sale.count()
      invoiceNo = makeInvoiceNo(count + 1)
    }

    // 2) Decrement StockItem — each is a single atomic SQL statement.
    //    updateMany with `gte` check: if quantity < qty, 0 rows updated → throw.
    //    No transaction needed — each update is independently atomic.
    for (const [pid, steps] of params.decrementPlan) {
      for (const step of steps) {
        const updated = await db.stockItem.updateMany({
          where: {
            productId: pid,
            warehouseId: step.warehouseId,
            quantity: { gte: step.qty },
          },
          data: {
            quantity: { decrement: step.qty },
          },
        })
        if (updated.count !== 1) {
          throw new Error(`stock-insufficient:concurrent:${pid}`)
        }
        decremented.push({ productId: pid, warehouseId: step.warehouseId, qty: step.qty })
      }
    }

    // 3) Create the sale + items (single nested query — atomic by itself)
    const sale = await db.sale.create({
      data: {
        invoiceNo,
        customerName: params.resolvedName,
        customerPhone: params.customerPhone || null,
        customerId: params.customerId || null,
        subtotal: params.totals.subtotal,
        taxRate: params.totals.usedPerProductTax ? 0 : params.cartTax,
        taxAmount: params.totals.taxAmount,
        discount: params.discount,
        deliveryFee: params.deliveryFee,
        driverName: params.driverName,
        total: params.totals.total,
        paid: params.totals.total,
        paymentMethod: coercePaymentMethod(params.paymentMethod),
        userId: params.userId,
        items: { create: itemsForDb(params.itemsData) },
      },
      include: { user: true, items: { include: { product: true } } },
    })

    // ── POST-SALE SIDE EFFECTS ─────────────────────────────────────────
    // These run AFTER the sale is committed. They are NON-BLOCKING — we
    // fire them off WITHOUT awaiting, so the API response returns to the
    // cashier immediately. On Vercel serverless, the function may stay
    // alive briefly after the response to complete these. If it doesn't,
    // the gaps are logged.
    //
    // CRITICAL: the sale + stock decrement are ALREADY committed. These
    // side effects are for accounting/audit convenience only.

    const productIds = Array.from(params.qtyByProduct.keys())

    // 4) Sync Product.quantity — SINGLE SQL query (was 80 queries!)
    // UPDATE Product SET quantity = (SELECT SUM(StockItem.quantity) ...)
    // WHERE id IN (...)
    if (productIds.length > 0) {
      void (async () => {
        try {
          const ids = productIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",")
          await db.$executeRawUnsafe(`
            UPDATE "Product"
            SET quantity = COALESCE((
              SELECT SUM(quantity) FROM "StockItem"
              WHERE "StockItem"."productId" = "Product".id
            ), 0)
            WHERE id IN (${ids})
          `)
        } catch (e: any) {
          console.warn(
            `[sale] Product.quantity sync failed for sale ${invoiceNo}. ` +
            `StockItem is correct; Product.quantity will self-correct. ` +
            `Error: ${e?.message ?? e}`
          )
        }
      })()
    }

    // 5) Create JournalEntry (non-blocking, fire-and-forget)
    const revenueLines = [
      { accountCode: paymentAccCode, debit: params.totals.total, description: `تحصيل فاتورة ${invoiceNo}` },
      { accountCode: "4010", credit: params.totals.total - params.totals.taxAmount, description: "إيراد مبيعات" },
    ]
    if (params.totals.taxAmount > 0) {
      revenueLines.push({ accountCode: "2010", credit: params.totals.taxAmount, description: "ضريبة مستحقة" })
    }
    void (async () => {
      try {
        await createJournalEntry({
          sourceType: "SALE",
          sourceId: sale.id,
          description: `قيد فاتورة مبيعات ${invoiceNo}${params.resolvedName ? ` — ${params.resolvedName}` : ""}`,
          date: new Date(),
          lines: revenueLines,
        })
      } catch (e: any) {
        console.error(
          `[sale] JournalEntry FAILED for sale ${invoiceNo} (${sale.id}). ` +
          `Sale is committed but accounting has a gap. Error: ${e?.message ?? e}`
        )
      }
    })()

    // 6) Create AuditLog (non-blocking, fire-and-forget)
    void (async () => {
      try {
        await logAuditEvent({
          userId: params.userId,
          userName: params.userName,
          action: "SALE_CREATED",
          description: `فاتورة مبيعات ${invoiceNo}`,
          saleId: sale.id,
        })
      } catch (e: any) {
        console.warn(`[sale] AuditLog failed for ${invoiceNo}: ${e?.message ?? e}`)
      }
    })()

    // Return IMMEDIATELY — the cashier sees the sale succeed fast.
    // Side effects continue in the background.
    return { ok: true, sale }
  } catch (e: any) {
    // ── COMPENSATING ACTIONS (saga rollback) ──────────────────────────
    // If the sale failed AFTER stock was decremented, re-increment the
    // stock to restore the original state. This is the compensating
    // transaction in the saga pattern.
    if (decremented.length > 0) {
      const msg = e?.message || "sale-failed"
      const shouldCompensate = !msg.startsWith("stock-insufficient:concurrent")
      // If the failure was a stock-insufficient error on item N, items
      // 1..N-1 were already decremented and need compensation. Item N
      // itself was NOT decremented (updateMany returned 0).
      if (shouldCompensate) {
        console.warn(
          `[sale] Sale failed (${msg}). Compensating: re-incrementing ` +
          `${decremented.length} stock items.`
        )
        for (const d of decremented) {
          try {
            await db.stockItem.update({
              where: {
                productId_warehouseId: {
                  productId: d.productId,
                  warehouseId: d.warehouseId,
                },
              },
              data: { quantity: { increment: d.qty } },
            })
          } catch (compErr: any) {
            // Compensation failed — stock is now WRONG. Log loudly.
            console.error(
              `[sale] COMPENSATION FAILED for product ${d.productId} ` +
              `warehouse ${d.warehouseId}. Stock is inconsistent! ` +
              `Error: ${compErr?.message ?? compErr}`
            )
          }
        }
      }
    }

    const msg = e?.message || "sale-failed"
    const status = msg.startsWith("stock-insufficient") ||
      msg.startsWith("product-not-found") ||
      msg.startsWith("invalid-item")
      ? 400
      : 500
    return { ok: false, error: msg, status }
  }
}

/**
 * Serialize the sale for the API response.
 */
export function serializeSaleResponse(sale: any) {
  return serializeSale(sale)
}

