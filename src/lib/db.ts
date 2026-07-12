import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Database connection.
//
// On Supabase + Vercel, DATABASE_URL points to the pgbouncer pooler
// (port 6543, ?pgbouncer=true). Pgbouncer in transaction mode does NOT
// support Prisma interactive transactions ($transaction(async (tx) => ...))
// because each query may land on a different backend connection, causing
// "Transaction not found / Transaction ID is invalid" errors.
//
// Fix: ALWAYS use a direct/session-pooler connection (port 5432) for the
// Prisma client. We:
//   1. Prefer DIRECT_DATABASE_URL if set (port 5432)
//   2. Otherwise derive a direct URL from DATABASE_URL by replacing
//      port 6543 → 5432 and stripping pgbouncer params
//   3. This guarantees the client never uses transaction-mode pgbouncer.
function getDirectDatasourceUrl(): string | undefined {
  // Helper: convert any Supabase URL to a direct (non-pgbouncer) URL.
  // This is critical because pgbouncer transaction mode breaks Prisma
  // interactive transactions.
  function toDirectUrl(rawUrl: string): string {
    let fixed = rawUrl
    // Replace port 6543 (pgbouncer transaction mode) → 5432 (session/direct)
    fixed = fixed.replace(':6543', ':5432')
    // Also handle 6543 without explicit port (rare)
    // Strip ALL pgbouncer-related query params
    fixed = fixed
      .replace(/[?&]pgbouncer=true/g, '')
      .replace(/[?&]connection_limit=\d+/g, '')
      .replace(/[?&]statement_timeout=\d+/g, '')
    // Clean up any orphan ? or & left after stripping
    fixed = fixed.replace(/[?&]$/, '')
    fixed = fixed.replace(/\?&/, '?')
    fixed = fixed.replace(/&&/g, '&')
    return fixed
  }

  // 1) Prefer DIRECT_DATABASE_URL — but convert it too, in case it was
  //    accidentally set to the pgbouncer URL on Vercel.
  const direct = process.env.DIRECT_DATABASE_URL
  if (direct && direct.trim()) return toDirectUrl(direct.trim())

  // 2) Fall back to DATABASE_URL (converted to direct)
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) return undefined
  return toDirectUrl(dbUrl)
}

const datasourceUrl = getDirectDatasourceUrl()

if (globalForPrisma.prisma) {
  const hasPI = typeof (globalForPrisma.prisma as any).purchaseInvoice !== "undefined"
  if (!hasPI) {
    try {
      void (globalForPrisma.prisma as any).$disconnect?.()
    } catch {}
    globalForPrisma.prisma = undefined
  }
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query'],
    ...(datasourceUrl ? { datasourceUrl } : {}),
  })

// ALWAYS cache the Prisma client in globalThis — even in production.
// On Vercel serverless, each function invocation would otherwise create
// a NEW PrismaClient (and a new DB connection pool), causing:
//   - Intermittent "no products" / "login fails" errors (connection races)
//   - Connection pool exhaustion on Supabase
//   - Slow cold starts (PrismaClient init is expensive)
// Caching in globalThis lets the same client survive across invocations
// within the same serverless function instance.
globalForPrisma.prisma = db

/* ─── Warehouse inventory helpers ──────────────────────────────────── */

/**
 * Recalculate Product.quantity as the SUM of all StockItem.quantity
 * for that product. Call this AFTER every StockItem mutation to keep
 * the aggregate in sync.
 *
 * Must be called inside a transaction if the caller is in one.
 */
export async function updateProductQuantityFromStockItems(
  tx: any,
  productId: string
): Promise<void> {
  const agg = await (tx as any).stockItem.aggregate({
    where: { productId },
    _sum: { quantity: true },
  })
  const total = agg._sum.quantity ?? 0
  await (tx as any).product.update({
    where: { id: productId },
    data: { quantity: total },
  })
}

/**
 * Get the default warehouse (first active warehouse). Used as a fallback
 * when a warehouseId is missing (e.g. legacy sales without warehouse).
 * Logs a warning to the console.
 */
export async function getDefaultWarehouseId(
  tx?: any
): Promise<string | null> {
  const client = tx || db
  const wh = await client.warehouse.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  })
  if (!wh) {
    console.warn("[warehouse] No active warehouse found — stock operations may fail")
    return null
  }
  console.warn(`[warehouse] No warehouseId provided — using default: ${wh.id}`)
  return wh.id
}

/**
 * Decrement stock from a specific warehouse's StockItem.
 * Runs inside the caller's Prisma transaction — all queries use the same
 * connection, so we get transactional isolation without needing SELECT
 * FOR UPDATE (which is incompatible with pgbouncer transaction mode on
 * Supabase). The `decrement` operation is atomic at the DB level.
 * Returns false if insufficient stock (caller should return 400).
 */
export async function decrementStockItem(
  tx: any,
  productId: string,
  warehouseId: string,
  quantity: number
): Promise<boolean> {
  const item = await tx.stockItem.findUnique({
    where: { productId_warehouseId: { productId, warehouseId } },
  })
  if (!item || item.quantity < quantity) {
    return false
  }
  await tx.stockItem.update({
    where: { productId_warehouseId: { productId, warehouseId } },
    data: { quantity: { decrement: quantity } },
  })
  return true
}

/**
 * Increment stock for a specific warehouse's StockItem (upsert if missing).
 */
export async function incrementStockItem(
  tx: any,
  productId: string,
  warehouseId: string,
  quantity: number
): Promise<void> {
  await tx.stockItem.upsert({
    where: { productId_warehouseId: { productId, warehouseId } },
    update: { quantity: { increment: quantity } },
    create: { productId, warehouseId, quantity },
  })
}
