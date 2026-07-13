import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Database connection — optimized for Vercel serverless + Supabase.
//
// STRATEGY: Use the DIRECT connection (port 5432) for the Prisma client.
// This supports interactive transactions ($transaction) which are needed
// for sales, exchanges, refunds, etc.
//
// To prevent connection pool exhaustion (Supabase limits to ~15 direct
// connections), we:
//   1. Cache the PrismaClient in globalThis (one client per function instance)
//   2. Set connection_limit=1 in the URL (one connection per client)
//   3. Vercel reuses function instances, so connections are shared
function getDatasourceUrl(): string | undefined {
  const direct = process.env.DIRECT_DATABASE_URL
  const dbUrl = process.env.DATABASE_URL

  // PREFER the direct URL (port 5432, no pgbouncer) — supports interactive
  // transactions ($transaction) which are required for sales, exchanges,
  // refunds, purchase invoices, stock transfers, etc.
  if (direct && direct.trim()) {
    let url = direct.trim()
    // Add connection_limit=1 if not already present (prevents pool exhaustion
    // on Supabase which limits direct connections to ~15).
    if (!url.includes('connection_limit=')) {
      url += (url.includes('?') ? '&' : '?') + 'connection_limit=1'
    }
    return url
  }

  // ── WARNING: DIRECT_DATABASE_URL is missing ───────────────────────────
  // Interactive transactions will likely fail with "Transaction not found"
  // because the fallback below points at the transaction-mode pooler (port
  // 6543 with pgbouncer=true), which is INCOMPATIBLE with Prisma interactive
  // transactions. The code attempts to strip pgbouncer params and switch
  // to port 5432, but Supabase's port-5432 pooler is a *session-mode* pooler
  // and still applies connection timeouts that can close long transactions.
  // The correct fix is to set DIRECT_DATABASE_URL in Vercel to the direct
  // host: postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[db] WARNING: DIRECT_DATABASE_URL is not set. ' +
      'Falling back to DATABASE_URL — Prisma interactive transactions ' +
      '($transaction) may fail with "Transaction not found". ' +
      'Set DIRECT_DATABASE_URL to the direct Supabase host ' +
      '(db.PROJECT_REF.supabase.co:5432) without pgbouncer=true. ' +
      'See DEPLOY.md for details.'
    )
  }

  // Fall back to DATABASE_URL. We strip pgbouncer params and switch to port
  // 5432 to give interactive transactions a chance, but this is NOT a
  // guaranteed-correct direct connection — it's a best-effort fallback.
  if (dbUrl) {
    let url = dbUrl
    // Convert pgbouncer pooler URL to direct-style URL
    url = url.replace(':6543', ':5432')
    url = url.replace(/[?&]pgbouncer=true/g, '')
    url = url.replace(/[?&]connection_limit=\d+/g, '')
    url = url.replace(/[?&]pgbouncer=[^&]*/g, '')
    // Add connection_limit=1
    url += (url.includes('?') ? '&' : '?') + 'connection_limit=1'
    // Clean up
    url = url.replace('&&', '&').replace('?&', '?')
    return url
  }

  return undefined
}

const datasourceUrl = getDatasourceUrl()

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
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query'],
    ...(datasourceUrl ? { datasourceUrl } : {}),
  })

// ALWAYS cache in globalThis — prevents creating new PrismaClient per
// serverless function invocation (which would exhaust Supabase connections).
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
