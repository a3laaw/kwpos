/**
 * Pure helper functions for the POS hook.
 *
 * Extracted from usePOS (Extract Function — Fowler) to make the
 * cart snapshot/restoration and error handling testable without React.
 */

import type { CartItem } from "./use-pos"
import type { Product } from "@/lib/types"

/** The shape of a parked-sale cart snapshot (serialized to JSON). */
export interface CartSnapshot {
  items: Array<{
    productId: string
    name: string
    barcode?: string | null
    salePrice: number
    wholesalePrice?: number
    corporatePrice?: number
    quantity: number
    unit: string
  }>
  customerName?: string
  customerPhone?: string
  discount?: string
  taxRate?: string
  paymentMethod?: "CASH" | "CARD" | "TRANSFER"
  deliveryEnabled?: boolean
  driverName?: string
  deliveryFee?: string
}

/**
 * Build a serializable snapshot of the current cart + checkout state.
 * Used when parking a sale (to restore later).
 */
export function buildCartSnapshot(
  cart: CartItem[],
  checkout: {
    customerName: string
    customerPhone: string
    discount: string
    taxRate: string
    paymentMethod: "CASH" | "CARD" | "TRANSFER"
    deliveryEnabled: boolean
    driverName: string
    deliveryFee: string
  }
): CartSnapshot {
  return {
    items: cart.map((it) => ({
      productId: it.product.id,
      name: it.product.name,
      barcode: it.product.barcode,
      salePrice: it.product.salePrice,
      wholesalePrice: it.product.wholesalePrice,
      corporatePrice: it.product.corporatePrice,
      quantity: it.quantity,
      unit: it.product.unit,
    })),
    customerName: checkout.customerName,
    customerPhone: checkout.customerPhone,
    discount: checkout.discount,
    taxRate: checkout.taxRate,
    paymentMethod: checkout.paymentMethod,
    deliveryEnabled: checkout.deliveryEnabled,
    driverName: checkout.driverName,
    deliveryFee: checkout.deliveryFee,
  }
}

/**
 * Restore cart items from a snapshot by fetching fresh product data.
 * Returns the restored cart (quantities capped by current stock).
 *
 * Pure async function — no React state. The caller applies the result.
 */
export async function restoreCartItemsFromSnapshot(
  snapshot: CartSnapshot
): Promise<CartItem[]> {
  const prods = await Promise.all(
    snapshot.items.map((s) =>
      fetch(`/api/products?q=${encodeURIComponent(s.barcode || s.name)}`)
        .then((r) => r.json())
        .then((d: any) => (d.items as any[])?.find((p) => p.id === s.productId) || null)
        .catch(() => null)
    )
  )
  const newCart: CartItem[] = []
  prods.forEach((p, i) => {
    if (!p) return
    const snapQty = snapshot.items[i].quantity
    newCart.push({
      product: p as Product,
      quantity: Math.min(snapQty, (p as Product).quantity),
    })
  })
  return newCart
}

/**
 * Compute sale totals (subtotal, discount, tax, delivery, total, item count).
 * Pure function — no side effects, no React state.
 */
export function computePOSTotals(
  cart: CartItem[],
  priceFor: (p: Product) => number,
  discount: string,
  taxRate: string,
  deliveryEnabled: boolean,
  deliveryFee: string
) {
  const subtotal = cart.reduce((acc, it) => acc + priceFor(it.product) * it.quantity, 0)
  const discountVal = Math.max(0, Math.min(Number(discount) || 0, subtotal))
  const deliveryFeeVal = deliveryEnabled ? Math.max(0, Number(deliveryFee) || 0) : 0
  const afterDiscount = Math.max(0, subtotal - discountVal)
  const taxVal = +(afterDiscount * ((Number(taxRate) || 0) / 100)).toFixed(2)
  const total = +(afterDiscount + taxVal + deliveryFeeVal).toFixed(2)
  const itemCount = cart.reduce((a, b) => a + b.quantity, 0)
  return { subtotal, discountVal, deliveryFeeVal, afterDiscount, taxVal, total, itemCount }
}

/**
 * Sale error handler — Replace Conditional with Table (Fowler).
 *
 * Each error prefix maps to a handler function that shows the
 * appropriate toast. Unknown errors fall through to a generic handler.
 */
export interface SaleErrorHandlerActions {
  toast: typeof import("sonner").toast
  signOut: () => void
  reload: () => void
}

export type SaleErrorHandler = (
  err: any,
  t: Record<string, string>,
  actions: SaleErrorHandlerActions
) => boolean // true if handled, false if unknown

const ERROR_HANDLERS: Array<{
  match: (msg: string) => boolean
  handle: SaleErrorHandler
}> = [
  {
    match: (msg) => msg === "session-expired",
    handle: (err, t, actions) => {
      const sessionExpired = (t as any).sessionExpired || "انتهت الجلسة"
      const pleaseRelogin = (t as any).pleaseRelogin || "الرجاء إعادة تسجيل الدخول"
      actions.toast.error(sessionExpired, { description: pleaseRelogin })
      setTimeout(() => {
        actions.signOut()
        actions.reload()
      }, 1500)
      return true
    },
  },
  {
    match: (msg) => msg.startsWith("stock-insufficient"),
    handle: (err, t, actions) => {
      const parts = err.message.split(":")
      const name = parts[2] || t.product
      actions.toast.error(t.stockInsufficient, {
        description: (t as any).posStockInsufficientDesc?.replace("{name}", name) || name,
      })
      return true
    },
  },
  {
    match: (msg) => msg.startsWith("stock-frozen"),
    handle: (err, t, actions) => {
      const productName = err.message.split(":")[1] || "هذا الصنف"
      actions.toast.error("الصنف مجمّد للجرد", {
        description: `${productName} تحت الجرد حاليًا — لا يمكن بيعه حتى اعتماد الجرد`,
      })
      return true
    },
  },
]

/**
 * Handle a sale error using the registered error handlers.
 * Returns true if the error was handled, false otherwise.
 */
export function handleSaleError(
  err: any,
  t: Record<string, string>,
  actions: SaleErrorHandlerActions
): boolean {
  const msg = err?.message || ""
  for (const handler of ERROR_HANDLERS) {
    if (handler.match(msg) && handler.handle(err, t, actions)) {
      return true
    }
  }
  // Fallback: generic error
  actions.toast.error((t as any).checkoutFailed || "فشل إتمام البيع", { description: msg })
  return false
}
