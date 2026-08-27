import { db } from "@/lib/db"
import { runInBackground } from "@/lib/background-runner"
import { createStockLowNotification } from "@/lib/notifications"
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
  warehouseId?: string
}

/**
 * Run post-transaction side effects:
 *   - Loyalty points (non-critical, but awaited — not fire-and-forget)
 *   - Stock-low notifications (Track 4.3) — for each product in the
 *     cart whose aggregate StockItem total is at or below its
 *     reorderLevel, fan out a STOCK_LOW notification to all users who
 *     can see inventory (ADMIN/MANAGER/WAREHOUSE/OWNER).
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

  // Stock-low notifications (Track 4.3) — fire-and-forget.
  // Uses the aggregate StockItem quantity (not the derived
  // Product.quantity, which is synced asynchronously in
  // transaction.ts) so we don't race the sync.
  await runInBackground("Stock-low notifications", ctx, async () => {
    const productIds = Array.from(new Set(params.totals.itemsData.map((it) => it.productId)))
    if (productIds.length === 0) return

    let warehouseName: string | null = null
    if (params.warehouseId) {
      const wh = await db.warehouse.findUnique({
        where: { id: params.warehouseId },
        select: { name: true },
      }).catch(() => null)
      warehouseName = wh?.name ?? null
    }

    // Fetch products + their aggregate StockItem quantity in parallel.
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, reorderLevel: true },
    })
    const stockAggs = await db.stockItem.groupBy({
      by: ["productId"],
      where: { productId: { in: productIds } },
      _sum: { quantity: true },
    })
    const stockMap = new Map(
      stockAggs.map((s: any) => [s.productId, Number(s._sum.quantity ?? 0)] as const)
    )

    for (const p of products) {
      const total = stockMap.get(p.id) ?? 0
      // Trigger when at or below the reorder level (matching the existing
      // notifications/route.ts semantics that used `quantity <= reorderLevel`).
      if (total <= p.reorderLevel) {
        await createStockLowNotification(p.id, p.name, warehouseName)
      }
    }
  })
}
