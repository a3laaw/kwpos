"use client"

import * as React from "react"
import { toast } from "sonner"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
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
  ClipboardCheck, Search, Loader2, TrendingDown, TrendingUp, Trash2, CheckCircle2, Printer, Save,
} from "lucide-react"
import {
  useProducts, useWarehouses, useStockTakes, useCreateStockTake, useApproveStockTake,
} from "@/hooks/use-api"
import { useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"
import { cn } from "@/lib/utils"

interface CountLine {
  productId: string
  productName: string
  systemQty: number
  actualQty: string
  unitCost: number
}

export function StockTakeTab() {
  const t = useT()
  const fmt = useFmt()
  const [lines, setLines] = React.useState<CountLine[]>([])
  const [warehouseId, setWarehouseId] = React.useState("")
  const [note, setNote] = React.useState("")
  const [barcodeSearch, setBarcodeSearch] = React.useState("")
  const [approveTarget, setApproveTarget] = React.useState<string | null>(null)

  const { data: productsData } = useProducts()
  const { data: whs } = useWarehouses()
  const { data: takesData, refetch } = useStockTakes()
  const createMut = useCreateStockTake()
  const approveMut = useApproveStockTake()

  const products = productsData?.items ?? []
  const warehouses = whs?.items ?? []
  const takes = takesData?.items ?? []

  function addProduct(productId: string) {
    if (lines.find((l) => l.productId === productId)) return
    const p = products.find((pr) => pr.id === productId)
    if (!p) return
    setLines((arr) => [
      ...arr,
      {
        productId: p.id,
        productName: p.name,
        systemQty: p.quantity,
        actualQty: String(p.quantity),
        unitCost: p.costPrice,
      },
    ])
  }

  function handleBarcodeSearch(e: React.KeyboardEvent) {
    if (e.key !== "Enter") return
    const code = barcodeSearch.trim()
    if (!code) return
    const p = products.find((pr) => pr.name.includes(code) || pr.barcode === code)
    if (p) {
      addProduct(p.id)
      toast.info(`أضيف: ${p.name}`)
    } else {
      toast.error("لم يُعثر على الصنف")
    }
    setBarcodeSearch("")
  }

  function setActualQty(productId: string, qty: string) {
    setLines((arr) =>
      arr.map((l) => (l.productId === productId ? { ...l, actualQty: qty } : l))
    )
  }

  function removeLine(productId: string) {
    setLines((arr) => arr.filter((l) => l.productId !== productId))
  }

  // Live variance summary (client-side preview)
  const variance = lines.reduce(
    (acc, l) => {
      const v = (Number(l.actualQty) || 0) - l.systemQty
      const val = v * l.unitCost
      if (v < 0) acc.shortage += Math.abs(val)
      else if (v > 0) acc.surplus += val
      return acc
    },
    { shortage: 0, surplus: 0 }
  )

  // ── Stage 1: Print stock count sheet (paper for physical count) ──
  function handlePrintCountSheet() {
    if (products.length === 0) {
      toast.error("لا توجد منتجات")
      return
    }
    const whName = warehouses.find((w) => w.id === warehouseId)?.name || "كل المخازن"
    const dateStr = new Intl.DateTimeFormat("ar-KW-u-nu-latn", {
      year: "numeric", month: "long", day: "numeric",
    }).format(new Date())

    const rows = products.map((p: any, i: number) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td class="name">${p.name}</td>
        <td class="barcode">${p.barcode || "—"}</td>
        <td class="system">${p.quantity}</td>
        <td class="actual"></td>
        <td class="diff"></td>
      </tr>`).join("")

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<title>كشف جرد — ${whName}</title>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 12mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Tajawal", sans-serif; color: #000; font-size: 11px; }
  .header { text-align: center; margin-bottom: 6mm; border-bottom: 2px solid #2E6237; padding-bottom: 3mm; }
  .header h1 { font-size: 20px; color: #2E6237; }
  .header p { font-size: 11px; color: #555; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; }
  thead th { background: #f0fdf4; color: #065f46; font-size: 10px; padding: 2mm; border-bottom: 2px solid #2E6237; }
  thead th.num { width: 8mm; text-align: center; }
  thead th.system, thead th.actual, thead th.diff { width: 20mm; text-align: center; }
  thead th.barcode { width: 30mm; text-align: center; }
  tbody td { padding: 2mm; border-bottom: 1px solid #ddd; font-size: 10px; }
  tbody td.num, tbody td.system { text-align: center; }
  tbody td.actual, tbody td.diff { text-align: center; height: 8mm; background: #fafafa; }
  tbody td.barcode { text-align: center; font-family: monospace; font-size: 9px; }
  .footer { margin-top: 6mm; text-align: center; font-size: 9px; color: #999; }
  @media print { body { -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="header">
    <h1>كشف جرد المخزون</h1>
    <p>المخزن: ${whName} | التاريخ: ${dateStr}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th class="num">#</th>
        <th>الصنف</th>
        <th class="barcode">الباركود</th>
        <th class="system">الرصيد بالنظام</th>
        <th class="actual">العد الفعلي</th>
        <th class="diff">الفرق</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">
    <p>تم إنشاء كشف الجرد: ${dateStr} — اطبع هذا الكشف، قم بالعد الفعلي، ثم أدخل الأرقام في النظام</p>
  </div>
</body>
</html>`

    const features = "width=900,height=700,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes"
    const w = window.open("", "_blank", features)
    if (!w) { alert("يرجى السماح بالنوافذ المنبثقة"); return }
    w.document.open()
    w.document.write(html)
    w.document.close()
    w.document.title = `كشف جرد — ${whName}`
    const trigger = () => { w.focus(); w.print() }
    if (w.document.fonts?.ready) {
      w.document.fonts.ready.then(() => setTimeout(trigger, 200))
    } else { setTimeout(trigger, 1200) }
  }

  // ── Save draft (Stage 2a): save actual quantities without approving ──
  // This allows the worker to save progress and come back later for large
  // inventories that take days to count.
  const [draftId, setDraftId] = React.useState<string | null>(null)
  const [saveDraftMut] = React.useState({ isPending: false })

  async function handleSaveDraft() {
    if (lines.length === 0) {
      toast.error("لا توجد أصناف للحفظ")
      return
    }
    try {
      const res = await createMut.mutateAsync({
        warehouseId: warehouseId || undefined,
        note: (note.trim() || "") + " [مسودة]",
        items: lines.map((l) => ({
          productId: l.productId,
          actualQty: Number(l.actualQty) || 0,
        })),
      })
      setDraftId(res.id)
      toast.success("تم حفظ المسودة", { description: `${res.takeNo} — يمكنك العودة لاحقًا لإكمال الجرد` })
    } catch (err: any) {
      toast.error("فشل حفظ المسودة", { description: String(err?.message || err) })
    }
  }

  async function handleCreate() {
    if (lines.length === 0) {
      toast.error(t.stockTakeCreateFailed, { description: t.newStockTake })
      return
    }
    try {
      const res = await createMut.mutateAsync({
        warehouseId: warehouseId || undefined,
        note: note.trim() || undefined,
        items: lines.map((l) => ({
          productId: l.productId,
          actualQty: Number(l.actualQty) || 0,
        })),
      })
      toast.success(t.stockTakeCreated, { description: res.takeNo })
      setLines([])
      setNote("")
      setDraftId(null)
      // Auto-open approve dialog for the just-created take
      setApproveTarget(res.id)
    } catch (err: any) {
      toast.error(t.stockTakeCreateFailed, { description: String(err?.message || err) })
    }
  }

  async function handleApprove() {
    if (!approveTarget) return
    try {
      const res = await approveMut.mutateAsync(approveTarget)
      toast.success(t.stockTakeApproved, {
        description: `${t.shortage}: ${fmt.currency(res.summary.shortageValue)} • ${t.surplus}: ${fmt.currency(res.summary.surplusValue)}`,
      })
      setApproveTarget(null)
      refetch()
    } catch (err: any) {
      toast.error(t.stockTakeApproveFailed, { description: String(err?.message || err) })
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left: product picker + form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Warehouse + note */}
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t.stockTakeWarehouse}</Label>
                <Select value={warehouseId} onValueChange={(v) => setWarehouseId(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={t.stockTakeAllWarehouses} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.stockTakeAllWarehouses}</SelectItem>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t.note}</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="—" className="h-9" />
              </div>
            </div>
          </Card>

          {/* Stage 1: Print count sheet */}
          <div className="rounded-lg border-2 border-dashed border-emerald-400/40 bg-emerald-50/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-emerald-700">المرحلة 1: طباعة كشف الجرد</p>
                <p className="text-xs text-muted-foreground">اطبع كشف بكل المنتجات والرصيد الحالي للعد الفعلي يدويًا</p>
              </div>
              <Button variant="outline" className="gap-2 shrink-0" onClick={handlePrintCountSheet}>
                <Printer className="h-4 w-4" />
                طباعة كشف الجرد
              </Button>
            </div>
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
            />
          </div>

          {/* Count lines */}
          {lines.length === 0 ? (
            <EmptyState icon={<ClipboardCheck className="h-7 w-7" />} title={t.noStockTakes} />
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-start p-2.5 font-medium">{t.productName || "الصنف"}</th>
                        <th className="text-center p-2.5 font-medium w-20">{t.systemQty}</th>
                        <th className="text-center p-2.5 font-medium w-20">{t.actualQty}</th>
                        <th className="text-center p-2.5 font-medium w-20">{t.varianceLabel}</th>
                        <th className="text-center p-2.5 font-medium w-24">{t.varianceValue}</th>
                        <th className="w-10" />
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
                              <Input
                                type="number"
                                min={0}
                                value={l.actualQty}
                                onChange={(e) => setActualQty(l.productId, e.target.value)}
                                className="h-7 w-16 text-center tabular-nums mx-auto"
                              />
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
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-primary" />
                {t.stockTakeTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-rose-500/5 border border-rose-500/20 p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingDown className="h-3 w-3 text-rose-500" /> {t.shortage}
                  </p>
                  <p className="text-lg font-bold tabular-nums text-rose-600">{fmt.currency(variance.shortage)}</p>
                </div>
                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-emerald-500" /> {t.surplus}
                  </p>
                  <p className="text-lg font-bold tabular-nums text-emerald-600">{fmt.currency(variance.surplus)}</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• {t.shortage} → {t.statementDebit} 5070 / {t.statementCredit} 1010</p>
                <p>• {t.surplus} → {t.statementDebit} 1010 / {t.statementCredit} 4060</p>
              </div>
              <Separator />
              {/* Stage 2: Close stock take online */}
              <div className="rounded-lg border-2 border-dashed border-blue-400/40 bg-blue-50/20 p-3 text-center">
                <p className="text-xs font-medium text-blue-700 mb-2">المرحلة 2: تقفيل الجرد على النظام</p>
                <p className="text-[10px] text-muted-foreground mb-2">بعد إدخال الأرقام الفعلية، اضغط زر الحفظ كمسودة أو الاعتماد النهائي</p>
              </div>
              {/* Save draft — for large inventories that take days */}
              <Button variant="outline" onClick={handleSaveDraft} disabled={lines.length === 0 || createMut.isPending} className="w-full gap-2">
                {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                حفظ كمسودة
              </Button>
              {draftId ? (
                <p className="text-[10px] text-center text-muted-foreground">
                  تم حفظ المسودة — يمكن العودة لها لاحقًا من قائمة الجرد
                </p>
              ) : null}
              <Button onClick={handleCreate} disabled={lines.length === 0 || createMut.isPending} className="w-full gap-2">
                {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                {t.newStockTake} (اعتماد نهائي)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Existing stock takes list */}
      {takes.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-muted-foreground">{t.stockTakeTitle}</h4>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-start p-2.5 font-medium">#{t.returnNo}</th>
                  <th className="text-start p-2.5 font-medium">{t.status || "الحالة"}</th>
                  <th className="text-center p-2.5 font-medium">{t.shortage}</th>
                  <th className="text-center p-2.5 font-medium">{t.surplus}</th>
                  <th className="text-start p-2.5 font-medium hidden md:table-cell">{t.statementDate}</th>
                  <th className="w-24" />
                </tr>
              </thead>
              <tbody>
                {takes.map((tk) => {
                  const shortage = tk.items.filter((i) => i.variance < 0).reduce((s, i) => s + Math.abs(i.varianceValue), 0)
                  const surplus = tk.items.filter((i) => i.variance > 0).reduce((s, i) => s + i.varianceValue, 0)
                  const approved = tk.status === "APPROVED"
                  return (
                    <tr key={tk.id} className="border-t border-border/40 hover:bg-muted/20">
                      <td className="p-2.5 font-mono text-xs" dir="ltr">{tk.takeNo}</td>
                      <td className="p-2.5">
                        <Badge variant={approved ? "default" : "secondary"} className={approved ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" : "bg-amber-500/15 text-amber-700 border-amber-500/30"}>
                          {approved ? <CheckCircle2 className="h-3 w-3 me-1" /> : null}
                          {approved ? t.stockTakeApproved : t.newStockTake}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-center tabular-nums text-rose-600">{shortage > 0 ? fmt.currency(shortage) : "—"}</td>
                      <td className="p-2.5 text-center tabular-nums text-emerald-600">{surplus > 0 ? fmt.currency(surplus) : "—"}</td>
                      <td className="p-2.5 text-xs text-muted-foreground hidden md:table-cell" dir="ltr">
                        {new Date(tk.createdAt).toLocaleDateString("en-GB")}
                      </td>
                      <td className="p-2.5 text-center">
                        {!approved ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setApproveTarget(tk.id)}
                            className="gap-1 h-7 text-xs"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            {t.approveStockTake}
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={!!approveTarget}
        onOpenChange={(o) => !o && setApproveTarget(null)}
        title={t.stockTakeConfirmApprove}
        description={<>{t.stockTakeConfirmApproveDesc}</>}
        confirmText={t.approveStockTake}
        destructive={false}
        loading={approveMut.isPending}
        onConfirm={handleApprove}
      />
    </div>
  )
}
