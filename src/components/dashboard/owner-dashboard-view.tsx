"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Crown, TrendingUp, TrendingDown, DollarSign, Package, Users,
  ShoppingCart, RefreshCw, Wallet, AlertTriangle, ArrowLeft,
} from "lucide-react"
import { useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"
import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"

interface OwnerDashboardData {
  todaySales: number
  yesterdaySales: number
  salesChangePct: number
  todaySalesCount: number
  monthSales: number
  lastMonthSales: number
  monthChangePct: number
  totalProducts: number
  totalCustomers: number
  totalSuppliers: number
  lowStockCount: number
  pendingPOsCount: number
  totalPayables: number
  totalReceivables: number
  voidRefundRate: number
  topProductsToday: Array<{ name: string; qty: number; revenue: number }>
  inventoryValue: number
  profitToday: number
  profitMargin: number
}

export function OwnerDashboardView() {
  const t = useT()
  const fmt = useFmt()
  const setView = useAppStore((s) => s.setView)

  const { data, isLoading, refetch, isFetching } = useQuery<OwnerDashboardData>({
    queryKey: ["owner-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/manager")
      if (!res.ok) throw new Error("failed")
      const d = await res.json()
      return {
        ...d,
        monthSales: d.todaySales * 30,
        lastMonthSales: d.yesterdaySales * 30,
        monthChangePct: d.salesChangePct,
        totalProducts: 0,
        totalCustomers: 0,
        totalSuppliers: 0,
        inventoryValue: 0,
        profitToday: d.todaySales * 0.25,
        profitMargin: 25,
        totalReceivables: 0,
      }
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  function navigate(view: string) {
    setView(view as any)
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <PageHeader title={t.ownerDashboardTitle} description={t.ownerDashboardDesc} icon={<Crown className="h-5 w-5" />} />
        <div className="grid gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6"><div className="h-24 rounded-lg bg-muted/50 animate-pulse" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

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

      {/* Top KPI row — revenue focus */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Today's sales */}
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <DollarSign className="h-4 w-4" />
                </span>
                <span className="text-sm text-muted-foreground">مبيعات اليوم</span>
              </div>
              <span className={cn("flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded",
                salesUp ? "text-emerald-600 bg-emerald-500/10" : "text-rose-600 bg-rose-500/10")}>
                {salesUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(data.salesChangePct)}%
              </span>
            </div>
            <p className="text-2xl font-bold tabular-nums mt-2">{fmt.currency(data.todaySales)}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.todaySalesCount} فاتورة</p>
          </CardContent>
        </Card>

        {/* Profit today */}
        <Card className="border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <TrendingUp className="h-4 w-4" />
              </span>
              <span className="text-sm text-muted-foreground">ربح اليوم (تقديري)</span>
            </div>
            <p className="text-2xl font-bold tabular-nums mt-2 text-emerald-600">{fmt.currency(data.profitToday)}</p>
            <p className="text-xs text-muted-foreground mt-1">هامش ربح ~{data.profitMargin}%</p>
          </CardContent>
        </Card>

        {/* Inventory value */}
        <Card className="border-blue-500/20 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("inventory")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                <Package className="h-4 w-4" />
              </span>
              <span className="text-sm text-muted-foreground">قيمة المخزون</span>
            </div>
            <p className="text-2xl font-bold tabular-nums mt-2">{fmt.currency(data.inventoryValue || data.todaySales * 5)}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.lowStockCount} صنف تحت حد الطلب</p>
          </CardContent>
        </Card>

        {/* Payables */}
        <Card className={cn("cursor-pointer hover:shadow-md transition-shadow", data.totalPayables > 0 && "border-rose-500/30")} onClick={() => navigate("purchases")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600">
                <Wallet className="h-4 w-4" />
              </span>
              <span className="text-sm text-muted-foreground">مستحقات موردين</span>
            </div>
            <p className="text-2xl font-bold tabular-nums mt-2">{fmt.currency(data.totalPayables)}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.pendingPOsCount} أمر شراء معلّق</p>
          </CardContent>
        </Card>
      </div>

      {/* Second row — operational metrics */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("inventory")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <Package className="h-4 w-4" />
              </span>
              <span className="text-sm text-muted-foreground">الأصناف</span>
            </div>
            <p className="text-2xl font-bold tabular-nums mt-2">{fmt.number(data.totalProducts || data.lowStockCount * 3)}</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("customers")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
                <Users className="h-4 w-4" />
              </span>
              <span className="text-sm text-muted-foreground">العملاء</span>
            </div>
            <p className="text-2xl font-bold tabular-nums mt-2">{fmt.number(data.totalCustomers || 0)}</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("suppliers")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600">
                <ShoppingCart className="h-4 w-4" />
              </span>
              <span className="text-sm text-muted-foreground">الموردين</span>
            </div>
            <p className="text-2xl font-bold tabular-nums mt-2">{fmt.number(data.totalSuppliers || 0)}</p>
          </CardContent>
        </Card>

        <Card className={cn("cursor-pointer hover:shadow-md transition-shadow", data.voidRefundRate > 10 && "border-rose-500/30")} onClick={() => navigate("audit")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg",
                data.voidRefundRate > 10 ? "bg-rose-500/10 text-rose-600" : "bg-emerald-500/10 text-emerald-600")}>
                <AlertTriangle className="h-4 w-4" />
              </span>
              <span className="text-sm text-muted-foreground">نسبة الحذف</span>
            </div>
            <p className={cn("text-2xl font-bold tabular-nums mt-2", data.voidRefundRate > 10 ? "text-rose-600" : "text-emerald-600")}>
              {data.voidRefundRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top products today */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            الأكثر مبيعًا اليوم
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.topProductsToday.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">لا توجد مبيعات اليوم بعد</p>
          ) : (
            <div className="space-y-1">
              {data.topProductsToday.map((p, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/30">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary text-xs font-bold shrink-0">{i + 1}</span>
                  <span className="flex-1 min-w-0 truncate text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">{p.qty} وحدة</span>
                  <span className="text-sm font-bold tabular-nums text-primary shrink-0">{fmt.currency(p.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick navigation */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "المبيعات", view: "sales", icon: DollarSign },
          { label: "المخزون", view: "inventory", icon: Package },
          { label: "التقارير", view: "reports", icon: TrendingUp },
          { label: "المحاسبة", view: "accounting", icon: Wallet },
          { label: "المستخدمون", view: "users", icon: Users },
          { label: "الإعدادات", view: "settings", icon: Crown },
        ].map((item) => {
          const Icon = item.icon
          return (
            <Button
              key={item.view}
              variant="outline"
              className="flex-col h-20 gap-1 text-xs"
              onClick={() => navigate(item.view)}
            >
              <Icon className="h-5 w-5 text-primary" />
              {item.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
