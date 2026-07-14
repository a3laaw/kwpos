import { db } from "@/lib/db"

/**
 * Loyalty tier thresholds — kept in sync with @/lib/sale/side-effects.ts.
 *
 * Higher tiers come first so the resolver returns the highest matching tier.
 */
export const LOYALTY_TIERS: ReadonlyArray<{ name: string; min: number }> = [
  { name: "GOLD", min: 10000 },
  { name: "SILVER", min: 5000 },
  { name: "BRONZE", min: 1000 },
] as const

/**
 * Resolve the loyalty tier name for a given total points balance.
 * Returns null when the balance is below the BRONZE threshold.
 *
 *   < 1000      → null
 *   1000..4999  → BRONZE
 *   5000..9999  → SILVER
 *   >= 10000    → GOLD
 */
export function resolveLoyaltyTier(points: number): string | null {
  for (const tier of LOYALTY_TIERS) {
    if (points >= tier.min) return tier.name
  }
  return null
}

/**
 * Reverse loyalty points for a refunded / cancelled sale.
 *
 * Mirrors the awarding formula in @/lib/sale/side-effects.ts
 * (Math.floor(afterDiscount)) but in reverse: deducts `pointsToDeduct`
 * from the customer, recomputes the loyalty tier, and guards the
 * balance against going below 0.
 *
 * NON-FATAL — wrap in try/catch at the call site. The refund/cancel
 * transaction has already committed by the time this runs.
 */
export async function reverseLoyaltyPoints(
  customerId: string,
  pointsToDeduct: number
): Promise<void> {
  if (!customerId || pointsToDeduct <= 0) return

  const cust = await db.customer.findUnique({
    where: { id: customerId },
    select: { loyaltyPoints: true, loyaltyTier: true },
  })
  if (!cust) return

  // Guard against going below 0 — cap the decrement at the current balance.
  const safeDecrement = Math.min(pointsToDeduct, cust.loyaltyPoints)
  if (safeDecrement <= 0) return

  // newPoints drives the tier recompute; it's clamped via Math.max(0, …).
  const newPoints = Math.max(0, cust.loyaltyPoints - pointsToDeduct)
  const newTier = resolveLoyaltyTier(newPoints)
  await db.customer.update({
    where: { id: customerId },
    data: {
      loyaltyPoints: { decrement: safeDecrement },
      loyaltyTier: newTier,
    },
  })
}
