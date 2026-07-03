"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAppStore } from "@/lib/store"
import { useDashboard } from "@/hooks/use-api"
import { useFmt } from "@/components/currency-context"
import { StatCard } from "@/components/shared/stat-card"
import { LoadingState } from "@/components/shared/loading-state"
import { EmptyState } from "@/components/shared/empty-state"
import {
  DollarSign,
  Package,
  AlertTriangle,
  ShoppingCart,
  TrendingUp,
  Boxes,
  ArrowLeft,
  Receipt,
  Trophy,
  Tags,
  Filter,
} from "lucide-react"

const PIE_COLORS = [
  "#10b981",
  "#f59e0b",
  "#0ea5e9",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f43f5e",
]

export function DashboardView() {
  const fmt = useFmt()
  const setView = useAppStore((s) => s.setView)
  const [from, setFrom] = React.useState("")
  const [to, setTo] = React.useState("")
  const [range, setRange] = React.useState("30")
  const [appliedFrom, setAppliedFrom] = React.useState("")
  const [appliedTo, setAppliedTo] = React.useState("")
  const [appliedRange, setAppliedRange] = React.useState("30")

  const { data, isLoading, isError, refetch } = useDashboard(
    appliedFrom || undefined,
    appliedTo || undefined,
    appliedRange
  )

  function applyRange() {
    setAppliedFrom(from)
    setAppliedTo(to)
    setAppliedRange(range)
  }
  function resetRange(days: string) {
    setFrom("")
    setTo("")
    setRange(days)
    setAppliedFrom("")
    setAppliedTo("")
    setAppliedRange(days)
  }

  const rangeLabel = appliedFrom
    ? `${appliedFrom}${appliedTo ? ` ← ${appliedTo}` : ""}`
    : `آخر ${appliedRange} يوم`

  if (isLoading) return <LoadingState text="جارٍ تحميل الإحصائيات..." />
  if (isError || !data) {
    return (
      <EmptyState
        title="تعذّر تحميل البيانات"
        description="حدث خطأ أثناء جلب إحصائيات لوحة التحكم."
        action={<Button onClick={() => refetch()}>إعادة المحاولة</Button>}
      />
    )
  }

  const lowStock = data.lowStockProducts ?? []
  const recentSales = data.recentSales ?? []
  const trend = data.salesTrend ?? []
  const top = data.topProducts ?? []
  const cats = data.categoryDistribution ?? []

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">من تاريخ</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">إلى تاريخ</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">نطاق سريع</Label>
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="7">آخر 7 أيام</option>
                <option value="30">آخر 30 يوم</option>
                <option value="90">آخر 90 يوم</option>
                <option value="365">آخر سنة</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={applyRange} size="sm" className="h-9">تطبيق</Button>
              <Button onClick={() => resetRange("30")} size="sm" variant="outline" className="h-9">إعادة تعيين</Button>
            </div>
          </div>
          <Badge variant="outline" className="self-end lg:self-auto">{rangeLabel}</Badge>
        </div>
      </Card>

      {/* KPI cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="إجمالي المبيعات"
          value={fmt.currency(data.totalSales)}
          hint={`${fmt.number(data.salesCount)} فاتورة`}
          icon={<DollarSign className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          title="مبيعات اليوم"
          value={fmt.currency(data.todaySales)}
          hint="منذ بداية اليوم"
          icon={<TrendingUp className="h-5 w-5" />}
          tone="info"
        />
        <StatCard
          title="عدد المنتجات"
          value={fmt.number(data.productsCount)}
          hint={`قيمة المخزون: ${fmt.currency(data.inventoryValue)}`}
          icon={<Package className="h-5 w-5" />}
          tone="default"
        />
        <StatCard
          title="منتجات قريبة من النفاذ"
          value={fmt.number(data.lowStockCount)}
          hint={`${fmt.number(data.pendingPurchases)} أمر شراء معلّق`}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone={data.lowStockCount > 0 ? "danger" : "success"}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Sales trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              اتجاه المبيعات
            </CardTitle>
            <CardDescription>إجمالي المبيعات اليومية ({fmt.symbol}) — {rangeLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            {trend.length === 0 ? (
              <EmptyState title="لا توجد مبيعات بعد" description="ستظهر بيانات المبيعات هنا." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--popover))",
                      color: "hsl(var(--popover-foreground))",
                      fontSize: 13,
                    }}
                    formatter={(v: number) => [fmt.currency(v), "المبيعات"]}
                    labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#salesGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Category distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Tags className="h-4 w-4 text-primary" />
              توزيع قيمة المخزون
            </CardTitle>
            <CardDescription>حسب الفئة</CardDescription>
          </CardHeader>
          <CardContent>
            {cats.length === 0 ? (
              <EmptyState title="لا توجد فئات" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={cats}
                    dataKey="total"
                    nameKey="categoryName"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {cats.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--popover))",
                      color: "hsl(var(--popover-foreground))",
                      fontSize: 13,
                    }}
                    formatter={(v: number) => fmt.currency(v)}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top products + low stock + recent sales */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-amber-500" />
              الأكثر مبيعاً
            </CardTitle>
            <CardDescription>حسب الإيرادات</CardDescription>
          </CardHeader>
          <CardContent>
            {top.length === 0 ? (
              <EmptyState title="لا توجد مبيعات بعد" />
            ) : (
              <div className="space-y-3">
                {top.map((p, i) => {
                  const max = top[0].total || 1
                  const pct = Math.round((p.total / max) * 100)
                  return (
                    <div key={p.productName} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex items-center gap-2 min-w-0">
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                              i === 0
                                ? "bg-amber-500/15 text-amber-600"
                                : i === 1
                                ? "bg-slate-400/15 text-slate-500"
                                : i === 2
                                ? "bg-orange-500/15 text-orange-600"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {i + 1}
                          </span>
                          <span className="truncate">{p.productName}</span>
                        </span>
                        <span className="font-semibold tabular-nums">
                          {fmt.currency(p.total)}
                        </span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low stock */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                تنبيهات المخزون
              </CardTitle>
              <CardDescription>منتجات تحتاج إعادة طلب</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-primary"
              onClick={() => setView("inventory")}
            >
              الكل
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <EmptyState
                title="المخزون بحالة جيدة"
                description="لا توجد منتجات قريبة من النفاذ."
                icon={<Boxes className="h-7 w-7" />}
              />
            ) : (
              <ScrollArea className="h-[230px] pr-2 scrollbar-thin">
                <div className="space-y-2">
                  {lowStock.slice(0, 8).map((p) => {
                    const critical = p.quantity <= Math.ceil(p.reorderLevel / 2)
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            الحد: {fmt.number(p.reorderLevel)} {p.unit}
                          </p>
                        </div>
                        <Badge
                          variant={critical ? "destructive" : "secondary"}
                          className="tabular-nums"
                        >
                          {fmt.number(p.quantity)}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Recent sales */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="h-4 w-4 text-primary" />
                أحدث الفواتير
              </CardTitle>
              <CardDescription>آخر العمليات</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-primary"
              onClick={() => setView("invoices")}
            >
              الكل
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <EmptyState title="لا توجد فواتير" />
            ) : (
              <ScrollArea className="h-[230px] pr-2 scrollbar-thin">
                <div className="space-y-2">
                  {recentSales.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium" dir="ltr">
                          {s.invoiceNo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {s.customerName || "عميل نقدي"} • {fmt.dateTime(s.createdAt)}
                        </p>
                      </div>
                      <span className="font-semibold tabular-nums text-primary">
                        {fmt.currency(s.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending purchases banner */}
      {data.pendingPurchases > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
                <ShoppingCart className="h-5 w-5" />
              </span>
              <div>
                <p className="font-medium text-sm">
                  لديك {fmt.number(data.pendingPurchases)} أمر شراء معلّق
                </p>
                <p className="text-xs text-muted-foreground">
                  أكّد الاستلام لتحديث كميات المخزون تلقائياً
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setView("purchases")}>
              مراجعة المشتريات
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
