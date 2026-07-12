import { toNum, round3 } from "@/lib/coercions"
import type { SaleInput, SaleItemRaw } from "./input"
import type { ProductStockRow } from "./stock-validator"

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
 * Pure function — no DB access, no side effects. Easy to unit-test.
 */
export function computeSaleTotals(
  items: SaleItemRaw[],
  products: Map<string, ProductStockRow>,
  input: Pick<SaleInput, "cartTax" | "discount" | "deliveryFee">
): SaleTotals {
  const itemsData: SaleItemDataWithTax[] = []
  let subtotal = 0
  let totalTaxFromProducts = 0

  for (const it of items) {
    const product = products.get(it.productId)
    // NOTE: product existence is validated by validateStockAvailability,
    // so it's guaranteed to exist here. Defensive `?.` guards test fallbacks.
    const lineSubtotal = round3(it.quantity * it.unitPrice)
    // Per-product tax rate — fall back to cart-level rate for backward compat
    const lineTaxRate = toNum(product?.taxRate) || input.cartTax
    const lineTax = round3(lineSubtotal * (lineTaxRate / 100))
    subtotal += lineSubtotal
    totalTaxFromProducts += lineTax
    itemsData.push({
      productId: it.productId,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
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
