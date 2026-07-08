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
import { useFmt } from "@/components/currency-context"
import { useT } from "@/components/i18n-context"
import { printThermalReceipt } from "@/lib/print"
import type { Product, Sale, CustomerTier } from "@/lib/types"
import { effectivePrice } from "@/lib/types"
import { computeEffectivePrice, promotionAppliesTo } from "@/lib/pricing"
import type { SaleConfirmSummary } from "@/components/sales/sale-confirm-dialog"

export interface CartItem {
  product: Product
  quantity: number
}

export interface UsePOSOptions {
  /**
   * When true (Express Mode), the customer tier is forced to RETAIL
   * regardless of CRM lookup or tierOverride. Express Mode has no tier
   * selector UI, so we always charge retail price.
   */
  forceRetailTier?: boolean
}

/**
 * Shared POS business-logic hook.
 *
 * Owns all cart / pricing / checkout state and logic. Both the standard
 * SalesView and the ExpressPosView consume this hook so they share the
 * EXACT same business logic (stock validation, journal entries, receipt
 * printing, tax calculation, etc.). The two views are only different
 * PRESENTATIONS of the same logic.
 *
 * Behavior is identical to the previous inline implementation in
 * sales-view.tsx — this is a pure extraction, not a re-implementation.
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

  // ── Core cart + checkout state ──
  const [q, setQ] = React.useState("")
  const [categoryId, setCategoryId] = React.useState("")
  const [cart, setCart] = React.useState<CartItem[]>([])
  const [discount, setDiscount] = React.useState("0")
  const [taxRate, setTaxRate] = React.useState(String(fmt.taxRate))
  const [paymentMethod, setPaymentMethod] = React.useState<"CASH" | "CARD" | "TRANSFER">("CASH")
  const [customerName, setCustomerName] = React.useState("")
  const [customerPhone, setCustomerPhone] = React.useState("")
  const [customerFound, setCustomerFound] = React.useState<{ name: string; address: string; type?: CustomerTier } | null>(null)
  const [lastSale, setLastSale] = React.useState<Sale | null>(null)

  // ── Auto-print toggle (persisted in localStorage) ──
  const [autoPrint, setAutoPrint] = React.useState<boolean>(false)
  React.useEffect(() => {
    try {
      setAutoPrint(localStorage.getItem("posAutoPrint") === "true")
    } catch {
      setAutoPrint(false)
    }
  }, [])
  const toggleAutoPrint = React.useCallback((on: boolean) => {
    setAutoPrint(on)
    try {
      localStorage.setItem("posAutoPrint", on ? "true" : "false")
    } catch {
      // ignore localStorage failures (private mode, etc.)
    }
  }, [])

  // ── Delivery service ──
  const [deliveryEnabled, setDeliveryEnabled] = React.useState(false)
  const [driverName, setDriverName] = React.useState("")
  const [deliveryFee, setDeliveryFee] = React.useState("")

  // ── Sale confirmation dialog ──
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  // ── Multi-tier pricing ──
  const [tierOverride, setTierOverride] = React.useState<CustomerTier | "">("")
  const customerTier: CustomerTier = forceRetailTier
    ? "RETAIL"
    : tierOverride || customerFound?.type || "RETAIL"

  // ── Active promotions ──
  const { data: activePromosData } = useActivePromotions()
  const activePromos = activePromosData.items

  /** Effective unit price for a product under the current customer tier,
   *  applying any active promotion whose scope includes this product. */
  const priceFor = React.useCallback(
    (p: Product) => {
      if (activePromos.length === 0) {
        return effectivePrice(p, customerTier)
      }
      const ap = computeEffectivePrice(
        {
          id: p.id,
          categoryId: p.categoryId ?? null,
          salePrice: p.salePrice,
          wholesalePrice: p.wholesalePrice,
          corporatePrice: p.corporatePrice,
        },
        customerTier,
        activePromos.map((pr) => ({
          id: pr.id,
          productId: pr.productId,
          scope: pr.scope,
          categoryIds: pr.categoryIds,
          discountType: pr.discountType,
          discountValue: pr.discountValue,
          startAt: pr.startAt,
          endAt: pr.endAt,
          isActive: pr.isActive,
          note: pr.note,
        }))
      )
      return ap.effectivePrice
    },
    [customerTier, activePromos]
  )

  /** Base tier price (no promo) — used to show a struck-through original
   *  price next to the promo price on product cards / cart lines. */
  const basePriceFor = React.useCallback(
    (p: Product) => effectivePrice(p, customerTier),
    [customerTier]
  )

  /** Whether a product currently has an active promotion (drives the "عرض" badge). */
  const hasActivePromo = React.useCallback(
    (p: Product) =>
      activePromos.some(
        (pr) => pr.isActive && promotionAppliesTo(pr, p.id, p.categoryId ?? null)
      ) && priceFor(p) < basePriceFor(p),
    [activePromos, priceFor, basePriceFor]
  )

  // ── Suspended / parked sales ──
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

  const cartPageItems = cart.slice(
    cartPage * ITEMS_PER_CART_PAGE,
    (cartPage + 1) * ITEMS_PER_CART_PAGE
  )

  const debouncedQ = React.useDeferredValue(q)
  const { data, isLoading } = useProducts({ q: debouncedQ || undefined, categoryId: categoryId || undefined })
  const { data: categoriesData } = useCategories()
  const createMut = useCreateSale()

  const products = data?.items ?? []
  const categories = categoriesData?.items ?? []

  // ── Auto-lookup customer by phone (debounced) ──
  const debouncedPhone = React.useDeferredValue(customerPhone)
  React.useEffect(() => {
    const phone = debouncedPhone.trim()
    if (!phone || phone.length < 4) {
      setCustomerFound(null)
      return
    }
    let cancelled = false
    fetch(`/api/customers?q=${encodeURIComponent(phone)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const match = (data.items as any[])?.find((c) => c.phone === phone)
        if (match) {
          setCustomerFound({ name: match.name, address: match.address, type: (match.type as CustomerTier) || "RETAIL" })
          setCustomerName(match.name)
        } else {
          setCustomerFound(null)
        }
      })
      .catch(() => setCustomerFound(null))
    return () => { cancelled = true }
  }, [debouncedPhone])

  // When a parked sale is fetched for resume, restore its cart snapshot.
  React.useEffect(() => {
    if (!resumeData) return
    try {
      const snap = JSON.parse(resumeData.cartJson) as {
        items: { productId: string; name: string; barcode?: string | null; salePrice: number; wholesalePrice?: number; corporatePrice?: number; quantity: number; unit: string }[]
        customerName?: string
        customerPhone?: string
        discount?: string
        taxRate?: string
        paymentMethod?: "CASH" | "CARD" | "TRANSFER"
        deliveryEnabled?: boolean
        driverName?: string
        deliveryFee?: string
      }
      Promise.all(
        snap.items.map((s) =>
          fetch(`/api/products?q=${encodeURIComponent(s.barcode || s.name)}`)
            .then((r) => r.json())
            .then((d: any) => (d.items as any[])?.find((p) => p.id === s.productId) || null)
            .catch(() => null)
        )
      ).then((prods) => {
        const newCart: CartItem[] = []
        prods.forEach((p, i) => {
          if (!p) return
          const snapQty = snap.items[i].quantity
          newCart.push({ product: p as Product, quantity: Math.min(snapQty, (p as Product).quantity) })
        })
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
          description: t.posResumeSuccessDesc
            .replace("{count}", String(newCart.length))
            .replace("{total}", fmt.currency(Number(resumeData.total))),
        })
      })
    } catch {
      toast.error(t.posResumeFailedToast)
      setResumeId(null)
    }
  }, [resumeData])

  // Quantity already in cart per product (for optimistic availability)
  const inCart = React.useMemo(() => {
    const m = new Map<string, number>()
    for (const it of cart) m.set(it.product.id, (m.get(it.product.id) || 0) + it.quantity)
    return m
  }, [cart])

  function addToCart(p: Product) {
    if (p.quantity <= 0) {
      toast.error(t.posItemUnavailable, {
        description: t.posItemUnavailableDesc
          .replace("{name}", p.name)
          .replace("{qty}", fmt.number(p.quantity)),
      })
      return
    }
    const inCartQty = inCart.get(p.id) || 0
    if (inCartQty >= p.quantity) {
      toast.error(t.qtyUnavailable, {
        description: t.posQtyUnavailableDesc
          .replace("{name}", p.name)
          .replace("{qty}", fmt.number(p.quantity - inCartQty))
          .replace("{unit}", p.unit),
      })
      return
    }
    const existing = cart.find((it) => it.product.id === p.id)
    if (!existing) {
      const newIndex = cart.length
      const newPage = Math.floor(newIndex / ITEMS_PER_CART_PAGE)
      setCartPage(newPage)
    }
    setCart((c) => {
      const ex = c.find((it) => it.product.id === p.id)
      if (ex) {
        return c.map((it) =>
          it.product.id === p.id ? { ...it, quantity: it.quantity + 1 } : it
        )
      }
      return [...c, { product: p, quantity: 1 }]
    })
  }

  function changeQty(productId: string, delta: number) {
    setCart((c) =>
      c
        .map((it) => {
          if (it.product.id !== productId) return it
          const next = it.quantity + delta
          if (next > it.product.quantity) {
            toast.error(t.qtyExceedsStock)
            return it
          }
          return { ...it, quantity: next }
        })
        .filter((it) => it.quantity > 0)
    )
  }

  function setQty(productId: string, qty: number) {
    const p = cart.find((it) => it.product.id === productId)?.product
    if (!p) return
    if (qty > p.quantity) {
      toast.error(t.qtyExceedsStock)
      return
    }
    setCart((c) =>
      qty <= 0
        ? c.filter((it) => it.product.id !== productId)
        : c.map((it) => (it.product.id === productId ? { ...it, quantity: qty } : it))
    )
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

  const subtotal = cart.reduce((acc, it) => acc + priceFor(it.product) * it.quantity, 0)
  const discountVal = Math.max(0, Math.min(Number(discount) || 0, subtotal))
  const deliveryFeeVal = deliveryEnabled ? Math.max(0, Number(deliveryFee) || 0) : 0
  const afterDiscount = Math.max(0, subtotal - discountVal)
  const taxVal = +(afterDiscount * ((Number(taxRate) || 0) / 100)).toFixed(2)
  const total = +(afterDiscount + taxVal + deliveryFeeVal).toFixed(2)
  const itemCount = cart.reduce((a, b) => a + b.quantity, 0)

  const confirmSummary: SaleConfirmSummary | null = React.useMemo(
    () => ({
      itemCount,
      subtotal,
      discount: discountVal,
      taxAmount: taxVal,
      taxRate: Number(taxRate) || 0,
      deliveryFee: deliveryFeeVal,
      driverName: deliveryEnabled ? driverName.trim() || null : null,
      total,
      paymentMethod,
      customerName: customerName.trim() || null,
    }),
    [itemCount, subtotal, discountVal, taxVal, taxRate, deliveryFeeVal, deliveryEnabled, driverName, total, paymentMethod, customerName]
  )

  function parkCurrentCart() {
    if (cart.length === 0) {
      toast.error(t.posParkEmptyToast)
      return
    }
    const snapshot = {
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
      customerName,
      customerPhone,
      discount,
      taxRate,
      paymentMethod,
      deliveryEnabled,
      driverName,
      deliveryFee,
    }
    parkMut.mutate(
      {
        label: customerName.trim() || customerPhone.trim() || undefined,
        cartJson: JSON.stringify(snapshot),
        itemCount: itemCount,
        total,
      },
      {
        onSuccess: (res: any) => {
          toast.success(t.invoiceParked, {
            description: t.posInvoiceParkedDesc.replace("{holdNo}", res.holdNo),
          })
          clearCart()
        },
        onError: () => toast.error(t.parkFailed),
      }
    )
  }

  function resumeParked(id: string) {
    setParkedListOpen(false)
    if (cart.length > 0) {
      if (!confirm(t.posResumeCartReplaceConfirm)) {
        return
      }
    }
    setResumeId(id)
  }

  function discardParked(id: string, holdNo: string) {
    if (!confirm(t.posDeleteParkedConfirm.replace("{holdNo}", holdNo))) return
    discardMut.mutate(id, {
      onSuccess: () => toast.success(t.posParkedDeletedToast.replace("{holdNo}", holdNo)),
    })
  }

  function handleCheckout() {
    if (cart.length === 0) {
      toast.error(t.cartEmpty)
      return
    }
    setConfirmOpen(true)
  }

  async function doConfirmSale() {
    if (cart.length === 0) return
    try {
      const sale = await createMut.mutateAsync({
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        items: cart.map((it) => ({
          productId: it.product.id,
          quantity: it.quantity,
          unitPrice: priceFor(it.product),
        })),
        taxRate: Number(taxRate) || 0,
        discount: discountVal,
        paymentMethod,
        deliveryFee: deliveryFeeVal,
        driverName: deliveryEnabled ? driverName.trim() || undefined : undefined,
      })
      toast.success(t.saleCompleted, {
        description: `${t.invoiceNo}: ${sale.invoiceNo}`,
      })
      setLastSale(sale)
      clearCart()
      if (autoPrint) {
        setTimeout(() => {
          try {
            printThermalReceipt(sale)
          } catch {
            // ignore — user can still click the manual print button
          }
        }, 500)
      }
    } catch (err: any) {
      if (err?.message === "session-expired") {
        toast.error(t.sessionExpired, {
          description: t.pleaseRelogin,
        })
        setTimeout(() => {
          signOut({ redirect: false }).then(() => window.location.reload())
        }, 1500)
        return
      }
      if (err?.message?.startsWith("stock-insufficient")) {
        const parts = err.message.split(":")
        const name = parts[2] || t.product
        toast.error(t.stockInsufficient, {
          description: t.posStockInsufficientDesc.replace("{name}", name),
        })
      } else {
        toast.error(t.checkoutFailed, { description: err?.message })
      }
    } finally {
      setConfirmOpen(false)
    }
  }

  return {
    // i18n + format
    t,
    fmt,
    PAYMENT_LABELS,
    // state
    q, setQ,
    categoryId, setCategoryId,
    cart, setCart,
    discount, setDiscount,
    taxRate, setTaxRate,
    paymentMethod, setPaymentMethod,
    customerName, setCustomerName,
    customerPhone, setCustomerPhone,
    customerFound,
    lastSale, setLastSale,
    autoPrint, toggleAutoPrint,
    deliveryEnabled, setDeliveryEnabled,
    driverName, setDriverName,
    deliveryFee, setDeliveryFee,
    tierOverride, setTierOverride,
    customerTier,
    confirmOpen, setConfirmOpen,
    cartPage, setCartPage,
    parkedListOpen, setParkedListOpen,
    // data
    products, categories,
    isLoading,
    activePromos,
    parkedItems,
    createMut,
    parkMut,
    // derived
    inCart,
    cartPageItems,
    cartTotalPages,
    ITEMS_PER_CART_PAGE,
    subtotal,
    discountVal,
    deliveryFeeVal,
    afterDiscount,
    taxVal,
    total,
    itemCount,
    confirmSummary,
    // pricing helpers
    priceFor,
    basePriceFor,
    hasActivePromo,
    // cart mutations
    addToCart,
    changeQty,
    setQty,
    removeItem,
    clearCart,
    // parked sales
    parkCurrentCart,
    resumeParked,
    discardParked,
    // checkout
    handleCheckout,
    doConfirmSale,
  }
}

export type POSApi = ReturnType<typeof usePOS>
