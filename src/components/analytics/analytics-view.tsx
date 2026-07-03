"use client"

import * as React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  LayoutGrid,
} from "lucide-react"
import { useAnalytics } from "@/hooks/use-api"
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

type ReportKey = "overview" | "top" | "stagnant" | "cost" | "margin"

export function AnalyticsView() {
  const fmt = useFmt()
  const [tab, setTab] = React.useState<ReportKey>("overview")

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
  const showDateFilter = tab !== "overview" && tab !== "cost" && tab !== "margin" || tab === "overview"

  // KPI summaries for the card selector (always computed)
  const topQty = data?.topSelling.reduce((s, d) => s + d.quantitySold, 0) ?? 0
  const stagnantCount = data?.stagnant.filter((d) => d.quantitySold === 0).length ?? 0
  const costCount = data?.mostExpensive.length ?? 0
  const profitableCount = data?.highestMargin.filter((d) => d.margin > 0).length ?? 0

  const reportCards: Array<{
    key: ReportKey
    label: string
    icon: any
    kpi: string
    hint: string
    tone: string
    iconBg: string
  }> = [
    { key: "overview", label: "نظرة عامة", icon: LayoutGrid, kpi: "", hint: "ملخص شامل", tone: "text-primary", iconBg: "bg-primary/10" },
    { key: "top", label: "الأكثر مبيعاً", icon: TrendingUp, kpi: fmt.number(topQty), hint: "وحدة مباعة", tone: "text-[#055BE5]", iconBg: "bg-[#055BE5]/10" },
    { key: "stagnant", label: "الأصناف الراكدة", icon: PackageX, kpi: fmt.number(stagnantCount), hint: "صنف لم يُبع", tone: "text-amber-600", iconBg: "bg-amber-500/10" },
    { key: "cost", label: "التكلفة", icon: Coins, kpi: fmt.number(costCount), hint: "صنف مُحلّل", tone: "text-rose-600", iconBg: "bg-rose-500/10" },
    { key: "margin", label: "الربحية", icon: Percent, kpi: fmt.number(profitableCount), hint: "صنف رابح", tone: "text-[#5CDE9D]", iconBg: "bg-[#5CDE9D]/10" },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="تحليلات المبيعات والمخزون"
        description="تقارير ذكية مفصّلة — اختر تقريراً لعرض تفاصيله."
        icon={<BarChart3 className="h-5 w-5" />}
      />

      {isLoading ? (
        <LoadingState text="جارٍ حساب التحليلات..." />
      ) : isError ? (
        <EmptyState title="تعذّر تحميل التحليلات" action={<Button onClick={() => refetch()}>إعادة المحاولة</Button>} />
      ) : !data ? null : (
        <>
          {/* Clickable report cards (the new "tabs") */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {reportCards.map((c) => {
              const Icon = c.icon
              const active = tab === c.key
              return (
                <button
                  key={c.key}
                  onClick={() => setTab(c.key)}
                  className={cn(
                    "group relative flex flex-col gap-2 rounded-xl border p-4 text-right transition-all",
                    active
                      ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-sm"
                      : "border-border/70 hover:border-primary/40 hover:shadow-sm bg-card"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg transition-colors", c.iconBg, c.tone)}>
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    {active ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{c.label}</p>
                    {c.kpi ? (
                      <p className={cn("text-lg font-bold tabular-nums leading-tight mt-0.5", c.tone)}>{c.kpi}</p>
                    ) : (
                      <p className="text-sm font-medium mt-0.5">ملخص شامل</p>
                    )}
                    {c.hint ? <p className="text-[10px] text-muted-foreground truncate">{c.hint}</p> : null}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Date-range filter (for sales-based reports + overview) */}
          {showDateFilter ? (
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

          {/* Report content */}
          {tab === "overview" ? <OverviewTab data={data} fmt={fmt} onNavigate={setTab} /> : null}
          {tab === "top" ? <TopSellingTab data={data.topSelling} fmt={fmt} /> : null}
          {tab === "stagnant" ? <StagnantTab data={data.stagnant} fmt={fmt} /> : null}
          {tab === "cost" ? <CostTab expensive={data.mostExpensive} cheapest={data.cheapest} fmt={fmt} /> : null}
          {tab === "margin" ? <MarginTab data={data.highestMargin} fmt={fmt} /> : null}
        </>
      )}
    </div>
  )
}

/* ───────────────────────── Overview Tab ───────────────────────── */
function OverviewTab({
  data,
  fmt,
  onNavigate,
}: {
  data: any
  fmt: ReturnType<typeof useFmt>
  onNavigate: (k: ReportKey) => void
}) {
  const totalRevenue = data.topSelling.reduce((s: number, d: ProductAnalytics) => s + d.grossVolume, 0)
  const totalQty = data.topSelling.reduce((s: number, d: ProductAnalytics) => s + d.quantitySold, 0)
  const stagnantValue = data.stagnant.reduce((s: number, d: ProductAnalytics) => s + d.currentStock * d.costPrice, 0)
  const avgMargin = data.highestMargin.length > 0
    ? data.highestMargin.reduce((s: number, d: ProductAnalytics) => s + d.marginPct, 0) / data.highestMargin.length
    : 0
  const neverSold = data.stagnant.filter((d: ProductAnalytics) => d.quantitySold === 0).length

  // Mini trend: top-selling quantities
  const topData = data.topSelling.slice(0, 6)

  return (
    <div className="space-y-4">
      {/* Top KPI row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <OverviewKpi label="إجمالي الكمية المباعة" value={fmt.number(totalQty)} hint="وحدة" icon={Boxes} tone="#055BE5" />
        <OverviewKpi label="إجمالي الإيراد" value={fmt.currency(totalRevenue)} hint="في الفترة" icon={TrendingUp} tone="#5CDE9D" />
        <OverviewKpi label="أصناف راكدة" value={fmt.number(neverSold)} hint={`قيمة ${fmt.currency(stagnantValue)}`} icon={PackageX} tone="#f59e0b" />
        <OverviewKpi label="متوسط هامش الربح" value={`${fmt.number(avgMargin)}%`} hint="عبر الأصناف" icon={Percent} tone="#185B6B" />
      </div>

      {/* Two charts side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-[#055BE5]" />
              أعلى ٦ أصناف مبيعاً
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => String(v).slice(0, 10)} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={40} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} formatter={(v: number) => [fmt.number(v) + " وحدة", "الكمية"]} />
                <Bar dataKey="quantitySold" fill="#055BE5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Percent className="h-4 w-4 text-[#5CDE9D]" />
              توزيع الربحية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.highestMargin.slice(0, 6)} dataKey="margin" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {data.highestMargin.slice(0, 6).map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} formatter={(v: number) => fmt.currency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick navigation cards */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">تقارير مفصّلة</CardTitle>
          <CardDescription>انتقل لتقرير محدد لعرض كل التفاصيل والرسوم</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <NavCard onClick={() => onNavigate("top")} icon={TrendingUp} title="الأكثر مبيعاً" desc={`${fmt.number(data.topSelling.length)} صنف`} color="#055BE5" />
            <NavCard onClick={() => onNavigate("stagnant")} icon={PackageX} title="الأصناف الراكدة" desc={`${fmt.number(neverSold)} لم تُبع`} color="#f59e0b" />
            <NavCard onClick={() => onNavigate("cost")} icon={Coins} title="التكلفة" desc={`${fmt.number(data.mostExpensive.length)} صنف`} color="#f43f5e" />
            <NavCard onClick={() => onNavigate("margin")} icon={Percent} title="الربحية" desc={`${fmt.number(data.highestMargin.length)} صنف`} color="#5CDE9D" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function OverviewKpi({ label, value, hint, icon: Icon, tone }: { label: string; value: string; hint: string; icon: any; tone: string }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-xl font-bold tabular-nums mt-1">{value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{hint}</p>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: `${tone}1a`, color: tone }}>
            <Icon className="h-4.5 w-4.5" />
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function NavCard({ onClick, icon: Icon, title, desc, color }: { onClick: () => void; icon: any; title: string; desc: string; color: string }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3 text-right transition-all hover:border-primary/40 hover:shadow-sm"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-110" style={{ background: `${color}1a`, color }}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium truncate">{title}</span>
        <span className="block text-xs text-muted-foreground truncate">{desc}</span>
      </span>
    </button>
  )
}

/* ───────────────────────── Top Selling Tab ───────────────────────── */
function TopSellingTab({ data, fmt }: { data: ProductAnalytics[]; fmt: ReturnType<typeof useFmt> }) {
  const maxQty = data.length > 0 ? Math.max(...data.map((d) => d.quantitySold), 1) : 1
  const totalRevenue = data.reduce((s, d) => s + d.grossVolume, 0)
  const totalQty = data.reduce((s, d) => s + d.quantitySold, 0)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <MiniStat title="إجمالي الكمية المباعة" value={fmt.number(totalQty)} icon={Boxes} color="#055BE5" />
        <MiniStat title="إجمالي الإيراد" value={fmt.currency(totalRevenue)} icon={TrendingUp} color="#5CDE9D" />
        <MiniStat title="أعلى صنف مبيعاً" value={data[0]?.name ?? "—"} icon={Trophy} color="#f59e0b" small />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-primary" />ترتيب الأصناف حسب الكمية</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? <EmptyState title="لا توجد مبيعات" description="جرّب نطاقاً زمنياً أوسع." /> : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 10, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={80} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} formatter={(v: number) => [fmt.number(v) + " وحدة", "الكمية"]} />
                <Bar dataKey="quantitySold" fill="#055BE5" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      <ProductRankTable data={data} fmt={fmt} metricLabel="الكمية" metricKey="quantitySold" metricFmt={(v) => fmt.number(v)} maxVal={maxQty} />
    </div>
  )
}

/* ───────────────────────── Stagnant Tab ───────────────────────── */
function StagnantTab({ data, fmt }: { data: ProductAnalytics[]; fmt: ReturnType<typeof useFmt> }) {
  const neverSold = data.filter((d) => d.quantitySold === 0)
  const totalStuckValue = data.reduce((s, d) => s + d.currentStock * d.costPrice, 0)
  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <MiniStat title="أصناف لم تُبع" value={fmt.number(neverSold.length)} icon={PackageX} color="#f43f5e" />
        <MiniStat title="إجمالي الأصناف الراكدة" value={fmt.number(data.length)} icon={AlertTriangle} color="#f59e0b" />
        <MiniStat title="قيمة المخزون الراكد" value={fmt.currency(totalStuckValue)} icon={Coins} color="#185B6B" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><PackageX className="h-4 w-4 text-amber-500" />الأصناف الراكدة</CardTitle>
          <CardDescription>مرتبة حسب أدنى دوران — قد تحتاج تخفيضات أو تصفية</CardDescription>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? <EmptyState title="لا توجد أصناف راكدة" description="كل الأصناف تبيع جيداً." /> : (
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
                        <td className="py-2 px-2 text-center">
                          <div className="flex items-center gap-1.5 justify-center">
                            <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(ratio, 100)}%` }} />
                            </div>
                            <span className="text-xs tabular-nums">{fmt.number(ratio)}%</span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center tabular-nums text-muted-foreground">{fmt.currency(stuckValue)}</td>
                        <td className="py-2 px-2 text-center">
                          <Badge variant={critical ? "destructive" : ratio < 10 ? "secondary" : "outline"}>{critical ? "لم يُبع" : "بطيء"}</Badge>
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
    </div>
  )
}

/* ───────────────────────── Cost Tab ───────────────────────── */
function CostTab({ expensive, cheapest, fmt }: { expensive: ProductAnalytics[]; cheapest: ProductAnalytics[]; fmt: ReturnType<typeof useFmt> }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <MiniStat title="أعلى تكلفة" value={expensive[0] ? fmt.currency(expensive[0].costPrice) : "—"} icon={ArrowUp} color="#f43f5e" />
        <MiniStat title="أقل تكلفة" value={cheapest[0] ? fmt.currency(cheapest[0].costPrice) : "—"} icon={ArrowDown} color="#5CDE9D" />
        <MiniStat title="متوسط التكلفة" value={fmt.currency(cheapest.length > 0 ? cheapest.reduce((s, d) => s + d.costPrice, 0) / cheapest.length : 0)} icon={Coins} color="#185B6B" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ArrowUp className="h-4 w-4 text-rose-500" />الأكثر تكلفة</CardTitle></CardHeader>
          <CardContent>
            {expensive.length === 0 ? <EmptyState title="لا توجد بيانات" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={expensive.slice(0, 8)} layout="vertical" margin={{ top: 5, right: 10, left: 80, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={80} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} formatter={(v: number) => fmt.currency(v)} />
                  <Bar dataKey="costPrice" fill="#f43f5e" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ArrowDown className="h-4 w-4 text-[#5CDE9D]" />الأقل تكلفة</CardTitle></CardHeader>
          <CardContent>
            {cheapest.length === 0 ? <EmptyState title="لا توجد بيانات" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={cheapest.slice(0, 8)} layout="vertical" margin={{ top: 5, right: 10, left: 80, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={80} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} formatter={(v: number) => fmt.currency(v)} />
                  <Bar dataKey="costPrice" fill="#5CDE9D" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/* ───────────────────────── Margin Tab ───────────────────────── */
function MarginTab({ data, fmt }: { data: ProductAnalytics[]; fmt: ReturnType<typeof useFmt> }) {
  const avgMarginPct = data.length > 0 ? data.reduce((s, d) => s + d.marginPct, 0) / data.length : 0
  const maxMargin = data.length > 0 ? Math.max(...data.map((d) => d.margin), 1) : 1
  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <MiniStat title="أعلى ربحية" value={data[0] ? fmt.currency(data[0].margin) : "—"} icon={Percent} color="#5CDE9D" />
        <MiniStat title="متوسط هامش الربح" value={`${fmt.number(avgMarginPct)}%`} icon={TrendingUp} color="#055BE5" />
        <MiniStat title="أصناف رابحة" value={fmt.number(data.filter((d) => d.margin > 0).length)} icon={Trophy} color="#f59e0b" />
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Percent className="h-4 w-4 text-[#5CDE9D]" />توزيع الربحية</CardTitle></CardHeader>
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
          <Badge variant="outline" className={r.marginPct >= 50 ? "text-[#5CDE9D] border-[#5CDE9D]/30 bg-[#5CDE9D]/10" : ""}>{fmt.number(r.marginPct)}%</Badge>
        </td>
      )} extraHeader={<th className="text-center py-2 px-2 font-medium">الهامش %</th>} />
    </div>
  )
}

/* ───────────────────────── Shared components ───────────────────────── */
function MiniStat({ title, value, icon: Icon, color, small }: { title: string; value: string; icon: any; color: string; small?: boolean }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            <p className={cn("font-bold tabular-nums mt-1", small ? "text-base truncate" : "text-xl")}>{value}</p>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: `${color}1a`, color }}>
            <Icon className="h-4.5 w-4.5" />
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

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
      <CardHeader><CardTitle className="text-base">تفصيل {metricLabel} حسب الصنف</CardTitle></CardHeader>
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
