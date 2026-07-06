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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Wallet } from "lucide-react"
import { useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"
import {
  useSuppliers,
  useSupplierBalances,
  useCreateSupplierPayment,
} from "@/hooks/use-api"

interface SupplierPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Preselected supplier id (e.g. when opened from a supplier card). */
  supplierId?: string | null
}

export function SupplierPaymentDialog({
  open,
  onOpenChange,
  supplierId,
}: SupplierPaymentDialogProps) {
  const t = useT()
  const fmt = useFmt()

  const { data: suppliersData } = useSuppliers()
  const { data: balancesData } = useSupplierBalances()
  const createMut = useCreateSupplierPayment()

  const [selectedSupplier, setSelectedSupplier] = React.useState<string>(supplierId ?? "")
  const [amount, setAmount] = React.useState<string>("")
  const [paymentMethod, setPaymentMethod] = React.useState<"CASH" | "BANK" | "CHECK">("CASH")
  const [referenceNo, setReferenceNo] = React.useState<string>("")
  const [paymentDate, setPaymentDate] = React.useState<string>(
    new Date().toISOString().slice(0, 10)
  )
  const [note, setNote] = React.useState<string>("")

  // Sync when dialog opens or supplierId prop changes
  React.useEffect(() => {
    if (open) {
      setSelectedSupplier(supplierId ?? "")
      setAmount("")
      setPaymentMethod("CASH")
      setReferenceNo("")
      setPaymentDate(new Date().toISOString().slice(0, 10))
      setNote("")
    }
  }, [open, supplierId])

  const suppliers = suppliersData?.items ?? []
  const balances = balancesData?.items ?? []
  const balanceMap = new Map(balances.map((b) => [b.supplierId, b.balance]))
  const currentBalance = selectedSupplier ? balanceMap.get(selectedSupplier) ?? 0 : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSupplier) {
      toast.error(t.supplierPaymentCreateFailed, { description: t.supplierBalance })
      return
    }
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error(t.supplierPaymentCreateFailed, { description: t.amountPaid })
      return
    }
    try {
      await createMut.mutateAsync({
        supplierId: selectedSupplier,
        amount: amt,
        paymentDate: paymentDate ? new Date(paymentDate).toISOString() : undefined,
        paymentMethod,
        referenceNo: referenceNo.trim() || null,
        note: note.trim() || null,
      })
      toast.success(t.supplierPaymentCreated)
      onOpenChange(false)
    } catch (err: any) {
      toast.error(t.supplierPaymentCreateFailed, { description: String(err?.message || err) })
    }
  }

  const methodLabel = (m: string) =>
    m === "CASH" ? t.paymentMethodCash : m === "BANK" ? t.paymentMethodBank : t.paymentMethodCheck

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            {t.paySupplier}
          </DialogTitle>
          <DialogDescription>{t.supplierPaymentsDesc}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Supplier */}
          <div className="space-y-2">
            <Label>{t.supplierBalance.split(" ")[0]}</Label>
            <Select
              value={selectedSupplier}
              onValueChange={setSelectedSupplier}
              disabled={!!supplierId}
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSupplier ? (
              <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-sm">
                <span className="text-muted-foreground">{t.supplierBalance}</span>
                <span className={`font-bold tabular-nums ${currentBalance > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {fmt.currency(currentBalance)}
                </span>
              </div>
            ) : null}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="sp-amount">{t.amountPaid}</Label>
            <Input
              id="sp-amount"
              type="number"
              step="0.001"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.000"
              required
              dir="ltr"
              className="text-left"
            />
          </div>

          {/* Payment method + date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t.paymentMethodLabel}</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">{t.paymentMethodCash}</SelectItem>
                  <SelectItem value="BANK">{t.paymentMethodBank}</SelectItem>
                  <SelectItem value="CHECK">{t.paymentMethodCheck}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sp-date">{t.paymentDateLabel}</Label>
              <Input
                id="sp-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                dir="ltr"
                className="text-left"
              />
            </div>
          </div>

          {/* Reference number */}
          <div className="space-y-2">
            <Label htmlFor="sp-ref">{t.referenceNo}</Label>
            <Input
              id="sp-ref"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="—"
              dir="ltr"
              className="text-left"
            />
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="sp-note">{t.note}</Label>
            <Textarea
              id="sp-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="—"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wallet className="h-4 w-4" />
              )}
              {t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
