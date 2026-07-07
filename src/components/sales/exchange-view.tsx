"use client"

import * as React from "react"
import { toast } from "sonner"
import { signOut } from "next-auth/react"
import { logAudit } from "@/lib/audit"
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
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeftRight,
  Search,
  Plus,
  Minus,
  Trash2,
  X,
  CheckCircle2,
  Printer,
  Loader2,
  PackageX,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  ScanLine,
  FileSearch,
  CalendarClock,
} from "lucide-react"
import {
  useProducts,
  useCreateExchange,
  useSaleForExchange,
  type ExchangeSale,
  type SaleForExchangeItem,
} from "@/hooks/use-api"
import { useFmt } from "@/components/currency-context"
import { printExchangeReceipt } from "@/lib/print"
import type { Product } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useT } from "@/components/i18n-context"

/** A return line — quantity is ALWAYS set via barcode scan (auto-increment).
 *  The cashier cannot type the quantity; only the "−1" undo button can
 *  decrement it. */
interface ReturnItem {
  saleItemId: string
  item: SaleForExchangeItem
  quantity: number
}

/** A new-item line — quantity is always positive (typed via the +/− controls). */
interface NewItem {
  product: Product
  quantity: number
  unitPrice: number
}

export function ExchangeView() {
  const fmt = useFmt()
  const t = useT()
  const PAYMENT_LABELS: Record<string, string> = {
    CASH: t.cash,
    CARD: t.card,
    TRANSFER: t.transfer,
  }

  // ── Step 1: Invoice lookup ──
  const [invoiceInput, setInvoiceInput] = React.useState("")
  const [activeInvoiceNo, setActiveInvoiceNo] = React.useState<string | null>(null)
  const saleQuery = useSaleForExchange(activeInvoiceNo)

  // ── Step 2: Return items (scan-driven) ──
  const [scanInput, setScanInput] = React.useState("")
  const [returnItems, setReturnItems] = React.useState<ReturnItem[]>([])

  // ── Step 3: New items ──
  const [newSearch, setNewSearch] = React.useState("")
  const [newItems, setNewItems] = React.useState<NewItem[]>([])

  // ── Step 4: Settlement ──
  const [note, setNote] = React.useState("")
  const [paymentMethod, setPaymentMethod] = React.useState<"CASH" | "CARD" | "TRANSFER">("CASH")
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [lastExchange, setLastExchange] = React.useState<ExchangeSale | null>(null)

  const debouncedNewQ = React.useDeferredValue(newSearch)
  const { data: newData } = useProducts({ q: debouncedNewQ || undefined })

  const createMut = useCreateExchange()
  const newProducts = (newData?.items ?? []).slice(0, 8)

  const sale = saleQuery.data
  const saleLoading = saleQuery.isFetching && !!activeInvoiceNo
  const saleNotFound = !!activeInvoiceNo && saleQuery.isError && !saleLoading

  // ── Invoice lookup ──
  function handleLookup() {
    const v = invoiceInput.trim()
    if (!v) {
      toast.error(t.enterInvoiceNoFirst)
      return
    }
    // Reset return cart (we're loading a new invoice).
    setReturnItems([])
    setActiveInvoiceNo(v)
  }

  function handleInvoiceKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      handleLookup()
    }
  }

  function resetInvoice() {
    setActiveInvoiceNo(null)
    setInvoiceInput("")
    setReturnItems([])
    setNewItems([])
    setNote("")
    setNewSearch("")
    setScanInput("")
    setPaymentMethod("CASH")
  }

  // ── Step 2: barcode scan handler ──
  function handleScan(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return
    e.preventDefault()
    const code = scanInput.trim()
    if (!code || !sale) return
    setScanInput("")

    // Find the matching sale item by barcode (exact match) OR by product
    // name (case-insensitive contains). Barcode scanners emit the barcode +
    // Enter; manual entry can use either.
    const target = sale.items.find(
      (it) =>
        (it.barcode && it.barcode.toLowerCase() === code.toLowerCase()) ||
        it.productName.trim().toLowerCase() === code.toLowerCase()
    )
    if (!target) {
      // Fallback: partial name match (for manual typing).
      const partial = sale.items.find((it) =>
        it.productName.toLowerCase().includes(code.toLowerCase())
      )
      if (!partial) {
        toast.error(t.itemNotInOriginalInvoice)
        return
      }
      addToReturn(partial)
      return
    }
    addToReturn(target)
  }

  function addToReturn(item: SaleForExchangeItem) {
    if (item.remainingQty <= 0) {
      toast.error(t.itemFullyReturned)
      return
    }
    setReturnItems((arr) => {
      const ex = arr.find((it) => it.saleItemId === item.saleItemId)
      if (ex) {
        // Don't exceed remainingQty — cap at the original remaining.
        const currentReturnInCart = ex.quantity
        if (currentReturnInCart >= item.remainingQty) {
          toast.error(
            t.scannedQtyExceedsReturnable + ` (${fmt.number(item.remainingQty)})`
          )
          return arr
        }
        return arr.map((it) =>
          it.saleItemId === item.saleItemId
            ? { ...it, quantity: it.quantity + 1 }
            : it
        )
      }
      return [...arr, { saleItemId: item.saleItemId, item, quantity: 1 }]
    })
    toast.success(`+1 ${item.productName}`)
  }

  function undoReturnScan(saleItemId: string) {
    setReturnItems((arr) =>
      arr
        .map((it) =>
          it.saleItemId === saleItemId ? { ...it, quantity: it.quantity - 1 } : it
        )
        .filter((it) => it.quantity > 0)
    )
  }

  function removeReturn(saleItemId: string) {
    setReturnItems((arr) => arr.filter((it) => it.saleItemId !== saleItemId))
  }

  // ── Step 3: new items ──
  function addNew(p: Product) {
    const existing = newItems.find((it) => it.product.id === p.id)
    const nextQty = (existing?.quantity ?? 0) + 1
    if (nextQty > p.quantity) {
      toast.error(t.qtyUnavailable, {
        description: t.posQtyUnavailableDesc
          .replace("{name}", p.name)
          .replace("{qty}", fmt.number(p.quantity))
          .replace("{unit}", p.unit),
      })
      return
    }
    setNewItems((arr) => {
      const ex = arr.find((it) => it.product.id === p.id)
      if (ex) {
        return arr.map((it) =>
          it.product.id === p.id ? { ...it, quantity: it.quantity + 1 } : it
        )
      }
      return [...arr, { product: p, quantity: 1, unitPrice: p.salePrice }]
    })
  }

  function changeNewQty(id: string, delta: number) {
    const it = newItems.find((x) => x.product.id === id)
    if (!it) return
    const next = it.quantity + delta
    if (delta > 0 && next > it.product.quantity) {
      toast.error(t.qtyExceedsStock)
      return
    }
    setNewItems((arr) =>
      arr
        .map((x) => (x.product.id === id ? { ...x, quantity: next } : x))
        .filter((x) => x.quantity > 0)
    )
  }

  function setNewQty(id: string, qty: number) {
    const it = newItems.find((x) => x.product.id === id)
    if (!it) return
    if (qty > it.product.quantity) {
      toast.error(t.qtyExceedsStock)
      return
    }
    setNewItems((arr) =>
      qty <= 0
        ? arr.filter((x) => x.product.id !== id)
        : arr.map((x) => (x.product.id === id ? { ...x, quantity: qty } : x))
    )
  }

  function setNewPrice(id: string, price: number) {
    setNewItems((arr) => arr.map((it) => (it.product.id === id ? { ...it, unitPrice: price } : it)))
  }

  function removeNew(id: string) {
    setNewItems((arr) => arr.filter((it) => it.product.id !== id))
  }

  // ── Totals (signed) ──
  const returnTotal = returnItems.reduce(
    (s, it) => s - it.quantity * it.item.unitPrice,
    0
  )
  const newTotal = newItems.reduce((s, it) => s + it.quantity * it.unitPrice, 0)
  const netAmount = +(returnTotal + newTotal).toFixed(3)
  const itemCount =
    returnItems.reduce((s, it) => s + it.quantity, 0) +
    newItems.reduce((s, it) => s + it.quantity, 0)

  const isCollect = netAmount > 0
  const isRefund = netAmount < 0
  const isEven = !isCollect && !isRefund

  const hasItems = returnItems.length > 0 || newItems.length > 0

  function handleCheckout() {
    if (!sale) return
    if (!hasItems) {
      toast.error(t.excAddItemsFirst)
      return
    }
    setConfirmOpen(true)
  }

  async function doConfirmExchange() {
    if (!sale || !hasItems) return
    const lines = [
      ...returnItems.map((it) => ({
        productId: it.item.productId,
        quantity: -it.quantity, // negative for returns
        unitPrice: it.item.unitPrice,
        isReturn: true,
      })),
      ...newItems.map((it) => ({
        productId: it.product.id,
        quantity: it.quantity, // positive for new items
        unitPrice: it.unitPrice,
        isReturn: false,
      })),
    ]
    try {
      const ex = await createMut.mutateAsync({
        originalSaleId: sale.id,
        customerName: sale.customerName || undefined,
        customerPhone: sale.customerPhone || undefined,
        paymentMethod,
        note: note.trim() || undefined,
        lines,
      })
      toast.success(t.exchangeApprovedSuccess, {
        description: `${t.exchangeNo}: ${ex.exchangeNo}`,
      })
      void logAudit("EXCHANGE", {
        saleId: sale.id,
        description: `تبديل للفاتورة ${sale.invoiceNo} — مستند: ${ex.exchangeNo}`,
      })
      setLastExchange(ex)
      // Reset to Step 1 for the next customer.
      resetInvoice()
      setConfirmOpen(false)
    } catch (err: any) {
      if (err?.message === "session-expired") {
        toast.error(t.sessionExpired, { description: t.pleaseRelogin })
        setTimeout(() => {
          signOut({ redirect: false }).then(() => window.location.reload())
        }, 1500)
        return
      }
      const msg = err?.message || ""
      if (msg.startsWith("stock-insufficient")) {
        const parts = msg.split(":")
        const name = parts[2] || t.product
        toast.error(t.stockInsufficient, {
          description: t.posStockInsufficientDesc.replace("{name}", name),
        })
      } else if (msg === "original-invoice-required") {
        toast.error(t.originalInvoiceRequired, {
          description: t.excOriginalInvoiceRequiredDesc,
        })
      } else if (msg === "original-not-found") {
        toast.error(t.originalInvoiceNotFound)
      } else if (msg === "invoice-too-old") {
        toast.error(t.invoiceExpired14Days)
      } else if (msg.startsWith("product-not-in-invoice")) {
        toast.error(t.itemNotInOriginalInvoice)
      } else if (msg.startsWith("return-exceeds-remaining")) {
        toast.error(t.excReturnExceedsRemainingMsg)
      } else {
        toast.error(t.exchangeApproveFailed, { description: msg })
      }
    } finally {
      setConfirmOpen(false)
    }
  }

  // Confirmation dialog keyboard handler.
  // Ctrl+Enter confirms; a lone Enter is blocked (no accidental confirm).
  const handleDialogKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !createMut.isPending) {
      e.preventDefault()
      doConfirmExchange()
    }
    if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      const target = e.target as HTMLElement
      if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
        e.preventDefault()
      }
    }
  }

  const invoiceBlocked = !!sale && !sale.isEligible

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.exchangesTitle}
        description={t.excDesc}
        icon={<ArrowLeftRight className="h-5 w-5" />}
        breadcrumbItems={[
          { labelKey: "navOperations" },
          { labelKey: "navExchanges" },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={resetInvoice}
            disabled={!activeInvoiceNo && returnItems.length === 0 && newItems.length === 0}
          >
            <X className="h-4 w-4" />
            {t.excNewExchangeBtn}
          </Button>
        }
      />

      {/* ── Step 1: Invoice lookup card ── */}
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSearch className="h-4 w-4 text-primary" />
            {t.fetchOriginalInvoice}
            <span className="text-[10px] font-normal text-muted-foreground mr-1">
              ({t.mandatory})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={invoiceInput}
                onChange={(e) => setInvoiceInput(e.target.value)}
                onKeyDown={handleInvoiceKeyDown}
                placeholder={t.excInvoiceExample}
                className="pr-9 h-10 font-mono"
                dir="ltr"
                disabled={!!activeInvoiceNo && saleLoading}
              />
            </div>
            <Button
              className="h-10 gap-2"
              onClick={handleLookup}
              disabled={!invoiceInput.trim() || saleLoading}
            >
              {saleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {t.fetchInvoice}
            </Button>
          </div>

          {/* Lookup error / not-found */}
          {saleNotFound ? (
            <div className="rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 px-4 py-3 text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{t.excInvoiceNotFoundShort}</span>
            </div>
          ) : null}

          {/* Loaded invoice summary */}
          {sale ? (
            <div className="space-y-3">
              <div
                className={cn(
                  "rounded-lg border px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2",
                  sale.isEligible
                    ? "border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/10"
                    : "border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/10"
                )}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge
                    className={cn(
                      "tabular-nums",
                      sale.isEligible
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-transparent"
                        : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-transparent"
                    )}
                  >
                    <FileSearch className="h-3 w-3 mr-1" />
                    {sale.invoiceNo}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {fmt.dateTime(sale.createdAt)}
                  </span>
                  {sale.customerName ? (
                    <span className="text-xs text-muted-foreground">
                      {t.excCustomerPrefix} <span className="font-medium text-foreground">{sale.customerName}</span>
                    </span>
                  ) : null}
                  {sale.customerPhone ? (
                    <span className="text-xs text-muted-foreground" dir="ltr">
                      {sale.customerPhone}
                    </span>
                  ) : null}
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "tabular-nums",
                    sale.isEligible
                      ? "border-emerald-300 text-emerald-700 dark:text-emerald-300"
                      : "border-rose-300 text-rose-700 dark:text-rose-300"
                  )}
                >
                  {sale.isEligible
                    ? t.excInvoiceEligibleLabel.replace("{days}", String(sale.daysOld))
                    : t.excInvoiceExpiredLabel.replace("{days}", String(sale.daysOld))}
                </Badge>
              </div>

              {/* 14-day warning */}
              {invoiceBlocked ? (
                <div className="rounded-lg border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">
                      {t.invoiceExpired14DaysLong}
                    </p>
                    <p className="text-xs mt-1">
                      {t.excInvoiceDatePrefix} {fmt.dateTime(sale.createdAt)} ({fmt.number(sale.daysOld)} {t.daysPassed})
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Original invoice items table (with remainingQty) */}
              <div className="rounded-lg border border-border/60 overflow-hidden">
                <div className="bg-muted/40 px-3 py-2 text-xs font-semibold flex items-center justify-between">
                  <span>{t.originalInvoiceItems}</span>
                  <span className="text-muted-foreground">
                    {t.excOriginalItemsHint}
                  </span>
                </div>
                <div className="max-h-72 overflow-y-auto scrollbar-thin">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 sticky top-0">
                      <tr>
                        <th className="text-start p-2 font-medium text-xs">{t.colItem}</th>
                        <th className="text-center p-2 font-medium text-xs">{t.colQty}</th>
                        <th className="text-center p-2 font-medium text-xs">{t.returned}</th>
                        <th className="text-center p-2 font-medium text-xs">{t.returnable}</th>
                        <th className="text-center p-2 font-medium text-xs">{t.colPrice}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sale.items.map((it) => (
                        <tr
                          key={it.saleItemId}
                          className="border-t border-border/40"
                        >
                          <td className="p-2">
                            <div className="font-medium truncate max-w-[200px]">
                              {it.productName}
                            </div>
                            {it.barcode ? (
                              <div className="text-[10px] text-muted-foreground font-mono" dir="ltr">
                                {it.barcode}
                              </div>
                            ) : null}
                          </td>
                          <td className="p-2 text-center tabular-nums">{fmt.number(it.quantity)}</td>
                          <td className="p-2 text-center tabular-nums text-muted-foreground">
                            {fmt.number(it.returnedQty)}
                          </td>
                          <td className="p-2 text-center tabular-nums">
                            <Badge
                              variant="outline"
                              className={cn(
                                "tabular-nums",
                                it.remainingQty > 0
                                  ? "border-emerald-300 text-emerald-700 dark:text-emerald-300"
                                  : "border-muted-foreground/30 text-muted-foreground"
                              )}
                            >
                              {fmt.number(it.remainingQty)}
                            </Badge>
                          </td>
                          <td className="p-2 text-center tabular-nums">{fmt.currency(it.unitPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ── Step 2 + 3: returns + new items (only after eligible invoice loaded) ── */}
      {sale && sale.isEligible ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ── Return items section (rose / red) ── */}
          <Card className="border-rose-200 dark:border-rose-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
                  <ArrowDownToLine className="h-4 w-4" />
                  {t.excReturnsByScanTitle}
                </span>
                {returnItems.length > 0 ? (
                  <Badge variant="outline" className="text-rose-700 border-rose-300 tabular-nums">
                    {t.itemsCountLabel.replace("{count}", String(returnItems.length))}
                  </Badge>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Barcode scan input — auto-increment on Enter */}
              <div className="relative">
                <ScanLine className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-500" />
                <Input
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyDown={handleScan}
                  placeholder={t.excScanReturnPlaceholder2}
                  className="pr-9 h-10 font-mono"
                  dir="ltr"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-muted-foreground -mt-1">
                {t.scanAddsOneHint}
              </p>

              {/* Return items list — quantity is NOT a typed input */}
              {returnItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/10 px-4 py-8 text-center text-xs text-muted-foreground">
                  <ScanLine className="h-7 w-7 mx-auto text-rose-400 opacity-60" />
                  <p className="mt-1.5">{t.excScanToAddHint}</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-80 overflow-y-auto scrollbar-thin">
                  {returnItems.map((it) => {
                    const lineTotal = -it.quantity * it.item.unitPrice
                    const remainingAfter = it.item.remainingQty - it.quantity
                    return (
                      <div
                        key={it.saleItemId}
                        className="flex items-center gap-2 rounded-lg border border-rose-200/70 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/10 p-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{it.item.productName}</p>
                          <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                            {t.excPricePrefix} {fmt.currency(it.item.unitPrice)} · {t.excRemainingAfterReturnPrefix}{" "}
                            <span
                              className={cn(
                                "font-medium",
                                remainingAfter < 0 ? "text-rose-600" : "text-emerald-600"
                              )}
                            >
                              {fmt.number(Math.max(0, remainingAfter))}
                            </span>
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {/* Auto-incremented quantity (read-only) + undo button */}
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => undoReturnScan(it.saleItemId)}
                              title={t.undoLastScan}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <div
                              className="h-7 w-10 flex items-center justify-center rounded-md border border-input bg-background text-sm font-bold tabular-nums"
                              title={t.qtyScanOnly}
                            >
                              {it.quantity}
                            </div>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => addToReturn(it.item)}
                              disabled={it.quantity >= it.item.remainingQty}
                              title={t.addAnotherScan}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => removeReturn(it.saleItemId)}
                              title={t.deleteReturnItem}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <p className="text-xs font-bold text-rose-600 tabular-nums">
                            - {fmt.currency(Math.abs(lineTotal))}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── New items section (emerald / green) ── */}
          <Card className="border-emerald-200 dark:border-emerald-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <ArrowUpFromLine className="h-4 w-4" />
                  {t.excNewItemsTitle}
                </span>
                {newItems.length > 0 ? (
                  <Badge variant="outline" className="text-emerald-700 border-emerald-300 tabular-nums">
                    {t.itemsCountLabel.replace("{count}", String(newItems.length))}
                  </Badge>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={newSearch}
                  onChange={(e) => setNewSearch(e.target.value)}
                  placeholder={t.excSearchNewItemsPlaceholder}
                  className="pr-9 h-10"
                />
              </div>
              {newSearch.trim() ? (
                <div className="rounded-lg border border-border/60 bg-card overflow-hidden max-h-60 overflow-y-auto scrollbar-thin">
                  {newProducts.length === 0 ? (
                    <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                      <PackageX className="h-6 w-6 mx-auto opacity-50" />
                      <p className="mt-1">{t.noNewItemsSearch}</p>
                    </div>
                  ) : (
                    newProducts.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          addNew(p)
                          setNewSearch("")
                        }}
                        disabled={p.quantity < 1}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border-b border-border/40 last:border-0 text-start",
                          p.quantity < 1 && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground tabular-nums">
                            {fmt.currency(p.salePrice)} · رصيد {fmt.number(p.quantity)}
                          </p>
                        </div>
                        <Plus className="h-4 w-4 text-emerald-600" />
                      </button>
                    ))
                  )}
                </div>
              ) : null}

              {newItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10 px-4 py-8 text-center text-xs text-muted-foreground">
                  <ArrowUpFromLine className="h-7 w-7 mx-auto text-emerald-400 opacity-60" />
                  <p className="mt-1.5">{t.excNoNewItems}</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-80 overflow-y-auto scrollbar-thin">
                  {newItems.map((it) => {
                    const lineTotal = it.quantity * it.unitPrice
                    return (
                      <div
                        key={it.product.id}
                        className="flex items-center gap-2 rounded-lg border border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10 p-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{it.product.name}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Input
                              type="number"
                              min={0}
                              step="0.250"
                              dir="ltr"
                              className="h-6 w-20 text-xs tabular-nums px-1"
                              value={it.unitPrice}
                              onChange={(e) => setNewPrice(it.product.id, Number(e.target.value) || 0)}
                            />
                            <span className="text-[10px] text-muted-foreground">/ {it.product.unit}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => changeNewQty(it.product.id, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              dir="ltr"
                              type="number"
                              className="h-7 w-10 text-center px-0 tabular-nums"
                              value={it.quantity}
                              onChange={(e) => {
                                const v = parseInt(e.target.value, 10)
                                if (!isNaN(v)) setNewQty(it.product.id, v)
                              }}
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => changeNewQty(it.product.id, 1)}
                              disabled={it.quantity >= it.product.quantity}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => removeNew(it.product.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <p className="text-xs font-bold text-emerald-600 tabular-nums">
                            + {fmt.currency(lineTotal)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* ── Settlement card (only after eligible invoice loaded) ── */}
      {sale && sale.isEligible ? (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="pm" className="text-xs text-muted-foreground">
                  {t.excSettlementMethodLabel}
                </Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as "CASH" | "CARD" | "TRANSFER")}
                >
                  <SelectTrigger id="pm" className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">{t.cash}</SelectItem>
                    <SelectItem value="CARD">{t.card}</SelectItem>
                    <SelectItem value="TRANSFER">{t.transfer}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="note" className="text-xs text-muted-foreground">
                  {t.noteOptional}
                </Label>
                <Input
                  id="note"
                  className="h-9 text-sm"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t.excNotePlaceholder}
                />
              </div>
            </div>

            <Separator />

            {/* Net settlement display — 3 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 p-3">
                <p className="text-[10px] text-muted-foreground">{t.returnsTotal}</p>
                <p className="text-base font-bold text-rose-600 tabular-nums mt-1">
                  - {fmt.currency(Math.abs(returnTotal))}
                </p>
              </div>
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 p-3">
                <p className="text-[10px] text-muted-foreground">{t.newTotal}</p>
                <p className="text-base font-bold text-emerald-600 tabular-nums mt-1">
                  + {fmt.currency(newTotal)}
                </p>
              </div>
              <div
                className={cn(
                  "rounded-lg p-3 border",
                  isCollect && "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40",
                  isRefund && "bg-sky-50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900/40",
                  isEven && "bg-muted/40 border-border"
                )}
              >
                <p className="text-[10px] text-muted-foreground">
                  {isCollect ? t.collectFromCustomer : isRefund ? t.refundToCustomer : t.exchange}
                </p>
                <p
                  className={cn(
                    "text-base font-bold tabular-nums mt-1",
                    isCollect && "text-amber-700 dark:text-amber-400",
                    isRefund && "text-sky-700 dark:text-sky-400",
                    isEven && "text-muted-foreground"
                  )}
                >
                  {isEven ? t.excNetEvenLabel : fmt.currency(Math.abs(netAmount))}
                </p>
              </div>
            </div>

            <Button
              className="w-full h-11 gap-2 text-sm"
              onClick={handleCheckout}
              disabled={createMut.isPending || !hasItems}
            >
              {createMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {t.excApproveExchangeBtn.replace("{count}", String(itemCount))}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* ── Success modal with print button ── */}
      <Dialog open={!!lastExchange} onOpenChange={(o) => !o && setLastExchange(null)}>
        <DialogContent
          className="max-w-lg p-0 gap-0 flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b border-border/60">
            <DialogTitle className="flex items-center gap-2 justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              {t.exchangeApproved}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t.excExchangeSuccessDesc}
            </DialogDescription>
          </DialogHeader>
          {lastExchange ? (
            <>
              <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                      <ArrowLeftRight className="h-8 w-8" />
                    </div>
                    <p className="mt-3 font-mono font-bold text-lg" dir="ltr">
                      {lastExchange.exchangeNo}
                    </p>
                    <p className="text-xs text-muted-foreground">{fmt.dateTime(lastExchange.createdAt)}</p>
                    {lastExchange.customerName ? (
                      <p className="text-xs text-muted-foreground mt-1">{t.excCustomerPrefix} {lastExchange.customerName}</p>
                    ) : null}
                  </div>

                  <div className="rounded-lg border border-border/60 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="text-start p-2 font-medium">{t.colItem}</th>
                          <th className="text-center p-2 font-medium">{t.colQty}</th>
                          <th className="text-center p-2 font-medium">{t.colTotal}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lastExchange.lines.map((ln) => (
                          <tr key={ln.id} className="border-t border-border/40">
                            <td className="p-2">{ln.productName}</td>
                            <td
                              className={cn(
                                "p-2 text-center tabular-nums font-medium",
                                ln.quantity < 0 ? "text-rose-600" : "text-emerald-600"
                              )}
                            >
                              {ln.quantity > 0 ? `+${ln.quantity}` : ln.quantity}
                            </td>
                            <td
                              className={cn(
                                "p-2 text-center tabular-nums font-medium",
                                ln.lineTotal < 0 ? "text-rose-600" : "text-emerald-600"
                              )}
                            >
                              {ln.lineTotal > 0
                                ? `+ ${fmt.currency(Math.abs(ln.lineTotal))}`
                                : `- ${fmt.currency(Math.abs(ln.lineTotal))}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-1.5 text-sm">
                    <Separator />
                    <div className="flex justify-between items-center pt-1">
                      <span className="font-semibold">
                        {lastExchange.netAmount > 0
                          ? t.collectFromCustomer
                          : lastExchange.netAmount < 0
                          ? t.refundToCustomer
                          : t.evenExchange}
                      </span>
                      <span
                        className={cn(
                          "text-xl font-bold tabular-nums",
                          lastExchange.netAmount > 0
                            ? "text-amber-700 dark:text-amber-400"
                            : lastExchange.netAmount < 0
                            ? "text-sky-700 dark:text-sky-400"
                            : "text-muted-foreground"
                        )}
                      >
                        {lastExchange.netAmount === 0
                          ? "0"
                          : fmt.currency(Math.abs(lastExchange.netAmount))}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      {t.excSettlementPrefix} {PAYMENT_LABELS[lastExchange.paymentMethod]}
                    </p>
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-border/60 bg-background px-6 py-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => printExchangeReceipt(lastExchange)}
                  >
                    <Printer className="h-4 w-4" />
                    {t.printReceipt}
                  </Button>
                  <Button className="flex-1" onClick={() => setLastExchange(null)}>
                    {t.excNewExchangeBtn}
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ── Confirmation dialog (Ctrl+Enter to confirm; lone Enter blocked) ── */}
      <AlertDialog
        open={confirmOpen}
        onOpenChange={(o) => {
          if (!o && createMut.isPending) return
          setConfirmOpen(o)
        }}
      >
        <AlertDialogContent
          className="max-w-md p-0 gap-0 overflow-hidden"
          onKeyDown={handleDialogKeyDown}
        >
          <div className="px-6 pt-6 pb-4 shrink-0 border-b border-border/60 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <AlertDialogTitle className="mt-3 text-lg font-bold">
              {t.confirmExchangeTitle}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs mt-1">
              {t.excConfirmDesc}
            </AlertDialogDescription>
          </div>

          <div className="px-6 py-4 space-y-3">
            {sale ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{t.originalInvoice}</span>
                <Badge className="tabular-nums bg-primary/10 text-primary border-transparent font-mono">
                  {sale.invoiceNo}
                </Badge>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{t.excSettlementPrefix}</span>
              <Badge className="tabular-nums bg-primary/10 text-primary border-transparent">
                {PAYMENT_LABELS[paymentMethod]}
              </Badge>
            </div>
            {sale?.customerName ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{t.customer}</span>
                <span className="text-xs font-medium truncate max-w-[60%]">{sale.customerName}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{t.itemsCount}</span>
              <span className="text-xs font-medium tabular-nums">
                {t.itemsCountLabel.replace("{count}", String(itemCount))}
              </span>
            </div>

            <Separator />

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-rose-600">
                <span>{t.returnsTotal}</span>
                <span className="tabular-nums">- {fmt.currency(Math.abs(returnTotal))}</span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>{t.newTotal}</span>
                <span className="tabular-nums">+ {fmt.currency(newTotal)}</span>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between items-center pt-1">
              <span className="font-bold">
                {isCollect ? t.collectFromCustomer : isRefund ? t.refundToCustomer : t.exchange}
              </span>
              <span
                className={cn(
                  "text-2xl font-bold tabular-nums",
                  isCollect
                    ? "text-amber-700 dark:text-amber-400"
                    : isRefund
                    ? "text-sky-700 dark:text-sky-400"
                    : "text-muted-foreground"
                )}
              >
                {isEven ? t.excNetEvenLabel : fmt.currency(Math.abs(netAmount))}
              </span>
            </div>
          </div>

          <div className="shrink-0 border-t border-border/60 bg-muted/20 px-6 py-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-1.5 border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => setConfirmOpen(false)}
                disabled={createMut.isPending}
              >
                <X className="h-4 w-4" />
                {t.saleConfirmCancelBtn}
              </Button>
              <Button
                className="flex-1 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={doConfirmExchange}
                disabled={createMut.isPending}
                title={t.saleConfirmOrCtrlEnter}
              >
                {createMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {createMut.isPending ? t.approving : t.yesApproveExchange}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              {t.excCtrlEnterConfirmHint}{" "}
              <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">Ctrl</kbd>{" "}
              +{" "}
              <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">Enter</kbd>
            </p>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
