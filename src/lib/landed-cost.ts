/**
 * Landed Cost Engine — محرّك تكلفة الوصول
 * ------------------------------------------------------------------
 * Distributes the extra charges of a purchase order (customs + shipping
 * + other) across its line items proportionally to each item's subtotal
 * value, then recomputes the weighted-average cost price for every
 * affected product.
 *
 * Weighted average formula (طريقة المتوسط المرجح):
 *   totalQtyOnHand  = product.quantity (BEFORE this receipt)
 *   incomingQty     = item.quantity
 *   incomingUnitCost = item.unitCost + allocatedPerUnit
 *   newCostPrice =
 *     ((totalQtyOnHand × oldCostPrice) + (incomingQty × incomingUnitCost))
 *     / (totalQtyOnHand + incomingQty)
 *
 * Edge case: when the product has zero on-hand stock before receipt,
 * the new cost price is simply the incoming unit cost (no blending).
 *
 * Kuwait context: no VAT — these extra charges are pure cost additions
 * that flow into inventory valuation only (no tax journal entry).
 */

export interface LandedCostAllocation {
  productId: string
  /** Original unit cost from the supplier invoice (before allocation). */
  unitCost: number
  /** Extra cost (customs/shipping/other) allocated to one unit. */
  allocatedPerUnit: number
  /** New weighted-average cost price to write back to the product. */
  newCostPrice: number
}

export interface LandedCostItemInput {
  productId: string
  quantity: number
  unitCost: number
  subtotal: number
}

export interface LandedCostExtraCharges {
  customs: number
  shipping: number
  other: number
}

export interface LandedCostProductInput {
  id: string
  /** Current weighted-average cost (before this receipt). */
  costPrice: number
  /** On-hand quantity (before this receipt). */
  quantity: number
}

function round3(v: number): number {
  return +Number(v).toFixed(3)
}

/**
 * Allocate extra charges across PO items proportionally by each item's
 * subtotal value, and compute the new weighted-average cost price for
 * each product.
 *
 * - If the PO's total subtotal is 0 (e.g. all free samples), the extra
 *   charges are allocated equally by quantity instead of by value.
 * - If there are no items, returns an empty array.
 * - If a product in `items` is not found in `currentProducts`, its
 *   allocation is still returned but `newCostPrice` falls back to
 *   `unitCost + allocatedPerUnit` (treats on-hand as 0).
 */
export function allocateLandedCost(
  items: LandedCostItemInput[],
  extraCharges: LandedCostExtraCharges,
  currentProducts: LandedCostProductInput[]
): LandedCostAllocation[] {
  if (!items || items.length === 0) return []

  const totalExtra =
    (Number(extraCharges.customs) || 0) +
    (Number(extraCharges.shipping) || 0) +
    (Number(extraCharges.other) || 0)

  // No extra charges → nothing to allocate. We still return one entry
  // per item with allocatedPerUnit = 0 and the weighted-average cost
  // computed against the incoming unit cost only (preserves the same
  // blending behaviour the caller would otherwise apply manually).
  if (totalExtra <= 0) {
    return items.map((it) => {
      const prod = currentProducts.find((p) => p.id === it.productId)
      const onHand = prod?.quantity ?? 0
      const oldCost = prod?.costPrice ?? 0
      const incomingUnitCost = it.unitCost
      const newCostPrice =
        onHand > 0
          ? round3(
              (onHand * oldCost + it.quantity * incomingUnitCost) /
                (onHand + it.quantity)
            )
          : round3(incomingUnitCost)
      return {
        productId: it.productId,
        unitCost: it.unitCost,
        allocatedPerUnit: 0,
        newCostPrice,
      }
    })
  }

  const totalSubtotal = items.reduce(
    (sum, it) => sum + (Number(it.subtotal) || 0),
    0
  )

  // Fallback: if all subtotals are 0, allocate by quantity instead of
  // by value so the extra charges are still spread across the items.
  const totalQty = items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0),
    0
  )

  const byValue = totalSubtotal > 0

  return items.map((it) => {
    const qty = Number(it.quantity) || 0
    const sub = Number(it.subtotal) || 0
    const share = byValue
      ? totalSubtotal > 0
        ? sub / totalSubtotal
        : 0
      : totalQty > 0
        ? qty / totalQty
        : 0
    const allocatedTotal = round3(totalExtra * share)
    const allocatedPerUnit = qty > 0 ? round3(allocatedTotal / qty) : 0

    const prod = currentProducts.find((p) => p.id === it.productId)
    const onHand = prod?.quantity ?? 0
    const oldCost = prod?.costPrice ?? 0
    const incomingUnitCost = round3(it.unitCost + allocatedPerUnit)

    let newCostPrice: number
    if (onHand > 0) {
      newCostPrice = round3(
        (onHand * oldCost + qty * incomingUnitCost) / (onHand + qty)
      )
    } else {
      newCostPrice = incomingUnitCost
    }

    return {
      productId: it.productId,
      unitCost: it.unitCost,
      allocatedPerUnit,
      newCostPrice,
    }
  })
}
