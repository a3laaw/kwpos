"use client"

import * as React from "react"
import { toast } from "sonner"
import { signOut } from "next-auth/react"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Calculator,
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  X,
  CheckCircle2,
  Printer,
  Loader2,
  PackageX,
  Package,
  Receipt,
  LayoutGrid,
  Tag,
  UserCheck,
  UserPlus,
  Coffee,
  Apple,
  Smartphone,
  Sparkles,
  Home,
  Phone,
  ChevronRight,
  ChevronLeft,
  Truck,
  Pause,
  Play,
  History,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useProducts, useCreateSale, useCategories, useSuspendedSales, useParkSale, useResumeSuspendedSale, useDiscardSuspendedSale, useFetchSuspendedSale, useActivePromotions } from "@/hooks/use-api"
import { useFmt } from "@/components/currency-context"
import { printThermalReceipt } from "@/lib/print"
import type { Product, Sale, CustomerTier } from "@/lib/types"
import { effectivePrice } from "@/lib/types"
import { computeEffectivePrice, promotionAppliesTo } from "@/lib/pricing"
import { cn } from "@/lib/utils"
import { SaleConfirmDialog, type SaleConfirmSummary } from "@/components/sales/sale-confirm-dialog"
import { useT } from "@/components/i18n-context"

interface CartItem {
  product: Product
  quantity: number
}

/** Icon mapping for known category names (falls back to Tag). */
const CATEGORY_ICONS: Record<string, any> = {
  "مواد غذائية": Apple,
  "مشروبات": Coffee,
  "منظفات": Sparkles,
  "إلكترونيات": Smartphone,
  "قرطاسية": Tag,
  "أدوات منزلية": Home,
}

export function SalesView() {
  const fmt = useFmt()
  const t = useT()
  const PAYMENT_LABELS: Record<string, string> = {
    CASH: t.cash,
    CARD: t.card,
    TRANSFER: t.transfer,
  }
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

  // ── Delivery service ──
  const [deliveryEnabled, setDeliveryEnabled] = React.useState(false)
  const [driverName, setDriverName] = React.useState("")
  const [deliveryFee, setDeliveryFee] = React.useState("")

  // ── Sale confirmation dialog ──
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  // ── Multi-tier pricing ──
  // The active customer tier. Defaults to RETAIL. When a CRM customer is found
  // by phone, their type is used automatically; the cashier can also override
  // manually via the tier selector. Prices in the cart follow this tier.
  const [tierOverride, setTierOverride] = React.useState<CustomerTier | "">("")
  const customerTier: CustomerTier =
    tierOverride || customerFound?.type || "RETAIL"

  // ── Active promotions (preloaded once for the whole POS screen) ──
  // We use the lightweight `useActivePromotions` hook (which filters the
  // cached promotions list to those whose [startAt, endAt] window contains
  // "now") so we never issue a per-product network call. The effective price
  // for each cart line is computed locally via `computeEffectivePrice`, which
  // now considers promotion SCOPE (PRODUCT | CATEGORY | ALL | ALL_EXCEPT).
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
      // Resolve each snapshot item back to a live product (to get current stock + price fields).
      // If the product no longer exists, skip it.
      Promise.all(
        snap.items.map((s) =>
          fetch(`/api/products?q=${encodeURIComponent(s.barcode || s.name)}`)
            .then((r) => r.json())
            .then((d: any) => (d.items as any[])?.find((p) => p.id === s.productId) || null)
            .catch(() => null)
        )
      ).then((products) => {
        const newCart: CartItem[] = []
        products.forEach((p, i) => {
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
        // Mark as resumed in the backend
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

  // ── Cart pagination ──
  // Show a fixed number of items per "page" in the cart. Auto-advance to the
  // next page when a new item is added beyond the current page's capacity.
  // Manual "previous" button lets the cashier review earlier items.
  const ITEMS_PER_CART_PAGE = 5
  const [cartPage, setCartPage] = React.useState(0)
  const cartTotalPages = Math.max(1, Math.ceil(cart.length / ITEMS_PER_CART_PAGE))

  // Clamp cartPage when cart shrinks (e.g. after remove/clear)
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
  // When the cashier types a phone number, search the CRM. If found, auto-fill
  // the name to prevent duplicates. If not found, mark as "new customer".
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
          setCustomerFound(null) // new customer — will be auto-registered on checkout
        }
      })
      .catch(() => setCustomerFound(null))
    return () => { cancelled = true }
  }, [debouncedPhone])

  // Quantity already in cart per product (for optimistic availability)
  const inCart = React.useMemo(() => {
    const m = new Map<string, number>()
    for (const it of cart) m.set(it.product.id, (m.get(it.product.id) || 0) + it.quantity)
    return m
  }, [cart])

  function addToCart(p: Product) {
    // Zero-stock prevention — forbid selling any product whose effective
    // on-hand quantity is zero, to protect cost accounts + inventory.
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
      // New item — auto-advance to the page it will appear on
      const newIndex = cart.length // index of the new item
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

  // Sale confirmation summary shown in the warning dialog before committing.
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

  // Clicking "إتمام البيع" does NOT execute the sale directly — it opens the
  // confirmation dialog. The actual sale runs in doConfirmSale() only after
  // the cashier explicitly presses "نعم، إتمام" (or Ctrl+Enter).
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
    } catch (err: any) {
      // Stale session (e.g. after re-seed) — auto-logout so user can re-login.
      if (err?.message === "session-expired") {
        toast.error(t.sessionExpired, {
          description: t.pleaseRelogin,
        })
        setTimeout(() => {
          signOut({ redirect: false }).then(() => window.location.reload())
        }, 1500)
        return
      }
      // Handle stock-insufficient errors specifically
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

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.posTitle}
        description={t.posDesc}
        icon={<Calculator className="h-5 w-5" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Product picker */}
        <div className="lg:col-span-3 space-y-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.searchNameBarcodePlaceholder}
              className="pr-9 h-11 text-base"
              autoFocus
            />
          </div>

          {/* Category filter cards */}
          {categories.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
              <button
                onClick={() => setCategoryId("")}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all border",
                  !categoryId
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card border-border/70 hover:border-primary/40 text-foreground"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
                {t.all}
              </button>
              {categories.map((c) => {
                const active = categoryId === c.id
                const Icon = CATEGORY_ICONS[c.name] || Tag
                return (
                  <button
                    key={c.id}
                    onClick={() => setCategoryId(active ? "" : c.id)}
                    className={cn(
                      "shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all border",
                      active
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card border-border/70 hover:border-primary/40 text-foreground"
                    )}
                  >
                    {c.imageUrl ? (
                      <img src={c.imageUrl} alt="" className="h-4 w-4 rounded object-cover" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                    {c.name}
                  </button>
                )
              })}
            </div>
          ) : null}

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 rounded-xl bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
              <PackageX className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="mt-2 font-medium">{t.noMatchingProducts}</p>
              <p className="text-sm text-muted-foreground">{t.tryAnotherKeyword}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {products.map((p) => {
                const used = inCart.get(p.id) || 0
                const available = p.quantity - used
                const out = available <= 0
                const promo = hasActivePromo(p)
                const baseP = basePriceFor(p)
                const effP = priceFor(p)
                const promoActive = promo && effP < baseP
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={out}
                    className={cn(
                      "group relative flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card transition-all hover:border-primary/50 hover:shadow-md",
                      out && "opacity-50 cursor-not-allowed hover:border-border",
                      promoActive && "ring-1 ring-emerald-400/60"
                    )}
                  >
                    {/* Product image */}
                    <div className="relative h-24 w-full bg-muted/40 overflow-hidden">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                      )}
                      {out ? (
                        <span className="absolute inset-0 flex items-center justify-center bg-background/70 text-xs font-bold text-destructive">{t.outOfStockShort}</span>
                      ) : null}
                      {promoActive ? (
                        <span className="absolute top-1 right-1 inline-flex items-center gap-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 shadow">
                          <Tag className="h-2.5 w-2.5" />
                          {t.promo}
                        </span>
                      ) : null}
                    </div>
                    {/* Info */}
                    <div className="p-2.5 text-right flex-1 flex flex-col gap-1">
                      <p className="font-medium text-sm leading-snug line-clamp-2">{p.name}</p>
                      <div className="flex items-center justify-between gap-1 mt-auto">
                        <span className="flex flex-col items-start leading-none">
                          {promoActive ? (
                            <span className="text-[10px] text-muted-foreground line-through tabular-nums">
                              {fmt.currency(baseP)}
                            </span>
                          ) : null}
                          <span className="font-bold tabular-nums text-sm text-primary">
                            {fmt.currency(effP)}
                          </span>
                        </span>
                        {!out ? (
                          <Badge variant={available <= p.reorderLevel ? "secondary" : "outline"} className="tabular-nums text-[10px]">
                            {fmt.number(available)}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    {used > 0 ? (
                      <span className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow">
                        {used}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="lg:col-span-2">
          <Card className="lg:sticky lg:top-20 flex flex-col max-h-[calc(100vh-7rem)]">
            {/* Header: title + clear */}
            <CardHeader className="pb-2 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  {t.cart}
                  {itemCount > 0 ? (
                    <Badge className="tabular-nums">{itemCount}</Badge>
                  ) : null}
                </CardTitle>
                <div className="flex items-center gap-1">
                  {/* Parked sales dropdown */}
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setParkedListOpen((o) => !o)}
                      className="gap-1 text-muted-foreground h-7"
                      title={t.parkedInvoices}
                    >
                      <History className="h-3.5 w-3.5" />
                      {t.parked}
                      {parkedItems.length > 0 ? (
                        <Badge className="tabular-nums text-[9px] h-4 px-1">{parkedItems.length}</Badge>
                      ) : null}
                    </Button>
                    {parkedListOpen ? (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setParkedListOpen(false)} />
                        <div className="absolute end-0 mt-1 w-72 rounded-lg border border-border bg-popover shadow-lg z-20 max-h-80 overflow-y-auto scrollbar-thin">
                          <div className="px-3 py-2 border-b border-border/60 text-xs font-semibold text-muted-foreground">
                            {t.parkedInvoices} ({parkedItems.length})
                          </div>
                          {parkedItems.length === 0 ? (
                            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                              {t.noParkedInvoices}
                            </div>
                          ) : (
                            parkedItems.map((p) => (
                              <div key={p.id} className="px-3 py-2 border-b border-border/40 hover:bg-muted/40 flex items-center justify-between gap-2">
                                <button
                                  onClick={() => resumeParked(p.id)}
                                  className="flex-1 text-start min-w-0"
                                >
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[9px] font-mono">{p.holdNo}</Badge>
                                    <span className="text-xs font-medium truncate">{p.label || t.unnamed}</span>
                                  </div>
                                  <div className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                                    {t.itemsCountLabel.replace("{count}", String(p.itemCount))} · {fmt.currency(p.total)}
                                  </div>
                                </button>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-emerald-600 hover:text-emerald-700"
                                    onClick={() => resumeParked(p.id)}
                                    title={t.resume}
                                  >
                                    <Play className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive hover:text-destructive"
                                    onClick={() => discardParked(p.id, p.holdNo)}
                                    title={t.delete}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </>
                    ) : null}
                  </div>
                  {/* Park current cart */}
                  {cart.length > 0 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={parkCurrentCart}
                      disabled={parkMut.isPending}
                      className="gap-1 text-amber-600 hover:text-amber-700 h-7"
                      title={t.parkCurrentInvoice}
                    >
                      {parkMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />}
                      {t.park}
                    </Button>
                  ) : null}
                  {cart.length > 0 ? (
                    <Button variant="ghost" size="sm" onClick={() => { clearCart(); setCartPage(0) }} className="gap-1 text-muted-foreground h-7">
                      <X className="h-3.5 w-3.5" />
                      {t.clearCart}
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col min-h-0 p-0">
              {cart.length === 0 ? (
                /* Empty cart */
                <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 py-10 text-center text-muted-foreground">
                  <ShoppingCart className="h-10 w-10 opacity-40" />
                  <p className="text-sm">{t.cartEmpty}</p>
                  <p className="text-xs">{t.tapToAddProduct}</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* ── Customer info at the TOP ── */}
                  <div className="px-3 py-2 border-b border-border/60 bg-muted/20 space-y-2 shrink-0">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="cust" className="text-[10px] text-muted-foreground">{t.customer}</Label>
                        <Input
                          id="cust"
                          className="h-7 text-xs"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder={t.cashCustomer}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">{t.payment}</Label>
                        <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CASH">{t.cash}</SelectItem>
                            <SelectItem value="CARD">{t.card}</SelectItem>
                            <SelectItem value="TRANSFER">{t.transfer}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="cphone" className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Phone className="h-2.5 w-2.5" /> {t.phoneAuto}
                      </Label>
                      <Input
                        id="cphone"
                        dir="ltr"
                        className={cn(
                          "h-7 text-xs text-left",
                          customerFound && "border-[#5CDE9D] bg-[#5CDE9D]/5",
                          customerPhone.trim().length >= 4 && !customerFound && "border-amber-500"
                        )}
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="+965 5xxx xxxx"
                      />
                      {customerFound ? (
                        <p className="text-[9px] text-[#5CDE9D] flex items-center gap-0.5 mt-0.5">
                          <UserCheck className="h-2.5 w-2.5" />
                          {t.customerFoundPrefix} {customerFound.name}
                        </p>
                      ) : customerPhone.trim().length >= 4 ? (
                        <p className="text-[9px] text-amber-600 flex items-center gap-0.5 mt-0.5">
                          <UserPlus className="h-2.5 w-2.5" />
                          {t.newCustomerAutoInline}
                        </p>
                      ) : null}
                    </div>

                    {/* Tier selector — drives multi-tier pricing. Auto-set from
                        CRM customer type, but cashier can override. */}
                    <div className="flex items-center gap-1.5">
                      <Label className="text-[10px] text-muted-foreground whitespace-nowrap">{t.tierLabel}</Label>
                      <div className="flex gap-1 flex-1">
                        {(["RETAIL", "WHOLESALE", "CORPORATE"] as CustomerTier[]).map((tier) => (
                          <button
                            key={tier}
                            type="button"
                            onClick={() => setTierOverride(tier)}
                            className={cn(
                              "flex-1 text-[10px] font-medium rounded px-1.5 py-1 transition-colors border",
                              customerTier === tier
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card border-border/60 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {tier === "RETAIL" ? t.tierRetail : tier === "WHOLESALE" ? t.tierWholesale : t.tierCorporate}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── Paginated cart items ── */}
                  <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2 min-h-0">
                    <div className="space-y-1.5">
                      {cartPageItems.map((it) => {
                        const promoActive = hasActivePromo(it.product) && priceFor(it.product) < basePriceFor(it.product)
                        return (
                        <div
                          key={it.product.id}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border border-border/60 bg-card p-2",
                            promoActive && "border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/15"
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate flex items-center gap-1">
                              {it.product.name}
                              {promoActive ? (
                                <Badge variant="outline" className="text-[8px] py-0 px-1 bg-emerald-500/10 text-emerald-700 border-emerald-300">
                                  {t.promo}
                                </Badge>
                              ) : null}
                            </p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {promoActive ? (
                                <>
                                  <span className="line-through opacity-70">{fmt.currency(basePriceFor(it.product))}</span>
                                  {" → "}
                                  <span className="font-semibold text-emerald-600">{fmt.currency(priceFor(it.product))}</span>
                                  {" × "}
                                  {it.quantity}
                                </>
                              ) : (
                                <>{fmt.currency(priceFor(it.product))} × {it.quantity}</>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => changeQty(it.product.id, -1)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              dir="ltr"
                              className="h-7 w-10 text-center px-0 tabular-nums"
                              value={it.quantity}
                              onChange={(e) => {
                                const v = parseInt(e.target.value, 10)
                                if (!isNaN(v)) setQty(it.product.id, v)
                              }}
                            />
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => changeQty(it.product.id, 1)} disabled={it.quantity >= it.product.quantity}>
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeItem(it.product.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* ── Cart pagination controls ── */}
                  {cartTotalPages > 1 ? (
                    <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-t border-border/40 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={cartPage <= 0}
                        onClick={() => setCartPage((p) => Math.max(0, p - 1))}
                        className="h-7 gap-1 text-xs"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                        {t.previous}
                      </Button>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {t.cartPageLabel
                          .replace("{x}", fmt.number(cartPage + 1))
                          .replace("{y}", fmt.number(cartTotalPages))
                          .replace("{count}", fmt.number(cart.length))}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={cartPage >= cartTotalPages - 1}
                        onClick={() => setCartPage((p) => Math.min(cartTotalPages - 1, p + 1))}
                        className="h-7 gap-1 text-xs"
                      >
                        {t.next}
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : null}

                  {/* ── Summary + checkout (bottom) ── */}
                  <div className="border-t border-border/60 p-3 space-y-2 shrink-0">
                    {/* Delivery service toggle + inputs */}
                    <div className="rounded-lg border border-border/70 p-2 space-y-2">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="flex items-center gap-1.5 text-xs font-medium">
                          <Truck className="h-3.5 w-3.5 text-sky-600" />
                          {t.deliveryRequest}
                        </span>
                        <input
                          type="checkbox"
                          checked={deliveryEnabled}
                          onChange={(e) => setDeliveryEnabled(e.target.checked)}
                          className="h-4 w-4 accent-primary cursor-pointer"
                        />
                      </label>
                      {deliveryEnabled ? (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <Label className="text-[10px] text-muted-foreground">{t.driverName}</Label>
                            <Input
                              type="text"
                              className="h-7 text-xs"
                              placeholder={t.driverNamePlaceholder}
                              value={driverName}
                              onChange={(e) => setDriverName(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">{t.deliveryFeeLabel} ({fmt.symbol})</Label>
                            <Input
                              type="number"
                              min={0}
                              step="0.250"
                              className="h-7 text-xs tabular-nums"
                              placeholder="0"
                              value={deliveryFee}
                              onChange={(e) => setDeliveryFee(e.target.value)}
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="disc" className="text-[10px] text-muted-foreground">{t.discount} ({fmt.symbol})</Label>
                        <Input id="disc" type="number" min={0} className="h-7 text-xs tabular-nums" value={discount} onChange={(e) => setDiscount(e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="tax" className="text-[10px] text-muted-foreground">{t.taxPercent}</Label>
                        <Input id="tax" type="number" min={0} className="h-7 text-xs tabular-nums" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-muted-foreground">
                        <span>{t.subtotal}</span>
                        <span className="tabular-nums">{fmt.currency(subtotal)}</span>
                      </div>
                      {discountVal > 0 ? (
                        <div className="flex justify-between text-rose-600">
                          <span>{t.discount}</span>
                          <span className="tabular-nums">- {fmt.currency(discountVal)}</span>
                        </div>
                      ) : null}
                      {taxVal > 0 ? (
                        <div className="flex justify-between text-muted-foreground">
                          <span>{t.tax} ({taxRate}%)</span>
                          <span className="tabular-nums">{fmt.currency(taxVal)}</span>
                        </div>
                      ) : null}
                      {deliveryFeeVal > 0 ? (
                        <div className="flex justify-between text-sky-600">
                          <span className="flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            {t.deliveryFeeLabel}{driverName.trim() ? ` · ${driverName.trim()}` : ""}
                          </span>
                          <span className="tabular-nums">+ {fmt.currency(deliveryFeeVal)}</span>
                        </div>
                      ) : null}
                      <div className="flex justify-between items-center pt-1 border-t border-border/60">
                        <span className="font-semibold text-sm">{t.total}</span>
                        <span className="text-lg font-bold tabular-nums text-primary">
                          {fmt.currency(total)}
                        </span>
                      </div>
                    </div>

                    <Button
                      className="w-full h-10 gap-2 text-sm"
                      onClick={handleCheckout}
                      disabled={createMut.isPending}
                    >
                      {createMut.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {t.posCheckoutWithTotal.replace("{total}", fmt.currency(total))}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Receipt dialog — sticky footer + scrollable body + no backdrop/escape close */}
      <Dialog open={!!lastSale} onOpenChange={(o) => !o && setLastSale(null)}>
        <DialogContent
          className="max-w-lg p-0 gap-0 flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b border-border/60">
            <DialogTitle className="flex items-center gap-2 justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              {t.saleCompleted}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t.receiptViewSummary}
            </DialogDescription>
          </DialogHeader>
          {lastSale ? (
            <>
              {/* Scrollable receipt body */}
              <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                      <Receipt className="h-8 w-8" />
                    </div>
                    <p className="mt-3 font-mono font-bold text-lg" dir="ltr">{lastSale.invoiceNo}</p>
                    <p className="text-xs text-muted-foreground">{fmt.dateTime(lastSale.createdAt)}</p>
                    {lastSale.customerPhone ? (
                      <p className="text-xs text-muted-foreground mt-1" dir="ltr">
                        {t.customerPhone}: {lastSale.customerPhone}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-lg border border-border/60 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="text-right p-2 font-medium">{t.receiptItemsHeader}</th>
                          <th className="text-center p-2 font-medium">{t.receiptQtyHeader}</th>
                          <th className="text-center p-2 font-medium">{t.receiptTotalHeader}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lastSale.items.map((it) => (
                          <tr key={it.id} className="border-t border-border/40">
                            <td className="p-2">{it.productName}</td>
                            <td className="p-2 text-center tabular-nums">{it.quantity}</td>
                            <td className="p-2 text-center tabular-nums">{fmt.currency(it.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>{t.subtotal}</span>
                      <span className="tabular-nums">{fmt.currency(lastSale.subtotal)}</span>
                    </div>
                    {lastSale.discount > 0 ? (
                      <div className="flex justify-between text-rose-600">
                        <span>{t.discount}</span>
                        <span className="tabular-nums">- {fmt.currency(lastSale.discount)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between text-muted-foreground">
                      <span>{t.tax} ({lastSale.taxRate}%)</span>
                      <span className="tabular-nums">{fmt.currency(lastSale.taxAmount)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center pt-1">
                      <span className="font-semibold">{t.totalPaid}</span>
                      <span className="text-xl font-bold tabular-nums text-primary">
                        {fmt.currency(lastSale.total)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      {t.receiptPaymentMethod} {PAYMENT_LABELS[lastSale.paymentMethod]}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sticky footer — buttons always visible */}
              <div className="shrink-0 border-t border-border/60 bg-background px-6 py-4">
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => printThermalReceipt(lastSale)}>
                    <Printer className="h-4 w-4" />
                    {t.thermalPrint}
                  </Button>
                  <Button className="flex-1" onClick={() => setLastSale(null)}>
                    {t.newSale}
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Sale confirmation dialog — required before committing any sale.
          Blocks Enter (only Ctrl+Enter confirms), shows amount + payment +
          delivery summary, with green confirm + red cancel buttons. */}
      <SaleConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        summary={confirmSummary}
        loading={createMut.isPending}
        onConfirm={doConfirmSale}
        formatCurrency={(n) => fmt.currency(n)}
        paymentLabel={(m) => PAYMENT_LABELS[m] || m}
      />
    </div>
  )
}
