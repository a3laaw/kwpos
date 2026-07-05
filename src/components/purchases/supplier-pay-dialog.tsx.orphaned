"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Loader2, HandCoins, CheckCircle2 } from "lucide-react"
import { usePaySupplier } from "@/hooks/use-api"
import { useFmt } from "@/components/currency-context"
import type { PurchaseOrder } from "@/lib/types"

export function SupplierPayDialog({
  open, onOpenChange, po,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  po: PurchaseOrder | null
}) {
  const fmt = useFmt()
  const payMut = usePaySupplier()
  const [amount, setAmount] = React.useState("")
  const [discount, setDiscount] = React.useState("0")
  const [paymentAccount, setPaymentAccount] = React.useState("1010")
  const [note, setNote] = React.useState("")
  const [result, setResult] = React.useState<any>(null)

  React.useEffect(() => {
    if (po && open) {
      setAmount(String(po.total - (po as any).paidAmount || po.total))
      setDiscount("0")
      setPaymentAccount("1010")
      setNote("")
      setResult(null)
    }
  }, [po, open])

  const settleAmount = Number(amount) || 0
  const discountVal = Number(discount) || 0
  const netPaid = settleAmount - discountVal

  async function handlePay() {
    if (!po) return
    try {
      const res = await payMut.mutateAsync({
        id: po.id,
        amount: settleAmount,
        discountEarned: discountVal,
        paymentAccount,
        note: note.trim() || undefined,
      })
      setResult(res)
      toast.success("تم سداد المورد", { description: `مدفوع: ${fmt.currency(res.paidAmount)} • خصم: ${fmt.currency(res.discountEarned)}` })
    } catch (err: any) {
      toast.error("فشل السداد", { description: err?.message })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandCoins className="h-5 w-5 text-primary" />
            سداد مورد — {po?.supplierName}
          </DialogTitle>
          <DialogDescription>سداد مستحقات المورد مع الخصم المكتسب</DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#5CDE9D]/15 text-[#5CDE9D]">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="rounded-lg bg-muted/40 p-4 text-sm space-y-1 max-w-xs mx-auto">
              <div className="flex justify-between"><span>مبلغ السداد</span><span className="tabular-nums">{fmt.currency(result.paidAmount)}</span></div>
              <div className="flex justify-between text-[#5CDE9D]"><span>خصم مكتسب</span><span className="tabular-nums">{fmt.currency(result.discountEarned)}</span></div>
            </div>
            <Button onClick={() => onOpenChange(false)}>إغلاق</Button>
          </div>
        ) : (
          <>
            <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">المورد</span><span>{po?.supplierName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">إجمالي أمر الشراء</span><span className="tabular-nums">{fmt.currency(po?.total || 0)}</span></div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>مبلغ السداد (إجمالي المديونية)</Label>
                <Input type="number" min={0} step="0.001" value={amount} onChange={(e) => setAmount(e.target.value)} className="tabular-nums" />
              </div>
              <div className="space-y-1.5">
                <Label>الخصم المكتسب من المورد</Label>
                <Input type="number" min={0} step="0.001" value={discount} onChange={(e) => setDiscount(e.target.value)} className="tabular-nums" />
                <p className="text-[10px] text-muted-foreground">خصم تعجيل أو خصم تجاري منحه المورد</p>
              </div>
              <div className="space-y-1.5">
                <Label>حساب الدفع</Label>
                <Select value={paymentAccount} onValueChange={setPaymentAccount}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1010">النقدية (صندوق)</SelectItem>
                    <SelectItem value="1020">البنك</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>ملاحظة</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="اختياري" />
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>إجمالي المديونية</span><span className="tabular-nums">{fmt.currency(settleAmount)}</span>
              </div>
              <div className="flex justify-between text-[#5CDE9D]">
                <span>− الخصم المكتسب</span><span className="tabular-nums">{fmt.currency(discountVal)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-border/60 pt-1">
                <span>الصافي المدفوع</span><span className="tabular-nums text-primary text-lg">{fmt.currency(netPaid)}</span>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground">
              القيد المحاسبي: مدين حـ/ المورد ← دائن حـ/ الصندوق (الصافي) + دائن حـ/ الخصم المكتسب
            </p>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
              <Button onClick={handlePay} disabled={settleAmount <= 0 || payMut.isPending} className="gap-2">
                {payMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <HandCoins className="h-4 w-4" />}
                تأكيد السداد
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
