"use client"

import * as React from "react"
import { signOut } from "next-auth/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
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
  Tag,
  Truck,
  Zap,
  LogOut,
  ChevronDown,
  ChevronUp,
  Wallet,
  CreditCard,
  Settings2,
} from "lucide-react"
import { useFmt } from "@/components/currency-context"
import { printThermalReceipt } from "@/lib/print"
import type { Product } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useT } from "@/components/i18n-context"
import type { SessionUser } from "@/components/user-context"
import { usePOS } from "@/hooks/use-pos"
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner"
import { openCashDrawer } from "@/lib/cash-drawer"
import { SaleConfirmDialog } from "@/components/sales/sale-confirm-dialog"

export interface ExpressPosViewProps {
  user: SessionUser
  onToggleMode: () => void // switch to Standard Mode
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return "؟"
  if (parts.length === 1) return parts[0].slice(0, 2)
  return (parts[0][0] || "") + (parts[1][0] || "")
}

export function ExpressPosView({ user, onToggleMode }: ExpressPosViewProps) {
  const fmt = useFmt()
  const t = useT()
  // Express Mode = always RETAIL tier (no tier selector UI).
  const pos = usePOS({ forceRetailTier: true })
  const {
    q, setQ,
    cart,
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
    confirmOpen, setConfirmOpen,
    products,
    isLoading,
    inCart,
    subtotal,
    discountVal,
    deliveryFeeVal,
    taxVal,
    total,
    itemCount,
    confirmSummary,
    priceFor,
    basePriceFor,
    hasActivePromo,
    addToCart,
    changeQty,
    removeItem,
    clearCart,
    handleCheckout,
    doConfirmSale,
    createMut,
    PAYMENT_LABELS,
  } = pos

  // ── Barcode input ref + always-focused behavior ──
  // The barcode input must be focused on mount and refocused after every
  // relevant action (sale completed, product added, escape pressed).
  // It captures scanner input without requiring a click — the input is
  // always focused unless the user is actively interacting with another
  // field (customer phone, discount, etc.).
  const barcodeRef = React.useRef<HTMLInputElement>(null)
  const focusBarcode = React.useCallback(() => {
    // Defer to next tick so the DOM has time to settle (e.g. after a Dialog
    // closes or a state update re-renders the input).
    requestAnimationFrame(() => {
      const el = barcodeRef.current
      if (!el) return
      // Don't steal focus if the user is typing in another input or a dialog
      // is open.
      const active = document.activeElement as HTMLElement | null
      if (!active) return // no active element — safe to focus

      // Don't steal focus if a dialog/combobox is open
      const inDialog = active.closest('[role="dialog"]') || active.closest('[role="combobox"]')
      if (inDialog) return

      // Don't steal focus if the user is interacting with ANY interactive element
      // (inputs, buttons, selects, textareas, links, [role=button], collapsible triggers)
      if (
        active !== el &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.tagName === "SELECT" ||
          active.tagName === "BUTTON" ||
          active.tagName === "A" ||
          active.getAttribute("role") === "button" ||
          active.closest("button") ||
          active.closest('[role="button"]') ||
          active.closest("[data-radix-collection-item]"))
      ) {
        return
      }
      el.focus()
      // Place cursor at end so a fresh scan replaces the value cleanly.
      const len = el.value.length
      try {
        el.setSelectionRange(len, len)
      } catch {
        // some input types don't support setSelectionRange
      }
    })
  }, [])

  // Focus on mount.
  React.useEffect(() => {
    focusBarcode()
  }, [focusBarcode])

  // Refocus when lastSale changes back to null (after sale dismissed).
  React.useEffect(() => {
    if (!lastSale) {
      focusBarcode()
    }
  }, [lastSale, focusBarcode])

  // Refocus after a product is added (cart length increases) — ONLY if
  // the barcode input is already focused (don't steal focus from cart
  // qty controls or other elements the user might be interacting with).
  const prevCartLen = React.useRef(cart.length)
  React.useEffect(() => {
    if (cart.length > prevCartLen.current) {
      // Only refocus if the barcode input itself was focused (i.e. the
      // user added via barcode scan, not by tapping a product card).
      const active = document.activeElement
      if (active === barcodeRef.current) {
        focusBarcode()
      }
    }
    prevCartLen.current = cart.length
  }, [cart.length, focusBarcode])

  // Refocus when the confirm dialog closes.
  React.useEffect(() => {
    if (!confirmOpen) {
      focusBarcode()
    }
  }, [confirmOpen, focusBarcode])

  // Global keydown: refocus barcode input when the user presses Escape
  // anywhere (clears cart with confirm if items exist).
  // The barcode input's own onKeyDown handles the in-input case.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Only handle if the barcode input is the active element OR no input is focused.
      const active = document.activeElement as HTMLElement | null
      const inDialog = active?.closest('[role="dialog"]') || active?.closest('[role="combobox"]')
      if (inDialog) return
      // F2 → checkout (works even when barcode input isn't focused)
      if (e.key === "F2") {
        e.preventDefault()
        handleCheckout()
        return
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [handleCheckout])

  // ── Barcode Enter handler ──
  // Try exact barcode match against the loaded products first; if not found,
  // fetch by barcode and add if exact match exists. Otherwise, leave the
  // value as the search filter (the products list re-filters via debouncedQ).
  async function handleBarcodeEnter() {
    const code = q.trim()
    if (!code) return
    // Exact match from already-loaded products.
    const local = products.find((p) => p.barcode && p.barcode === code)
    if (local) {
      addToCart(local)
      setQ("")
      return
    }
    // Fetch by barcode (covers the case where the debounce hasn't fired yet).
    try {
      const res = await fetch(`/api/products?q=${encodeURIComponent(code)}`)
      if (!res.ok) return
      const data = await res.json()
      const match = (data.items as any[])?.find((p) => p.barcode && p.barcode === code)
      if (match) {
        addToCart(match as Product)
        setQ("")
      }
      // else: leave the value as a search filter — products re-filter via debouncedQ.
    } catch {
      // ignore network errors
    }
  }

  // ── Global barcode scanner hook ──
  // Detects USB HID barcode scanner input even when the barcode input
  // is NOT focused (e.g. user just finished a sale). Adds the product
  // to cart by exact barcode match.
  useBarcodeScanner(async (barcode) => {
    // Exact match from loaded products
    const local = products.find((p) => p.barcode && p.barcode === barcode)
    if (local) {
      addToCart(local)
      toast.success(t.productAdded || "تمت الإضافة", { description: local.name })
      return
    }
    // Fetch by barcode
    try {
      const res = await fetch(`/api/products?q=${encodeURIComponent(barcode)}`)
      if (!res.ok) return
      const data = await res.json()
      const match = (data.items as any[])?.find((p) => p.barcode && p.barcode === barcode)
      if (match) {
        addToCart(match as Product)
        toast.success(t.productAdded || "تمت الإضافة", { description: (match as Product).name })
      } else {
        toast.error(t.productNotFound || "لم يُعثر على المنتج", { description: barcode })
      }
    } catch {
      // ignore
    }
  }, !confirmOpen) // disabled when checkout dialog is open

  function handleBarcodeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        // Ctrl/Cmd+Enter → open checkout
        handleCheckout()
      } else {
        // Enter → add by barcode or filter
        handleBarcodeEnter()
      }
    } else if (e.key === "F2") {
      e.preventDefault()
      handleCheckout()
    } else if (e.key === "Escape") {
      e.preventDefault()
      if (cart.length > 0) {
        if (window.confirm(t.expressClearCartConfirm)) {
          clearCart()
          setQ("")
          focusBarcode()
        }
      } else {
        setQ("")
        focusBarcode()
      }
    }
  }

  // ── Express checkout: set payment method + open confirm dialog ──
  // The Cash / Card buttons set the payment method and open the same
  // SaleConfirmDialog used in Standard Mode. The user explicitly confirms
  // (or presses Ctrl+Enter) before doConfirmSale runs — same safety flow.
  function expressCheckout(method: "CASH" | "CARD") {
    if (cart.length === 0) {
      toast.error(t.cartEmpty)
      return
    }
    setPaymentMethod(method)
    setConfirmOpen(true)
  }

  // ── Store name (from localStorage `erp-store-info`) ──
  const [storeName, setStoreName] = React.useState<string>("")
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("erp-store-info")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed.name === "string" && parsed.name) {
          setStoreName(parsed.name)
        }
      }
    } catch {
      // ignore
    }
  }, [])

  const displayName = storeName || t.appName

  async function handleLogout() {
    await signOut({ redirect: false })
    toast.success(t.logout)
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Top toolbar ── */}
      <header className="shrink-0 border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex h-14 items-center gap-3 px-4">
          {/* Store name */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate leading-tight">{displayName}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{t.expressMode}</p>
            </div>
          </div>

          {/* Auto-print toggle (compact) */}
          <Button
            variant={autoPrint ? "default" : "outline"}
            size="sm"
            onClick={() => toggleAutoPrint(!autoPrint)}
            className="gap-1.5 h-8 hidden sm:inline-flex"
            title={t.posAutoPrint}
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="text-xs">{t.posAutoPrint}</span>
          </Button>

          {/* Open Cash Drawer */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => openCashDrawer()}
            className="gap-1.5 h-8"
            title="فتح درج النقدية"
          >
            <Wallet className="h-3.5 w-3.5" />
            <span className="text-xs hidden sm:inline">الدرج</span>
          </Button>

          {/* Standard Mode toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleMode}
            className="gap-1.5 h-8"
            title={t.standardMode}
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span className="text-xs hidden sm:inline">{t.standardMode}</span>
          </Button>

          {/* User avatar + logout */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full ring-2 ring-transparent hover:ring-primary/40 transition h-9">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{user.name}</span>
                  <span className="text-xs text-muted-foreground font-normal" dir="ltr">
                    {user.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 text-destructive focus:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                {t.expressLogout}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Barcode input — large, always focused */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Input
              ref={barcodeRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={handleBarcodeKeyDown}
              onBlur={() => {
                // Only refocus the barcode if the user didn't click into
                // another interactive element. Give a longer delay (150ms)
                // so click events on buttons/links have time to register.
                setTimeout(() => {
                  const active = document.activeElement as HTMLElement | null
                  if (!active || active === document.body) {
                    // Nothing focused — safe to refocus barcode
                    focusBarcode()
                    return
                  }
                  // Don't refocus if the user is interacting with anything
                  if (
                    active.tagName === "INPUT" ||
                    active.tagName === "TEXTAREA" ||
                    active.tagName === "SELECT" ||
                    active.tagName === "BUTTON" ||
                    active.tagName === "A" ||
                    active.closest('[role="dialog"]') ||
                    active.closest('[role="combobox"]') ||
                    active.closest("button") ||
                    active.closest('[role="button"]')
                  ) {
                    return
                  }
                  focusBarcode()
                }, 150)
              }}
              placeholder={t.expressBarcodePlaceholder}
              className="pr-11 h-14 text-lg font-medium"
              autoComplete="off"
              spellCheck={false}
              inputMode="text"
              aria-label={t.expressBarcodePlaceholder}
            />
            {q ? (
              <button
                onClick={() => { setQ(""); focusBarcode() }}
                className="absolute left-3 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground"
                title={t.clearCart}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 px-1 hidden sm:block">
            {t.expressBarcodeHint}
          </p>
        </div>
      </header>

      {/* ── Main: cart (side) + products grid ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 min-h-0">
        {/* Cart panel — desktop: side panel; mobile: below products */}
        <aside
          className="lg:col-span-5 xl:col-span-4 border-border/70 bg-card flex flex-col min-h-0 order-2 lg:order-1 border-t lg:border-t-0 lg:border-e"
        >
          {/* Cart header */}
          <div className="shrink-0 px-4 py-3 border-b border-border/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <ShoppingCart className="h-5 w-5 text-primary shrink-0" />
              <span className="font-semibold">{t.expressCartTitle}</span>
              {itemCount > 0 ? (
                <Badge className="tabular-nums">{itemCount}</Badge>
              ) : null}
            </div>
            {cart.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.confirm(t.expressClearCartConfirm)) {
                    clearCart()
                    focusBarcode()
                  }
                }}
                className="gap-1 text-muted-foreground hover:text-destructive h-8"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="text-xs">{t.expressClearCart}</span>
              </Button>
            ) : null}
          </div>

          {/* Cart items list (scrollable) */}
          <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 px-6 py-10 text-center text-muted-foreground">
                <ShoppingCart className="h-12 w-12 opacity-30" />
                <p className="text-sm">{t.cartEmpty}</p>
                <p className="text-xs">{t.tapToAddProduct}</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {cart.map((it) => {
                  const promoActive = hasActivePromo(it.product) && priceFor(it.product) < basePriceFor(it.product)
                  const lineTotal = priceFor(it.product) * it.quantity
                  const unitP = priceFor(it.product)
                  const baseP = basePriceFor(it.product)
                  return (
                    <div
                      key={it.product.id}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors",
                        promoActive && "bg-emerald-50/30 dark:bg-emerald-950/10"
                      )}
                    >
                      {/* Thumbnail (36×36) */}
                      <div className="h-9 w-9 shrink-0 rounded bg-muted/40 overflow-hidden flex items-center justify-center">
                        {it.product.imageUrl ? (
                          <img src={it.product.imageUrl} alt="" className="h-full w-full object-contain p-0.5" />
                        ) : (
                          <Package className="h-4 w-4 text-muted-foreground/40" />
                        )}
                      </div>

                      {/* Name + unit price */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate leading-tight" title={it.product.name}>
                          {it.product.name}
                          {promoActive ? (
                            <Badge variant="outline" className="text-[10px] py-0 px-1 ms-1 bg-emerald-500/10 text-emerald-700 border-emerald-300">
                              {t.promo}
                            </Badge>
                          ) : null}
                        </p>
                        <p className="text-[11px] text-muted-foreground tabular-nums leading-tight">
                          {promoActive && baseP !== unitP ? (
                            <span className="line-through me-1">{fmt.currency(baseP)}</span>
                          ) : null}
                          {fmt.currency(unitP)}
                          {it.quantity > 1 ? <span className="ms-1">× {it.quantity}</span> : null}
                        </p>
                      </div>

                      {/* Qty controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => changeQty(it.product.id, -1)}
                          title="-1"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-7 text-center text-sm font-bold tabular-nums">
                          {it.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => changeQty(it.product.id, 1)}
                          disabled={it.quantity >= it.product.quantity}
                          title="+1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Subtotal */}
                      <span className="w-20 text-end text-sm font-bold tabular-nums text-primary shrink-0">
                        {fmt.currency(lineTotal)}
                      </span>

                      {/* Remove */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeItem(it.product.id)}
                        title={t.delete}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Summary + checkout — sticky bottom of cart panel */}
          <div className="shrink-0 border-t border-border/60 p-3 space-y-2 bg-card">
            {/* More Options — collapsible */}
            <MoreOptions
              customerName={customerName}
              setCustomerName={setCustomerName}
              customerPhone={customerPhone}
              setCustomerPhone={setCustomerPhone}
              customerFound={customerFound}
              discount={discount}
              setDiscount={setDiscount}
              taxRate={taxRate}
              setTaxRate={setTaxRate}
              deliveryEnabled={deliveryEnabled}
              setDeliveryEnabled={setDeliveryEnabled}
              driverName={driverName}
              setDriverName={setDriverName}
              deliveryFee={deliveryFee}
              setDeliveryFee={setDeliveryFee}
              fmt={fmt}
            />

            {/* Totals */}
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
                <span className="text-2xl font-bold tabular-nums text-primary">
                  {fmt.currency(total)}
                </span>
              </div>
            </div>

            {/* Large checkout buttons — always visible */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                size="lg"
                onClick={() => expressCheckout("CASH")}
                disabled={cart.length === 0 || createMut.isPending}
                className="h-12 gap-2 text-base bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {createMut.isPending && paymentMethod === "CASH" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Wallet className="h-5 w-5" />
                )}
                {t.expressCash}
              </Button>
              <Button
                size="lg"
                onClick={() => expressCheckout("CARD")}
                disabled={cart.length === 0 || createMut.isPending}
                className="h-12 gap-2 text-base bg-sky-600 hover:bg-sky-700 text-white"
              >
                {createMut.isPending && paymentMethod === "CARD" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CreditCard className="h-5 w-5" />
                )}
                {t.expressCard}
              </Button>
            </div>
          </div>
        </aside>

        {/* Product grid */}
        <section className="lg:col-span-7 xl:col-span-8 flex flex-col min-h-0 order-1 lg:order-2 bg-background">
          <div className="flex-1 overflow-y-auto scrollbar-thin p-3 min-h-0">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-40 rounded-lg bg-muted/50 animate-pulse" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-center text-muted-foreground py-16">
                <PackageX className="h-12 w-12 opacity-40" />
                <p className="text-sm font-medium">{t.noMatchingProducts}</p>
                <p className="text-xs">{t.tryAnotherKeyword}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {products.map((p) => {
                  const used = inCart.get(p.id) || 0
                  const available = p.quantity - used
                  const out = available <= 0
                  const lowStock = !out && available <= p.reorderLevel
                  const promo = hasActivePromo(p)
                  const baseP = basePriceFor(p)
                  const effP = priceFor(p)
                  const promoActive = promo && effP < baseP
                  return (
                    <button
                      key={p.id}
                      onClick={() => { addToCart(p); focusBarcode() }}
                      disabled={out}
                      className={cn(
                        "group relative flex flex-col overflow-hidden rounded-lg border border-border/70 bg-card transition-all hover:border-primary/50 hover:shadow-md",
                        out && "opacity-50 cursor-not-allowed hover:border-border",
                        promoActive && "ring-1 ring-emerald-400/60"
                      )}
                    >
                      {/* Product image — larger than standard mode (h-28/h-32), object-contain */}
                      <div className="relative h-28 sm:h-32 w-full bg-muted/30 overflow-hidden flex items-center justify-center">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="h-full w-full object-contain group-hover:scale-105 transition-transform p-1.5" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package className="h-10 w-10 text-muted-foreground/30" />
                          </div>
                        )}
                        {out ? (
                          <span className="absolute inset-0 flex items-center justify-center bg-background/70 text-xs font-bold text-destructive">
                            {t.outOfStockShort}
                          </span>
                        ) : null}
                        {promoActive ? (
                          <span className="absolute top-1 end-1 inline-flex items-center gap-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5">
                            <Tag className="h-2.5 w-2.5" />
                            {t.promo}
                          </span>
                        ) : null}
                        {/* Low-stock badge — only if low/out */}
                        {lowStock ? (
                          <span className="absolute top-1 start-1 inline-flex items-center gap-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5">
                            {t.expressLowStock}: {fmt.number(available)}
                          </span>
                        ) : null}
                        {/* In-cart count badge */}
                        {used > 0 ? (
                          <span className="absolute -top-1.5 -end-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold shadow">
                            {used}
                          </span>
                        ) : null}
                      </div>
                      {/* Info */}
                      <div className="p-2 text-start flex-1 flex flex-col gap-0.5">
                        <p className="font-medium text-xs leading-tight line-clamp-2" title={p.name}>{p.name}</p>
                        <div className="flex items-end justify-between gap-0.5 mt-auto">
                          <span className="flex flex-col items-start leading-none">
                            {promoActive ? (
                              <span className="text-[10px] text-muted-foreground line-through tabular-nums">
                                {fmt.currency(baseP)}
                              </span>
                            ) : null}
                            <span className="font-bold tabular-nums text-base text-primary">
                              {fmt.currency(effP)}
                            </span>
                          </span>
                          {!out && !lowStock ? (
                            <Badge variant="outline" className="tabular-nums text-[10px] h-5 px-1.5">
                              {fmt.number(available)}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── Receipt dialog (same as Standard Mode) ── */}
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
              <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
                <div className="space-y-5">
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
                          <th className="text-start p-2 font-medium">{t.receiptItemsHeader}</th>
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

      {/* ── Sale confirmation dialog (same as Standard Mode) ── */}
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

/* ── More Options collapsible section ──
 * Customer phone, discount, tax, delivery, driver. Hidden by default to keep
 * the express view uncluttered; expanded on demand for non-rush sales. */
interface MoreOptionsProps {
  customerName: string
  setCustomerName: (v: string) => void
  customerPhone: string
  setCustomerPhone: (v: string) => void
  customerFound: { name: string; address: string; type?: import("@/lib/types").CustomerTier } | null
  discount: string
  setDiscount: (v: string) => void
  taxRate: string
  setTaxRate: (v: string) => void
  deliveryEnabled: boolean
  setDeliveryEnabled: (v: boolean) => void
  driverName: string
  setDriverName: (v: string) => void
  deliveryFee: string
  setDeliveryFee: (v: string) => void
  fmt: ReturnType<typeof useFmt>
}

function MoreOptions(props: MoreOptionsProps) {
  const t = useT()
  const [open, setOpen] = React.useState(false)
  const {
    customerName, setCustomerName,
    customerPhone, setCustomerPhone, customerFound,
    discount, setDiscount,
    taxRate, setTaxRate,
    deliveryEnabled, setDeliveryEnabled,
    driverName, setDriverName,
    deliveryFee, setDeliveryFee,
    fmt,
  } = props

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full gap-1.5 h-8 text-muted-foreground">
          <Settings2 className="h-3.5 w-3.5" />
          <span className="text-xs">{t.expressMoreOptions}</span>
          {open ? (
            <ChevronUp className="h-3.5 w-3.5 ms-auto" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 ms-auto" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">{t.expressCustomerName}</Label>
            <Input
              className="h-8 text-xs"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={t.cashCustomer}
              onFocus={(e) => e.target.select()}
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">{t.expressCustomerPhone}</Label>
            <Input
              dir="ltr"
              className={cn(
                "h-8 text-xs text-end",
                customerFound && "border-[#DFC196] bg-[#DFC196]/5",
                customerPhone.trim().length >= 4 && !customerFound && "border-amber-500"
              )}
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="+965 5xxx xxxx"
              onFocus={(e) => e.target.select()}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">{t.expressDiscount} ({fmt.symbol})</Label>
            <Input
              type="number"
              min={0}
              className="h-8 text-xs tabular-nums"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              onFocus={(e) => e.target.select()}
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">{t.expressTaxRate}</Label>
            <Input
              type="number"
              min={0}
              className="h-8 text-xs tabular-nums"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              onFocus={(e) => e.target.select()}
            />
          </div>
        </div>
        {/* Delivery */}
        <div className="rounded-md border border-border/70 p-2 space-y-2">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="flex items-center gap-1.5 text-xs font-medium">
              <Truck className="h-3.5 w-3.5 text-sky-600" />
              {t.expressDelivery}
            </span>
            <input
              type="checkbox"
              checked={deliveryEnabled}
              onChange={(e) => setDeliveryEnabled(e.target.checked)}
              className="h-4 w-4 accent-primary cursor-pointer"
            />
          </label>
          {deliveryEnabled ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">{t.expressDriverName}</Label>
                <Input
                  type="text"
                  className="h-8 text-xs"
                  placeholder={t.driverNamePlaceholder}
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">{t.expressDeliveryFee} ({fmt.symbol})</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.250"
                  className="h-8 text-xs tabular-nums"
                  placeholder="0"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  onFocus={(e) => e.target.select()}
                />
              </div>
            </div>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

