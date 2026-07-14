"use client"

import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { LoadingState } from "@/components/shared/loading-state"
import { EmptyState } from "@/components/shared/empty-state"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Crown, Gem, AlertTriangle, Ban, Star, Calendar, TrendingUp, Package } from "lucide-react"
import { useFmt } from "@/components/currency-context"
import { useT } from "@/components/i18n-context"
import { cn } from "@/lib/utils"

interface EfficiencyProduct {
  id: string
  name: string
  barcode: string | null
  categoryName: string | null
  unitsSold: number
  unitsReturned: number
  returnRate: number
  revenue: number
  costPrice: number
  netProfit: number
  profitContribution: number
  currentStock: number
  capitalTied: number
  scores: {
    profit: number
    sales: number
    return: number
    cost: number
  }
  efficiencyIndex: number
  decision: string
  decisionCode: "CHAMPION" | "HIDDEN_GEM" | "DECEPTIVE" | "STAGNANT"
}

interface EfficiencyData {
  period: { from: string | null; to: string | null }
  totals: {
    totalNetProfit: number
    maxUnitsSold: number
    maxCostPrice: number
    productCount: number
  }
  summary: {
    champions: number
    hiddenGems: number
    deceptive: number
    stagnant: number
  }
  products: EfficiencyProduct[]
}

const DECISION_META: Record<EfficiencyProduct["decisionCode"], {
  label: string
  icon: React.ReactNode
  color: string
  bgColor: string
}> = {
  CHAMPION: {
    label: "منتج بطل",
    icon: <Crown className="h-3.5 w-3.5" />,
    color: "text-emerald-700 dark:text-emerald-300",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700",
  },
  HIDDEN_GEM: {
    label: "فرصة كامنة",
    icon: <Gem className="h-3.5 w-3.5" />,
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700",
  },
  DECEPTIVE: {
    label: "منتج مخادع",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    color: "text-amber-700 dark:text-amber-300",
    bgColor: "bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700",
  },
  STAGNANT: {
    label: "منتج راكد",
    icon: <Ban className="h-3.5 w-3.5" />,
    color: "text-red-700 dark:text-red-300",
    bgColor: "bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700",
  },
}

function indexColor(index: number): string {
  if (index >= 70) return "text-emerald-600 dark:text-emerald-400 font-bold"
  if (index >= 40) return "text-blue-600 dark:text-blue-400 font-bold"
  if (index >= 25) return "text-amber-600 dark:text-amber-400 font-bold"
  return "text-red-600 dark:text-red-400 font-bold"
}

function indexBgColor(index: number): string {
  if (index >= 70) return "bg-emerald-50 dark:bg-emerald-950/30"
  if (index >= 40) return "bg-blue-50 dark:bg-blue-950/30"
  if (index >= 25) return "bg-amber-50 dark:bg-amber-950/30"
  return "bg-red-50 dark:bg-red-950/30"
}

export function ProductEfficiencyReport() {
  const t = useT()
  const fmt = useFmt()

  // Default: last 30 days
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
  const [from, setFrom] = React.useState(thirtyDaysAgo.toISOString().slice(0, 10))
  const [to, setTo] = React.useState(today.toISOString().slice(0, 10))
  const [data, setData] = React.useState<EfficiencyData | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function fetchReport() {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      if (from) qs.set("from", from)
      if (to) qs.set("to", to)
      const res = await fetch(`/api/reports/product-efficiency?${qs.toString()}`)
      if (!res.ok) throw new Error(`request-failed:${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setError(e?.message ?? "fetch-failed")
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch on mount + when dates change (debounced)
  React.useEffect(() => {
    const timer = setTimeout(() => fetchReport(), 300)
    return () => clearTimeout(timer)
  }, [from, to])

  return (
    <div className="space-y-4">
      {/* Date range filter */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              من تاريخ
            </Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-40"
              dir="ltr"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              إلى تاريخ
            </Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-40"
              dir="ltr"
            />
          </div>
          <Button onClick={fetchReport} disabled={loading} className="gap-2">
            {loading ? "جاري..." : "تحديث"}
          </Button>
        </div>
      </Card>

      {/* Summary cards */}
      {data && data.products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard
            label="منتج بطل"
            value={data.summary.champions}
            icon={<Crown className="h-5 w-5" />}
            color="emerald"
          />
          <SummaryCard
            label="فرصة كامنة"
            value={data.summary.hiddenGems}
            icon={<Gem className="h-5 w-5" />}
            color="blue"
          />
          <SummaryCard
            label="منتج مخادع"
            value={data.summary.deceptive}
            icon={<AlertTriangle className="h-5 w-5" />}
            color="amber"
          />
          <SummaryCard
            label="منتج راكد"
            value={data.summary.stagnant}
            icon={<Ban className="h-5 w-5" />}
            color="red"
          />
        </div>
      ) : null}

      {/* Main table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <EmptyState title="فشل تحميل التقرير" />
          ) : !data || data.products.length === 0 ? (
            <EmptyState
              icon={<Package className="h-7 w-7" />}
              title="لا توجد بيانات في هذه الفترة"
            />
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-xs border-collapse" dir="rtl">
                <thead>
                  <tr className="bg-muted/60 border-b-2 border-border">
                    <th className="text-right p-2 sticky right-0 bg-muted/60 z-10 min-w-[140px]">المنتج</th>
                    <th className="text-center p-2 min-w-[80px]">الفئة</th>
                    <th className="text-center p-2 min-w-[60px]">مبيعات</th>
                    <th className="text-center p-2 min-w-[60px]">مرتجع</th>
                    <th className="text-center p-2 min-w-[70px]">معدل المرتجع %</th>
                    <th className="text-center p-2 min-w-[80px]">الإيراد</th>
                    <th className="text-center p-2 min-w-[70px]">التكلفة</th>
                    <th className="text-center p-2 min-w-[80px]">صافي الربح</th>
                    <th className="text-center p-2 min-w-[70px]">مساهمة %</th>
                    <th className="text-center p-2 min-w-[50px]" title="نقاط الربح (من 40)">ربح/40</th>
                    <th className="text-center p-2 min-w-[50px]" title="نقاط المبيعات (من 25)">بيع/25</th>
                    <th className="text-center p-2 min-w-[50px]" title="نقاط المرتجع (من 20)">مرتجع/20</th>
                    <th className="text-center p-2 min-w-[50px]" title="نقاط التكلفة (من 15)">تكلفة/15</th>
                    <th className="text-center p-2 min-w-[70px] font-bold">المؤشر/100</th>
                    <th className="text-center p-2 min-w-[100px] font-bold">القرار الإداري</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((p, i) => {
                    const meta = DECISION_META[p.decisionCode]
                    return (
                      <tr
                        key={p.id}
                        className={cn(
                          "border-b border-border/40 hover:bg-muted/30 transition-colors",
                          i % 2 === 1 && "bg-muted/10"
                        )}
                      >
                        {/* Product name + barcode */}
                        <td className="p-2 sticky right-0 bg-background z-10 border-l border-border/40">
                          <div className="font-medium truncate max-w-[140px]" title={p.name}>{p.name}</div>
                          {p.barcode ? (
                            <div className="text-[10px] text-muted-foreground tabular-nums" dir="ltr">{p.barcode}</div>
                          ) : null}
                        </td>
                        {/* Category */}
                        <td className="p-2 text-center text-muted-foreground">
                          {p.categoryName ?? "—"}
                        </td>
                        {/* Units sold */}
                        <td className="p-2 text-center tabular-nums font-medium">{p.unitsSold}</td>
                        {/* Units returned */}
                        <td className="p-2 text-center tabular-nums text-red-600 dark:text-red-400">
                          {p.unitsReturned > 0 ? p.unitsReturned : "—"}
                        </td>
                        {/* Return rate % */}
                        <td className={cn("p-2 text-center tabular-nums font-medium", p.returnRate > 20 ? "text-red-600 dark:text-red-400" : p.returnRate > 10 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")}>
                          {p.returnRate.toFixed(1)}%
                        </td>
                        {/* Revenue */}
                        <td className="p-2 text-center tabular-nums">{fmt.currency(p.revenue)}</td>
                        {/* Cost price */}
                        <td className="p-2 text-center tabular-nums text-muted-foreground">{fmt.currency(p.costPrice)}</td>
                        {/* Net profit */}
                        <td className={cn("p-2 text-center tabular-nums font-semibold", p.netProfit > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                          {fmt.currency(p.netProfit)}
                        </td>
                        {/* Profit contribution % */}
                        <td className="p-2 text-center tabular-nums text-muted-foreground">
                          {p.profitContribution.toFixed(1)}%
                        </td>
                        {/* Score: profit /40 */}
                        <td className="p-2 text-center tabular-nums">{p.scores.profit.toFixed(1)}</td>
                        {/* Score: sales /25 */}
                        <td className="p-2 text-center tabular-nums">{p.scores.sales.toFixed(1)}</td>
                        {/* Score: return /20 */}
                        <td className="p-2 text-center tabular-nums">{p.scores.return.toFixed(1)}</td>
                        {/* Score: cost /15 */}
                        <td className="p-2 text-center tabular-nums">{p.scores.cost.toFixed(1)}</td>
                        {/* Efficiency index /100 */}
                        <td className={cn("p-2 text-center tabular-nums text-base", indexColor(p.efficiencyIndex), indexBgColor(p.efficiencyIndex))}>
                          {p.efficiencyIndex.toFixed(1)}
                        </td>
                        {/* Decision */}
                        <td className="p-2 text-center">
                          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium", meta.bgColor, meta.color)}>
                            {meta.icon}
                            {meta.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      {data && data.products.length > 0 ? (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-2">دليل الألوان والمعادلات</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <p><strong>المعادلة (100 نقطة):</strong></p>
              <p>• صافي الربح (40) = (ربح المنتج ÷ أعلى ربح) × 40</p>
              <p>• المبيعات (25) = (وحدات المنتج ÷ أعلى مبيعات) × 25</p>
              <p>• المرتجع (20) = 20 × (1 − معدل المرتجع% ÷ 100)</p>
              <p>• التكلفة (15) = (1 − التكلفة ÷ أعلى تكلفة) × 15</p>
            </div>
            <div className="space-y-1">
              <p><strong>القرار الإداري:</strong></p>
              <p>🟢 <strong>منتج بطل</strong>: المؤشر ≥ 70 — منتج ممتاز</p>
              <p>🔵 <strong>فرصة كامنة</strong>: المؤشر 40-69 — يحتاج ترويج</p>
              <p>🟡 <strong>منتج مخادع</strong>: مرتجع أكثر من 20% — يبيع لكن يرجع</p>
              <p>🔴 <strong>منتج راكد</strong>: المؤشر أقل من 40 — راجع للمراجعة</p>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: number
  icon: React.ReactNode
  color: "emerald" | "blue" | "amber" | "red"
}) {
  const colorMap = {
    emerald: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
    red: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
  }
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", colorMap[color])}>
          {icon}
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">{label}</p>
          <p className="text-xl font-bold tabular-nums">{value}</p>
        </div>
      </div>
    </Card>
  )
}
