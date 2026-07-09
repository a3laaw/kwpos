"use client"

import * as React from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  ArrowRightLeft, Plus, Search, Loader2, CheckCircle2, ArrowLeft, ArrowRight, Truck,
} from "lucide-react"
import { useProducts, useWarehouses } from "@/hooks/use-api"
import { useFmt } from "@/components/currency-context"
import { cn } from "@/lib/utils"

interface TransferLine {
  productId: string
  productName: string
  quantity: string
  unitCost: number
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  OUT: { label: "بالطريق", className: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
  RECEIVED: { label: "مستلم", className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" },
  CANCELLED: { label: "ملغي", className: "bg-rose-500/15 text-rose-700 border-rose-500/30" },
}

export function TransfersView() {
  const fmt = useFmt()
  const [fromWh, setFromWh] = React.useState("")
  const [toWh, setToWh] = React.useState("")
  const [lines, setLines] = React.useState<TransferLine[]>([])
  const [barcodeSearch, setBarcodeSearch] = React.useState("")
  const [note, setNote] = React.useState("")
  const [creating, setCreating] = React.useState(false)
  const [transfers, setTransfers] = React.useState<any[]>([])

  const { data: productsData } = useProducts()
  const { data: whs } = useWarehouses()
  const products = productsData?.items ?? []
  const warehouses = whs?.items ?? []

  // Load existing transfers
  React.useEffect(() => {
    fetch("/api/stock-transfers").then((r) => r.json()).then((d) => setTransfers(d.items || []))
  }, [])

  function addProduct(productId: string) {
    if (lines.find((l) => l.productId === productId)) return
    const p = products.find((pr) => pr.id === productId)
    if (!p) return
    setLines((arr) => [...arr, { productId: p.id, productName: p.name, quantity: "1", unitCost: p.costPrice }])
  }

  function handleBarcodeSearch(e: React.KeyboardEvent) {
    if (e.key !== "Enter") return
    const code = barcodeSearch.trim()
    if (!code) return
    const p = products.find((pr) => pr.name.includes(code) || pr.barcode === code)
    if (p) { addProduct(p.id); toast.info(`أضيف: ${p.name}`) }
    else toast.error("لم يُعثر على الصنف")
    setBarcodeSearch("")
  }

  function setQty(productId: string, qty: string) {
    setLines((arr) => arr.map((l) => l.productId === productId ? { ...l, quantity: qty } : l))
  }
  function removeLine(productId: string) {
    setLines((arr) => arr.filter((l) => l.productId !== productId))
  }

  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * l.unitCost, 0)

  async function handleCreate() {
    if (!fromWh || !toWh) { toast.error("اختر المخزنين"); return }
    if (fromWh === toWh) { toast.error("لا يمكن التحويل لنفس المخزن"); return }
    if (lines.length === 0) { toast.error("أضف أصنافاً"); return }
    setCreating(true)
    try {
      const res = await fetch("/api/stock-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromWarehouseId: fromWh, toWarehouseId: toWh, note: note.trim() || undefined,
          items: lines.map((l) => ({ productId: l.productId, quantity: Number(l.quantity) || 0 })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error)
      toast.success("تم إنشاء التحويل", { description: `${data.transferNo} — بضاعة بالطريق` })
      setLines([]); setNote("")
      // Refresh list
      const list = await fetch("/api/stock-transfers").then((r) => r.json())
      setTransfers(list.items || [])
    } catch (err: any) {
      toast.error("فشل التحويل", { description: err?.message })
    } finally { setCreating(false) }
  }

  async function handleReceive(id: string) {
    try {
      const res = await fetch(`/api/stock-transfers/${id}/receive`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error)
      toast.success("تم استلام التحويل", { description: "أُضيفت الكميات للمخزن المستلم" })
      const list = await fetch("/api/stock-transfers").then((r) => r.json())
      setTransfers(list.items || [])
    } catch (err: any) {
      toast.error("فشل الاستلام", { description: err?.message })
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="التحويلات بين الفروع"
        description="إنشاء تحويل (إرسال) من مخزن لآخر، ثم استلام البضاعة عند الوصول."
        icon={<ArrowRightLeft className="h-5 w-5" />}
      />

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left: create transfer */}
        <div className="lg:col-span-2 space-y-4">
          {/* Warehouses */}
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1"><ArrowRight className="h-3 w-3" /> من مخزن</Label>
                <Select value={fromWh} onValueChange={setFromWh}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="اختر المصدر" /></SelectTrigger>
                  <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1"><ArrowLeft className="h-3 w-3" /> إلى مخزن</Label>
                <Select value={toWh} onValueChange={setToWh}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="اختر الوجهة" /></SelectTrigger>
                  <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Barcode search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={barcodeSearch} onChange={(e) => setBarcodeSearch(e.target.value)}
              onKeyDown={handleBarcodeSearch}
              placeholder="امسح باركود الصنف لإضافته..." className="pr-9" />
          </div>

          {/* Items */}
          {lines.length === 0 ? (
            <EmptyState icon={<Truck className="h-7 w-7" />} title="لا توجد أصناف" description="ابحث بالباركود وأضف الأصناف للتحويل" />
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-start p-2.5 font-medium">الصنف</th>
                        <th className="text-center p-2.5 font-medium w-20">كمية</th>
                        <th className="text-center p-2.5 font-medium w-24">التكلفة</th>
                        <th className="text-center p-2.5 font-medium w-24">الإجمالي</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l) => (
                        <tr key={l.productId} className="border-t border-border/40 hover:bg-muted/20">
                          <td className="p-2.5 font-medium">{l.productName}</td>
                          <td className="p-2.5 text-center">
                            <Input type="number" min={1} value={l.quantity}
                              onChange={(e) => setQty(l.productId, e.target.value)}
                              className="h-7 w-16 text-center tabular-nums mx-auto" />
                          </td>
                          <td className="p-2.5 text-center tabular-nums">{fmt.currency(l.unitCost)}</td>
                          <td className="p-2.5 text-center tabular-nums font-medium">{fmt.currency((Number(l.quantity) || 0) * l.unitCost)}</td>
                          <td className="p-2.5 text-center">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeLine(l.productId)}>
                              <Plus className="h-3.5 w-3.5 rotate-45" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: summary + create */}
        <div className="lg:col-span-1">
          <Card className="lg:sticky lg:top-20">
            <CardHeader><CardTitle className="text-base">ملخص التحويل</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">عدد الأصناف</span>
                <span className="tabular-nums">{fmt.number(lines.length)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">إجمالي القيمة (بالتكلفة)</span>
                <span className="tabular-nums font-bold text-primary">{fmt.currency(total)}</span>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">ملاحظة</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="اختياري" className="h-8 text-sm" />
              </div>
              <Separator />
              <Button onClick={handleCreate} disabled={lines.length === 0 || !fromWh || !toWh || creating} className="w-full gap-2">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
                إنشاء تحويل (إرسال)
              </Button>
              <p className="text-[10px] text-muted-foreground">
                الخطوة ١: خصم من المخزن المرسل (بضاعة بالطريق).
                الخطوة ٢: استلام عند الوصول → إضافة للمخزن المستلم + قيد محاسبي.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transfer history */}
      {transfers.length > 0 ? (
        <Card>
          <CardHeader><CardTitle className="text-base">سجل التحويلات</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-start p-2.5 font-medium">رقم</th>
                    <th className="text-start p-2.5 font-medium hidden sm:table-cell">من ← إلى</th>
                    <th className="text-center p-2.5 font-medium">أصناف</th>
                    <th className="text-center p-2.5 font-medium">القيمة</th>
                    <th className="text-center p-2.5 font-medium">الحالة</th>
                    <th className="text-center p-2.5 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((t) => {
                    const meta = STATUS_META[t.status] || STATUS_META.OUT
                    return (
                      <tr key={t.id} className="border-t border-border/40 hover:bg-muted/20">
                        <td className="p-2.5 font-mono text-xs" dir="ltr">{t.transferNo}</td>
                        <td className="p-2.5 hidden sm:table-cell text-xs text-muted-foreground">{t.fromWarehouseId?.slice(-4)} ← {t.toWarehouseId?.slice(-4)}</td>
                        <td className="p-2.5 text-center tabular-nums">{t.items?.length || 0}</td>
                        <td className="p-2.5 text-center tabular-nums">{fmt.currency(t.total)}</td>
                        <td className="p-2.5 text-center"><Badge className={meta.className}>{meta.label}</Badge></td>
                        <td className="p-2.5 text-center">
                          {t.status === "OUT" ? (
                            <Button size="sm" variant="outline" onClick={() => handleReceive(t.id)} className="h-7 gap-1 text-xs">
                              <CheckCircle2 className="h-3 w-3" /> استلام
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
