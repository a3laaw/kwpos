"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Crown, TrendingUp, TrendingDown, DollarSign, Wallet,
  RefreshCw, ArrowLeft,
} from "lucide-react"
import { useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"
import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"

export function OwnerDashboardView() {
  const t = useT()
  const fmt = useFmt()
  const setView = useAppStore((s) => s.setView)

  const { data, isLoading, refetch, isFetching } = useQuery<any>({
    queryKey: ["owner-dashboard-simple"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/manager")
      if (!res.ok) throw new Error("failed")
      return res.json()
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <PageHeader title={t.ownerDashboardTitle} description={t.ownerDashboardDesc} icon={<Crown className="h-5 w-5" />} />
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><div className="h-32 rounded-lg bg-muted/50 animate-pulse" /></CardContent></Card>
          ))}
        </div>
      </div>
    )
  }

  // Estimate expenses as 75% of sales (cost of goods + overheads)
  const todaySales = data.todaySales || 0
  const yesterdaySales = data.yesterdaySales || 0
  const estimatedExpenses = todaySales * 0.75
  const netProfit = todaySales - estimatedExpenses
  const salesUp = data.salesChangePct >= 0

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.ownerDashboardTitle}
        description={t.ownerDashboardDesc}
        icon={<Crown className="h-5 w-5" />}
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            تحديث
          </Button>
        }
      />

      {/* Big cards: Sales vs Expenses */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Sales */}
        <Card className="border-emerald-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <DollarSign className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm text-muted-foreground">مبيعات اليوم</p>
                  <p className="text-xs text-muted-foreground">{data.todaySalesCount || 0} فاتورة</p>
                </div>
              </div>
              <span className={cn(
                "flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-lg",
                salesUp ? "text-emerald-600 bg-emerald-500/10" : "text-rose-600 bg-rose-500/10"
              )}>
                {salesUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {Math.abs(data.salesChangePct || 0)}%
              </span>
            </div>
            <p className="text-3xl font-bold tabular-nums text-emerald-600">{fmt.currency(todaySales)}</p>
            <div className="mt-3 pt-3 border-t border-border/40 flex justify-between text-xs text-muted-foreground">
              <span>أمس: {fmt.currency(yesterdaySales)}</span>
              <span>الفرق: {fmt.currency(todaySales - yesterdaySales)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card className="border-rose-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600">
                  <Wallet className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm text-muted-foreground">مصروفات اليوم (تقديري)</p>
                  <p className="text-xs text-muted-foreground">تكلفة البضاعة + مصاريف تشغيل</p>
                </div>
              </div>
            </div>
            <p className="text-3xl font-bold tabular-nums text-rose-600">{fmt.currency(estimatedExpenses)}</p>
            <div className="mt-3 pt-3 border-t border-border/40 flex justify-between text-xs text-muted-foreground">
              <span>صافي الربح: {fmt.currency(netProfit)}</span>
              <span>هامش: {todaySales > 0 ? Math.round((netProfit / todaySales) * 100) : 0}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick summary row */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setView("sales" as any)}>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">المبيعات</p>
            <p className="text-lg font-bold tabular-nums">{fmt.currency(todaySales)}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setView("accounting" as any)}>
          <CardContent className="p-4 text-center">
            <Wallet className="h-5 w-5 text-rose-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">المصروفات</p>
            <p className="text-lg font-bold tabular-nums">{fmt.currency(estimatedExpenses)}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setView("inventory" as any)}>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">صافي الربح</p>
            <p className="text-lg font-bold tabular-nums text-emerald-600">{fmt.currency(netProfit)}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setView("reports" as any)}>
          <CardContent className="p-4 text-center">
            <Crown className="h-5 w-5 text-amber-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">الهامش</p>
            <p className="text-lg font-bold tabular-nums">{todaySales > 0 ? Math.round((netProfit / todaySales) * 100) : 0}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 flex-wrap">
        <Button variant="outline" onClick={() => setView("sales" as any)} className="gap-2">
          <DollarSign className="h-4 w-4" /> نقاط البيع
        </Button>
        <Button variant="outline" onClick={() => setView("reports" as any)} className="gap-2">
          <TrendingUp className="h-4 w-4" /> التقارير
        </Button>
        <Button variant="outline" onClick={() => setView("accounting" as any)} className="gap-2">
          <Wallet className="h-4 w-4" /> المحاسبة
        </Button>
        <Button variant="outline" onClick={() => setView("settings" as any)} className="gap-2">
          <Crown className="h-4 w-4" /> الإعدادات
        </Button>
      </div>
    </div>
  )
}
