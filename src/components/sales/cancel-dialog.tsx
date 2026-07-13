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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Ban, Loader2, AlertTriangle } from "lucide-react"
import { useCancelSale } from "@/hooks/use-api"
import { useFmt } from "@/components/currency-context"
import { useT } from "@/components/i18n-context"
import type { Sale } from "@/lib/types"

interface CancelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sale: Sale | null
}

export function CancelDialog({ open, onOpenChange, sale }: CancelDialogProps) {
  const t = useT()
  const fmt = useFmt()
  const [reason, setReason] = React.useState("")
  const cancelMut = useCancelSale()

  React.useEffect(() => {
    if (open) setReason("")
  }, [open])

  if (!sale) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sale) return
    const trimmed = reason.trim()
    if (trimmed.length < 3) {
      toast.error(t.cancelSaleReasonRequired)
      return
    }
    try {
      const res = await cancelMut.mutateAsync({ id: sale.id, reason: trimmed })
      toast.success(t.cancelSaleSuccessToast, {
        description: t.cancelSaleSuccessDesc.replace("{invoice}", sale.invoiceNo),
      })
      onOpenChange(false)
    } catch (err: any) {
      const msg = err?.message
      let friendly = t.cancelSaleFailedToast
      if (msg === "already-cancelled") friendly = t.cancelSaleBlockedCancelled
      else if (msg === "already-refunded") friendly = t.cancelSaleBlockedRefunded
      else if (msg === "has-partial-refund") friendly = t.cancelSaleBlockedPartial
      else if (msg === "reason-required") friendly = t.cancelSaleReasonRequired
      toast.error(friendly, { description: msg })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Ban className="h-5 w-5" />
            {t.cancelSaleDialogTitle}
          </DialogTitle>
          <DialogDescription>{t.cancelSaleDialogDesc}</DialogDescription>
        </DialogHeader>

        {/* Invoice summary */}
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t.invoiceNo}</span>
            <span className="font-medium tabular-nums">{sale.invoiceNo}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t.customer}</span>
            <span className="font-medium">{sale.customerName || t.walkInCustomer}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t.items}</span>
            <span className="font-medium tabular-nums">{sale.items.length}</span>
          </div>
          <Separator className="my-1.5" />
          <div className="flex justify-between text-base">
            <span className="font-semibold">{t.total}</span>
            <span className="font-bold tabular-nums text-destructive">{fmt.currency(sale.total)}</span>
          </div>
        </div>

        {/* Warning */}
        <div className="flex gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{t.cancelSaleWarning}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Reason (required) */}
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">{t.cancelSaleReasonLabel} *</Label>
            <Textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.cancelSaleReasonPlaceholder}
              rows={3}
              autoFocus
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={cancelMut.isPending}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="destructive" disabled={cancelMut.isPending || reason.trim().length < 3}>
              {cancelMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              {t.cancelSaleConfirmBtn}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
