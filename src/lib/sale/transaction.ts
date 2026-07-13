import { db } from "@/lib/db"
import { serializeSale } from "@/lib/serialize"
import { makeInvoiceNo } from "@/lib/format"
import { coercePaymentMethod } from "@/lib/coercions"
import { createJournalEntry } from "@/lib/journal"
import { itemsForDb, type SaleItemDataWithTax, type SaleTotals } from "./totals"
import type { DecrementStep } from "./decrement-planner"

export interface ExecuteSaleParams {
  decrementPlan: Map<string, DecrementStep[]>
  itemsData: SaleItemDataWithTax[]
  totals: SaleTotals
  userId: string
  warehouseId: string
  customerId: string | undefined
  customerPhone: string
  resolvedName: string | null
  cartTax: number
  paymentMethod: unknown
  discount: number
  deliveryFee: number
  driverName: string | null
}

export type ExecuteSaleResult =
  | { ok: false; error: string; status: number }
  | { ok: true; sale: any }

/**
 * Execute the core sale transaction:
 *   1. Generate the invoice number (atomic via sequence)
 *   2. Decrement StockItem for each unique product (atomic with gte check)
 *   3. Create the Sale + SaleItems in one nested query
 *   4. Create the journal entry (INSIDE tx — if it fails, sale rolls back)
 *
 * This is the ONLY code inside the Prisma transaction. Post-transaction
 * side effects (audit log, loyalty points, quantity sync) run after.
 */
export async function executeSaleTransaction(
  params: ExecuteSaleParams
): Promise<ExecuteSaleResult> {
  try {
    const paymentAccCode = params.paymentMethod === "CASH" ? "1010" : "1020"

    const sale = await db.$transaction(async (tx) => {
      // 1) Generate invoice number atomically.
      // On PostgreSQL (production), use a sequence for concurrency safety.
      // On SQLite (tests), fall back to count()+1 (tests are single-threaded).
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

      // 3) Create the sale + items
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

      // 4) Create journal entry INSIDE the transaction (critical for accounting integrity)
      // If this fails, the entire sale rolls back.
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

      return sale
    }, {
      timeout: 15000,
      maxWait: 5000,
    })

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

