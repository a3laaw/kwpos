"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, AlertTriangle, Truck, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useT } from "@/components/i18n-context"

export interface SaleConfirmSummary {
  itemCount: number
  subtotal: number
  discount: number
  taxAmount: number
  taxRate: number
  deliveryFee: number
  driverName?: string | null
  total: number
  paymentMethod: "CASH" | "CARD" | "TRANSFER"
  customerName?: string | null
}

interface SaleConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  summary: SaleConfirmSummary | null
  loading?: boolean
  onConfirm: () => void
  formatCurrency: (n: number) => string
  paymentLabel: (m: string) => string
}

const PAYMENT_BADGE: Record<string, string> = {
  CASH: "bg-emerald-500/15 text-emerald-600",
  CARD: "bg-sky-500/15 text-sky-600",
  TRANSFER: "bg-violet-500/15 text-violet-600",
}

/**
 * Sale confirmation dialog with:
 *  - Warning message + amount summary + payment method.
 *  - Green confirm + red cancel buttons.
 *  - Keyboard protection: a single Enter does NOT confirm. The cashier must
 *    either click the button physically or press Ctrl+Enter.
 *  - Delivery fee line only shown when deliveryFee > 0.
 *  - Backdrop/escape do NOT close (prevent accidental abort of a deliberate
 *    confirmation flow); only the buttons close the dialog.
 */
export function SaleConfirmDialog({
  open,
  onOpenChange,
  summary,
  loading = false,
  onConfirm,
  formatCurrency,
  paymentLabel,
}: SaleConfirmDialogProps) {
  const t = useT()

  // Handle the Ctrl+Enter shortcut on the dialog content.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !loading) {
      e.preventDefault()
      onConfirm()
    }
    // Block a lone Enter from triggering the default Radix action.
    if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      // Radix AlertDialog focuses the first focusable button on open; a lone
      // Enter would click it. Stop that so the cashier must use Ctrl+Enter
      // or click explicitly.
      const target = e.target as HTMLElement
      // Allow Enter inside text inputs to behave normally (rare here).
      if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
        e.preventDefault()
      }
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        // Block backdrop/escape closing while loading; otherwise allow cancel.
        if (!o && loading) return
        onOpenChange(o)
      }}
    >
      <AlertDialogContent
        className="max-w-md p-0 gap-0 overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Header — warning */}
        <div className="px-6 pt-6 pb-4 shrink-0 border-b border-border/60 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <AlertDialogTitle className="mt-3 text-lg font-bold">
            {t.saleConfirmDialogTitle}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs mt-1">
            {t.saleConfirmDialogDesc}
          </AlertDialogDescription>
        </div>

        {/* Summary body */}
        {summary ? (
          <div className="px-6 py-4 space-y-3">
            {/* Payment method + customer row */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{t.saleConfirmPaymentMethod}</span>
              <Badge className={cn("tabular-nums", PAYMENT_BADGE[summary.paymentMethod] || "")}>
                {paymentLabel(summary.paymentMethod)}
              </Badge>
            </div>
            {summary.customerName ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{t.customer}</span>
                <span className="text-xs font-medium truncate max-w-[60%]">{summary.customerName}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{t.itemsCount}</span>
              <span className="text-xs font-medium tabular-nums">
                {t.itemsCountLabel.replace("{count}", String(summary.itemCount))}
              </span>
            </div>

            <Separator />

            {/* Amount breakdown */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{t.subtotal}</span>
                <span className="tabular-nums">{formatCurrency(summary.subtotal)}</span>
              </div>
              {summary.discount > 0 ? (
                <div className="flex justify-between text-rose-600">
                  <span>{t.discount}</span>
                  <span className="tabular-nums">- {formatCurrency(summary.discount)}</span>
                </div>
              ) : null}
              {summary.taxAmount > 0 ? (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t.tax} ({summary.taxRate}%)</span>
                  <span className="tabular-nums">{formatCurrency(summary.taxAmount)}</span>
                </div>
              ) : null}
              {summary.deliveryFee > 0 ? (
                <div className="flex justify-between text-sky-600 bg-sky-500/5 -mx-1 px-1 py-0.5 rounded">
                  <span className="flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5" />
                    {t.deliveryFeeLabel}{summary.driverName ? ` · ${summary.driverName}` : ""}
                  </span>
                  <span className="tabular-nums">+ {formatCurrency(summary.deliveryFee)}</span>
                </div>
              ) : null}
            </div>

            <Separator />

            {/* Grand total */}
            <div className="flex justify-between items-center pt-1">
              <span className="font-bold">{t.saleConfirmGrandTotalLabel}</span>
              <span className="text-2xl font-bold tabular-nums text-primary">
                {formatCurrency(summary.total)}
              </span>
            </div>
          </div>
        ) : null}

        {/* Action footer — green confirm + red cancel */}
        <div className="shrink-0 border-t border-border/60 bg-muted/20 px-6 py-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-1.5 border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              <X className="h-4 w-4" />
              {t.saleConfirmCancelBtn}
            </Button>
            <Button
              className="flex-1 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={onConfirm}
              disabled={loading}
              title={t.saleConfirmOrCtrlEnter}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {loading ? t.completing : t.saleConfirmConfirmBtn}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            {t.saleConfirmCtrlEnterHint} <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[9px] font-mono">Ctrl</kbd> + <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[9px] font-mono">Enter</kbd>
          </p>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
