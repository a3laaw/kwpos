import { toNum, round3 } from "@/lib/coercions"
import type { SaleInput, SaleItemRaw } from "./input"
import type { ProductStockRow } from "./stock-validator"
import { effectivePrice } from "@/lib/types"
import type { CustomerTier } from "@/lib/types"

/**
 * The per-line computed data for a sale item (without the transient
 * `lineTaxRate` field that is NOT persisted to the DB).
 */
export interface SaleItemData {
  productId: string
  quantity: number
  unitPrice: number
  subtotal: number
}

/** Full per-line data including the transient tax rate (used internally). */
export interface SaleItemDataWithTax extends SaleItemData {
  lineTaxRate: number
}

export interface SaleTotals {
  itemsData: SaleItemDataWithTax[]
  subtotal: number
  afterDiscount: number
  taxAmount: number
  total: number
  /** true when per-product tax rates were used (cart-level tax = 0 in this case) */
  usedPerProductTax: boolean
}

/**
 * Compute all sale totals (subtotal, tax, discount, delivery, total) and
 * build the per-line item data.
 *
 * SECURITY: unitPrice is calculated SERVER-SIDE from the product's price
 * tiers + customer tier + active promotions. The client-sent unitPrice
 * is IGNORED — it was previously trusted, allowing price manipulation.
 *
 * Pure function — no DB access, no side effects. Easy to unit-test.
 *
 * @param items - cart items from the request (productId + quantity only; unitPrice ignored)
 * @param products - product data prefetched from DB (with price tiers)
 * @param input - cart-level params (cartTax, discount, deliveryFee)
 * @param customerTier - the customer's price tier (RETAIL/WHOLESALE/CORPORATE)
 */
export function computeSaleTotals(
  items: SaleItemRaw[],
  products: Map<string, ProductStockRow>,
  input: Pick<SaleInput, "cartTax" | "discount" | "deliveryFee">,
  customerTier: CustomerTier = "RETAIL"
): SaleTotals {
  const itemsData: SaleItemDataWithTax[] = []
  let subtotal = 0
  let totalTaxFromProducts = 0

  for (const it of items) {
    const product = products.get(it.productId)
    // NOTE: product existence is validated by validateStockAvailability,
    // so it's guaranteed to exist here. Defensive `?.` guards test fallbacks.

    // SECURITY: Calculate unitPrice server-side — ignore client-sent price
    const serverUnitPrice = effectivePrice(
      {
        salePrice: toNum(product?.salePrice),
        wholesalePrice: toNum(product?.wholesalePrice),
        corporatePrice: toNum(product?.corporatePrice),
      },
      customerTier
    )

    const lineSubtotal = round3(it.quantity * serverUnitPrice)
    // Per-product tax rate — fall back to cart-level rate for backward compat
    const lineTaxRate = toNum(product?.taxRate) || input.cartTax
    const lineTax = round3(lineSubtotal * (lineTaxRate / 100))
    subtotal += lineSubtotal
    totalTaxFromProducts += lineTax
    itemsData.push({
      productId: it.productId,
      quantity: it.quantity,
      unitPrice: serverUnitPrice, // server-calculated, not client-sent
      subtotal: lineSubtotal,
      lineTaxRate,
    })
  }

  const afterDiscount = Math.max(0, subtotal - input.discount)
  // Use per-product tax if any product has a non-zero rate; otherwise
  // fall back to cart-level rate for backward compatibility.
  const usedPerProductTax = totalTaxFromProducts > 0
  const taxAmount = usedPerProductTax
    ? totalTaxFromProducts
    : round3(afterDiscount * (input.cartTax / 100))
  const total = round3(afterDiscount + taxAmount + input.deliveryFee)

  return {
    itemsData,
    subtotal: round3(subtotal),
    afterDiscount,
    taxAmount,
    total,
    usedPerProductTax,
  }
}

/**
 * Strip the transient `lineTaxRate` field from itemsData before DB insert.
 * (Introduce Parameter Object — avoids the inline destructuring hack.)
 */
export function itemsForDb(itemsData: SaleItemDataWithTax[]): SaleItemData[] {
  return itemsData.map(({ lineTaxRate, ...rest }) => rest)
}
