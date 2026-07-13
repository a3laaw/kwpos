import { db } from "@/lib/db"

export interface ProductStockRow {
  id: string
  name: string
  taxRate: number | null
  costPrice: number
  salePrice: number
  wholesalePrice: number
  corporatePrice: number
  categoryId?: string | null
  [key: string]: unknown
}

export interface StockItemRow {
  productId: string
  warehouseId: string
  quantity: number
}

export interface PrefetchedStockData {
  products: Map<string, ProductStockRow>
  frozenProductIds: Set<string>
  stockItems: StockItemRow[]
  totalStockByProduct: Map<string, number>
  stockByProduct: Map<string, Array<{ warehouseId: string; quantity: number }>>
}

/**
 * Prefetch all stock-related data for a list of product IDs in a single
 * parallel batch (4 queries via Promise.all).
 *
 * Returns ready-to-use maps so the caller doesn't rebuild them.
 */
export async function prefetchStockData(
  productIds: string[]
): Promise<PrefetchedStockData> {
  const [products, frozenItems, stockItems] = await Promise.all([
    db.product.findMany({ where: { id: { in: productIds } } }),
    db.stockTakeItem.findMany({
      where: { productId: { in: productIds }, stockTake: { status: "DRAFT" } },
      select: { productId: true },
    }),
    db.stockItem.findMany({ where: { productId: { in: productIds } } }),
  ])

  const productMap = new Map<string, ProductStockRow>(
    products.map((p) => [p.id, p as ProductStockRow])
  )
  const frozenProductIds = new Set(frozenItems.map((f) => f.productId))

  // Build both the per-product total and the per-product warehouse breakdown
  // in a single pass.
  const totalStockByProduct = new Map<string, number>()
  const stockByProduct = new Map<string, Array<{ warehouseId: string; quantity: number }>>()
  for (const si of stockItems) {
    const row: StockItemRow = {
      productId: si.productId,
      warehouseId: si.warehouseId,
      quantity: Number(si.quantity),
    }
    totalStockByProduct.set(
      row.productId,
      (totalStockByProduct.get(row.productId) || 0) + row.quantity
    )
    if (!stockByProduct.has(row.productId)) {
      stockByProduct.set(row.productId, [])
    }
    stockByProduct.get(row.productId)!.push({ warehouseId: row.warehouseId, quantity: row.quantity })
  }

  return { products: productMap, frozenProductIds, stockItems, totalStockByProduct, stockByProduct }
}

/**
 * Result of stock availability validation.
 * - `ok: false` → `error` is a machine-readable error code with context
 * - `ok: true`  → all cart items have sufficient total stock
 */
export type StockValidationResult =
  | { ok: false; error: string; status: 400 }
  | { ok: true }

/**
 * Validate that every product in the cart has sufficient TOTAL stock
 * across all warehouses.
 *
 * Checks product existence, inventory freeze (active stock-take), and
 * total quantity availability. Does NOT check per-warehouse — the
 * decrement plan handles multi-warehouse spillover.
 */
export function validateStockAvailability(
  stockData: PrefetchedStockData,
  qtyByProduct: Map<string, number>
): StockValidationResult {
  for (const [pid, totalQty] of qtyByProduct) {
    const product = stockData.products.get(pid)
    if (!product) {
      return { ok: false, error: `product-not-found:${pid}`, status: 400 }
    }
    if (stockData.frozenProductIds.has(pid)) {
      return { ok: false, error: `stock-frozen:${product.name}`, status: 400 }
    }
    const available = stockData.totalStockByProduct.get(pid) || 0
    if (available < totalQty) {
      return {
        ok: false,
        error: `stock-insufficient:${product.name}:available:${available}:requested:${totalQty}`,
        status: 400,
      }
    }
  }
  return { ok: true }
}
