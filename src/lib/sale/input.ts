import { toNum } from "@/lib/coercions"

/** Loosely-typed shape of a single cart item from the POST /api/sales body. */
type RawCartItem = Record<string, unknown>

/** Loosely-typed shape of the POST /api/sales request body. */
type RawSaleRequestBody = Record<string, unknown>

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
export function parseSaleInput(body: unknown): ParseResult {
  const raw: RawSaleRequestBody =
    body && typeof body === "object" ? (body as RawSaleRequestBody) : {}
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
  } = raw

  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "items-required", status: 400 }
  }

  // Aggregate quantities per unique product (in case the same product
  // appears multiple times in the cart).
  const qtyByProduct = new Map<string, number>()
  const productIds: string[] = []
  for (const it of items as RawCartItem[]) {
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
      customerName: typeof customerName === "string" ? customerName.trim() || null : null,
      customerPhone: typeof customerPhone === "string" ? customerPhone.trim() || "" : "",
      customerAddress: typeof customerAddress === "string" ? customerAddress.trim() || null : null,
      items: (items as RawCartItem[]).map((it) => ({
        productId: String(it.productId),
        quantity: toNum(it.quantity),
        unitPrice: toNum(it.unitPrice),
      })),
      cartTax: toNum(taxRate),
      discount: Math.max(0, toNum(discount)),
      deliveryFee: Math.max(0, toNum(deliveryFee)),
      driverName: typeof driverName === "string" ? driverName.trim() || null : null,
      paymentMethod,
      warehouseId: typeof raw.warehouseId === "string" ? raw.warehouseId : null,
      productIds,
      qtyByProduct,
    },
  }
}
