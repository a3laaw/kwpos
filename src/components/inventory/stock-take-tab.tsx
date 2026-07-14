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
  ClipboardCheck, Loader2, Trash2, CheckCircle2, Printer, Save, Play, FilePlus2, Filter,
} from "lucide-react"
import {
  useProducts, useCategories, useWarehouses, useStockTakes,
  useCreateStockTake, useApproveStockTake,
} from "@/hooks/use-api"
import { useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"
import { cn } from "@/lib/utils"

interface CountLine {
  productId: string
  productName: string
  barcode: string | null
  systemQty: number
  actualQty: string
  unitCost: number
}

export function StockTakeTab() {
  const t = useT()
  const fmt = useFmt()
  const [lines, setLines] = React.useState<CountLine[]>([])
  const [warehouseId, setWarehouseId] = React.useState("all")
  const [categoryId, setCategoryId] = React.useState("all")
  const [note, setNote] = React.useState("")
  const [approveTarget, setApproveTarget] = React.useState<string | null>(null)
  const [currentDraftId, setCurrentDraftId] = React.useState<string | null>(null)
  const [currentDraftNo, setCurrentDraftNo] = React.useState<string | null>(null)
  const [mode, setMode] = React.useState<"idle" | "counting">("idle")
  const [showBookValue, setShowBookValue] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const { data: productsData } = useProducts()
  const { data: catsData } = useCategories()
  const { data: whs } = useWarehouses()
  const { data: takesData, refetch } = useStockTakes()
  const createMut = useCreateStockTake()
  const approveMut = useApproveStockTake()

  const allProducts = productsData?.items ?? []
  const categories = catsData?.items ?? []
  const warehouses = (whs?.items ?? []).filter((w: any) => w.isActive)
  const takes = takesData?.items ?? []

  // Filter lines by search (for large inventories)
  const filteredLines = search.trim()
    ? lines.filter((l) =>
        l.productName.includes(search.trim()) ||
        (l.barcode && l.barcode.includes(search.trim()))
      )
    : lines

  // ── Start a new stock take: auto-load all products ──
  async function handleStartNew() {
    if (allProducts.length === 0) {
      toast.error("لا توجد منتجات لجردها")
      return
    }

    // Filter products by category if selected
    const filtered = categoryId !== "all"
      ? allProducts.filter((p: any) => p.categoryId === categoryId)
      : allProducts

    if (filtered.length === 0) {
      toast.error("لا توجد منتجات في هذا القسم")
      return
    }

    // Load all products as blank lines (blind count)
    const newLines: CountLine[] = filtered.map((p: any) => ({
      productId: p.id,
      productName: p.name,
      barcode: p.barcode ?? null,
      systemQty: p.quantity,
      actualQty: "",
      unitCost: p.costPrice,
    }))

    setLines(newLines)
    setMode("counting")
    setCurrentDraftId(null)
    setCurrentDraftNo(null)
    setNote(`مسودة جرد - ${new Date().toLocaleDateString("ar-KW-u-nu-latn")}`)

    // Create the draft on the server immediately (loadAll)
    try {
      const res = await createMut.mutateAsync({
        warehouseId: warehouseId === "all" ? undefined : warehouseId,
        categoryId: categoryId === "all" ? undefined : categoryId,
        loadAll: true,
        note: `مسودة جرد - ${new Date().toLocaleDateString("ar-KW-u-nu-latn")}`,
        items: [], // loadAll takes precedence
      } as any)
      setCurrentDraftId(res.id)
      setCurrentDraftNo(res.takeNo)
      toast.success(`تم بدء جرد جديد: ${res.takeNo}`, {
        description: `${newLines.length} صنف — ابدأ بإدخال الأرصدة الفعلية`,
      })
    } catch (err: any) {
      toast.error("فشل إنشاء المسودة", { description: String(err?.message || err) })
    }
  }

  function setActualQty(productId: string, qty: string) {
    setLines((arr) =>
      arr.map((l) => (l.productId === productId ? { ...l, actualQty: qty } : l))
    )
  }

  // ── Save (update existing draft) ──
  async function handleSave() {
    if (!currentDraftId) {
      toast.error("لم يتم إنشاء المسودة بعد")
      return
    }
    const filledLines = lines.filter((l) => l.actualQty !== "")
    if (filledLines.length === 0) {
      toast.error("لم يتم إدخال أي أرصدة بعد")
      return
    }
    try {
      const res = await fetch(`/api/stock-takes/${currentDraftId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note,
          items: lines.map((l) => ({
            productId: l.productId,
            actualQty: Number(l.actualQty) || 0,
          })),
        }),
      })
      if (!res.ok) throw new Error(`request-failed:${res.status}`)
      toast.success("تم حفظ التقدم", {
        description: `${currentDraftNo} — ${filledLines.length}/${lines.length} صنف مُدخل`,
      })
    } catch (err: any) {
      toast.error("فشل الحفظ", { description: String(err?.message || err) })
    }
  }

  // ── Continue an existing draft ──
  async function handleContinue(takeId: string) {
    try {
      const res = await fetch(`/api/stock-takes/${takeId}`)
      if (!res.ok) throw new Error(`request-failed:${res.status}`)
      const tk = await res.json()
      if (tk.status !== "DRAFT") {
        toast.error("لا يمكن متابعة جرد معتمد")
        return
      }
      // Load the items into the form
      const loadedLines: CountLine[] = (tk.items || []).map((it: any) => ({
        productId: it.productId,
        productName: it.productName,
        barcode: null,
        systemQty: it.systemQty,
        actualQty: it.actualQty ? String(it.actualQty) : "",
        unitCost: it.unitCost,
      }))
      setLines(loadedLines)
      setNote(tk.note || "")
      setCurrentDraftId(tk.id)
      setCurrentDraftNo(tk.takeNo)
      setWarehouseId(tk.warehouseId || "all")
      setMode("counting")
      toast.success(`متابعة الجرد: ${tk.takeNo}`, {
        description: `${loadedLines.filter((l) => l.actualQty !== "").length}/${loadedLines.length} صنف مُدخل مسبقاً`,
      })
    } catch (err: any) {
      toast.error("فشل فتح المسودة", { description: String(err?.message || err) })
    }
  }

  // ── Approve final ──
  async function handleApprove() {
    if (!approveTarget) return
    try {
      // Save first (update the draft with latest values)
      if (currentDraftId) {
        await fetch(`/api/stock-takes/${currentDraftId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            note,
            items: lines.map((l) => ({
              productId: l.productId,
              actualQty: Number(l.actualQty) || 0,
            })),
          }),
        })
      }
      const res = await approveMut.mutateAsync(approveTarget)
      toast.success(t.stockTakeApproved, {
        description: `${t.shortage}: ${fmt.currency(res.summary.shortageValue)} • ${t.surplus}: ${fmt.currency(res.summary.surplusValue)}`,
      })
      setApproveTarget(null)
      setMode("idle")
      setLines([])
      setCurrentDraftId(null)
      setCurrentDraftNo(null)
      refetch()
    } catch (err: any) {
      toast.error(t.stockTakeApproveFailed, { description: String(err?.message || err) })
    }
  }

  // ── Print blind count sheet ──
  function handlePrintCountSheet() {
    if (lines.length === 0) {
      toast.error("لا توجد أصناف")
      return
    }
    const whName = warehouseId === "all" ? "كل المخازن" : (warehouses.find((w) => w.id === warehouseId)?.name || "—")
    const dateStr = new Intl.DateTimeFormat("ar-KW-u-nu-latn", {
      year: "numeric", month: "long", day: "numeric",
    }).format(new Date())

    const rows = lines.map((l, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td class="name">${l.productName}</td>
        <td class="barcode">${l.barcode || "—"}</td>
        <td class="actual"></td>
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
  thead th.actual { width: 30mm; text-align: center; }
  thead th.barcode { width: 30mm; text-align: center; }
  tbody td { padding: 2mm; border-bottom: 1px solid #ddd; font-size: 10px; }
  tbody td.num { text-align: center; }
  tbody td.actual { text-align: center; height: 10mm; background: #fafafa; }
  tbody td.barcode { text-align: center; font-family: monospace; font-size: 9px; }
  .footer { margin-top: 6mm; text-align: center; font-size: 9px; color: #999; }
  @media print { body { -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="header">
    <h1>كشف جرد المخزون (جرد أعمى)</h1>
    <p>المخزن: ${whName} | التاريخ: ${dateStr}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th class="num">#</th>
        <th>الصنف</th>
        <th class="barcode">الباركود</th>
        <th class="actual">العد الفعلي</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">
    <p>كشف جرد أعمى — لا يحتوي على الرصيد الدفتري. قم بالعد الفعلي واكتب الرقم في خانة "العد الفعلي"</p>
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

  function handleCancel() {
    setMode("idle")
    setLines([])
    setCurrentDraftId(null)
    setCurrentDraftNo(null)
    setNote("")
  }

  // Counted progress
  const countedCount = lines.filter((l) => l.actualQty !== "").length
  const progress = lines.length > 0 ? Math.round((countedCount / lines.length) * 100) : 0

  return (
    <div className="space-y-4">
      {/* ── Setup mode: choose warehouse + category + start ── */}
      {mode === "idle" ? (
        <Card className="p-6">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <ClipboardCheck className="h-7 w-7 text-primary" />
              </div>
            </div>
            <h3 className="text-lg font-bold">بدء جرد جديد</h3>
            <p className="text-sm text-muted-foreground mt-1">
              اختر المخزن والقسم ثم ابدأ — سيتم تحميل كل الأصناف تلقائياً
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {/* Warehouse */}
            <div className="space-y-2">
              <Label className="text-sm">{t.stockTakeWarehouse || "المخزن"}</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.stockTakeAllWarehouses || "كل المخازن"}</SelectItem>
                  {warehouses.map((w: any) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-sm">القسم / التصنيف</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأقسام</SelectItem>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label className="text-sm">{t.note || "ملاحظة"}</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="اختياري"
              />
            </div>
          </div>

          <div className="flex justify-center mt-6">
            <Button onClick={handleStartNew} disabled={createMut.isPending} size="lg" className="gap-2">
              {createMut.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <FilePlus2 className="h-5 w-5" />}
              بدء جرد جديد
            </Button>
          </div>
          {createMut.isPending ? (
            <p className="text-center text-xs text-muted-foreground mt-2">
              جاري تحميل كل الأصناف...
            </p>
          ) : null}
        </Card>
      ) : null}

      {/* ── Counting mode: table + actions ── */}
      {mode === "counting" ? (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Left: search + count table */}
          <div className="lg:col-span-2 space-y-3">
            {/* Draft info bar */}
            <Card className="p-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 border-amber-500/30">
                    {currentDraftNo || "مسودة جديدة"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {countedCount}/{lines.length} صنف — {progress}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleCancel} className="text-xs">
                    إلغاء
                  </Button>
                </div>
              </div>
            </Card>

            {/* Search + print */}
            <div className="flex gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالاسم أو الباركود..."
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={handlePrintCountSheet} className="gap-2 shrink-0">
                <Printer className="h-4 w-4" />
                طباعة كشف
              </Button>
            </div>

            {/* Count table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-y-auto scrollbar-thin" style={{ maxHeight: "calc(100vh - 22rem)" }}>
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 sticky top-0 z-10">
                      <tr>
                        <th className="text-start p-2.5 font-medium w-10">#</th>
                        <th className="text-start p-2.5 font-medium">{t.productName || "الصنف"}</th>
                        {showBookValue ? (
                          <th className="text-center p-2.5 font-medium w-20">دفتري</th>
                        ) : null}
                        <th className="text-center p-2.5 font-medium w-28">{t.actualQty || "العد الفعلي"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLines.map((l, idx) => (
                        <tr
                          key={l.productId}
                          className={cn(
                            "border-t border-border/40 hover:bg-muted/20",
                            l.actualQty !== "" && "bg-emerald-50/30 dark:bg-emerald-950/10"
                          )}
                        >
                          <td className="p-2.5 text-center text-muted-foreground tabular-nums">
                            {lines.indexOf(l) + 1}
                          </td>
                          <td className="p-2.5">
                            <div className="font-medium">{l.productName}</div>
                            {l.barcode ? (
                              <div className="text-[10px] text-muted-foreground" dir="ltr">{l.barcode}</div>
                            ) : null}
                          </td>
                          {showBookValue ? (
                            <td className="p-2.5 text-center tabular-nums text-muted-foreground">
                              {l.systemQty}
                            </td>
                          ) : null}
                          <td className="p-2.5 text-center">
                            <Input
                              type="number"
                              min={0}
                              value={l.actualQty}
                              onChange={(e) => setActualQty(l.productId, e.target.value)}
                              className="h-8 w-24 text-center tabular-nums mx-auto"
                              placeholder="؟"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: actions */}
          <div className="lg:col-span-1">
            <Card className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto scrollbar-thin">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-primary" />
                  {t.stockTakeTitle || "الجرد"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Blind count badge */}
                <div className="rounded-lg bg-muted/40 border border-border/60 p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-2">
                    {showBookValue ? "الوضع: عرض الرصيد الدفتري" : "جرد أعمى — الرصيد الدفتري مخفي"}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setShowBookValue(!showBookValue)}
                  >
                    <Filter className="h-3 w-3" />
                    {showBookValue ? "إخفاء الرصيد الدفتري" : "إظهار الرصيد الدفتري"}
                  </Button>
                </div>

                <Separator />

                {/* Progress */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">التقدم</span>
                    <span className="font-medium tabular-nums">{countedCount}/{lines.length}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <Separator />

                {/* Save */}
                <Button
                  variant="outline"
                  onClick={handleSave}
                  disabled={lines.length === 0 || countedCount === 0}
                  className="w-full gap-2"
                >
                  <Save className="h-4 w-4" />
                  حفظ التقدم
                </Button>
                {currentDraftId ? (
                  <p className="text-[10px] text-center text-muted-foreground">
                    سيتم تحديث المسودة {currentDraftNo}
                  </p>
                ) : null}

                {/* Approve */}
                <Button
                  onClick={() => currentDraftId && setApproveTarget(currentDraftId)}
                  disabled={lines.length === 0 || countedCount === 0 || !currentDraftId}
                  className="w-full gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {t.newStockTake || "اعتماد الجرد"}
                </Button>
                <p className="text-[10px] text-center text-muted-foreground">
                  الاعتماد النهائي يقفل الجرد ويُعدّل المخزون
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {/* ── Existing stock takes list ── */}
      {takes.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-muted-foreground">{t.stockTakeTitle || "الجرد السابق"}</h4>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-start p-2.5 font-medium">#</th>
                  <th className="text-start p-2.5 font-medium">{t.status || "الحالة"}</th>
                  <th className="text-center p-2.5 font-medium hidden sm:table-cell">الأصناف</th>
                  <th className="text-center p-2.5 font-medium hidden md:table-cell">{t.shortage || "عجز"}</th>
                  <th className="text-center p-2.5 font-medium hidden md:table-cell">{t.surplus || "فائض"}</th>
                  <th className="text-start p-2.5 font-medium hidden lg:table-cell">{t.statementDate || "التاريخ"}</th>
                  <th className="w-32" />
                </tr>
              </thead>
              <tbody>
                {takes.map((tk: any) => {
                  const shortage = tk.items?.filter((i: any) => i.variance < 0).reduce((s: number, i: any) => s + Math.abs(i.varianceValue), 0) || 0
                  const surplus = tk.items?.filter((i: any) => i.variance > 0).reduce((s: number, i: any) => s + i.varianceValue, 0) || 0
                  const approved = tk.status === "APPROVED"
                  const itemCount = tk.items?.length || 0
                  return (
                    <tr key={tk.id} className="border-t border-border/40 hover:bg-muted/20">
                      <td className="p-2.5 font-mono text-xs" dir="ltr">{tk.takeNo}</td>
                      <td className="p-2.5">
                        <Badge
                          variant={approved ? "default" : "secondary"}
                          className={approved
                            ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-700 border-amber-500/30"
                          }
                        >
                          {approved ? <CheckCircle2 className="h-3 w-3 me-1" /> : null}
                          {approved ? (t.stockTakeApproved || "معتمد") : (t.newStockTake || "مسودة")}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-center tabular-nums hidden sm:table-cell">{itemCount}</td>
                      <td className="p-2.5 text-center tabular-nums text-rose-600 hidden md:table-cell">
                        {shortage > 0 ? fmt.currency(shortage) : "—"}
                      </td>
                      <td className="p-2.5 text-center tabular-nums text-emerald-600 hidden md:table-cell">
                        {surplus > 0 ? fmt.currency(surplus) : "—"}
                      </td>
                      <td className="p-2.5 text-xs text-muted-foreground hidden lg:table-cell" dir="ltr">
                        {new Date(tk.createdAt).toLocaleDateString("en-GB")}
                      </td>
                      <td className="p-2.5 text-center">
                        {!approved ? (
                          <div className="flex gap-1 justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleContinue(tk.id)}
                              className="gap-1 h-7 text-xs"
                              title="متابعة الجرد"
                            >
                              <Play className="h-3 w-3" />
                              متابعة
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setApproveTarget(tk.id)}
                              className="gap-1 h-7 text-xs text-emerald-600"
                              title="اعتماد"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            {t.stockTakeApproved || "معتمد"}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Approve confirmation */}
      <ConfirmDialog
        open={!!approveTarget}
        onOpenChange={(o) => !o && setApproveTarget(null)}
        title={t.stockTakeConfirmApprove || "تأكيد الاعتماد"}
        description={<>{t.stockTakeConfirmApproveDesc || "سيتم اعتماد الجرد وتعديل المخزون بشكل نهائي"}</>}
        confirmText={t.approveStockTake || "اعتماد"}
        destructive={false}
        loading={approveMut.isPending}
        onConfirm={handleApprove}
      />
    </div>
  )
}
