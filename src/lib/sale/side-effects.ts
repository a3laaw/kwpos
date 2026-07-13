import { db } from "@/lib/db"
import { createJournalEntry } from "@/lib/journal"
import { logAuditEvent } from "@/lib/audit"
import { runInBackground } from "@/lib/background-runner"
import type { SaleItemDataWithTax, SaleTotals } from "./totals"

/** Loyalty tier thresholds — Replace Conditional with Data. */
const LOYALTY_TIERS: Array<{ name: string; min: number }> = [
  { name: "GOLD", min: 10000 },
  { name: "SILVER", min: 5000 },
  { name: "BRONZE", min: 1000 },
]

/** Resolve the loyalty tier name for a given total points balance. */
function resolveLoyaltyTier(points: number): string | null {
  for (const tier of LOYALTY_TIERS) {
    if (points >= tier.min) return tier.name
  }
  return null
}

export interface PostSaleSideEffectsParams {
  sale: any
  qtyByProduct: Map<string, number>
  totals: SaleTotals
  userId: string
  userName?: string | null
  customerId: string | undefined
  resolvedName: string | null
  paymentMethod: unknown
}

/**
 * Run all non-critical post-transaction side effects:
 *   1. Sync Product.quantity as SUM(StockItem.quantity)
 *   2. Write the audit log
 *   3. Award loyalty points to the customer (if linked)
 *
 * NOTE: The journal entry is now created INSIDE the sale transaction
 * (in transaction.ts) — it's no longer a post-tx side effect. This
 * ensures accounting integrity: if the journal fails, the sale rolls back.
 *
 * Each operation here is wrapped in `runInBackground` so a failure in one
 * does NOT affect the others or the already-committed sale.
 */
export async function runPostSaleSideEffects(
  params: PostSaleSideEffectsParams
): Promise<void> {
  const ctx = params.sale.invoiceNo

  // 1) Product.quantity sync
  await runInBackground("Product.quantity sync", ctx, async () => {
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
  })

  // 2) Audit log
  await runInBackground("Audit log", ctx, async () => {
    await logAuditEvent({
      userId: params.userId,
      userName: params.userName,
      action: "SALE_CREATED",
      description: `فاتورة مبيعات ${params.sale.invoiceNo}`,
      saleId: params.sale.id,
    })
  })

  // 3) Loyalty points
  if (params.customerId) {
    await runInBackground("Loyalty points", ctx, async () => {
      const pointsEarned = Math.floor(params.totals.afterDiscount)
      if (pointsEarned <= 0) return
      const cust = await db.customer.findUnique({
        where: { id: params.customerId },
        select: { loyaltyPoints: true, loyaltyTier: true },
      })
      if (!cust) return
      const newPoints = cust.loyaltyPoints + pointsEarned
      const newTier = resolveLoyaltyTier(newPoints)
      await db.customer.update({
        where: { id: params.customerId },
        data: {
          loyaltyPoints: { increment: pointsEarned },
          loyaltyTier: newTier,
        },
      })
    })
  }
}
