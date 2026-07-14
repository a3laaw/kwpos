"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import {
  RotateCcw,
  Search,
  Loader2,
  AlertTriangle,
  FileText,
  CheckCircle2,
} from "lucide-react"
import { useRefundSale } from "@/hooks/use-api"
import { useFmt } from "@/components/currency-context"
import type { Sale } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useT } from "@/components/i18n-context"

const MAX_DAYS = 14

interface RefundLine {
  saleItemId: string
  productName: string
  originalQty: number
  returnedQty: number
  returnableQty: number
  unitPrice: number
  returnQty: string // input value
}

export function RefundDialog({
  open,
  onOpenChange,
  sale,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sale: Sale | null
}) {
  const fmt = useFmt()
  const t = useT()
  const refundMut = useRefundSale()
  const [lines, setLines] = React.useState<RefundLine[]>([])
  const [barcodeSearch, setBarcodeSearch] = React.useState("")
  const [override14, setOverride14] = React.useState(false)
  const [result, setResult] = React.useState<any>(null)

  React.useEffect(() => {
    if (sale && open) {
      setLines(
        sale.items.map((it) => ({
          saleItemId: it.id,
          productName: it.productName,
          originalQty: it.quantity,
          returnedQty: it.returnedQty || 0,
          returnableQty: it.quantity - (it.returnedQty || 0),
          unitPrice: it.unitPrice,
          returnQty: "0",
        }))
      )
      setOverride14(false)
      setResult(null)
      setBarcodeSearch("")
    }
  }, [sale, open])

  const daysSince = sale
    ? Math.floor((Date.now() - new Date(sale.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0
  const past14 = daysSince > MAX_DAYS

  // Refund calculations
  const refundSubtotal = lines.reduce(
    (s, l) => s + (Number(l.returnQty) || 0) * l.unitPrice,
    0
  )
  const refundTax = sale && sale.taxRate > 0
    ? +(refundSubtotal * (sale.taxRate / 100)).toFixed(3)
    : 0
  const refundTotal = +(refundSubtotal + refundTax).toFixed(3)
  const hasReturns = lines.some((l) => Number(l.returnQty) > 0)

  function setReturnQty(saleItemId: string, qty: string) {
    setLines((arr) =>
      arr.map((l) => {
        if (l.saleItemId !== saleItemId) return l
        const v = Math.min(Number(qty) || 0, l.returnableQty)
        return { ...l, returnQty: String(Math.max(0, v)) }
      })
    )
  }

  // Barcode search — highlight matching item
  function handleBarcodeSearch(e: React.KeyboardEvent) {
    if (e.key !== "Enter") return
    const code = barcodeSearch.trim()
    if (!code) return
    // Find by product name partial match or invoice number
    const match = lines.find((l) =>
      l.productName.includes(code) || l.saleItemId.includes(code)
    )
    if (match && match.returnableQty > 0) {
      setReturnQty(match.saleItemId, "1")
      toast.info(t.refundItemSelected.replace("{name}", match.productName))
    } else {
      toast.error(t.refundItemNotFound)
    }
    setBarcodeSearch("")
  }

  async function handleRefund() {
    if (!sale) return
    const items = lines
      .filter((l) => Number(l.returnQty) > 0)
      .map((l) => ({ saleItemId: l.saleItemId, returnedQty: Number(l.returnQty) }))

    if (items.length === 0) {
      toast.error(t.refundSelectAtLeastOne)
      return
    }

    try {
      const res = await refundMut.mutateAsync({
        id: sale.id,
        reason: t.partialRefund,
        items,
        override14Days: past14 && override14,
      })
      setResult(res)
      // Audit log is created server-side by the refund API route
      // (action: SALE_REFUNDED). No client-side logging needed.
      toast.success(t.refundApprovedToast, {
        description: t.refundApprovedToastDesc
          .replace("{creditNoteNo}", res.refundSummary?.creditNoteNo || "")
          .replace("{total}", fmt.currency(res.refundSummary?.refundTotal || 0)),
      })
    } catch (err: any) {
      if (err?.message === "past-14-days") {
        toast.error(t.refund14DaysExceededToast, {
          description: t.refund14DaysExceededDesc,
        })
      } else {
        toast.error(t.refundFailedToast, { description: err?.message })
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            {t.refundDialogTitle.replace("{invoiceNo}", sale?.invoiceNo || "")}
          </DialogTitle>
          <DialogDescription>
            {t.refundPartialDialogDesc}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          /* ── Success screen ── */
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#DFC196]/15 text-[#DFC196]">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <p className="font-bold text-lg">{t.refundSuccessTitle}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t.creditNote}: <span className="font-mono font-bold" dir="ltr">{result.refundSummary?.creditNoteNo}</span>
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-4 text-sm space-y-1 max-w-xs mx-auto">
              <div className="flex justify-between"><span>{t.refundReturnsLabel}</span><span className="tabular-nums">{fmt.currency(result.refundSummary?.refundSubtotal || 0)}</span></div>
              <div className="flex justify-between"><span>{t.refundTaxLabel}</span><span className="tabular-nums">{fmt.currency(result.refundSummary?.refundTax || 0)}</span></div>
              <Separator className="my-1" />
              <div className="flex justify-between font-bold"><span>{t.refundTotalLabel}</span><span className="tabular-nums text-primary">{fmt.currency(result.refundSummary?.refundTotal || 0)}</span></div>
            </div>
            <Button onClick={() => onOpenChange(false)}>{t.close}</Button>
          </div>
        ) : (
          <>
            {/* 14-day warning */}
            {past14 ? (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    {t.refund14DaysWarning
                      .replace("{maxDays}", String(MAX_DAYS))
                      .replace("{daysSince}", String(daysSince))}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t.refund14DaysWarningDesc}
                  </p>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <Checkbox checked={override14} onCheckedChange={(v) => setOverride14(!!v)} />
                    <span className="text-xs font-medium">{t.refundOverrideAdminLabel}</span>
                  </label>
                </div>
              </div>
            ) : null}

            {/* Barcode search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={barcodeSearch}
                onChange={(e) => setBarcodeSearch(e.target.value)}
                onKeyDown={handleBarcodeSearch}
                placeholder={t.refundSearchPlaceholder}
                className="pr-9"
                dir="ltr"
              />
            </div>

            {/* Items list */}
            <div className="space-y-2 max-h-[40vh] overflow-y-auto scrollbar-thin pr-1">
              {lines.map((l) => {
                const isMatch = barcodeSearch && l.productName.includes(barcodeSearch)
                const retQty = Number(l.returnQty) || 0
                const lineRefund = retQty * l.unitPrice
                const fullyReturned = l.returnableQty === 0
                return (
                  <div
                    key={l.saleItemId}
                    className={cn(
                      "rounded-lg border p-4 transition-all",
                      isMatch && "border-primary ring-1 ring-primary/30",
                      fullyReturned ? "border-border/40 opacity-50" : "border-border/60"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{l.productName}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {fmt.currency(l.unitPrice)} / {t.refundUnitSuffix}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {fullyReturned ? (
                          <Badge variant="secondary" className="text-[10px]">{t.fullyReturned}</Badge>
                        ) : null}
                        <div className="text-xs text-muted-foreground text-center">
                          <p>{t.refundOriginalLabel} <span className="font-medium tabular-nums">{fmt.number(l.originalQty)}</span></p>
                          <p>{t.refundReturnedLabel} <span className="font-medium tabular-nums">{fmt.number(l.returnedQty)}</span></p>
                          <p>{t.refundAvailableLabel} <span className="font-bold tabular-nums text-primary">{fmt.number(l.returnableQty)}</span></p>
                        </div>
                        {!fullyReturned ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <Label className="text-[10px] text-muted-foreground">{t.returnQty}</Label>
                            <Input
                              type="number"
                              min={0}
                              max={l.returnableQty}
                              value={l.returnQty}
                              onChange={(e) => setReturnQty(l.saleItemId, e.target.value)}
                              className="h-8 w-16 text-center tabular-nums"
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {retQty > 0 ? (
                      <div className="mt-1.5 text-xs text-primary font-medium tabular-nums">
                        {t.refundLineValueLabel} {fmt.currency(lineRefund)}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>

            {/* Refund summary */}
            {hasReturns ? (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t.refundReturnsTotalLabel}</span>
                  <span className="tabular-nums">{fmt.currency(refundSubtotal)}</span>
                </div>
                {refundTax > 0 ? (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t.refundTaxWithRateLabel.replace("{rate}", String(sale?.taxRate || 0))}</span>
                    <span className="tabular-nums">{fmt.currency(refundTax)}</span>
                  </div>
                ) : null}
                <Separator />
                <div className="flex justify-between font-bold">
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4 text-primary" />
                    {t.creditNoteTotal}
                  </span>
                  <span className="tabular-nums text-primary text-lg">{fmt.currency(refundTotal)}</span>
                </div>
              </div>
            ) : null}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>{t.cancel}</Button>
              <Button
                onClick={handleRefund}
                disabled={!hasReturns || (past14 && !override14) || refundMut.isPending}
                className="gap-2"
              >
                {refundMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                {t.refundApproveBtn}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
