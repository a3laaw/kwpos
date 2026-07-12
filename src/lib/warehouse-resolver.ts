import { db } from "@/lib/db"
import type { SessionUser } from "@/components/user-context"

/**
 * Resolve the warehouse for a stock-mutating operation.
 *
 * Priority:
 *   1. The user's assigned warehouse (user.warehouseId)
 *   2. An explicit warehouseId in the request body
 *   3. The first active warehouse (default)
 *
 * This is shared by sales, exchanges, and refunds so they all resolve
 * the warehouse the same way (DRY — previously duplicated 3×).
 *
 * Returns the warehouse id, or null if no active warehouse exists.
 */
export async function resolveWarehouseId(
  user: Pick<SessionUser, "warehouseId"> | undefined | null,
  bodyWarehouseId?: string | null
): Promise<string | null> {
  // 1) User's assigned warehouse takes priority
  const userWh = user?.warehouseId
  if (userWh) {
    const wh = await db.warehouse.findUnique({
      where: { id: userWh },
      select: { id: true },
    })
    if (wh) return wh.id
  }

  // 2) Explicit warehouseId in the request body
  if (bodyWarehouseId) {
    const wh = await db.warehouse.findUnique({
      where: { id: bodyWarehouseId },
      select: { id: true },
    })
    if (wh) return wh.id
  }

  // 3) Fall back to the first active warehouse
  const defaultWh = await db.warehouse.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  })
  return defaultWh?.id ?? null
}
