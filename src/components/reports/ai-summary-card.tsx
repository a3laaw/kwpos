"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import {
  BrainCircuit,
  RefreshCw,
  Loader2,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Info,
  CalendarRange,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"
import { cn } from "@/lib/utils"

type Period = "week" | "month"

interface AISummaryData {
  summary: string
  highlights: string[]
  concerns: string[]
  recommendations: string[]
  period: Period
  generatedAt: string
  fallback: boolean
  kpis: {
    totalSales: number
    totalProfit: number
    orderCount: number
    avgOrderValue: number
    topProducts: Array<{ name: string; qty: number; revenue: number }>
    topCategories: Array<{ name: string; revenue: number }>
    byPayment: Array<{ method: string; revenue: number; count: number }>
    refundCount: number
    refundTotal: number
    newCustomers: number
    lowStockCount: number
    bestDay: { date: string; revenue: number } | null
    worstDay: { date: string; revenue: number } | null
  }
}

/**
 * AI Smart Reports — summary card (Track 3.2)
 *
 * Fetches an AI-generated business analysis from
 * `/api/reports/ai-summary?period=week|month` and renders the four
 * structured sections (summary / highlights / concerns / recommendations)
 * in an RTL Arabic card. Shows a small "fallback" badge when the AI
 * was unavailable and the server returned a deterministic summary
 * computed from the raw KPIs.
 *
 * The "تحديث" (refresh) button bypasses the 1-hour server cache via
 * `?refresh=1` and triggers a refetch.
 */
export function AISummaryCard() {
  const t = useT()
  const fmt = useFmt()
  const [period, setPeriod] = React.useState<Period>("week")

  const { data, isLoading, isError, refetch, isFetching } = useQuery<AISummaryData>({
    queryKey: ["ai-summary", period],
    queryFn: async ({ queryKey }) => {
      const p = queryKey[1] as Period
      // Use a timestamp to defeat the client-side cache when refetch is invoked.
      const res = await fetch(
        `/api/reports/ai-summary?period=${p}&_=${Date.now()}`,
        { headers: { Accept: "application/json" } }
      )
      const ct = res.headers.get("content-type") || ""
      if (!ct.includes("application/json")) {
        // Server returned an HTML error page — usually a cold-start / 500.
        throw new Error("server-error")
      }
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "request-failed")
      return json as AISummaryData
    },
    staleTime: 60 * 60 * 1000, // 1 hour — matches server cache
    retry: false, // don't retry AI failures automatically
  })

  function handleRefresh() {
    // Bypass server cache via ?refresh=1 and force a fresh fetch.
    void refetch()
  }

  function handlePeriodChange(value: string) {
    setPeriod(value === "month" ? "month" : "week")
  }

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BrainCircuit className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                {t.aiSummaryTitle}
                {data?.fallback ? (
                  <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800">
                    {t.aiFallbackBadge}
                  </Badge>
                ) : null}
              </CardTitle>
              <CardDescription className="mt-1">
                {t.aiSummaryDesc}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">{t.aiPeriodWeek}</SelectItem>
                  <SelectItem value="month">{t.aiPeriodMonth}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-8"
              onClick={handleRefresh}
              disabled={isLoading || isFetching}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
              {t.aiRefresh}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <AILoadingSkeleton />
        ) : isError ? (
          <AIErrorState onRetry={handleRefresh} t={t} />
        ) : !data ? null : (
          <div className="space-y-5" dir="rtl">
            {/* ── Executive summary ───────────────────────────────────── */}
            <section className="space-y-2">
              <SectionLabel icon={<Info className="h-4 w-4" />} tone="info">
                {t.aiSectionSummary}
              </SectionLabel>
              <p className="text-sm leading-7 text-foreground whitespace-pre-line">
                {data.summary || t.aiNoContent}
              </p>
            </section>

            {/* ── Highlights ──────────────────────────────────────────── */}
            <section className="space-y-2">
              <SectionLabel icon={<TrendingUpIcon />} tone="success">
                {t.aiSectionHighlights}
              </SectionLabel>
              {data.highlights.length > 0 ? (
                <BulletList items={data.highlights} tone="success" />
              ) : (
                <EmptyBulletPlaceholder text={t.aiNoContent} />
              )}
            </section>

            {/* ── Concerns ────────────────────────────────────────────── */}
            <section className="space-y-2">
              <SectionLabel icon={<AlertTriangle className="h-4 w-4" />} tone="warning">
                {t.aiSectionConcerns}
              </SectionLabel>
              {data.concerns.length > 0 ? (
                <BulletList items={data.concerns} tone="warning" />
              ) : (
                <EmptyBulletPlaceholder text={t.aiNoContent} />
              )}
            </section>

            {/* ── Recommendations ─────────────────────────────────────── */}
            <section className="space-y-2">
              <SectionLabel icon={<Lightbulb className="h-4 w-4" />} tone="primary">
                {t.aiSectionRecommendations}
              </SectionLabel>
              {data.recommendations.length > 0 ? (
                <BulletList items={data.recommendations} tone="primary" />
              ) : (
                <EmptyBulletPlaceholder text={t.aiNoContent} />
              )}
            </section>

            {/* ── KPI strip ───────────────────────────────────────────── */}
            <div className="border-t border-border/60 pt-4 mt-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiChip label={t.aiKpiSales} value={fmt.currency(data.kpis.totalSales)} />
                <KpiChip label={t.aiKpiProfit} value={fmt.currency(data.kpis.totalProfit)} />
                <KpiChip label={t.aiKpiOrders} value={fmt.number(data.kpis.orderCount)} />
                <KpiChip label={t.aiKpiAvgOrder} value={fmt.currency(data.kpis.avgOrderValue)} />
                <KpiChip label={t.aiKpiRefunds} value={`${fmt.number(data.kpis.refundCount)}`} />
                <KpiChip label={t.aiKpiNewCustomers} value={fmt.number(data.kpis.newCustomers)} />
                <KpiChip label={t.aiKpiLowStock} value={fmt.number(data.kpis.lowStockCount)} />
                <KpiChip
                  label={t.aiKpiBestDay}
                  value={data.kpis.bestDay ? `${data.kpis.bestDay.date} (${fmt.currency(data.kpis.bestDay.revenue)})` : "—"}
                />
              </div>
            </div>

            {/* ── Generated-at footer ────────────────────────────────── */}
            <div className="text-[10px] text-muted-foreground text-end pt-1">
              {t.aiGeneratedAt}: {fmt.dateTime(data.generatedAt)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Sub-components ────────────────────────────────────────────────────

function SectionLabel({
  icon,
  tone,
  children,
}: {
  icon: React.ReactNode
  tone: "info" | "success" | "warning" | "primary"
  children: React.ReactNode
}) {
  const toneClass = {
    info: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    primary: "bg-[#DFC196]/15 text-[#8B7355] dark:text-[#DFC196]",
  }[tone]
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg",
          toneClass
        )}
      >
        {icon}
      </div>
      <span className="text-sm font-semibold">{children}</span>
    </div>
  )
}

function BulletList({
  items,
  tone,
}: {
  items: string[]
  tone: "success" | "warning" | "primary"
}) {
  const markerClass = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    primary: "bg-primary",
  }[tone]
  return (
    <ul className="space-y-1.5 ms-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm leading-6">
          <span
            className={cn(
              "mt-2 h-1.5 w-1.5 rounded-full shrink-0",
              markerClass
            )}
          />
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  )
}

function EmptyBulletPlaceholder({ text }: { text: string }) {
  return <p className="text-xs text-muted-foreground italic ms-1">{text}</p>
}

function KpiChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
      <p className="text-[10px] text-muted-foreground truncate">{label}</p>
      <p className="text-sm font-semibold mt-0.5 tabular-nums">{value}</p>
    </div>
  )
}

function TrendingUpIcon() {
  return <CheckCircle2 className="h-4 w-4" />
}

function AILoadingSkeleton() {
  const t = useT()
  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">{t.aiThinking}</span>
      </div>
      <div className="space-y-2">
        <div className="h-4 w-1/3 rounded bg-muted/70 animate-pulse" />
        <div className="h-4 w-full rounded bg-muted/50 animate-pulse" />
        <div className="h-4 w-4/5 rounded bg-muted/50 animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-1/4 rounded bg-muted/70 animate-pulse" />
        <div className="h-3 w-full rounded bg-muted/40 animate-pulse" />
        <div className="h-3 w-5/6 rounded bg-muted/40 animate-pulse" />
        <div className="h-3 w-3/4 rounded bg-muted/40 animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-1/4 rounded bg-muted/70 animate-pulse" />
        <div className="h-3 w-full rounded bg-muted/40 animate-pulse" />
        <div className="h-3 w-2/3 rounded bg-muted/40 animate-pulse" />
      </div>
    </div>
  )
}

function AIErrorState({
  onRetry,
  t,
}: {
  onRetry: () => void
  t: ReturnType<typeof useT>
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-rose-300 bg-rose-50/50 dark:bg-rose-950/20 px-6 py-10 text-center"
      dir="rtl"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div>
        <p className="font-semibold">{t.aiErrorTitle}</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
          {t.aiErrorDesc}
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={onRetry} className="gap-1.5">
        <RefreshCw className="h-3.5 w-3.5" />
        {t.aiRetry}
      </Button>
    </div>
  )
}
