"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Crown, TrendingUp, TrendingDown, DollarSign, Wallet, Receipt,
  Boxes, CreditCard, Clock, AlertTriangle, AlertOctagon, Info,
  RefreshCw, Package, ShoppingCart, FileText, Users, BarChart3,
  ArrowLeft, Trophy, Layers,
} from "lucide-react"
import { useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"
import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"

// ── Types ────────────────────────────────────────────────────────────
interface OwnerDashboardAlert {
  type:
    | "lowStock"
    | "highRefundRate"
    | "highVoidRate"
    | "unusualSalesDrop"
    | "unusualSalesSpike"
    | "overdueSupplierPayments"
    | "expiringPromotions"
  severity: "info" | "warning" | "critical"
  message: string
  action: string
}

interface PeriodMetrics {
  sales: number
  profit: number
  orders: number
  aov: number
  prevSales: number
  prevProfit: number
  prevOrders: number
  prevAov: number
  salesChangePct: number
  profitChangePct: number
  ordersChangePct: number
  aovChangePct: number
}

interface TopProduct {
  name: string
  qty: number
  revenue: number
}

interface TopCategory {
  name: string
  qty: number
  revenue: number
}

interface PaymentMethodBreakdown {
  method: "CASH" | "CARD" | "TRANSFER"
  total: number
  count: number
}

interface HourlyBucket {
  hour: number
  total: number
  count: number
}

interface TrendDay {
  date: string
  total: number
  label: string
}

interface LowStockProduct {
  id: string
  name: string
  barcode: string | null
  quantity: number
  reorderLevel: number
}

interface OwnerDashboardData {
  generatedAt: string
  periodComparison: {
    today: PeriodMetrics
    week: PeriodMetrics
    month: PeriodMetrics
  }
  todayKPIs: {
    sales: number
    salesCount: number
    profit: number
    stockValue: number
    outstandingPayments: number
    activeShifts: number
    lowStockCount: number
  }
  topProductsToday: TopProduct[]
  topCategoriesToday: TopCategory[]
  salesByPaymentMethod: PaymentMethodBreakdown[]
  hourlySales: HourlyBucket[]
  sevenDayTrend: TrendDay[]
  customers: {
    total: number
    newThisMonth: number
  }
  refundRate: number
  voidRate: number
  lowStockProducts: LowStockProduct[]
  outstandingPayables: Array<{ id: string; name: string; balance: number }>
  openShifts: Array<{ id: string; cashierName: string; openedAt: string; openingBalance: number }>
  alerts: OwnerDashboardAlert[]
}

// ── Brand colors (terracotta + gold scheme) ──────────────────────────
const BRAND = {
  terracotta: "#2E6237",
  gold: "#DFC196",
  lightGold: "#F9DC7C",
  rose: "#f43f5e",
  amber: "#f59e0b",
  blue: "#3b82f6",
} as const

const PAYMENT_COLORS: Record<PaymentMethodBreakdown["method"], string> = {
  CASH: BRAND.terracotta,
  CARD: BRAND.gold,
  TRANSFER: BRAND.lightGold,
}

// ── Alert message resolver ──────────────────────────────────────────
// The API returns structured `message` strings like "lowStock:5" —
// we parse the prefix and the payload to look up the corresponding
// i18n template and substitute the placeholder.
function resolveAlertMessage(message: string, t: ReturnType<typeof useT>): string {
  const [type, value] = message.split(":")
  switch (type) {
    case "lowStock":
      return t.odAlertLowStock.replace("{count}", value || "0")
    case "highRefundRate":
      return t.odAlertHighRefund.replace("{rate}", value || "0")
    case "highVoidRate":
      return t.odAlertHighVoid.replace("{rate}", value || "0")
    case "salesDrop":
      return t.odAlertSalesDrop.replace("{pct}", value || "0")
    case "salesSpike":
      return t.odAlertSalesSpike.replace("{pct}", value || "0")
    case "overduePayments":
      return t.odAlertOverduePayments.replace("{count}", value || "0")
    case "expiringPromos":
      return t.odAlertExpiringPromos.replace("{count}", value || "0")
    default:
      return message
  }
}

// ── Component ────────────────────────────────────────────────────────
export function OwnerDashboardView() {
  const t = useT()
  const fmt = useFmt()
  const setView = useAppStore((s) => s.setView)

  const { data, isLoading, refetch, isFetching, dataUpdatedAt } = useQuery<OwnerDashboardData>({
    queryKey: ["owner-dashboard-pro"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/owner")
      if (!res.ok) throw new Error("failed")
      return res.json()
    },
    // Auto-refresh every 60 seconds so KPIs stay current without manual
    // refresh. react-query pauses polling when the tab is hidden.
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  // Period comparison toggle state: today | week | month
  const [period, setPeriod] = React.useState<"today" | "week" | "month">("today")

  function navigate(view: string) {
    setView(view as any)
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <PageHeader
          title={t.ownerDashboardTitle}
          description={t.ownerDashboardDesc}
          icon={<Crown className="h-5 w-5" />}
        />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-24 rounded-lg bg-muted/50 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-sm text-muted-foreground text-center">{t.odLoading}</p>
      </div>
    )
  }

  const kpi = data?.todayKPIs ?? { sales: 0, count: 0, profit: 0, stockValue: 0, outstandingPayments: 0, activeShifts: 0 }
  const comp = data?.periodComparison?.[period] ?? { sales: 0, profit: 0, orders: 0, aov: 0, salesChangePct: 0, profitChangePct: 0, ordersChangePct: 0, aovChangePct: 0 }
  const trend = data?.sevenDayTrend ?? []
  const hourly = data?.hourlySales ?? []
  const topProducts = data?.topProductsToday ?? []
  const topCategories = data?.topCategoriesToday ?? []
  const payments = data?.salesByPaymentMethod ?? []
  const alerts = data?.alerts ?? []
  const lowStock = data?.lowStockProducts ?? []
  const outstandingPayables = (data as any)?.outstandingPayables ?? []

  // Sales-change pct for the KPI card header badge (always vs yesterday).
  const salesChangePct = data?.periodComparison?.today?.salesChangePct ?? 0
  const profitChangePct = data?.periodComparison?.today?.profitChangePct ?? 0
  const ordersChangePct = data?.periodComparison?.today?.ordersChangePct ?? 0

  // Payment method donut calculation: total + percentages.
  const totalPayments = payments.reduce((s, p) => s + p.total, 0)
  const cashPct = totalPayments > 0 ? (payments.find((p) => p.method === "CASH")?.total || 0) / totalPayments * 100 : 0
  const cardPct = totalPayments > 0 ? (payments.find((p) => p.method === "CARD")?.total || 0) / totalPayments * 100 : 0
  // TRANSFER gets the remainder.
  const transferPct = Math.max(0, 100 - cashPct - cardPct)

  // Conic-gradient donut: from 0deg, CASH 0→cash%, CARD cash%→(cash+card)%, TRANSFER rest→100%
  const donutGradient = `conic-gradient(from -90deg, ${BRAND.terracotta} 0% ${cashPct}%, ${BRAND.gold} ${cashPct}% ${cashPct + cardPct}%, ${BRAND.lightGold} ${cashPct + cardPct}% 100%)`

  // Last-updated timestamp for the header.
  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : new Date(data.generatedAt).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.ownerDashboardTitle}
        description={t.ownerDashboardDesc}
        icon={<Crown className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs text-muted-foreground tabular-nums">
              {t.odLastUpdated}: {lastUpdated}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              {t.odRefresh}
            </Button>
          </div>
        }
      />

      {/* ── Smart alerts panel ─────────────────────────────────────── */}
      <Card className={cn(
        "transition-colors",
        alerts.length === 0
          ? "border-emerald-500/20"
          : alerts.some((a) => a.severity === "critical")
          ? "border-rose-500/40 bg-rose-500/5"
          : "border-amber-500/30 bg-amber-500/5"
      )}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className={cn(
              "h-4 w-4",
              alerts.length === 0
                ? "text-emerald-600"
                : alerts.some((a) => a.severity === "critical")
                ? "text-rose-600"
                : "text-amber-600"
            )} />
            {t.odSmartAlerts}
            {alerts.length > 0 && (
              <Badge variant="secondary" className="bg-rose-500/10 text-rose-700">
                {alerts.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <TrendingUp className="h-3.5 w-3.5" />
              </span>
              {t.odNoAlerts}
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {alerts.map((a, i) => {
                const sevConfig = {
                  critical: {
                    bg: "bg-rose-500/10",
                    text: "text-rose-700",
                    icon: AlertOctagon,
                    border: "border-rose-500/30 hover:border-rose-500/60",
                  },
                  warning: {
                    bg: "bg-amber-500/10",
                    text: "text-amber-700",
                    icon: AlertTriangle,
                    border: "border-amber-500/30 hover:border-amber-500/60",
                  },
                  info: {
                    bg: "bg-blue-500/10",
                    text: "text-blue-700",
                    icon: Info,
                    border: "border-blue-500/30 hover:border-blue-500/60",
                  },
                } as const
                const cfg = sevConfig[a.severity]
                const Icon = cfg.icon
                return (
                  <button
                    key={i}
                    onClick={() => navigate(a.action)}
                    className={cn(
                      "flex items-start gap-2 rounded-lg border p-3 text-start transition-all",
                      cfg.border, cfg.bg
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", cfg.text)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight">
                        {resolveAlertMessage(a.message, t)}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
                        {a.severity === "critical" ? t.odAlertSeverityCritical
                          : a.severity === "warning" ? t.odAlertSeverityWarning
                          : t.odAlertSeverityInfo}
                        <ArrowLeft className="h-2.5 w-2.5" />
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── KPI cards row (6 cards) ────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          title={t.odKpiSales}
          value={fmt.currency(kpi.sales)}
          hint={t.odKpiInvoicesHint.replace("{count}", String(kpi.salesCount))}
          icon={<DollarSign className="h-5 w-5" />}
          tone="success"
          changePct={salesChangePct}
        />
        <KpiCard
          title={t.odKpiProfit}
          value={fmt.currency(kpi.profit)}
          hint={t.odKpiInvoicesHint.replace("{count}", String(kpi.salesCount))}
          icon={<Wallet className="h-5 w-5" />}
          tone="terracotta"
          changePct={profitChangePct}
        />
        <KpiCard
          title={t.odKpiOrders}
          value={fmt.number(kpi.salesCount)}
          hint={t.odKpiLowStockHint.replace("{count}", String(kpi.lowStockCount))}
          icon={<Receipt className="h-5 w-5" />}
          tone="gold"
          changePct={ordersChangePct}
        />
        <KpiCard
          title={t.odKpiStockValue}
          value={fmt.currency(kpi.stockValue)}
          hint={t.odKpiSuppliersHint.replace("{count}", String(outstandingPayables?.length ?? 0))}
          icon={<Boxes className="h-5 w-5" />}
          tone="info"
        />
        <KpiCard
          title={t.odKpiOutstanding}
          value={fmt.currency(kpi.outstandingPayments)}
          hint={t.odKpiSuppliersHint.replace("{count}", String(outstandingPayables?.length ?? 0))}
          icon={<CreditCard className="h-5 w-5" />}
          tone="danger"
          onClick={() => navigate("suppliers")}
        />
        <KpiCard
          title={t.odKpiActiveShifts}
          value={fmt.number(kpi.activeShifts)}
          hint={t.odKpiShiftsHint}
          icon={<Clock className="h-5 w-5" />}
          tone="blue"
          onClick={() => navigate("shifts")}
        />
      </div>

      {/* ── Period comparison card ────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" />
                {t.odComparison}
              </CardTitle>
              <CardDescription className="text-xs">
                {period === "today" ? t.odPeriodToday : period === "week" ? t.odPeriodWeek : t.odPeriodMonth}
              </CardDescription>
            </div>
            {/* Period toggle */}
            <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1 self-end sm:self-auto">
              {(["today", "week", "month"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                    period === p
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p === "today" ? t.odPeriodToday : p === "week" ? t.odPeriodWeek : t.odPeriodMonth}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <ComparisonMetric
              label={t.odMetricSales}
              current={fmt.currency(comp.sales)}
              previous={fmt.currency(comp.prevSales)}
              changePct={comp.salesChangePct}
            />
            <ComparisonMetric
              label={t.odMetricProfit}
              current={fmt.currency(comp.profit)}
              previous={fmt.currency(comp.prevProfit)}
              changePct={comp.profitChangePct}
            />
            <ComparisonMetric
              label={t.odMetricOrders}
              current={fmt.number(comp.orders)}
              previous={fmt.number(comp.prevOrders)}
              changePct={comp.ordersChangePct}
            />
            <ComparisonMetric
              label={t.odMetricAOV}
              current={fmt.currency(comp.aov)}
              previous={fmt.currency(comp.prevAov)}
              changePct={comp.aovChangePct}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── 7-day trend + Hourly distribution (CSS bars) ──────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-[#2E6237]" />
              {t.odSalesTrend7d}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CssBars
              items={trend.map((d) => ({
                label: d.label,
                value: d.total,
                tooltip: `${d.date}: ${fmt.currency(d.total)}`,
              }))}
              color={BRAND.terracotta}
              emptyText={t.odNoSalesToday}
              barHeight="h-20"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-[#DFC196]" />
              {t.odHourlyDistribution}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CssBars
              items={hourly.map((h) => ({
                label: `${h.hour}`,
                value: h.total,
                tooltip: `${h.hour}:00 — ${fmt.currency(h.total)} (${h.count})`,
              }))}
              color={BRAND.gold}
              emptyText={t.odNoSalesToday}
              barHeight="h-20"
              compact
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Top products + Payment methods donut + Top categories ─── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top products */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-[#2E6237]" />
              {t.odTopProducts}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{t.odNoSalesToday}</p>
            ) : (
              <div className="space-y-2">
                {topProducts.map((p, i) => {
                  const max = topProducts[0].revenue || 1
                  const pct = Math.round((p.revenue / max) * 100)
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 min-w-0">
                          <span className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold",
                            i === 0 ? "bg-amber-500/15 text-amber-600"
                              : i === 1 ? "bg-slate-400/15 text-slate-500"
                              : i === 2 ? "bg-orange-500/15 text-orange-600"
                              : "bg-muted text-muted-foreground"
                          )}>
                            {i + 1}
                          </span>
                          <span className="truncate">{p.name}</span>
                        </span>
                        <span className="font-semibold tabular-nums shrink-0">
                          {fmt.currency(p.revenue)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-md bg-muted/40 overflow-hidden">
                        <div
                          className="h-full rounded-md transition-all"
                          style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: BRAND.terracotta }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        {fmt.number(p.qty)} {t.odUnits}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment methods donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4 text-[#DFC196]" />
              {t.odPaymentMethods}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalPayments === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{t.odNoSalesToday}</p>
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                <div className="relative grid place-items-center shrink-0">
                  <div
                    className="h-32 w-32 rounded-full"
                    style={{ background: donutGradient }}
                    aria-label={t.odPaymentMethods}
                  />
                  <div className="absolute h-20 w-20 rounded-full bg-card grid place-items-center">
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">{t.odKpiOrders}</p>
                      <p className="text-sm font-bold tabular-nums">
                        {fmt.number(payments.reduce((s, p) => s + p.count, 0))}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 w-full space-y-2">
                  {payments.map((p) => {
                    const total = payments.reduce((s, x) => s + x.count, 0)
                    const countPct = total > 0 ? (p.count / total) * 100 : 0
                    const label = p.method === "CASH" ? t.odCash : p.method === "CARD" ? t.odCard : t.odTransfer
                    return (
                      <div key={p.method} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-3 w-3 rounded-sm shrink-0"
                            style={{ backgroundColor: PAYMENT_COLORS[p.method] }}
                          />
                          <span className="text-sm truncate">{label}</span>
                        </div>
                        <div className="text-end shrink-0">
                          <p className="text-sm font-bold tabular-nums">{fmt.currency(p.total)}</p>
                          <p className="text-[10px] text-muted-foreground tabular-nums">
                            {p.count} ({countPct.toFixed(0)}%)
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top categories */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4 text-[#F9DC7C]" />
              {t.odTopCategories}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{t.odNoSalesToday}</p>
            ) : (
              <div className="space-y-2">
                {topCategories.map((c, i) => {
                  const max = topCategories[0].revenue || 1
                  const pct = Math.round((c.revenue / max) * 100)
                  const colors = [BRAND.terracotta, "#3a7d4a", "#52955f", "#6ba874", "#84ba89"]
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate">{c.name}</span>
                        <span className="font-semibold tabular-nums">{fmt.currency(c.revenue)}</span>
                      </div>
                      <div className="h-1.5 rounded-md bg-muted/40 overflow-hidden">
                        <div
                          className="h-full rounded-md transition-all"
                          style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: colors[i % colors.length] }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        {fmt.number(c.qty)} {t.odUnits}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Customers + Refund/Void + Low stock ──────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Customers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-[#2E6237]" />
              {t.odCustomersTotal}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
              <span className="text-sm text-muted-foreground">{t.odCustomersTotal}</span>
              <span className="text-xl font-bold tabular-nums">{fmt.number(data.customers.total)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[#2E6237]/5 px-3 py-2">
              <span className="text-sm text-muted-foreground">{t.odCustomersNew}</span>
              <span className="text-xl font-bold tabular-nums text-[#2E6237]">
                +{fmt.number(data.customers.newThisMonth)}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs gap-1"
              onClick={() => navigate("customers")}
            >
              {t.navCustomers}
              <ArrowLeft className="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>

        {/* Refund + Void rate */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              {t.odRefundRate} / {t.odVoidRate}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <RateBar
              label={t.odRefundRate}
              rate={data.refundRate}
              thresholds={[10, 20]}
              onClick={() => navigate("audit")}
            />
            <RateBar
              label={t.odVoidRate}
              rate={data.voidRate}
              thresholds={[5, 10]}
              onClick={() => navigate("audit")}
            />
          </CardContent>
        </Card>

        {/* Low stock products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4 text-amber-600" />
                {t.odLowStockPanel}
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-primary"
              onClick={() => navigate("inventory")}
            >
              {t.all}
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t.dshNoLowStockProducts}</p>
            ) : (
              <ScrollArea className="h-[180px]">
                <div className="space-y-1.5">
                  {lowStock.map((p) => {
                    const critical = p.quantity === 0
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5 cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate("inventory")}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{p.name}</p>
                          {p.barcode && (
                            <p className="text-[10px] text-muted-foreground truncate" dir="ltr">
                              {p.barcode}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={critical ? "destructive" : "secondary"}
                          className="tabular-nums shrink-0"
                        >
                          {p.quantity} / {p.reorderLevel}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Quick actions (6 buttons) ─────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="h-4 w-4 text-primary" />
            {t.odQuickActions}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            <QuickActionButton
              icon={DollarSign}
              label={t.odActionNewSale}
              color={BRAND.terracotta}
              onClick={() => navigate("sales")}
            />
            <QuickActionButton
              icon={Package}
              label={t.odActionAddProduct}
              color={BRAND.gold}
              onClick={() => navigate("inventory")}
            />
            <QuickActionButton
              icon={ShoppingCart}
              label={t.odActionCreatePO}
              color={BRAND.lightGold}
              onClick={() => navigate("purchases")}
            />
            <QuickActionButton
              icon={FileText}
              label={t.odActionReports}
              color={BRAND.blue}
              onClick={() => navigate("reports")}
            />
            <QuickActionButton
              icon={Wallet}
              label={t.odActionAddExpense}
              color={BRAND.rose}
              onClick={() => navigate("accounting")}
            />
            <QuickActionButton
              icon={Clock}
              label={t.odActionShifts}
              color={BRAND.amber}
              onClick={() => navigate("shifts")}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────

interface KpiCardProps {
  title: string
  value: string
  hint: string
  icon: React.ReactNode
  tone: "success" | "terracotta" | "gold" | "info" | "danger" | "blue"
  changePct?: number
  onClick?: () => void
}

function KpiCard({ title, value, hint, icon, tone, changePct, onClick }: KpiCardProps) {
  const toneClass: Record<KpiCardProps["tone"], string> = {
    success: "bg-emerald-500/10 text-emerald-600",
    terracotta: "bg-[#2E6237]/10 text-[#2E6237]",
    gold: "bg-[#DFC196]/15 text-[#a07e3a]",
    info: "bg-blue-500/10 text-blue-600",
    danger: "bg-rose-500/10 text-rose-600",
    blue: "bg-blue-500/10 text-blue-600",
  }
  const showChange = typeof changePct === "number" && isFinite(changePct)
  const up = (changePct ?? 0) >= 0
  return (
    <Card
      className={cn(
        "transition-shadow",
        onClick && "cursor-pointer hover:shadow-md"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            <p className="text-lg font-bold tabular-nums mt-1">{value}</p>
          </div>
          <span className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            toneClass[tone]
          )}>
            {icon}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1 mt-2">
          <p className="text-[10px] text-muted-foreground truncate">{hint}</p>
          {showChange && (
            <span className={cn(
              "flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0",
              up ? "text-emerald-600 bg-emerald-500/10" : "text-rose-600 bg-rose-500/10"
            )}>
              {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(changePct ?? 0).toFixed(1)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface ComparisonMetricProps {
  label: string
  current: string
  previous: string
  changePct: number
}

function ComparisonMetric({ label, current, previous, changePct }: ComparisonMetricProps) {
  const up = changePct >= 0
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      <p className="text-lg font-bold tabular-nums mt-1">{current}</p>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {previous}
        </span>
        <span className={cn(
          "flex items-center gap-0.5 text-[10px] font-bold px-1 py-0.5 rounded tabular-nums",
          up ? "text-emerald-600 bg-emerald-500/10" : "text-rose-600 bg-rose-500/10"
        )}>
          {up ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
          {Math.abs(changePct).toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

interface CssBarsProps {
  items: Array<{ label: string; value: number; tooltip: string }>
  color: string
  emptyText: string
  barHeight?: string
  compact?: boolean
}

function CssBars({ items, color, emptyText, barHeight = "h-20", compact }: CssBarsProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">{emptyText}</p>
  }
  const max = Math.max(...items.map((i) => i.value), 0)
  // If every value is 0 there is nothing to chart — show the empty state
  // so the user doesn't see an empty bar strip.
  if (max === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">{emptyText}</p>
  }
  return (
    <div className={cn("flex items-end gap-1", barHeight)}>
      {items.map((item, i) => {
        const pct = max > 0 ? (item.value / max) * 100 : 0
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0 group">
            <div className="w-full rounded-t-md bg-muted/30 overflow-hidden flex items-end" style={{ height: "100%" }}>
              <div
                className="w-full rounded-t-md transition-all group-hover:opacity-80"
                style={{
                  height: `${Math.max(pct, item.value > 0 ? 3 : 0)}%`,
                  backgroundColor: color,
                }}
                title={item.tooltip}
              />
            </div>
            {!compact && (
              <span className="text-[10px] text-muted-foreground truncate w-full text-center" title={item.label}>
                {item.label}
              </span>
            )}
            {compact && (i % 3 === 0 || item.value > 0) && (
              <span className="text-[9px] text-muted-foreground tabular-nums">
                {item.label}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface RateBarProps {
  label: string
  rate: number
  thresholds: [number, number] // [warn, critical]
  onClick?: () => void
}

function RateBar({ label, rate, thresholds, onClick }: RateBarProps) {
  const [warn, critical] = thresholds
  const color = rate >= critical ? "bg-rose-500"
    : rate >= warn ? "bg-amber-500"
    : "bg-emerald-500"
  const textColor = rate >= critical ? "text-rose-600"
    : rate >= warn ? "text-amber-600"
    : "text-emerald-600"
  const bgColor = rate >= critical ? "bg-rose-500/10"
    : rate >= warn ? "bg-amber-500/10"
    : "bg-emerald-500/10"
  const pct = Math.min(rate, 100)
  return (
    <div
      className={cn(
        "rounded-lg p-3 transition-colors",
        onClick && "cursor-pointer hover:opacity-90",
        bgColor
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium">{label}</span>
        <span className={cn("text-base font-bold tabular-nums", textColor)}>
          {rate.toFixed(1)}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${Math.max(pct, 1)}%` }}
        />
      </div>
    </div>
  )
}

interface QuickActionButtonProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  color: string
  onClick: () => void
}

function QuickActionButton({ icon: Icon, label, color, onClick }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-2 rounded-xl border border-border/70 bg-card p-4 text-center transition-all hover:border-primary/40 hover:shadow-sm"
    >
      <span
        className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
        style={{ background: `${color}1a`, color }}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}
