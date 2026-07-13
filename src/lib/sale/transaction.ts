import { db } from "@/lib/db"
import { serializeSale } from "@/lib/serialize"
import { makeInvoiceNo } from "@/lib/format"
import { coercePaymentMethod } from "@/lib/coercions"
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
 *   1. Generate the invoice number (1 query)
 *   2. Decrement StockItem for each unique product (N queries)
 *   3. Create the Sale + SaleItems in one nested query
 *
 * This is the ONLY code inside the Prisma transaction — everything else
 * (journal, audit, loyalty, quantity sync) runs AFTER it commits.
 */
export async function executeSaleTransaction(
  params: ExecuteSaleParams
): Promise<ExecuteSaleResult> {
  try {
    // Use $transaction with the direct connection (port 5432).
    // The direct connection supports interactive transactions.
    // connection_limit=1 in the URL prevents pool exhaustion.
    const sale = await db.$transaction(async (tx) => {
      const count = await tx.sale.count()
      const invoiceNo = makeInvoiceNo(count + 1)

      // Decrement StockItem for each unique product (atomic decrement)
      for (const [pid, steps] of params.decrementPlan) {
        for (const step of steps) {
          await tx.stockItem.update({
            where: { productId_warehouseId: { productId: pid, warehouseId: step.warehouseId } },
            data: { quantity: { decrement: step.qty } },
          })
        }
      }

      return await tx.sale.create({
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
    }, {
      timeout: 10000,
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
