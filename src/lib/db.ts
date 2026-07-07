import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Database connection is configured via the DATABASE_URL environment
// variable (read by Prisma from prisma/schema.prisma). No hardcoded
// credentials live in this file. Set DATABASE_URL + DIRECT_DATABASE_URL
// in your environment (local .env, Vercel dashboard, etc.).
//
// Use the Supabase pooler (port 6543) with connection_limit=1 to
// prevent pool exhaustion on Vercel serverless.

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
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

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
 * Uses SELECT FOR UPDATE row locking when inside a transaction.
 * Returns false if insufficient stock (caller should return 400).
 */
export async function decrementStockItem(
  tx: any,
  productId: string,
  warehouseId: string,
  quantity: number
): Promise<boolean> {
  // Row-level lock via raw SQL (PostgreSQL SELECT ... FOR UPDATE)
  await tx.$executeRawUnsafe(
    `SELECT * FROM "StockItem" WHERE "productId" = $1 AND "warehouseId" = $2 FOR UPDATE`,
    productId,
    warehouseId
  )
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
