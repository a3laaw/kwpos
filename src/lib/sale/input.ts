import { toNum } from "@/lib/coercions"

/**
 * Raw sale input parsed from the POST /api/sales request body.
 */
export interface SaleInput {
  customerName: string | null
  customerPhone: string
  customerAddress: string | null
  items: SaleItemRaw[]
  cartTax: number
  discount: number
  deliveryFee: number
  driverName: string | null
  paymentMethod: unknown
  warehouseId?: string | null
  productIds: string[]
  qtyByProduct: Map<string, number>
}

export interface SaleItemRaw {
  productId: string
  quantity: number
  unitPrice: number
}

/**
 * Result of parsing the raw request body.
 * - `ok: false` → `error` is a machine-readable error code
 * - `ok: true`  → `input` is the validated SaleInput
 */
export type ParseResult =
  | { ok: false; error: string; status: 400 }
  | { ok: true; input: SaleInput }

/**
 * Parse + validate the raw request body for POST /api/sales.
 * Returns a discriminated union so the caller can early-return on error
 * without nested conditionals (Replace Nested Conditional with Guard Clauses).
 */
export function parseSaleInput(body: any): ParseResult {
  const {
    customerName,
    customerPhone,
    customerAddress,
    items,
    taxRate,
    discount,
    paymentMethod,
    deliveryFee,
    driverName,
  } = body || {}

  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "items-required", status: 400 }
  }

  // Aggregate quantities per unique product (in case the same product
  // appears multiple times in the cart).
  const qtyByProduct = new Map<string, number>()
  const productIds: string[] = []
  for (const it of items) {
    const pid = String(it?.productId ?? "")
    const qty = toNum(it?.quantity)
    if (!pid || qty <= 0) continue
    if (!qtyByProduct.has(pid)) productIds.push(pid)
    qtyByProduct.set(pid, (qtyByProduct.get(pid) || 0) + qty)
  }

  if (productIds.length === 0) {
    return { ok: false, error: "items-required", status: 400 }
  }

  return {
    ok: true,
    input: {
      customerName: customerName?.trim() || null,
      customerPhone: customerPhone?.trim() || "",
      customerAddress: customerAddress?.trim() || null,
      items: items.map((it: any) => ({
        productId: String(it.productId),
        quantity: toNum(it.quantity),
        unitPrice: toNum(it.unitPrice),
      })),
      cartTax: toNum(taxRate),
      discount: Math.max(0, toNum(discount)),
      deliveryFee: Math.max(0, toNum(deliveryFee)),
      driverName: driverName?.trim() || null,
      paymentMethod,
      warehouseId: body?.warehouseId ?? null,
      productIds,
      qtyByProduct,
    },
  }
}
