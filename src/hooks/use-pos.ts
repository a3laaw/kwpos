"use client"

import * as React from "react"
import { toast } from "sonner"
import { signOut } from "next-auth/react"
import {
  useProducts,
  useCreateSale,
  useCategories,
  useSuspendedSales,
  useParkSale,
  useResumeSuspendedSale,
  useDiscardSuspendedSale,
  useFetchSuspendedSale,
  useActivePromotions,
} from "@/hooks/use-api"
import { useBundles } from "@/hooks/use-bundles"
import { useFmt } from "@/components/currency-context"
import { useT } from "@/components/i18n-context"
import { printThermalReceipt } from "@/lib/print"
import type { Product, Sale, CustomerTier } from "@/lib/types"
import type { SaleConfirmSummary } from "@/components/sales/sale-confirm-dialog"

import { usePricing } from "@/hooks/use-pricing"
import { useCustomerLookup } from "@/hooks/use-customer-lookup"
import {
  buildCartSnapshot,
  restoreCartItemsFromSnapshot,
  computePOSTotals,
  handleSaleError,
} from "@/hooks/pos-helpers"

export interface CartItem {
  product: Product
  quantity: number
}

export interface UsePOSOptions {
  forceRetailTier?: boolean
}

/**
 * Shared POS business-logic hook.
 *
 * Orchestrator only — pricing, customer lookup, totals, error handling,
 * and cart snapshot logic live in extracted hooks/functions:
 *   - usePricing          → priceFor, basePriceFor, hasActivePromo
 *   - useCustomerLookup   → debounced phone → customer auto-search
 *   - computePOSTotals    → pure totals computation
 *   - buildCartSnapshot   → pure snapshot builder
 *   - handleSaleError     → table-driven error handling
 *
 * This keeps the hook focused on state management + orchestration.
 */
export function usePOS(opts?: UsePOSOptions) {
  const fmt = useFmt()
  const t = useT()
  const forceRetailTier = opts?.forceRetailTier ?? false

  const PAYMENT_LABELS: Record<string, string> = {
    CASH: t.cash,
    CARD: t.card,
    TRANSFER: t.transfer,
  }

  // ── Core cart state ──
  const [q, setQ] = React.useState("")
  const [categoryId, setCategoryId] = React.useState("")
  const [cart, setCart] = React.useState<CartItem[]>([])
  const [discount, setDiscount] = React.useState("0")
  const [taxRate, setTaxRate] = React.useState("0")
  const [paymentMethod, setPaymentMethod] = React.useState<"CASH" | "CARD" | "TRANSFER">("CASH")
  const [customerName, setCustomerName] = React.useState("")
  const [customerPhone, setCustomerPhone] = React.useState("")
  const [customerAddress, setCustomerAddress] = React.useState("")
  const [lastSale, setLastSale] = React.useState<Sale | null>(null)

  // ── Auto-print (persisted) ──
  const [autoPrint, setAutoPrint] = React.useState(false)
  React.useEffect(() => {
    try { setAutoPrint(localStorage.getItem("posAutoPrint") === "true") } catch { setAutoPrint(false) }
  }, [])
  const toggleAutoPrint = React.useCallback((on: boolean) => {
    setAutoPrint(on)
    try { localStorage.setItem("posAutoPrint", on ? "true" : "false") } catch {}
  }, [])

  // ── Delivery ──
  const [deliveryEnabled, setDeliveryEnabled] = React.useState(false)
  const [driverName, setDriverName] = React.useState("")
  const [deliveryFee, setDeliveryFee] = React.useState("")

  // ── Confirm dialog ──
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  // ── Multi-tier pricing ──
  const [tierOverride, setTierOverride] = React.useState<CustomerTier | "">("")

  // ── Customer lookup (extracted hook) ──
  const { customerFound, setCustomerFound } = useCustomerLookup(customerPhone)

  const customerTier: CustomerTier = forceRetailTier
    ? "RETAIL"
    : tierOverride || customerFound?.type || "RETAIL"

  // Sync customer name from lookup
  React.useEffect(() => {
    if (customerFound && !customerName) setCustomerName(customerFound.name)
  }, [customerFound])

  // ── Active promotions ──
  const { data: activePromosData } = useActivePromotions()
  const activePromos = activePromosData.items

  // ── Pricing (extracted hook) ──
  const { priceFor, basePriceFor, hasActivePromo } = usePricing(customerTier, activePromos)

  // ── Data fetching ──
  const debouncedQ = React.useDeferredValue(q)
  const { data, isLoading } = useProducts({ q: debouncedQ || undefined, categoryId: categoryId || undefined })
  const { data: categoriesData } = useCategories()
  const createMut = useCreateSale()
  const { data: bundlesData } = useBundles(undefined, true)

  const products = data?.items ?? []
  const categories = categoriesData?.items ?? []
  const bundles = bundlesData?.items ?? []

  // ── Parked sales ──
  const { data: parkedData } = useSuspendedSales()
  const parkMut = useParkSale()
  const resumeMut = useResumeSuspendedSale()
  const discardMut = useDiscardSuspendedSale()
  const [parkedListOpen, setParkedListOpen] = React.useState(false)
  const [resumeId, setResumeId] = React.useState<string | null>(null)
  const { data: resumeData } = useFetchSuspendedSale(resumeId)
  const parkedItems = parkedData?.items ?? []

  // ── Cart pagination ──
  const ITEMS_PER_CART_PAGE = 10
  const [cartPage, setCartPage] = React.useState(0)
  const cartTotalPages = Math.max(1, Math.ceil(cart.length / ITEMS_PER_CART_PAGE))
  React.useEffect(() => {
    if (cartPage >= cartTotalPages) setCartPage(Math.max(0, cartTotalPages - 1))
  }, [cartTotalPages, cartPage])
  const cartPageItems = cart.slice(cartPage * ITEMS_PER_CART_PAGE, (cartPage + 1) * ITEMS_PER_CART_PAGE)

  // Quantity in cart per product
  const inCart = React.useMemo(() => {
    const m = new Map<string, number>()
    for (const it of cart) m.set(it.product.id, (m.get(it.product.id) || 0) + it.quantity)
    return m
  }, [cart])

  // ── Restore parked sale (simplified using extracted function) ──
  React.useEffect(() => {
    if (!resumeData) return
    try {
      const snap = JSON.parse(resumeData.cartJson)
      restoreCartItemsFromSnapshot(snap).then((newCart) => {
        setCart(newCart)
        setCustomerName(snap.customerName || "")
        setCustomerPhone(snap.customerPhone || "")
        setDiscount(snap.discount || "0")
        setTaxRate(snap.taxRate || String(fmt.taxRate))
        if (snap.paymentMethod) setPaymentMethod(snap.paymentMethod)
        setDeliveryEnabled(!!snap.deliveryEnabled)
        setDriverName(snap.driverName || "")
        setDeliveryFee(snap.deliveryFee || "")
        setCartPage(0)
        resumeMut.mutate(resumeData.id)
        setResumeId(null)
        toast.success(`${t.invoiceRestored} ${resumeData.holdNo}`, {
          description: (t as any).posResumeSuccessDesc
            ?.replace("{count}", String(newCart.length))
            .replace("{total}", fmt.currency(Number(resumeData.total))),
        })
      })
    } catch {
      toast.error((t as any).posResumeFailedToast || "فشل الاستئناف")
      setResumeId(null)
    }
  }, [resumeData])

  // ── Cart mutations ──
  function addBundleToCart(bundle: { id: string; name: string; salePrice: number; imageUrl?: string | null; items: Array<{ productId: string; quantity: number; product?: { name: string; quantity: number } }> }) {
    for (const item of bundle.items) {
      const product = products.find((p) => p.id === item.productId)
      if (product) {
        const available = product.quantity - (inCart.get(item.productId) || 0)
        if (available < item.quantity) {
          toast.error(t.qtyUnavailable || "الكمية غير متوفرة", {
            description: `${product.name}: ${available} متاح، الباقة تحتاج ${item.quantity}`,
          })
          return
        }
      }
    }
    const virtualProduct: Product = {
      id: `bundle-${bundle.id}`, name: `📦 ${bundle.name}`, barcode: null,
      quantity: 999, salePrice: bundle.salePrice, costPrice: 0,
      wholesalePrice: bundle.salePrice, corporatePrice: bundle.salePrice,
      taxRate: 0, unit: "باقة", imageUrl: bundle.imageUrl || null,
    } as Product
    setCart((c) => {
      const ex = c.find((it) => it.product.id === virtualProduct.id)
      if (ex) return c.map((it) => it.product.id === virtualProduct.id ? { ...it, quantity: it.quantity + 1 } : it)
      const newPage = Math.floor(c.length / ITEMS_PER_CART_PAGE)
      setCartPage(newPage)
      return [...c, { product: virtualProduct, quantity: 1 }]
    })
    toast.success(t.productAdded || "تمت الإضافة", { description: bundle.name })
  }

  function addToCart(p: Product) {
    if (p.quantity <= 0) {
      toast.error(t.posItemUnavailable, {
        description: (t as any).posItemUnavailableDesc?.replace("{name}", p.name).replace("{qty}", fmt.number(p.quantity)),
      })
      return
    }
    const inCartQty = inCart.get(p.id) || 0
    if (inCartQty >= p.quantity) {
      toast.error(t.qtyUnavailable, {
        description: (t as any).posQtyUnavailableDesc?.replace("{name}", p.name).replace("{qty}", fmt.number(p.quantity - inCartQty)).replace("{unit}", p.unit),
      })
      return
    }
    const existing = cart.find((it) => it.product.id === p.id)
    if (!existing) setCartPage(Math.floor(cart.length / ITEMS_PER_CART_PAGE))
    setCart((c) => {
      const ex = c.find((it) => it.product.id === p.id)
      if (ex) return c.map((it) => it.product.id === p.id ? { ...it, quantity: it.quantity + 1 } : it)
      return [...c, { product: p, quantity: 1 }]
    })
  }

  function changeQty(productId: string, delta: number) {
    setCart((c) => c.map((it) => {
      if (it.product.id !== productId) return it
      const next = it.quantity + delta
      if (next > it.product.quantity) { toast.error(t.qtyExceedsStock); return it }
      return { ...it, quantity: next }
    }).filter((it) => it.quantity > 0))
  }

  function setQty(productId: string, qty: number) {
    const p = cart.find((it) => it.product.id === productId)?.product
    if (!p) return
    if (qty > p.quantity) { toast.error(t.qtyExceedsStock); return }
    setCart((c) => qty <= 0
      ? c.filter((it) => it.product.id !== productId)
      : c.map((it) => it.product.id === productId ? { ...it, quantity: qty } : it))
  }

  function removeItem(productId: string) {
    setCart((c) => c.filter((it) => it.product.id !== productId))
  }

  function clearCart() {
    setCart([])
    setDiscount("0")
    setCustomerName("")
    setCustomerPhone("")
    setDeliveryEnabled(false)
    setDriverName("")
    setDeliveryFee("")
  }

  // ── Totals (extracted pure function) ──
  const totals = computePOSTotals(cart, priceFor, discount, taxRate, deliveryEnabled, deliveryFee)

  const confirmSummary: SaleConfirmSummary | null = React.useMemo(
    () => ({
      itemCount: totals.itemCount,
      subtotal: totals.subtotal,
      discount: totals.discountVal,
      taxAmount: totals.taxVal,
      taxRate: Number(taxRate) || 0,
      deliveryFee: totals.deliveryFeeVal,
      driverName: deliveryEnabled ? driverName.trim() || null : null,
      total: totals.total,
      paymentMethod,
      customerName: customerName.trim() || null,
    }),
    [totals, taxRate, deliveryEnabled, driverName, paymentMethod, customerName]
  )

  // ── Parked sales operations ──
  function parkCurrentCart() {
    if (cart.length === 0) { toast.error((t as any).posParkEmptyToast || "السلة فارغة"); return }
    const snapshot = buildCartSnapshot(cart, { customerName, customerPhone, discount, taxRate, paymentMethod, deliveryEnabled, driverName, deliveryFee })
    parkMut.mutate(
      { label: customerName.trim() || customerPhone.trim() || undefined, cartJson: JSON.stringify(snapshot), itemCount: totals.itemCount, total: totals.total },
      {
        onSuccess: (res: any) => {
          toast.success(t.invoiceParked, { description: (t as any).posInvoiceParkedDesc?.replace("{holdNo}", res.holdNo) })
          clearCart()
        },
        onError: () => toast.error((t as any).parkFailed || "فشل التعليق"),
      }
    )
  }

  function resumeParked(id: string) {
    setParkedListOpen(false)
    if (cart.length > 0 && !confirm((t as any).posResumeCartReplaceConfirm || "استبدال السلة الحالية؟")) return
    setResumeId(id)
  }

  function discardParked(id: string, holdNo: string) {
    if (!confirm((t as any).posDeleteParkedConfirm?.replace("{holdNo}", holdNo) || `حذف الفاتورة ${holdNo}؟`)) return
    discardMut.mutate(id, {
      onSuccess: () => toast.success((t as any).posParkedDeletedToast?.replace("{holdNo}", holdNo)),
    })
  }

  // ── Checkout ──
  function handleCheckout() {
    if (cart.length === 0) { toast.error(t.cartEmpty); return }
    if (!customerPhone.trim()) { toast.error((t as any).posPhoneRequired || "رقم الهاتف مطلوب"); return }
    if (deliveryEnabled && !customerAddress.trim()) { toast.error((t as any).posAddressRequired || "العنوان مطلوب للتوصيل"); return }
    setConfirmOpen(true)
  }

  async function doConfirmSale() {
    if (cart.length === 0) return
    try {
      const sale = await createMut.mutateAsync({
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        items: cart.map((it) => ({ productId: it.product.id, quantity: it.quantity, unitPrice: priceFor(it.product) })),
        taxRate: Number(taxRate) || 0,
        discount: totals.discountVal,
        paymentMethod,
        deliveryFee: totals.deliveryFeeVal,
        driverName: deliveryEnabled ? driverName.trim() || undefined : undefined,
      })
      toast.success(t.saleCompleted, { description: `${t.invoiceNo}: ${sale.invoiceNo}` })
      setLastSale(sale)
      clearCart()
      if (autoPrint) {
        setTimeout(() => { try { printThermalReceipt(sale) } catch {} }, 500)
      }
    } catch (err: any) {
      handleSaleError(err, t as any, {
        toast,
        signOut: () => signOut({ redirect: false }),
        reload: () => window.location.reload(),
      })
    } finally {
      setConfirmOpen(false)
    }
  }

  return {
    // i18n + format
    t, fmt, PAYMENT_LABELS,
    // state
    q, setQ, categoryId, setCategoryId, cart, setCart,
    discount, setDiscount, taxRate, setTaxRate,
    paymentMethod, setPaymentMethod,
    customerName, setCustomerName, customerPhone, setCustomerPhone,
    customerAddress, setCustomerAddress,
    customerFound, lastSale, setLastSale,
    autoPrint, toggleAutoPrint,
    deliveryEnabled, setDeliveryEnabled, driverName, setDriverName, deliveryFee, setDeliveryFee,
    tierOverride, setTierOverride, customerTier,
    confirmOpen, setConfirmOpen, cartPage, setCartPage, parkedListOpen, setParkedListOpen,
    // data
    products, categories, bundles, isLoading, activePromos, parkedItems, createMut, parkMut,
    // derived
    inCart, cartPageItems, cartTotalPages, ITEMS_PER_CART_PAGE,
    subtotal: totals.subtotal, discountVal: totals.discountVal,
    deliveryFeeVal: totals.deliveryFeeVal, afterDiscount: totals.afterDiscount,
    taxVal: totals.taxVal, total: totals.total, itemCount: totals.itemCount,
    confirmSummary,
    // pricing helpers
    priceFor, basePriceFor, hasActivePromo,
    // cart mutations
    addToCart, addBundleToCart, changeQty, setQty, removeItem, clearCart,
    // parked sales
    parkCurrentCart, resumeParked, discardParked,
    // checkout
    handleCheckout, doConfirmSale,
  }
}

export type POSApi = ReturnType<typeof usePOS>
