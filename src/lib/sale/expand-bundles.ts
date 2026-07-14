import { db } from "@/lib/db"
import type { SaleInput, SaleItemRaw } from "./input"

/**
 * Expand bundle line items into their component products.
 *
 * The POS sends bundle items with a virtual productId like "bundle-{id}".
 * The sale flow (stock validation, decrement, totals) only knows about real
 * Product rows. This function:
 *   1. Detects items with productId starting with "bundle-"
 *   2. Fetches the Bundle + its BundleItems (component products + quantities)
 *   3. Replaces each bundle line with its component products (real productIds)
 *      so stock validation + decrement work correctly
 *
 * NOTE on pricing: This current implementation expands the bundle into its
 * components priced at their INDIVIDUAL sale prices (not the bundle price).
 * This means the invoice total = sum of component prices, NOT the bundle
 * price. The bundle discount is NOT applied in this version.
 *
 * To apply the bundle price correctly, we would need to either:
 *   (a) Add a `bundleId` column to SaleItem (schema migration), OR
 *   (b) Add special bundle-pricing logic to computeSaleTotals
 * Both are deferred. For now, bundles work (sale succeeds, stock decrements
 * correctly) but the invoice shows components at their individual prices.
 *
 * If a bundle- prefixed ID has no matching Bundle row, the item is dropped.
 */
export async function expandBundles(input: SaleInput): Promise<SaleInput> {
  // Find bundle items (productId starts with "bundle-")
  const bundleIds = input.items
    .filter((it) => it.productId.startsWith("bundle-"))
    .map((it) => it.productId.replace("bundle-", ""))
    .filter(Boolean)

  if (bundleIds.length === 0) {
    return input // no bundles — nothing to expand
  }

  // Fetch bundles + their components
  const bundles = await db.bundle.findMany({
    where: { id: { in: bundleIds } },
    include: { items: true },
  })

  const bundleMap = new Map(bundles.map((b) => [`bundle-${b.id}`, b]))

  // Build the expanded items list + expanded qtyByProduct
  // Bundle lines are replaced by their component products (real productIds).
  const expandedItems: SaleItemRaw[] = []
  const expandedQtyByProduct = new Map<string, number>()
  const expandedProductIds: string[] = []

  function addProduct(pid: string, qty: number) {
    if (!expandedQtyByProduct.has(pid)) {
      expandedProductIds.push(pid)
    }
    expandedQtyByProduct.set(pid, (expandedQtyByProduct.get(pid) || 0) + qty)
  }

  for (const it of input.items) {
    if (it.productId.startsWith("bundle-")) {
      const bundle = bundleMap.get(it.productId)
      if (!bundle) {
        // Bundle not found — skip this item (invalid)
        continue
      }

      // Expand the bundle into its component products.
      // Each component is added as a separate line item (priced individually).
      for (const component of bundle.items) {
        const componentQty = Number(component.quantity) * it.quantity
        if (componentQty > 0) {
          expandedItems.push({
            productId: component.productId,
            quantity: componentQty,
            unitPrice: 0, // server-side pricing will compute the real price
          })
          addProduct(component.productId, componentQty)
        }
      }
    } else {
      // Regular product — keep as-is
      expandedItems.push(it)
      addProduct(it.productId, it.quantity)
    }
  }

  return {
    ...input,
    items: expandedItems,
    productIds: expandedProductIds,
    qtyByProduct: expandedQtyByProduct,
  }
}
