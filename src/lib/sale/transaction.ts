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
 * Execute the core sale transaction:
 *   1. Generate the invoice number (atomic via sequence on PostgreSQL)
 *   2. Decrement StockItem for each unique product (atomic with gte check)
 *   3. Sync Product.quantity inside the transaction
 *   4. Create the Sale + SaleItems in one nested query
 *   5. Create the journal entry (INSIDE tx — if it fails, sale rolls back)
 *   6. Create the AuditLog (INSIDE tx — critical for compliance)
 *
 * Post-transaction side effects (loyalty points) run AFTER the tx commits
 * via await (not fire-and-forget — Vercel doesn't guarantee fire-and-forget).
 */
export async function executeSaleTransaction(
  params: ExecuteSaleParams
): Promise<ExecuteSaleResult> {
  try {
    const paymentAccCode = params.paymentMethod === "CASH" ? "1010" : "1020"

    const sale = await db.$transaction(async (tx) => {
      // 1) Generate invoice number atomically
      let invoiceNo: string
      const isPostgres = !process.env.DATABASE_URL?.startsWith("file:")
      if (isPostgres) {
        const seqResult = await tx.$queryRaw`SELECT nextval('sale_invoice_seq') as seq`
        const seq = Number((seqResult as any[])[0]?.seq ?? 1)
        invoiceNo = makeInvoiceNo(seq)
      } else {
        const count = await tx.sale.count()
        invoiceNo = makeInvoiceNo(count + 1)
      }

      // 2) Decrement StockItem with atomic gte check (prevents race condition)
      for (const [pid, steps] of params.decrementPlan) {
        for (const step of steps) {
          const updated = await tx.stockItem.updateMany({
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
        }
      }

      // 3) Product.quantity sync is now done AFTER the transaction commits
      // (see step 7 below). This removes N aggregate + N update queries
      // from inside the transaction, making it shorter and more resilient
      // to PgBouncer connection reassignment on Supabase. Product.quantity
      // is a DERIVED value (SUM of StockItem.quantity) so computing it
      // post-commit is safe — if it fails, StockItem is still correct and
      // the next sale/refresh will recompute it.

      // 4) Create the sale + items
      const sale = await tx.sale.create({
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

      // 5) Create journal entry INSIDE the transaction
      const revenueLines = [
        { accountCode: paymentAccCode, debit: params.totals.total, description: `تحصيل فاتورة ${invoiceNo}` },
        { accountCode: "4010", credit: params.totals.total - params.totals.taxAmount, description: "إيراد مبيعات" },
      ]
      if (params.totals.taxAmount > 0) {
        revenueLines.push({ accountCode: "2010", credit: params.totals.taxAmount, description: "ضريبة مستحقة" })
      }
      await createJournalEntry({
        sourceType: "SALE",
        sourceId: sale.id,
        description: `قيد فاتورة مبيعات ${invoiceNo}${params.resolvedName ? ` — ${params.resolvedName}` : ""}`,
        date: new Date(),
        lines: revenueLines,
        tx,
      })

      // 6) Create AuditLog INSIDE the transaction (critical for compliance)
      await logAuditEvent({
        tx,
        userId: params.userId,
        userName: params.userName,
        action: "SALE_CREATED",
        description: `فاتورة مبيعات ${invoiceNo}`,
        saleId: sale.id,
      })

      return sale
    }, {
      timeout: 15000,
      maxWait: 5000,
    })

    // 7) Sync Product.quantity OUTSIDE the transaction.
    // This is a DERIVED value (SUM of StockItem.quantity). Running it
    // post-commit with `db` (not `tx`) means:
    //   - The transaction is shorter → less likely to hit PgBouncer issues
    //   - If this sync fails (cold start, connection drop), the SALE is
    //     still committed and StockItem is still correct. Product.quantity
    //     will be stale until the next sale or a manual refresh.
    //   - We await (not fire-and-forget) so the API response reflects the
    //     updated quantity.
    try {
      for (const pid of params.qtyByProduct.keys()) {
        const agg = await db.stockItem.aggregate({
          where: { productId: pid },
          _sum: { quantity: true },
        })
        await db.product.update({
          where: { id: pid },
          data: { quantity: agg._sum.quantity ?? 0 },
        })
      }
    } catch {
      // Non-fatal: sale is committed, StockItem is correct.
      // Product.quantity will self-correct on the next sale.
    }

    return { ok: true, sale }
  } catch (e: any) {
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

