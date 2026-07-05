"use client"

import * as React from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { TableSkeleton } from "@/components/shared/loading-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { RefundDialog } from "@/components/sales/refund-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ReceiptText,
  Search,
  Eye,
  Printer,
  Banknote,
  CreditCard,
  ArrowLeftRight,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Flame,
  User,
  Phone,
  Calendar,
} from "lucide-react"
import { useSales, useRefundSale } from "@/hooks/use-api"
import { useAppStore } from "@/lib/store"
import { useFmt } from "@/components/currency-context"
import { printA4Invoice, printThermalReceipt } from "@/lib/print"
import { useUser } from "@/components/user-context"
import type { Sale } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useT } from "@/components/i18n-context"
import type { Dict } from "@/lib/i18n"

function paymentMeta(t: Dict) {
  return {
    CASH: { label: t.cash, icon: Banknote, className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
    CARD: { label: t.card, icon: CreditCard, className: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30" },
    TRANSFER: { label: t.transfer, icon: ArrowLeftRight, className: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30" },
  } as const
}

export function InvoicesView() {
  const fmt = useFmt()
  const t = useT()
  const user = useUser()
  const setView = useAppStore((s) => s.setView)
  const [q, setQ] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [pageSize] = React.useState(10)
  const [selected, setSelected] = React.useState<Sale | null>(null)
  const [refundTarget, setRefundTarget] = React.useState<Sale | null>(null)
  const isAdmin = user.role === "ADMIN"
  const debouncedQ = React.useDeferredValue(q)
  const { data, isLoading, isError, refetch } = useSales(debouncedQ || undefined, page, pageSize)
  const refundMut = useRefundSale()
  const PAYMENT_META = paymentMeta(t)

  const sales = data?.items ?? []
  const pagination = data?.pagination
  const isRefunded = (s: Sale) => s.refundStatus === "FULL"
  const isPartialRefund = (s: Sale) => s.refundStatus === "PARTIAL"

  // Auto-advance pages — if current page is empty but not first page, go back
  React.useEffect(() => {
    if (!isLoading && sales.length === 0 && page > 1) {
      setPage(1)
    }
  }, [isLoading, sales.length, page])

  // Refund handled by RefundDialog now

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.invoicesTitle}
        description={t.invoicesDescFull}
        icon={<ReceiptText className="h-5 w-5" />}
        actions={
          <Button variant="outline" onClick={() => setView("sales")} className="gap-2">
            {t.newInvoice}
          </Button>
        }
      />

      {/* Search */}
      <Card className="p-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1) }}
            placeholder={t.searchInvoiceOrCustomer}
            className="pr-9"
          />
        </div>
      </Card>

      {/* Master-detail layout */}
      <div className="grid lg:grid-cols-12 gap-4">
        {/* List (master) */}
        <div className="lg:col-span-5 space-y-2">
          {isLoading ? (
            <TableSkeleton rows={6} />
          ) : isError ? (
            <EmptyState title={t.invoicesLoadFailed} action={<Button onClick={() => refetch()}>{t.retry}</Button>} />
          ) : sales.length === 0 ? (
            <EmptyState icon={<ReceiptText className="h-7 w-7" />} title={t.noInvoices} />
          ) : (
            <>
              <ScrollArea className="max-h-[calc(100vh-16rem)] scrollbar-thin pr-1">
                <div className="space-y-1.5">
                  {sales.map((s) => {
                    const pm = PAYMENT_META[s.paymentMethod]
                    const refunded = isRefunded(s)
                    const partial = isPartialRefund(s)
                    const active = selected?.id === s.id
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelected(s)}
                        className={cn(
                          "w-full text-right rounded-lg border p-3 transition-all",
                          active
                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                            : "border-border/60 hover:border-primary/40 hover:bg-muted/30"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-sm" dir="ltr">{s.invoiceNo}</span>
                              {refunded ? (
                                <Badge variant="destructive" className="text-[10px]">{t.invoicesRefundFullBadge}</Badge>
                              ) : partial ? (
                                <Badge variant="secondary" className="text-[10px] bg-amber-500/15 text-amber-700">{t.invoicesRefundPartialBadge}</Badge>
                              ) : null}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {s.customerName || t.cashCustomer}
                              {s.customerPhone ? ` • ${s.customerPhone}` : ""}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{fmt.dateTime(s.createdAt)}</p>
                          </div>
                          <div className="text-left shrink-0">
                            <p className={cn("font-bold tabular-nums text-sm", refunded && "line-through text-muted-foreground")}>
                              {fmt.currency(s.total)}
                            </p>
                            <Badge variant="outline" className={cn("text-[10px] gap-1", pm.className)}>
                              <pm.icon className="h-2.5 w-2.5" />
                              {pm.label}
                            </Badge>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </ScrollArea>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 ? (
                <div className="flex items-center justify-between gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="gap-1"
                  >
                    <ChevronRight className="h-4 w-4" />
                    {t.previous}
                  </Button>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {t.invoicesPageLabel
                      .replace("{x}", fmt.number(page))
                      .replace("{y}", fmt.number(pagination.totalPages))
                      .replace("{total}", fmt.number(pagination.total))}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="gap-1"
                  >
                    {t.next}
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              ) : pagination ? (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  {t.invoicesCountLabel.replace("{total}", fmt.number(pagination.total))}
                </p>
              ) : null}
            </>
          )}
        </div>

        {/* Detail (detail panel) */}
        <div className="lg:col-span-7">
          {selected ? (
            <InvoiceDetail
              sale={selected}
              fmt={fmt}
              t={t}
              isAdmin={isAdmin}
              isRefunded={isRefunded(selected)}
              onRefund={() => setRefundTarget(selected)}
            />
          ) : (
            <Card className="flex items-center justify-center h-[400px] border-dashed">
              <div className="text-center text-muted-foreground">
                <Eye className="h-10 w-10 mx-auto opacity-40 mb-2" />
                <p className="text-sm">{t.selectInvoiceHint}</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Refund dialog (partial returns) */}
      <RefundDialog
        open={!!refundTarget}
        onOpenChange={(o) => {
          if (!o) {
            setRefundTarget(null)
            setSelected(null)
          }
        }}
        sale={refundTarget}
      />
    </div>
  )
}

/* ───────────────────────── Invoice Detail Panel ───────────────────────── */
function InvoiceDetail({
  sale,
  fmt,
  t,
  isAdmin,
  isRefunded,
  onRefund,
}: {
  sale: Sale
  fmt: ReturnType<typeof useFmt>
  t: Dict
  isAdmin: boolean
  isRefunded: boolean
  onRefund: () => void
}) {
  const pm = paymentMeta(t)[sale.paymentMethod]
  return (
    <Card className="flex flex-col max-h-[calc(100vh-10rem)] overflow-hidden">
      {/* Header — fixed, not scrollable */}
      <div className="bg-primary/5 border-b border-border/60 p-4 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-primary" />
              {t.salesInvoice}
            </h3>
            <p className="font-mono text-sm text-primary mt-1" dir="ltr">{sale.invoiceNo}</p>
            {isRefunded ? (
              <Badge variant="destructive" className="mt-1">{t.invoicesRefundedFullyBadge}</Badge>
            ) : sale.refundStatus === "PARTIAL" ? (
              <Badge variant="secondary" className="mt-1 bg-amber-500/15 text-amber-700">{t.invoicesRefundedPartialWithAmount.replace("{amount}", fmt.currency(sale.refundTotal))}</Badge>
            ) : null}
          </div>
          <div className="text-left">
            <p className="text-xs text-muted-foreground">{fmt.dateTime(sale.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4 min-h-0">
        {/* Customer + payment info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> {t.customer}</p>
            <p className="font-medium text-sm mt-1">{sale.customerName || t.cashCustomer}</p>
            {sale.customerPhone ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3" /> <span dir="ltr">{sale.customerPhone}</span></p>
            ) : null}
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> {t.payment}</p>
            <p className="font-medium text-sm mt-1">
              <Badge variant="outline" className={cn("gap-1", pm.className)}>
                <pm.icon className="h-3 w-3" /> {pm.label}
              </Badge>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{sale.userName || "—"}</p>
          </div>
        </div>

        {/* Items table */}
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-right p-2.5 font-medium">{t.colItem}</th>
                <th className="text-center p-2.5 font-medium w-16">{t.colQty}</th>
                <th className="text-center p-2.5 font-medium w-24">{t.colPrice}</th>
                <th className="text-center p-2.5 font-medium w-28">{t.colTotal}</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((it) => (
                <tr key={it.id} className="border-t border-border/40">
                  <td className="p-2.5 font-medium">{it.productName}</td>
                  <td className="p-2.5 text-center tabular-nums">{fmt.number(it.quantity)}</td>
                  <td className="p-2.5 text-center tabular-nums">{fmt.currency(it.unitPrice)}</td>
                  <td className="p-2.5 text-center font-semibold tabular-nums">{fmt.currency(it.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>{t.subtotal}</span>
            <span className="tabular-nums" dir="ltr">{fmt.currency(sale.subtotal)}</span>
          </div>
          {sale.discount > 0 ? (
            <div className="flex justify-between text-rose-600">
              <span>{t.discount}</span>
              <span className="tabular-nums" dir="ltr">- {fmt.currency(sale.discount)}</span>
            </div>
          ) : null}
          {sale.taxAmount > 0 ? (
            <div className="flex justify-between text-muted-foreground">
              <span>{t.tax} ({fmt.number(sale.taxRate)}%)</span>
              <span className="tabular-nums" dir="ltr">{fmt.currency(sale.taxAmount)}</span>
            </div>
          ) : null}
          <Separator />
          <div className="flex justify-between items-center pt-1">
            <span className="font-semibold text-base">{t.total}</span>
            <span className={cn("text-2xl font-bold tabular-nums text-primary", isRefunded && "line-through")}>
              {fmt.currency(sale.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons — fixed at bottom, always visible */}
      <div className="border-t border-border/60 p-3 space-y-2 shrink-0 bg-card">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="gap-2" onClick={() => printThermalReceipt(sale)}>
            <Flame className="h-4 w-4" />
            {t.thermalPrint80}
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => printA4Invoice(sale)}>
            <Printer className="h-4 w-4" />
            {t.a4Print}
          </Button>
        </div>
        {isAdmin ? (
          <>
            <Button
              variant="outline"
              className="w-full gap-2 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/50"
              onClick={onRefund}
              disabled={isRefunded}
            >
              <RotateCcw className="h-4 w-4" />
              {isRefunded ? t.invoicesRefundedFullyBadge : sale.refundStatus === "PARTIAL" ? t.invoicesAdditionalRefund : t.invoicesRefundInvoiceAction}
            </Button>
            {isRefunded ? (
              <p className="text-[10px] text-muted-foreground text-center">
                {t.invoicesRefundedFullTotalDesc.replace("{total}", fmt.currency(sale.refundTotal))}
              </p>
            ) : sale.refundStatus === "PARTIAL" ? (
              <p className="text-[10px] text-amber-600 text-center">
                {t.invoicesRefundedPartialDesc.replace("{amount}", fmt.currency(sale.refundTotal))}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </Card>
  )
}
