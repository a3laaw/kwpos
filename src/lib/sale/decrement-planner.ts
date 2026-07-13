import type { PrefetchedStockData } from "./stock-validator"

export interface DecrementStep {
  warehouseId: string
  qty: number
}

/**
 * Build a per-product decrement plan that may span multiple warehouses.
 *
 * For each product, start from the default warehouse and spill over to
 * other warehouses (sorted by largest stock first) until the requested
 * quantity is covered.
 *
 * This is the multi-warehouse stock-decrement strategy.
 */
export function buildDecrementPlan(
  qtyByProduct: Map<string, number>,
  stockData: PrefetchedStockData,
  defaultWarehouseId: string
): Map<string, DecrementStep[]> {
  const plan = new Map<string, DecrementStep[]>()

  for (const [pid, totalQty] of qtyByProduct) {
    const warehouses = (stockData.stockByProduct.get(pid) || []).slice()
    // Sort: default warehouse first, then by largest stock
    warehouses.sort((a, b) => {
      if (a.warehouseId === defaultWarehouseId) return -1
      if (b.warehouseId === defaultWarehouseId) return 1
      return b.quantity - a.quantity
    })

    let remaining = totalQty
    const steps: DecrementStep[] = []
    for (const wh of warehouses) {
      if (remaining <= 0) break
      const take = Math.min(wh.quantity, remaining)
      if (take > 0) {
        steps.push({ warehouseId: wh.warehouseId, qty: take })
        remaining -= take
      }
    }
    plan.set(pid, steps)
  }

  return plan
}
