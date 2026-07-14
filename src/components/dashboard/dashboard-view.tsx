"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
import { useT, useI18n } from "@/components/i18n-context"
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
  Download,
} from "lucide-react"
import { exportToExcel, type ExcelColumn } from "@/lib/excel"

const PIE_COLORS = [
  "#2E6237", // blue primary
  "#DFC196", // aqua green accent
  "#F9DC7C", // dark teal
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#0ea5e9",
]

export function DashboardView() {
  const fmt = useFmt()
  const t = useT()
  const { locale } = useI18n()
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
    : t.dshLastXDays.replace("{x}", appliedRange)

  if (isLoading) return <LoadingState text={t.dshLoadingStats} />
  if (isError || !data) {
    return (
      <EmptyState
        title={t.dshDataLoadFailed}
        description={t.dshDataLoadFailedDesc}
        action={<Button onClick={() => refetch()}>{t.retry}</Button>}
      />
    )
  }

  const lowStock = data.lowStockProducts ?? []
  const recentSales = data.recentSales ?? []
  const trend = data.salesTrend ?? []
  const top = data.topProducts ?? []
  const cats = data.categoryDistribution ?? []
  // Capture the narrowed `data` so the click handler below doesn't lose the
  // narrowing through the closure.
  const d = data

  // Excel export — KPIs + recent sales + low stock products in one sheet.
  function handleExportExcel() {
    const columns: ExcelColumn[] = [
      { header: "القسم", key: "section", width: 16 },
      { header: "البيان", key: "label", width: 32 },
      { header: "القيمة", key: "value", width: 20 },
    ]
    const rows: Record<string, any>[] = []
    // KPIs
    rows.push({ section: "مؤشرات", label: t.dshTotalSales, value: fmt.currency(d.totalSales) })
    rows.push({ section: "مؤشرات", label: t.dshTodaySales, value: fmt.currency(d.todaySales) })
    rows.push({ section: "مؤشرات", label: t.invoiceCountLabel.replace("{count}", ""), value: fmt.number(d.salesCount) })
    rows.push({ section: "مؤشرات", label: t.dshProductsCount, value: fmt.number(d.productsCount) })
    rows.push({ section: "مؤشرات", label: t.inventoryValueLabel.replace("{value}", ""), value: fmt.currency(d.inventoryValue) })
    rows.push({ section: "مؤشرات", label: t.dshLowStockProducts, value: fmt.number(d.lowStockCount) })
    rows.push({ section: "مؤشرات", label: t.pendingPoCountLabel.replace("{count}", ""), value: fmt.number(d.pendingPurchases) })
    // Recent sales
    for (const s of recentSales) {
      rows.push({
        section: "أحدث الفواتير",
        label: s.invoiceNo,
        value: `${fmt.currency(s.total)} — ${s.customerName || t.cashCustomer} — ${fmt.dateTime(s.createdAt)}`,
      })
    }
    // Low stock products
    for (const p of lowStock) {
      rows.push({
        section: "نقص المخزون",
        label: p.name,
        value: `${fmt.number(p.quantity)} / ${fmt.number(p.reorderLevel)} ${p.unit ?? ""}`,
      })
    }
    const today = new Date().toISOString().slice(0, 10)
    exportToExcel(rows, columns, `dashboard-${today}.xlsx`, "لوحة المعلومات")
  }

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">{t.fromDate}</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t.toDate}</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t.quickRange}</Label>
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="7">{t.last7Days}</option>
                <option value="30">{t.last30Days}</option>
                <option value="90">{t.last90Days}</option>
                <option value="365">{t.lastYear}</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={applyRange} size="sm" className="h-9">{t.apply}</Button>
              <Button onClick={() => resetRange("30")} size="sm" variant="outline" className="h-9">{t.reset}</Button>
              <Button onClick={handleExportExcel} size="sm" variant="outline" className="h-9 gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Excel
              </Button>
            </div>
          </div>
          <Badge variant="outline" className="self-end lg:self-auto">{rangeLabel}</Badge>
        </div>
      </Card>

      {/* KPI cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t.dshTotalSales}
          value={fmt.currency(data.totalSales)}
          hint={t.invoiceCountLabel.replace("{count}", fmt.number(data.salesCount))}
          icon={<DollarSign className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          title={t.dshTodaySales}
          value={fmt.currency(data.todaySales)}
          hint={t.dshSinceStartOfDay}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="info"
        />
        <StatCard
          title={t.dshProductsCount}
          value={fmt.number(data.productsCount)}
          hint={t.inventoryValueLabel.replace("{value}", fmt.currency(data.inventoryValue))}
          icon={<Package className="h-5 w-5" />}
          tone="default"
        />
        <StatCard
          title={t.dshLowStockProducts}
          value={fmt.number(data.lowStockCount)}
          hint={t.pendingPoCountLabel.replace("{count}", fmt.number(data.pendingPurchases))}
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
              {t.dshSalesTrend}
            </CardTitle>
            <CardDescription>
              {t.dshDailySalesTotalDesc
                .replace("{symbol}", fmt.symbol)
                .replace("{range}", rangeLabel)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trend.length === 0 ? (
              <EmptyState title={t.dshNoSalesYet} description={t.dshNoSalesYetDesc} />
            ) : (
              <ResponsiveContainer width="100%" height={260} minHeight={200}>
                <AreaChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2E6237" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#2E6237" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    // Render day name in the active UI locale (Arabic month/day
                    // names for `ar`, English for `en`). The backend still
                    // sends a hardcoded Arabic `label` field, but we ignore it
                    // here to avoid leaking Arabic when the UI is in English.
                    tickFormatter={(iso: string) => {
                      const d = new Date(iso)
                      if (isNaN(d.getTime())) return ""
                      return new Intl.DateTimeFormat(
                        locale === "en" ? "en-GB" : "ar-KW-u-nu-latn",
                        { weekday: "short" }
                      ).format(d)
                    }}
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
                    formatter={(v: number) => [fmt.currency(v), t.dshSales]}
                    labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#2E6237"
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
              {t.dshInventoryValueDistribution}
            </CardTitle>
            <CardDescription>{t.dshByCategory}</CardDescription>
          </CardHeader>
          <CardContent>
            {cats.length === 0 ? (
              <EmptyState title={t.dshNoCategories} description={t.noDataDescription} />
            ) : (
              <ResponsiveContainer width="100%" height={260} minHeight={200}>
                <PieChart>
                  <Pie
                    data={cats}
                    dataKey="total"
                    nameKey="categoryName"
                    cx="50%"
                    cy="45%"
                    innerRadius={45}
                    outerRadius={75}
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
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    iconSize={9}
                    wrapperStyle={{
                      fontSize: 11,
                      paddingTop: 8,
                      maxHeight: 60,
                      overflow: "hidden",
                    }}
                    formatter={(value: string) =>
                      value.length > 16 ? `${value.slice(0, 16)}…` : value
                    }
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
              {t.dshTopSelling}
            </CardTitle>
            <CardDescription>{t.dshByRevenue}</CardDescription>
          </CardHeader>
          <CardContent>
            {top.length === 0 ? (
              <EmptyState title={t.dshNoSalesYet} description={t.noDataDescription} />
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
                {t.dshInventoryAlerts}
              </CardTitle>
              <CardDescription>{t.dshProductsNeedReorder}</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-primary"
              onClick={() => setView("inventory")}
            >
              {t.all}
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <EmptyState
                title={t.dshInventoryGood}
                description={t.dshNoLowStockProducts}
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
                            {t.dshLimit}: {fmt.number(p.reorderLevel)} {p.unit}
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
                {t.dshRecentInvoices}
              </CardTitle>
              <CardDescription>{t.dshRecentOperations}</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-primary"
              onClick={() => setView("invoices")}
            >
              {t.all}
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <EmptyState title={t.dshNoInvoices} description={t.noDataDescription} />
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
                          {s.customerName || t.cashCustomer} • {fmt.dateTime(s.createdAt)}
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
                  {t.dshYouHavePendingPo} ({fmt.number(data.pendingPurchases)})
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.dshConfirmReceiptToUpdateStock}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setView("purchases")}>
              {t.dshReviewPurchases}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
