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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2, Loader2, BookCopy } from "lucide-react"
import { useAccounts, useCreateManualJournal } from "@/hooks/use-api"
import { useFmt } from "@/components/currency-context"

interface Line {
  key: string
  accountCode: string
  debit: string
  credit: string
  description: string
}

let kseq = 0
const mkKey = () => `line-${++kseq}`

export function ManualJournalDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const fmt = useFmt()
  const { data: accountsData } = useAccounts()
  const createMut = useCreateManualJournal()
  const [description, setDescription] = React.useState("")
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10))
  const [lines, setLines] = React.useState<Line[]>([
    { key: mkKey(), accountCode: "", debit: "", credit: "", description: "" },
    { key: mkKey(), accountCode: "", debit: "", credit: "", description: "" },
  ])

  const accounts = (accountsData?.flat ?? []).filter((a) => a.code !== "1000" && a.code !== "2000" && a.code !== "3000" && a.code !== "4000" && a.code !== "5000")

  React.useEffect(() => {
    if (open) {
      setDescription("")
      setDate(new Date().toISOString().slice(0, 10))
      setLines([
        { key: mkKey(), accountCode: "", debit: "", credit: "", description: "" },
        { key: mkKey(), accountCode: "", debit: "", credit: "", description: "" },
      ])
    }
  }, [open])

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0)
  const balanced = Math.abs(totalDebit - totalCredit) < 0.001

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((arr) => arr.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }
  function addLine() {
    setLines((arr) => [...arr, { key: mkKey(), accountCode: "", debit: "", credit: "", description: "" }])
  }
  function removeLine(key: string) {
    setLines((arr) => (arr.length > 2 ? arr.filter((l) => l.key !== key) : arr))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) {
      toast.error("الوصف مطلوب")
      return
    }
    const validLines = lines.filter((l) => l.accountCode && (Number(l.debit) > 0 || Number(l.credit) > 0))
    if (validLines.length < 2) {
      toast.error("أضف سطرين على الأقل")
      return
    }
    if (!balanced) {
      toast.error("القيد غير متوازن", { description: `مدين ${fmt.currency(totalDebit)} ≠ دائن ${fmt.currency(totalCredit)}` })
      return
    }
    try {
      await createMut.mutateAsync({
        description: description.trim(),
        date,
        lines: validLines.map((l) => ({
          accountCode: l.accountCode,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          description: l.description.trim() || undefined,
        })),
      })
      toast.success("تم إنشاء القيد المحاسبي")
      onOpenChange(false)
    } catch (err: any) {
      toast.error("فشل إنشاء القيد", { description: err?.message })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookCopy className="h-5 w-5 text-primary" />
            قيد محاسبي يدوي
          </DialogTitle>
          <DialogDescription>أدخل قيداً مزدوجاً متوازناً (مدين = دائن)</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="je-desc">الوصف *</Label>
              <Input id="je-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="مثال: تسوية رصيد" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="je-date">التاريخ</Label>
              <Input id="je-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>سطور القيد</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> إضافة سطر
              </Button>
            </div>

            <div className="space-y-2 max-h-[35vh] overflow-y-auto scrollbar-thin pr-1">
              {lines.map((l) => (
                <div key={l.key} className="grid grid-cols-12 gap-2 items-center rounded-lg border border-border/60 bg-muted/20 p-2">
                  <div className="col-span-12 sm:col-span-5">
                    <Select value={l.accountCode} onValueChange={(v) => updateLine(l.key, { accountCode: v })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="اختر الحساب" /></SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.code}>
                            <span className="font-mono text-xs" dir="ltr">{a.code}</span> — {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Input type="number" min={0} step="0.001" placeholder="مدين" value={l.debit} onChange={(e) => updateLine(l.key, { debit: e.target.value })} className="h-9 tabular-nums" />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Input type="number" min={0} step="0.001" placeholder="دائن" value={l.credit} onChange={(e) => updateLine(l.key, { credit: e.target.value })} className="h-9 tabular-nums" />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <Input placeholder="وصف" value={l.description} onChange={(e) => updateLine(l.key, { description: e.target.value })} className="h-9" />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive" onClick={() => removeLine(l.key)} disabled={lines.length <= 2}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-bold"
            style={{ background: balanced ? "rgba(92,222,157,0.1)" : "rgba(244,63,94,0.1)" }}>
            <span>المجموع</span>
            <div className="flex gap-6">
              <span className="text-emerald-600 tabular-nums">مدين: {fmt.currency(totalDebit)}</span>
              <span className="text-rose-600 tabular-nums">دائن: {fmt.currency(totalCredit)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={createMut.isPending}>إلغاء</Button>
            <Button type="submit" disabled={createMut.isPending || !balanced || !description.trim()}>
              {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              حفظ القيد
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
