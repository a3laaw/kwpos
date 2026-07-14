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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Loader2, Ship, FilePlus, CheckCircle2 } from "lucide-react"
import { useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"
import {
  useCustomsAnnexes,
  useCreateCustomsAnnex,
  usePostCustomsAnnex,
  type CustomsAnnex,
  type PurchaseInvoice,
} from "@/hooks/use-api"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"

interface CustomsAnnexDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The posted purchase invoice the annex is attached to. */
  invoice: PurchaseInvoice | null
}

const STATUS_BADGE: Record<
  CustomsAnnex["status"],
  { labelKey: "annexDraft" | "annexAlreadyPosted"; className: string }
> = {
  DRAFT: {
    labelKey: "annexDraft",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  },
  POSTED: {
    labelKey: "annexAlreadyPosted",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  },
}

function r3(v: number): number {
  return +Number(v).toFixed(3)
}

export function CustomsAnnexDialog({
  open,
  onOpenChange,
  invoice,
}: CustomsAnnexDialogProps) {
  const t = useT()
  const fmt = useFmt()

  const createMut = useCreateCustomsAnnex()
  const postMut = usePostCustomsAnnex()

  const invoiceId = invoice?.id ?? ""
  const subtotal = invoice?.subtotal ?? 0

  // Existing annexes for this invoice (so the user can post one from the list).
  const { data: annexesData, isLoading: annexesLoading } =
    useCustomsAnnexes(invoiceId || undefined)

  const annexes = annexesData?.items ?? []

  // Form state
  const [customsRate, setCustomsRate] = React.useState("")
  const [taxRate, setTaxRate] = React.useState("")
  const [shippingRate, setShippingRate] = React.useState("")
  const [otherCharges, setOtherCharges] = React.useState("")
  const [billOfLading, setBillOfLading] = React.useState("")
  const [arrivalDate, setArrivalDate] = React.useState("")
  const [note, setNote] = React.useState("")
  const [postTarget, setPostTarget] = React.useState<CustomsAnnex | null>(null)

  // Reset form whenever the dialog opens
  React.useEffect(() => {
    if (open) {
      setCustomsRate("")
      setTaxRate("")
      setShippingRate("")
      setOtherCharges("")
      setBillOfLading("")
      setArrivalDate("")
      setNote("")
      setPostTarget(null)
    }
  }, [open, invoiceId])

  // Live calculation from the invoice subtotal
  const customsRateNum = Math.max(0, Number(customsRate) || 0)
  const taxRateNum = Math.max(0, Number(taxRate) || 0)
  const shippingRateNum = Math.max(0, Number(shippingRate) || 0)
  const otherChargesNum = Math.max(0, Number(otherCharges) || 0)

  const customsAmount = r3((subtotal * customsRateNum) / 100)
  const taxAmount = r3((subtotal * taxRateNum) / 100)
  const shippingAmount = r3((subtotal * shippingRateNum) / 100)
  const totalAnnexCost = r3(
    customsAmount + taxAmount + shippingAmount + otherChargesNum
  )

  const hasAnyInput =
    customsRateNum > 0 ||
    taxRateNum > 0 ||
    shippingRateNum > 0 ||
    otherChargesNum > 0

  async function handleSaveDraft(e: React.FormEvent) {
    e.preventDefault()
    if (!invoice) return
    if (!hasAnyInput) {
      toast.error(t.annexCreateFailed, { description: t.annexEmptyRates })
      return
    }
    try {
      await createMut.mutateAsync({
        purchaseInvoiceId: invoice.id,
        customsRate: customsRateNum,
        taxRate: taxRateNum,
        shippingRate: shippingRateNum,
        otherCharges: otherChargesNum,
        billOfLading: billOfLading.trim() || null,
        arrivalDate: arrivalDate ? new Date(arrivalDate).toISOString() : null,
        note: note.trim() || null,
      })
      toast.success(t.annexCreated)
      // Reset the form (keep the dialog open so the user can see the new annex
      // in the list below and post it if they want).
      setCustomsRate("")
      setTaxRate("")
      setShippingRate("")
      setOtherCharges("")
      setBillOfLading("")
      setArrivalDate("")
      setNote("")
    } catch (err: any) {
      const msg = String(err?.message || err)
      if (msg.includes("invoice-not-posted")) {
        toast.error(t.annexCreateFailed, {
          description: t.piCannotDeletePosted,
        })
      } else if (msg.includes("empty-annex")) {
        toast.error(t.annexCreateFailed, { description: t.annexEmptyRates })
      } else {
        toast.error(t.annexCreateFailed, { description: msg })
      }
    }
  }

  async function handlePost() {
    if (!postTarget) return
    try {
      await postMut.mutateAsync(postTarget.id)
      toast.success(t.annexPosted)
      setPostTarget(null)
    } catch (err: any) {
      const msg = String(err?.message || err)
      if (msg.includes("already-posted")) {
        toast.error(t.annexPostFailed, { description: t.annexAlreadyPosted })
      } else {
        toast.error(t.annexPostFailed, { description: msg })
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5 text-primary" />
            {t.annexTitle}
          </DialogTitle>
          <DialogDescription>{t.annexDesc}</DialogDescription>
        </DialogHeader>

        {invoice ? (
          <div className="space-y-5">
            {/* Invoice summary (read-only) */}
            <Card className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t.piNo ?? t.date}
                  </p>
                  <p className="font-mono font-medium">{invoice.invoiceNo}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.supplier}</p>
                  <p className="font-medium">{invoice.supplierName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t.annexInvoiceSubtotal}
                  </p>
                  <p className="font-semibold tabular-nums text-primary">
                    {fmt.currency(invoice.subtotal)}
                  </p>
                </div>
              </div>
            </Card>

            {/* Form: rates + other charges */}
            <form onSubmit={handleSaveDraft} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <RateInput
                  id="annex-customs"
                  label={t.annexCustomsRate}
                  value={customsRate}
                  onChange={setCustomsRate}
                  amount={customsAmount}
                  fmt={fmt}
                  t={t}
                />
                <RateInput
                  id="annex-tax"
                  label={t.annexTaxRate}
                  value={taxRate}
                  onChange={setTaxRate}
                  amount={taxAmount}
                  fmt={fmt}
                  t={t}
                />
                <RateInput
                  id="annex-shipping"
                  label={t.annexShippingRate}
                  value={shippingRate}
                  onChange={setShippingRate}
                  amount={shippingAmount}
                  fmt={fmt}
                  t={t}
                />
                <div className="space-y-2">
                  <Label htmlFor="annex-other">{t.annexOtherCharges}</Label>
                  <Input
                    id="annex-other"
                    type="number"
                    step="0.001"
                    min="0"
                    value={otherCharges}
                    onChange={(e) => setOtherCharges(e.target.value)}
                    placeholder="0.000"
                    dir="ltr"
                    className="text-end"
                  />
                  <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-sm">
                    <span className="text-xs text-muted-foreground">
                      {t.annexAmount}
                    </span>
                    <span className="font-medium tabular-nums">
                      {fmt.currency(otherChargesNum)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bill of lading + arrival date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="annex-bol">{t.annexBillOfLading}</Label>
                  <Input
                    id="annex-bol"
                    value={billOfLading}
                    onChange={(e) => setBillOfLading(e.target.value)}
                    placeholder="—"
                    dir="ltr"
                    className="text-end"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="annex-arrival">{t.annexArrivalDate}</Label>
                  <Input
                    id="annex-arrival"
                    type="date"
                    value={arrivalDate}
                    onChange={(e) => setArrivalDate(e.target.value)}
                    dir="ltr"
                    className="text-end"
                  />
                </div>
              </div>

              {/* Note */}
              <div className="space-y-2">
                <Label htmlFor="annex-note">{t.note}</Label>
                <Textarea
                  id="annex-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="—"
                />
              </div>

              {/* Live total bar */}
              <div className="rounded-lg border border-border/60 bg-muted/40 p-4 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t.annexCustomsRate}
                  </span>
                  <span className="font-medium tabular-nums">
                    {fmt.currency(customsAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t.annexTaxRate}
                  </span>
                  <span className="font-medium tabular-nums">
                    {fmt.currency(taxAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t.annexShippingRate}
                  </span>
                  <span className="font-medium tabular-nums">
                    {fmt.currency(shippingAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t.annexOtherCharges}
                  </span>
                  <span className="font-medium tabular-nums">
                    {fmt.currency(otherChargesNum)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-border/60">
                  <span className="font-medium">{t.annexTotal}</span>
                  <span className="text-lg font-bold tabular-nums text-primary">
                    {fmt.currency(totalAnnexCost)}
                  </span>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  {t.cancel}
                </Button>
                <Button
                  type="submit"
                  disabled={createMut.isPending || !hasAnyInput}
                >
                  {createMut.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FilePlus className="h-4 w-4" />
                  )}
                  {t.annexSaveDraft}
                </Button>
              </DialogFooter>
            </form>

            {/* Existing annexes for this invoice */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  {t.annexNo} — {invoice.invoiceNo}
                </h3>
                {annexes.length > 0 ? (
                  <Badge variant="secondary" className="tabular-nums">
                    {annexes.length}
                  </Badge>
                ) : null}
              </div>

              {annexesLoading ? (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                </div>
              ) : annexes.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                  {t.annexNoAnnexes}
                </div>
              ) : (
                <div className="rounded-lg border border-border/60 overflow-hidden max-h-72 overflow-y-auto scrollbar-thin">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-start font-medium px-3 py-2">
                          {t.annexNo}
                        </th>
                        <th className="text-start font-medium px-3 py-2 hidden sm:table-cell">
                          {t.annexDate}
                        </th>
                        <th className="text-center font-medium px-3 py-2">
                          {t.annexTotal}
                        </th>
                        <th className="text-center font-medium px-3 py-2">
                          {t.colStatus}
                        </th>
                        <th className="w-20 px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {annexes.map((a) => {
                        const meta = STATUS_BADGE[a.status]
                        return (
                          <tr
                            key={a.id}
                            className="border-t border-border/60 hover:bg-muted/30"
                          >
                            <td className="px-3 py-2 font-mono text-xs">
                              {a.annexNo}
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground hidden sm:table-cell">
                              {fmt.dateTime(a.annexDate)}
                            </td>
                            <td className="px-3 py-2 text-center font-semibold tabular-nums">
                              {fmt.currency(a.totalAnnexCost)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Badge
                                variant="secondary"
                                className={meta.className}
                              >
                                {t[meta.labelKey]}
                              </Badge>
                            </td>
                            <td className="px-2 py-2 text-center">
                              {a.status === "DRAFT" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 gap-1.5"
                                  onClick={() => setPostTarget(a)}
                                  disabled={postMut.isPending}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  {t.annexPost}
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>

      {/* Post confirmation */}
      <ConfirmDialog
        open={!!postTarget}
        onOpenChange={(o) => !o && setPostTarget(null)}
        title={t.annexPost}
        description={
          <span className="text-sm leading-relaxed">
            {postTarget?.annexNo} — {fmt.currency(postTarget?.totalAnnexCost ?? 0)}
          </span>
        }
        confirmText={t.annexPost}
        destructive={false}
        loading={postMut.isPending}
        onConfirm={handlePost}
      />
    </Dialog>
  )
}

/** A labelled percentage input with a live-calculated amount preview. */
function RateInput({
  id,
  label,
  value,
  onChange,
  amount,
  fmt,
  t,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  amount: number
  fmt: ReturnType<typeof useFmt>
  t: ReturnType<typeof useT>
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        step="0.001"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0.000"
        dir="ltr"
        className="text-end"
      />
      <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-sm">
        <span className="text-xs text-muted-foreground">{t.annexAmount}</span>
        <span className="font-medium tabular-nums">{fmt.currency(amount)}</span>
      </div>
    </div>
  )
}
