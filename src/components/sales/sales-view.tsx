"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  Zap,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useFmt } from "@/components/currency-context"
import { printThermalReceipt } from "@/lib/print"
import type { CustomerTier } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Toggle } from "@/components/ui/toggle"
import { SaleConfirmDialog } from "@/components/sales/sale-confirm-dialog"
import { useT } from "@/components/i18n-context"
import { useUser } from "@/components/user-context"
import { usePOS } from "@/hooks/use-pos"
import { ExpressPosView } from "@/components/sales/express-pos-view"

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
  const user = useUser()
  const router = useRouter()
  const t = useT()
  // Local mirror of the user's posExpressMode preference. The user-context
  // value is memoized without `posExpressMode` in its deps, so we keep a
  // local copy + toggle that calls the PATCH endpoint and `router.refresh()`
  // to re-read the session.
  const [expressMode, setExpressMode] = React.useState<boolean>(user.posExpressMode ?? false)

  async function toggleMode() {
    const next = !expressMode
    setExpressMode(next) // optimistic
    try {
      await fetch("/api/users/me/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posExpressMode: next }),
      })
      // Re-read the session so the server-rendered `user` prop reflects
      // the new preference on next navigation.
      router.refresh()
    } catch {
      setExpressMode(!next) // revert on failure
    }
  }

  if (expressMode) {
    return <ExpressPosView user={user} onToggleMode={toggleMode} />
  }

  return <StandardSalesView onToggleMode={toggleMode} />
}

function StandardSalesView({ onToggleMode }: { onToggleMode: () => void }) {
  const fmt = useFmt()
  const t = useT()
  const user = useUser()
  const pos = usePOS()
  // Only ADMIN/MANAGER can apply manual discounts in the cart.
  // SALES/CASHIER get discounts only from the pricing/promotions screen.
  const canDiscount = user.role === "ADMIN" || user.role === "MANAGER" || user.role === "OWNER"
  const {
    q, setQ,
    categoryId, setCategoryId,
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
    tierOverride, setTierOverride,
    customerTier,
    confirmOpen, setConfirmOpen,
    cartPage, setCartPage,
    parkedListOpen, setParkedListOpen,
    products, categories,
    isLoading,
    parkedItems,
    createMut,
    parkMut,
    inCart,
    cartPageItems,
    cartTotalPages,
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
    parkCurrentCart,
    resumeParked,
    discardParked,
    handleCheckout,
    doConfirmSale,
    PAYMENT_LABELS,
  } = pos

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.posTitle}
        description={t.posDesc}
        icon={<Calculator className="h-5 w-5" />}
        breadcrumbItems={[{ labelKey: "navSales" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleMode}
              className="gap-1.5"
              title={t.expressMode}
            >
              <Zap className="h-3.5 w-3.5" />
              <span className="text-xs">{t.expressMode}</span>
            </Button>
            <Toggle
              pressed={autoPrint}
              onPressedChange={(v) => toggleAutoPrint(v)}
              variant="outline"
              size="sm"
              aria-label={t.posAutoPrint}
              className="gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="text-xs">{t.posAutoPrint}</span>
            </Toggle>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Product picker */}
        <div className="lg:col-span-7 space-y-4">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-32 rounded-lg bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
              <PackageX className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="mt-2 font-medium">{t.noMatchingProducts}</p>
              <p className="text-sm text-muted-foreground">{t.tryAnotherKeyword}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
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
                      "group relative flex flex-col overflow-hidden rounded-lg border border-border/70 bg-card transition-all hover:border-primary/50 hover:shadow-sm",
                      out && "opacity-50 cursor-not-allowed hover:border-border",
                      promoActive && "ring-1 ring-emerald-400/60"
                    )}
                  >
                    {/* Product image — larger, no cropping */}
                    <div className="relative h-24 w-full bg-muted/40 overflow-hidden flex items-center justify-center">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="h-full w-full object-contain group-hover:scale-105 transition-transform p-1" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                      )}
                      {out ? (
                        <span className="absolute inset-0 flex items-center justify-center bg-background/70 text-[10px] font-bold text-destructive">{t.outOfStockShort}</span>
                      ) : null}
                      {promoActive ? (
                        <span className="absolute top-0.5 right-0.5 inline-flex items-center gap-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold px-1 py-0.5">
                          <Tag className="h-2 w-2" />
                          {t.promo}
                        </span>
                      ) : null}
                    </div>
                    {/* Info — compact single layout */}
                    <div className="p-1.5 text-start flex-1 flex flex-col gap-0.5">
                      <p className="font-medium text-xs leading-tight line-clamp-2" title={p.name}>{p.name}</p>
                      <div className="flex items-center justify-between gap-0.5 mt-auto">
                        <span className="flex flex-col items-start leading-none">
                          {promoActive ? (
                            <span className="text-[10px] text-muted-foreground line-through tabular-nums">
                              {fmt.currency(baseP)}
                            </span>
                          ) : null}
                          <span className="font-bold tabular-nums text-xs text-primary">
                            {fmt.currency(effP)}
                          </span>
                        </span>
                        {!out ? (
                          <Badge variant={available <= p.reorderLevel ? "secondary" : "outline"} className="tabular-nums text-[10px] h-4 px-1">
                            {fmt.number(available)}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    {used > 0 ? (
                      <span className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold shadow">
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
        <div className="lg:col-span-5">
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
                        <Badge className="tabular-nums text-[10px] h-4 px-1">{parkedItems.length}</Badge>
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
                                    <Badge variant="outline" className="text-[10px] font-mono">{p.holdNo}</Badge>
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
                          "h-7 text-xs text-end",
                          customerFound && "border-[#DFC196] bg-[#DFC196]/5",
                          customerPhone.trim().length >= 4 && !customerFound && "border-amber-500"
                        )}
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="+965 5xxx xxxx"
                      />
                      {customerFound ? (
                        <p className="text-[10px] text-[#DFC196] flex items-center gap-0.5 mt-0.5">
                          <UserCheck className="h-2.5 w-2.5" />
                          {t.customerFoundPrefix} {customerFound.name}
                        </p>
                      ) : customerPhone.trim().length >= 4 ? (
                        <p className="text-[10px] text-amber-600 flex items-center gap-0.5 mt-0.5">
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

                  {/* ── Dense cart items (no cards, single-row layout) ── */}
                  <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-1 min-h-0">
                    <div className="space-y-0">
                      {cartPageItems.map((it) => {
                        const promoActive = hasActivePromo(it.product) && priceFor(it.product) < basePriceFor(it.product)
                        const lineTotal = priceFor(it.product) * it.quantity
                        return (
                        <div
                          key={it.product.id}
                          className={cn(
                            "flex items-center gap-1.5 h-14 px-1 border-b border-border/30 hover:bg-muted/30 transition-colors group",
                            promoActive && "bg-emerald-50/30 dark:bg-emerald-950/10"
                          )}
                        >
                          {/* Delete — small icon */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeItem(it.product.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>

                          {/* Product thumbnail — small but visible */}
                          <div className="h-9 w-9 shrink-0 rounded bg-muted/40 overflow-hidden flex items-center justify-center">
                            {it.product.imageUrl ? (
                              <img src={it.product.imageUrl} alt="" className="h-full w-full object-contain p-0.5" />
                            ) : (
                              <Package className="h-4 w-4 text-muted-foreground/40" />
                            )}
                          </div>

                          {/* Name — truncate + tooltip */}
                          <p
                            className="flex-1 min-w-0 text-xs font-medium truncate"
                            title={it.product.name}
                          >
                            {it.product.name}
                            {promoActive ? (
                              <Badge variant="outline" className="text-[10px] py-0 px-1 ml-1 bg-emerald-500/10 text-emerald-700 border-emerald-300">
                                {t.promo}
                              </Badge>
                            ) : null}
                          </p>

                          {/* Qty controls — inline, minimal */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 hover:bg-primary/10"
                              onClick={() => changeQty(it.product.id, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center text-xs font-semibold tabular-nums">
                              {it.quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 hover:bg-primary/10"
                              onClick={() => changeQty(it.product.id, 1)}
                              disabled={it.quantity >= it.product.quantity}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* Line total — right aligned, bold */}
                          <span className="w-20 text-end text-xs font-bold tabular-nums text-primary shrink-0">
                            {fmt.currency(lineTotal)}
                          </span>
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

                    <div className="grid grid-cols-1 gap-2">
                      {canDiscount ? (
                        <div>
                          <Label htmlFor="disc" className="text-[10px] text-muted-foreground">{t.discount} ({fmt.symbol})</Label>
                          <Input id="disc" type="number" min={0} className="h-7 text-xs tabular-nums" value={discount} onChange={(e) => setDiscount(e.target.value)} />
                        </div>
                      ) : null}
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
                          <span>{t.tax}</span>
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

                    <Button
                      className="w-full h-9 gap-2 text-sm"
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
                      <span>{t.tax}</span>
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
