"use client"

import * as React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadingState } from "@/components/shared/loading-state"
import { StatCard } from "@/components/shared/stat-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BarChart3,
  TrendingUp,
  PackageX,
  ArrowUp,
  ArrowDown,
  Percent,
  Calendar,
  Trophy,
  Coins,
  Boxes,
  RotateCcw,
  Filter,
  AlertTriangle,
} from "lucide-react"
import { useAnalytics, useWarehouses } from "@/hooks/use-api"
import { useFmt } from "@/components/currency-context"
import type { ProductAnalytics } from "@/lib/types"
import { cn } from "@/lib/utils"

const PIE_COLORS = ["#055BE5", "#5CDE9D", "#185B6B", "#f59e0b", "#8b5cf6", "#ec4899", "#0ea5e9"]

function defaultFrom(): string {
  const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 10)
}
function defaultTo(): string {
  return new Date().toISOString().slice(0, 10)
}

export function AnalyticsView() {
  const fmt = useFmt()
  const [tab, setTab] = React.useState("top")

  // Shared date-range for sales-based tabs (top-selling, stagnant)
  const [from, setFrom] = React.useState(defaultFrom())
  const [to, setTo] = React.useState(defaultTo())
  const [appliedFrom, setAppliedFrom] = React.useState(from)
  const [appliedTo, setAppliedTo] = React.useState(to)

  const { data, isLoading, isError, refetch } = useAnalytics(appliedFrom, appliedTo)

  function applyRange() {
    setAppliedFrom(from)
    setAppliedTo(to)
  }
  function resetRange() {
    const f = defaultFrom()
    const t = defaultTo()
    setFrom(f)
    setTo(t)
    setAppliedFrom(f)
    setAppliedTo(t)
  }
  function setQuickRange(days: number) {
    const f = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const t = new Date().toISOString().slice(0, 10)
    setFrom(f)
    setTo(t)
  }

  const rangeLabel = `${appliedFrom} ← ${appliedTo}`
  const isSalesTab = tab === "top" || tab === "stagnant"

  return (
    <div className="space-y-5">
      <PageHeader
        title="تحليلات المبيعات والمخزون"
        description="تقارير ذكية مفصّلة بتابات منفصلة لكل نوع من التحليلات."
        icon={<BarChart3 className="h-5 w-5" />}
      />

      {/* Shared filter bar (date range for sales tabs) */}
      {isSalesTab ? (
        <Card className="border-primary/20 p-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> من</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> إلى</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <Button size="sm" variant="ghost" onClick={() => setQuickRange(7)} className="h-9">٧ أيام</Button>
              <Button size="sm" variant="ghost" onClick={() => setQuickRange(30)} className="h-9">٣٠ يوم</Button>
              <Button size="sm" variant="ghost" onClick={() => setQuickRange(90)} className="h-9">٩٠ يوم</Button>
            </div>
            <div className="flex gap-2 mr-auto">
              <Button size="sm" variant="outline" onClick={resetRange} className="gap-1.5 h-9"><RotateCcw className="h-3.5 w-3.5" /> إعادة</Button>
              <Button size="sm" onClick={applyRange} className="gap-1.5 h-9"><Filter className="h-3.5 w-3.5" /> تطبيق</Button>
            </div>
            <Badge variant="outline" className="self-end">{rangeLabel}</Badge>
          </div>
        </Card>
      ) : null}

      {isLoading ? (
        <LoadingState text="جارٍ حساب التحليلات..." />
      ) : isError ? (
        <EmptyState title="تعذّر تحميل التحليلات" action={<Button onClick={() => refetch()}>إعادة المحاولة</Button>} />
      ) : !data ? null : (
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 max-w-2xl">
            <TabsTrigger value="top" className="gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">الأكثر مبيعاً</span>
            </TabsTrigger>
            <TabsTrigger value="stagnant" className="gap-1.5">
              <PackageX className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">الأصناف الراكدة</span>
            </TabsTrigger>
            <TabsTrigger value="cost" className="gap-1.5">
              <Coins className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">التكلفة</span>
            </TabsTrigger>
            <TabsTrigger value="margin" className="gap-1.5">
              <Percent className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">الربحية</span>
            </TabsTrigger>
          </TabsList>

          {/* ───── TAB 1: Top-selling ───── */}
          <TabsContent value="top" className="space-y-4 mt-0">
            <TopSellingTab data={data.topSelling} fmt={fmt} />
          </TabsContent>

          {/* ───── TAB 2: Stagnant stock ───── */}
          <TabsContent value="stagnant" className="space-y-4 mt-0">
            <StagnantTab data={data.stagnant} fmt={fmt} />
          </TabsContent>

          {/* ───── TAB 3: Cost (expensive + cheapest) ───── */}
          <TabsContent value="cost" className="space-y-4 mt-0">
            <CostTab expensive={data.mostExpensive} cheapest={data.cheapest} fmt={fmt} />
          </TabsContent>

          {/* ───── TAB 4: Margin ───── */}
          <TabsContent value="margin" className="space-y-4 mt-0">
            <MarginTab data={data.highestMargin} fmt={fmt} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

/* ───────────────────────── Top Selling Tab ───────────────────────── */
function TopSellingTab({ data, fmt }: { data: ProductAnalytics[]; fmt: ReturnType<typeof useFmt> }) {
  const maxQty = data.length > 0 ? Math.max(...data.map((d) => d.quantitySold), 1) : 1
  const totalRevenue = data.reduce((s, d) => s + d.grossVolume, 0)
  const totalQty = data.reduce((s, d) => s + d.quantitySold, 0)

  return (
    <>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <StatCard title="إجمالي الكمية المباعة" value={fmt.number(totalQty)} hint="وحدة" icon={<Boxes className="h-5 w-5" />} tone="default" />
        <StatCard title="إجمالي الإيراد" value={fmt.currency(totalRevenue)} hint={`${fmt.number(data.length)} صنف`} icon={<TrendingUp className="h-5 w-5" />} tone="success" />
        <StatCard title="أعلى صنف مبيعاً" value={data[0]?.name ?? "—"} hint={data[0] ? `${fmt.number(data[0].quantitySold)} وحدة` : ""} icon={<Trophy className="h-5 w-5" />} tone="warning" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            ترتيب الأصناف حسب الكمية المباعة
          </CardTitle>
          <CardDescription>الكمية وحجم الإيراد لكل صنف في النطاق المحدد</CardDescription>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <EmptyState title="لا توجد مبيعات" description="جرّب نطاقاً زمنياً أوسع." />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 10, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={80} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} formatter={(v: number, n) => n === "quantitySold" ? [fmt.number(v) + " وحدة", "الكمية"] : [fmt.currency(v), "الإيراد"]} />
                <Bar dataKey="quantitySold" name="quantitySold" fill="#055BE5" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <ProductRankTable data={data} fmt={fmt} metricLabel="الكمية" metricKey="quantitySold" metricFmt={(v) => fmt.number(v)} maxVal={maxQty} />
    </>
  )
}

/* ───────────────────────── Stagnant Tab ───────────────────────── */
function StagnantTab({ data, fmt }: { data: ProductAnalytics[]; fmt: ReturnType<typeof useFmt> }) {
  const neverSold = data.filter((d) => d.quantitySold === 0)
  const lowTurnover = data.filter((d) => d.quantitySold > 0 && d.currentStock + d.quantitySold > 0 && d.quantitySold / (d.currentStock + d.quantitySold) < 0.2)
  const totalStuckValue = data.reduce((s, d) => s + d.currentStock * d.costPrice, 0)

  return (
    <>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <StatCard title="أصناف لم تُبع" value={fmt.number(neverSold.length)} hint="صفر مبيعات" icon={<PackageX className="h-5 w-5" />} tone="danger" />
        <StatCard title="أصناف بطيئة الدوران" value={fmt.number(lowTurnover.length)} hint="أقل من 20% دوران" icon={<AlertTriangle className="h-5 w-5" />} tone="warning" />
        <StatCard title="قيمة المخزون الراكد" value={fmt.currency(totalStuckValue)} hint="رأس مال مجمّد" icon={<Coins className="h-5 w-5" />} tone="info" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PackageX className="h-4 w-4 text-amber-500" />
            الأصناف الراكدة (مباعة ≤ حد منخفض)
          </CardTitle>
          <CardDescription>قد تحتاج تخفيضات أو تصفية — مرتبة حسب أدنى دوران</CardDescription>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <EmptyState title="لا توجد أصناف راكدة" description="كل الأصناف تبيع جيداً." />
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-right py-2 px-2 font-medium">الصنف</th>
                    <th className="text-center py-2 px-2 font-medium">المخزون</th>
                    <th className="text-center py-2 px-2 font-medium">المبيع</th>
                    <th className="text-center py-2 px-2 font-medium">نسبة الدوران</th>
                    <th className="text-center py-2 px-2 font-medium">القيمة الراكدة</th>
                    <th className="text-center py-2 px-2 font-medium">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 15).map((r) => {
                    const ratio = r.currentStock + r.quantitySold > 0 ? (r.quantitySold / (r.currentStock + r.quantitySold)) * 100 : 0
                    const critical = r.quantitySold === 0
                    const stuckValue = r.currentStock * r.costPrice
                    return (
                      <tr key={r.id} className="border-b border-border/40 hover:bg-muted/20">
                        <td className="py-2 px-2 font-medium">{r.name}</td>
                        <td className="py-2 px-2 text-center tabular-nums">{fmt.number(r.currentStock)}</td>
                        <td className="py-2 px-2 text-center tabular-nums">{fmt.number(r.quantitySold)}</td>
                        <td className="py-2 px-2 text-center tabular-nums">
                          <div className="flex items-center gap-1.5 justify-center">
                            <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(ratio, 100)}%` }} />
                            </div>
                            <span className="text-xs">{fmt.number(ratio)}%</span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center tabular-nums text-muted-foreground">{fmt.currency(stuckValue)}</td>
                        <td className="py-2 px-2 text-center">
                          <Badge variant={critical ? "destructive" : ratio < 10 ? "secondary" : "outline"}>
                            {critical ? "لم يُبع" : "بطيء"}
                          </Badge>
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
    </>
  )
}

/* ───────────────────────── Cost Tab ───────────────────────── */
function CostTab({ expensive, cheapest, fmt }: { expensive: ProductAnalytics[]; cheapest: ProductAnalytics[]; fmt: ReturnType<typeof useFmt> }) {
  return (
    <>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <StatCard title="أعلى تكلفة" value={expensive[0] ? fmt.currency(expensive[0].costPrice) : "—"} hint={expensive[0]?.name} icon={<ArrowUp className="h-5 w-5" />} tone="warning" />
        <StatCard title="أقل تكلفة" value={cheapest[0] ? fmt.currency(cheapest[0].costPrice) : "—"} hint={cheapest[0]?.name} icon={<ArrowDown className="h-5 w-5" />} tone="success" />
        <StatCard title="متوسط التكلفة" value={fmt.currency(cheapest.length > 0 ? cheapest.reduce((s, d) => s + d.costPrice, 0) / cheapest.length : 0)} hint="عبر كل الأصناف" icon={<Coins className="h-5 w-5" />} tone="info" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Most expensive */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowUp className="h-4 w-4 text-rose-500" />
              الأصناف الأكثر تكلفة
            </CardTitle>
            <CardDescription>حسب سعر التكلفة الأساسي</CardDescription>
          </CardHeader>
          <CardContent>
            {expensive.length === 0 ? <EmptyState title="لا توجد بيانات" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={expensive.slice(0, 8)} layout="vertical" margin={{ top: 5, right: 10, left: 80, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={80} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} formatter={(v: number) => fmt.currency(v)} />
                  <Bar dataKey="costPrice" name="التكلفة" fill="#f43f5e" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Cheapest */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowDown className="h-4 w-4 text-[#5CDE9D]" />
              الأصناف الأقل تكلفة
            </CardTitle>
            <CardDescription>حسب سعر التكلفة الأساسي</CardDescription>
          </CardHeader>
          <CardContent>
            {cheapest.length === 0 ? <EmptyState title="لا توجد بيانات" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={cheapest.slice(0, 8)} layout="vertical" margin={{ top: 5, right: 10, left: 80, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={80} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} formatter={(v: number) => fmt.currency(v)} />
                  <Bar dataKey="costPrice" name="التكلفة" fill="#5CDE9D" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

/* ───────────────────────── Margin Tab ───────────────────────── */
function MarginTab({ data, fmt }: { data: ProductAnalytics[]; fmt: ReturnType<typeof useFmt> }) {
  const avgMarginPct = data.length > 0 ? data.reduce((s, d) => s + d.marginPct, 0) / data.length : 0
  const maxMargin = data.length > 0 ? Math.max(...data.map((d) => d.margin), 1) : 1

  return (
    <>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <StatCard title="أعلى ربحية" value={data[0] ? fmt.currency(data[0].margin) : "—"} hint={data[0]?.name} icon={<Percent className="h-5 w-5" />} tone="success" />
        <StatCard title="متوسط هامش الربح" value={`${fmt.number(avgMarginPct)}%`} hint="عبر كل الأصناف" icon={<TrendingUp className="h-5 w-5" />} tone="info" />
        <StatCard title="عدد الأصناف الرابحة" value={fmt.number(data.filter((d) => d.margin > 0).length)} hint="ربح موجب" icon={<Trophy className="h-5 w-5" />} tone="warning" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Percent className="h-4 w-4 text-[#5CDE9D]" />
            توزيع الربحية حسب الفئة
          </CardTitle>
          <CardDescription>نسبة مساهمة كل صنف في إجمالي هامش الربح</CardDescription>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? <EmptyState title="لا توجد بيانات" /> : (
            <div className="grid sm:grid-cols-2 gap-4 items-start">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={data.slice(0, 8)} dataKey="margin" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {data.slice(0, 8).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} formatter={(v: number) => fmt.currency(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5">
                {data.slice(0, 8).map((d, i) => (
                  <div key={d.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="truncate">{d.name}</span>
                    </span>
                    <span className="font-medium tabular-nums shrink-0">{fmt.currency(d.margin)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ProductRankTable data={data} fmt={fmt} metricLabel="هامش الربح" metricKey="margin" metricFmt={(v) => fmt.currency(v)} maxVal={maxMargin} extraColumn={(r) => (
        <td className="py-2 px-2 text-center tabular-nums">
          <Badge variant="outline" className={r.marginPct >= 50 ? "text-[#5CDE9D] border-[#5CDE9D]/30 bg-[#5CDE9D]/10" : ""}>
            {fmt.number(r.marginPct)}%
          </Badge>
        </td>
      )} extraHeader={<th className="text-center py-2 px-2 font-medium">الهامش %</th>} />
    </>
  )
}

/* ───────────────────────── Shared: ranked product table ───────────────────────── */
function ProductRankTable({
  data,
  fmt,
  metricLabel,
  metricKey,
  metricFmt,
  maxVal,
  extraHeader,
  extraColumn,
}: {
  data: ProductAnalytics[]
  fmt: ReturnType<typeof useFmt>
  metricLabel: string
  metricKey: keyof ProductAnalytics
  metricFmt: (v: number) => string
  maxVal: number
  extraHeader?: React.ReactNode
  extraColumn?: (r: ProductAnalytics) => React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">تفصيل {metricLabel} حسب الصنف</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? <EmptyState title="لا توجد بيانات" /> : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-right py-2 px-2 font-medium w-8">#</th>
                  <th className="text-right py-2 px-2 font-medium">الصنف</th>
                  {extraHeader}
                  <th className="text-center py-2 px-2 font-medium">{metricLabel}</th>
                  <th className="text-center py-2 px-2 font-medium hidden sm:table-cell">النسبة</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r, i) => {
                  const val = Number(r[metricKey]) || 0
                  const pct = maxVal > 0 ? Math.round((val / maxVal) * 100) : 0
                  return (
                    <tr key={r.id} className="border-b border-border/40 hover:bg-muted/20">
                      <td className="py-2 px-2">
                        <span className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold",
                          i === 0 ? "bg-amber-500/15 text-amber-600" : i === 1 ? "bg-slate-400/15 text-slate-500" : i === 2 ? "bg-orange-500/15 text-orange-600" : "bg-muted text-muted-foreground"
                        )}>{i + 1}</span>
                      </td>
                      <td className="py-2 px-2 font-medium">{r.name}</td>
                      {extraColumn ? extraColumn(r) : null}
                      <td className="py-2 px-2 text-center tabular-nums font-semibold">{metricFmt(val)}</td>
                      <td className="py-2 px-2 hidden sm:table-cell">
                        <div className="flex items-center gap-1.5 justify-center">
                          <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs tabular-nums">{pct}%</span>
                        </div>
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
  )
}
