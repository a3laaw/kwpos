import { db } from "@/lib/db"
import { runInBackground } from "@/lib/background-runner"
import type { SaleTotals } from "./totals"

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
  totals: SaleTotals
  customerId: string | undefined
}

/**
 * Run post-transaction side effects:
 *   - Loyalty points (non-critical, but awaited — not fire-and-forget)
 *
 * NOTE: Product.quantity sync, AuditLog, and JournalEntry are now INSIDE
 * the sale transaction (in transaction.ts) — they're no longer post-tx
 * side effects. This ensures data integrity on Vercel serverless where
 * fire-and-forget is not guaranteed.
 */
export async function runPostSaleSideEffects(
  params: PostSaleSideEffectsParams
): Promise<void> {
  const ctx = params.sale.invoiceNo

  // Loyalty points — awaited (not fire-and-forget)
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
