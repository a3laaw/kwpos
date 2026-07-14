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
import { Search, RotateCcw, Loader2, CheckCircle2, Package } from "lucide-react"
import { useCreatePurchaseReturn } from "@/hooks/use-api"
import { useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"
import type { PurchaseOrder } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ReturnLine {
  poItemId: string
  productName: string
  originalQty: number
  returnedQty: number
  returnableQty: number
  unitCost: number
  returnQty: string
}

export function PurchaseReturnDialog({
  open,
  onOpenChange,
  po,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  po: PurchaseOrder | null
}) {
  const t = useT()
  const fmt = useFmt()
  const returnMut = useCreatePurchaseReturn()
  const [lines, setLines] = React.useState<ReturnLine[]>([])
  const [barcodeSearch, setBarcodeSearch] = React.useState("")
  const [result, setResult] = React.useState<any>(null)

  React.useEffect(() => {
    if (po && open) {
      setLines(
        po.items.map((it) => ({
          poItemId: it.id,
          productName: it.productName,
          originalQty: it.quantity,
          returnedQty: it.returnedQty || 0,
          returnableQty: Math.max(0, it.quantity - (it.returnedQty || 0)),
          unitCost: it.unitCost,
          returnQty: "0",
        }))
      )
      setResult(null)
      setBarcodeSearch("")
    }
  }, [po, open])

  const returnTotal = lines.reduce(
    (s, l) => s + (Number(l.returnQty) || 0) * l.unitCost,
    0
  )
  const hasReturns = lines.some((l) => Number(l.returnQty) > 0)

  function setReturnQty(poItemId: string, qty: string) {
    setLines((arr) =>
      arr.map((l) => {
        if (l.poItemId !== poItemId) return l
        const v = Math.min(Number(qty) || 0, l.returnableQty)
        return { ...l, returnQty: String(Math.max(0, v)) }
      })
    )
  }

  function handleBarcodeSearch(e: React.KeyboardEvent) {
    if (e.key !== "Enter") return
    const code = barcodeSearch.trim()
    if (!code) return
    const match = lines.find((l) => l.productName.includes(code))
    if (match && match.returnableQty > 0) {
      setReturnQty(match.poItemId, "1")
      toast.info(`تم تحديد: ${match.productName}`)
    } else {
      toast.error("لم يتم العثور على الصنف")
    }
    setBarcodeSearch("")
  }

  async function handleReturn() {
    if (!po) return
    const items = lines
      .filter((l) => Number(l.returnQty) > 0)
      .map((l) => ({ poItemId: l.poItemId, returnQty: Number(l.returnQty) }))
    if (items.length === 0) {
      toast.error(t.returnSelectQty)
      return
    }
    try {
      const res = await returnMut.mutateAsync({ purchaseOrderId: po.id, items })
      setResult(res)
      toast.success(t.purchaseReturnCreated, {
        description: `${t.returnNo}: ${res.returnNo}`,
      })
    } catch (err: any) {
      toast.error(t.purchaseReturnCreateFailed, {
        description: String(err?.message || err),
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            {t.returnFromPO} {po?.id ? `— ${po.id.slice(-6)}` : ""}
          </DialogTitle>
          <DialogDescription>{t.purchaseReturnsDesc}</DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <p className="font-bold text-lg">{t.purchaseReturnCreated}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t.returnNo}:{" "}
                <span className="font-mono font-bold" dir="ltr">
                  {result.returnNo}
                </span>
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-4 text-sm max-w-xs mx-auto">
              <div className="flex justify-between">
                <span>{t.returnTotal}</span>
                <span className="tabular-nums font-bold text-primary">
                  {fmt.currency(result.returnTotal)}
                </span>
              </div>
            </div>
            <Button onClick={() => onOpenChange(false)}>{t.close}</Button>
          </div>
        ) : (
          <>
            {/* Supplier info */}
            <div className="rounded-lg bg-muted/40 p-4 text-sm">
              <p>
                <span className="text-muted-foreground">{t.colSupplier}:</span>{" "}
                {po?.supplierName}
              </p>
              <p>
                <span className="text-muted-foreground">{t.returnFromPO}:</span>{" "}
                <span className="tabular-nums">{fmt.currency(po?.total || 0)}</span>
              </p>
            </div>

            {/* Barcode search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={barcodeSearch}
                onChange={(e) => setBarcodeSearch(e.target.value)}
                onKeyDown={handleBarcodeSearch}
                placeholder="ابحث بالباركود أو الاسم..."
                className="pr-9"
                dir="ltr"
              />
            </div>

            {/* Items */}
            <div className="space-y-2 max-h-[35vh] overflow-y-auto scrollbar-thin pr-1">
              {lines.map((l) => {
                const retQty = Number(l.returnQty) || 0
                const lineRefund = retQty * l.unitCost
                const fullyReturned = l.returnableQty === 0
                return (
                  <div
                    key={l.poItemId}
                    className={cn(
                      "rounded-lg border p-4",
                      fullyReturned ? "border-border/40 opacity-50" : "border-border/60"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{l.productName}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {fmt.currency(l.unitCost)} / وحدة
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-xs text-muted-foreground text-center">
                          <p>
                            {t.returnOriginalQty}:{" "}
                            <span className="font-medium tabular-nums">
                              {fmt.number(l.originalQty)}
                            </span>
                          </p>
                          <p>
                            {t.returnAvailable}:{" "}
                            <span className="font-bold tabular-nums text-primary">
                              {fmt.number(l.returnableQty)}
                            </span>
                          </p>
                        </div>
                        {!fullyReturned ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <Label className="text-[10px] text-muted-foreground">
                              {t.returnQty}
                            </Label>
                            <Input
                              type="number"
                              min={0}
                              max={l.returnableQty}
                              value={l.returnQty}
                              onChange={(e) => setReturnQty(l.poItemId, e.target.value)}
                              className="h-8 w-16 text-center tabular-nums"
                            />
                          </div>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            {t.returnFullyReturned}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {retQty > 0 ? (
                      <p className="mt-1 text-xs text-primary font-medium tabular-nums">
                        {t.returnTotal}: {fmt.currency(lineRefund)}
                      </p>
                    ) : null}
                  </div>
                )
              })}
            </div>

            {hasReturns ? (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 flex justify-between font-bold text-sm">
                <span>{t.returnTotal}</span>
                <span className="tabular-nums text-primary text-lg">
                  {fmt.currency(returnTotal)}
                </span>
              </div>
            ) : null}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t.cancel}
              </Button>
              <Button
                onClick={handleReturn}
                disabled={!hasReturns || returnMut.isPending}
                className="gap-2"
              >
                {returnMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Package className="h-4 w-4" />
                )}
                {t.approveReturn}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
