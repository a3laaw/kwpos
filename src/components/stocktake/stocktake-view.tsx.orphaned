"use client"

import * as React from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadingState } from "@/components/shared/loading-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  ClipboardCheck, Plus, Search, CheckCircle2, Loader2, AlertTriangle, TrendingDown, TrendingUp, Trash2,
} from "lucide-react"
import { useProducts, useWarehouses } from "@/hooks/use-api"
import { useFmt } from "@/components/currency-context"
import { cn } from "@/lib/utils"

interface CountLine {
  productId: string
  productName: string
  systemQty: number
  actualQty: string
  unitCost: number
}

export function StockTakeView() {
  const fmt = useFmt()
  const [lines, setLines] = React.useState<CountLine[]>([])
  const [warehouseId, setWarehouseId] = React.useState("")
  const [note, setNote] = React.useState("")
  const [barcodeSearch, setBarcodeSearch] = React.useState("")
  const [creating, setCreating] = React.useState(false)
  const [approveTarget, setApproveTarget] = React.useState<string | null>(null)

  const { data: productsData } = useProducts()
  const { data: whs } = useWarehouses()
  const products = productsData?.items ?? []
  const warehouses = whs?.items ?? []

  function addProduct(productId: string) {
    if (lines.find((l) => l.productId === productId)) return
    const p = products.find((pr) => pr.id === productId)
    if (!p) return
    setLines((arr) => [...arr, {
      productId: p.id, productName: p.name, systemQty: p.quantity,
      actualQty: String(p.quantity), unitCost: p.costPrice,
    }])
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

  function setActualQty(productId: string, qty: string) {
    setLines((arr) => arr.map((l) => l.productId === productId ? { ...l, actualQty: qty } : l))
  }

  function removeLine(productId: string) {
    setLines((arr) => arr.filter((l) => l.productId !== productId))
  }

  // Variance summary
  const variance = lines.reduce((acc, l) => {
    const v = (Number(l.actualQty) || 0) - l.systemQty
    const val = v * l.unitCost
    if (v < 0) acc.shortage += Math.abs(val)
    else if (v > 0) acc.surplus += val
    return acc
  }, { shortage: 0, surplus: 0 })

  async function handleCreate() {
    if (lines.length === 0) { toast.error("أضف صنفاً واحداً على الأقل"); return }
    setCreating(true)
    try {
      const res = await fetch("/api/stock-takes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: warehouseId || undefined,
          note: note.trim() || undefined,
          items: lines.map((l) => ({ productId: l.productId, actualQty: Number(l.actualQty) || 0 })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "failed")
      toast.success("تم إنشاء أمر الجرد", { description: data.takeNo })
      setLines([]); setNote(""); setApproveTarget(data.id)
    } catch (err: any) {
      toast.error("فشل إنشاء الجرد", { description: err?.message })
    } finally { setCreating(false) }
  }

  async function handleApprove() {
    if (!approveTarget) return
    try {
      const res = await fetch(`/api/stock-takes/${approveTarget}/approve`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "failed")
      toast.success("تم اعتماد الجرد", {
        description: `عجز: ${fmt.currency(data.summary?.shortageValue || 0)} • فائض: ${fmt.currency(data.summary?.surplusValue || 0)}`,
      })
      setApproveTarget(null)
    } catch (err: any) {
      toast.error("فشل الاعتماد", { description: err?.message })
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="جرد المخزون"
        description="إنشاء أمر جرد، إدخال الكميات الفعلية، وتسوية الفروقات محاسبياً."
        icon={<ClipboardCheck className="h-5 w-5" />}
      />

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left: product picker + form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Warehouse + note */}
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">المخزن (اختياري)</Label>
                <Select value={warehouseId} onValueChange={(v) => setWarehouseId(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="كل المخازن" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل المخازن</SelectItem>
                    {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">ملاحظة</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="جرد دوري / مفاجئ" className="h-9" />
              </div>
            </div>
          </Card>

          {/* Barcode search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={barcodeSearch} onChange={(e) => setBarcodeSearch(e.target.value)}
              onKeyDown={handleBarcodeSearch}
              placeholder="امسح باركود الصنف أو اكتب اسمه..." className="pr-9" />
          </div>

          {/* Count lines */}
          {lines.length === 0 ? (
            <EmptyState icon={<ClipboardCheck className="h-7 w-7" />} title="لا توجد أصناف للجرد" description="ابحث بالباركود وأضف الأصناف للجرد" />
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-right p-2.5 font-medium">الصنف</th>
                        <th className="text-center p-2.5 font-medium w-20">دفتري</th>
                        <th className="text-center p-2.5 font-medium w-20">فعلي</th>
                        <th className="text-center p-2.5 font-medium w-20">الفرق</th>
                        <th className="text-center p-2.5 font-medium w-24">قيمة الفرق</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l) => {
                        const v = (Number(l.actualQty) || 0) - l.systemQty
                        const val = v * l.unitCost
                        return (
                          <tr key={l.productId} className="border-t border-border/40 hover:bg-muted/20">
                            <td className="p-2.5 font-medium">{l.productName}</td>
                            <td className="p-2.5 text-center tabular-nums">{fmt.number(l.systemQty)}</td>
                            <td className="p-2.5 text-center">
                              <Input type="number" min={0} value={l.actualQty}
                                onChange={(e) => setActualQty(l.productId, e.target.value)}
                                className="h-7 w-16 text-center tabular-nums mx-auto" />
                            </td>
                            <td className={cn("p-2.5 text-center tabular-nums font-medium", v < 0 ? "text-rose-600" : v > 0 ? "text-emerald-600" : "text-muted-foreground")}>
                              {v > 0 ? "+" : ""}{fmt.number(v)}
                            </td>
                            <td className={cn("p-2.5 text-center tabular-nums", v < 0 ? "text-rose-600" : v > 0 ? "text-emerald-600" : "text-muted-foreground")}>
                              {fmt.currency(val)}
                            </td>
                            <td className="p-2.5 text-center">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeLine(l.productId)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: summary + actions */}
        <div className="lg:col-span-1">
          <Card className="lg:sticky lg:top-20">
            <CardHeader><CardTitle className="text-base">ملخص الجرد</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-rose-500/5 border border-rose-500/20 p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingDown className="h-3 w-3 text-rose-500" /> عجز</p>
                  <p className="text-lg font-bold tabular-nums text-rose-600">{fmt.currency(variance.shortage)}</p>
                </div>
                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3 text-emerald-500" /> فائض</p>
                  <p className="text-lg font-bold tabular-nums text-emerald-600">{fmt.currency(variance.surplus)}</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• العجز → مدين: عجز المخزون (٥٠٧٠) / دائن: المخزون (١٠١٠)</p>
                <p>• الفائض → مدين: المخزون (١٠١٠) / دائن: إيراد تسوية (٤٠٦٠)</p>
              </div>
              <Separator />
              <Button onClick={handleCreate} disabled={lines.length === 0 || creating} className="w-full gap-2">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                إنشاء واعتماد الجرد
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={!!approveTarget}
        onOpenChange={(o) => !o && setApproveTarget(null)}
        title="اعتماد الجرد"
        description={<>سيتم تعديل كميات المخزون وإنشاء القيود المحاسبية للعجز/الفائض.</>}
        confirmText="اعتماد"
        destructive={false}
        loading={creating}
        onConfirm={handleApprove}
      />
    </div>
  )
}
