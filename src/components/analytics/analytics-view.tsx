"use client"

import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadingState } from "@/components/shared/loading-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import {
  BarChart3,
  TrendingUp,
  PackageX,
  ArrowUp,
  ArrowDown,
  Percent,
  Calendar,
  Trophy,
  AlertTriangle,
  Coins,
  Crown,
} from "lucide-react"
import { useAnalytics } from "@/hooks/use-api"
import { useFmt } from "@/components/currency-context"
import type { ProductAnalytics } from "@/lib/types"
import { cn } from "@/lib/utils"

function defaultFrom(): string {
  const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 10)
}
function defaultTo(): string {
  return new Date().toISOString().slice(0, 10)
}

export function AnalyticsView() {
  const fmt = useFmt()
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

  return (
    <div className="space-y-5">
      <PageHeader
        title="تحليلات المبيعات والمخزون"
        description="تحليلات ذكية للأصناف: الأكثر مبيعاً، الراكد، الأعلى/الأقل تكلفة، والأكثر ربحية."
        icon={<BarChart3 className="h-5 w-5" />}
      />

      {/* Date range filter */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="space-y-1.5 flex-1">
            <Label htmlFor="from" className="text-xs flex items-center gap-1.5">
              <Calendar className="h-3 w-3" /> من تاريخ
            </Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5 flex-1">
            <Label htmlFor="to" className="text-xs flex items-center gap-1.5">
              <Calendar className="h-3 w-3" /> إلى تاريخ
            </Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
          </div>
          <div className="flex gap-2">
            <Button onClick={applyRange} size="sm">تطبيق</Button>
            <Button onClick={resetRange} size="sm" variant="outline">آخر ٣٠ يوم</Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          النطاق الزمني يطبّق على تحليلات "الأكثر مبيعاً" و"الأصناف الراكدة". تحليلات التكلفة والربحية تستند لبيانات المنتجات الحالية.
        </p>
      </Card>

      {isLoading ? (
        <LoadingState text="جارٍ حساب التحليلات..." />
      ) : isError ? (
        <EmptyState title="تعذّر تحميل التحليلات" action={<Button onClick={() => refetch()}>إعادة المحاولة</Button>} />
      ) : !data ? null : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Top selling */}
          <AnalyticsCard
            title="الأكثر مبيعاً"
            description="ترتيب حسب الكمية المباعة وحجم الإيراد"
            icon={<TrendingUp className="h-4 w-4" />}
            tone="success"
            empty={data.topSelling.length === 0}
            emptyText="لا توجد مبيعات في النطاق المحدد"
          >
            <RankList
              items={data.topSelling}
              primary={(r) => fmt.number(r.quantitySold)}
              primaryLabel="قطعة"
              secondary={(r) => fmt.currency(r.grossVolume)}
            />
          </AnalyticsCard>

          {/* Stagnant stock */}
          <AnalyticsCard
            title="الأصناف الراكدة"
            description="منخفضة أو صفرية المبيع (قد تحتاج تخفيضات)"
            icon={<PackageX className="h-4 w-4" />}
            tone="warning"
            empty={data.stagnant.length === 0}
            emptyText="لا توجد أصناف راكدة"
          >
            <StagnantList items={data.stagnant} fmt={fmt} />
          </AnalyticsCard>

          {/* Most expensive */}
          <AnalyticsCard
            title="الأصناف الأكثر تكلفة"
            description="حسب سعر التكلفة الأساسي"
            icon={<ArrowUp className="h-4 w-4" />}
            tone="info"
            empty={data.mostExpensive.length === 0}
            emptyText="لا توجد بيانات"
          >
            <CostList items={data.mostExpensive} fmt={fmt} />
          </AnalyticsCard>

          {/* Cheapest */}
          <AnalyticsCard
            title="الأصناف الأقل تكلفة"
            description="حسب سعر التكلفة الأساسي"
            icon={<ArrowDown className="h-4 w-4" />}
            tone="default"
            empty={data.cheapest.length === 0}
            emptyText="لا توجد بيانات"
          >
            <CostList items={data.cheapest} fmt={fmt} />
          </AnalyticsCard>

          {/* Highest margin */}
          <AnalyticsCard
            title="الأصناف الأكثر ربحية"
            description="حسب الفرق المطلق بين سعر البيع والتكلفة"
            icon={<Percent className="h-4 w-4" />}
            tone="success"
            empty={data.highestMargin.length === 0}
            emptyText="لا توجد بيانات"
          >
            <RankList
              items={data.highestMargin}
              primary={(r) => fmt.currency(r.margin)}
              primaryLabel="ربح/وحدة"
              secondary={(r) => `${fmt.number(r.marginPct)}%`}
            />
          </AnalyticsCard>
        </div>
      )}
    </div>
  )
}

const toneStyles: Record<string, string> = {
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  info: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  default: "bg-primary/10 text-primary",
}

function AnalyticsCard({
  title,
  description,
  icon,
  tone = "default",
  empty,
  emptyText,
  children,
}: {
  title: string
  description: string
  icon: React.ReactNode
  tone?: "success" | "warning" | "info" | "default"
  empty?: boolean
  emptyText?: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", toneStyles[tone])}>
            {icon}
          </span>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {empty ? (
          <p className="text-sm text-muted-foreground text-center py-6">{emptyText}</p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

function RankList({
  items,
  primary,
  primaryLabel,
  secondary,
}: {
  items: ProductAnalytics[]
  primary: (r: ProductAnalytics) => string
  primaryLabel: string
  secondary: (r: ProductAnalytics) => string
}) {
  const max = items.length > 0 ? Math.max(...items.map((i) => i.quantitySold || i.margin || 0), 1) : 1
  return (
    <ScrollArea className="max-h-80 pr-1 scrollbar-thin">
      <div className="space-y-2.5">
        {items.map((r, i) => {
          const val = r.quantitySold || r.margin || 0
          const pct = Math.round((val / max) * 100)
          return (
            <div key={r.id} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                      i === 0
                        ? "bg-amber-500/15 text-amber-600"
                        : i === 1
                        ? "bg-slate-400/15 text-slate-500"
                        : i === 2
                        ? "bg-orange-500/15 text-orange-600"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="truncate">{r.name}</span>
                  {r.categoryName ? (
                    <Badge variant="outline" className="text-[10px] shrink-0">{r.categoryName}</Badge>
                  ) : null}
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold tabular-nums">{primary(r)}</span>
                  <span className="text-[10px] text-muted-foreground">{primaryLabel}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={pct} className="h-1.5 flex-1" />
                <span className="text-xs text-muted-foreground tabular-nums w-20 text-left">{secondary(r)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}

function StagnantList({ items, fmt }: { items: ProductAnalytics[]; fmt: ReturnType<typeof useFmt> }) {
  return (
    <ScrollArea className="max-h-80 pr-1 scrollbar-thin">
      <div className="space-y-2">
        {items.map((r, i) => {
          const ratio = r.currentStock + r.quantitySold > 0
            ? (r.quantitySold / (r.currentStock + r.quantitySold)) * 100
            : 0
          const critical = r.quantitySold === 0
          return (
            <div
              key={r.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>المخزون: {fmt.number(r.currentStock)}</span>
                  <span>•</span>
                  <span>المبيع: {fmt.number(r.quantitySold)}</span>
                </p>
              </div>
              <div className="text-left shrink-0">
                <Badge variant={critical ? "destructive" : ratio < 20 ? "secondary" : "outline"} className="tabular-nums">
                  {critical ? "لم يُبع" : `${fmt.number(ratio)}% دوران`}
                </Badge>
                {r.lastSoldAt ? (
                  <p className="text-[10px] text-muted-foreground mt-1">آخر بيع: {new Date(r.lastSoldAt).toLocaleDateString("ar-KW-u-nu-latn")}</p>
                ) : (
                  <p className="text-[10px] text-muted-foreground mt-1">لا يوجد بيع</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}

function CostList({ items, fmt }: { items: ProductAnalytics[]; fmt: ReturnType<typeof useFmt> }) {
  return (
    <ScrollArea className="max-h-80 pr-1 scrollbar-thin">
      <div className="space-y-2">
        {items.map((r, i) => (
          <div
            key={r.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{r.name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                {r.categoryName ? <Badge variant="outline" className="text-[10px]">{r.categoryName}</Badge> : null}
                <span className="flex items-center gap-1">
                  <Coins className="h-3 w-3" />
                  تكلفة: {fmt.currency(r.costPrice)}
                </span>
              </p>
            </div>
            <div className="text-left shrink-0">
              <p className="font-semibold tabular-nums">{fmt.currency(r.salePrice)}</p>
              <p className="text-[10px] text-muted-foreground">سعر البيع</p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
