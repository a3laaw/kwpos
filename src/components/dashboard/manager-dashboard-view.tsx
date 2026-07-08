"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  TrendingUp, TrendingDown, DollarSign, Users, Package, ShoppingCart,
  CreditCard, AlertTriangle, RefreshCw, Clock, Receipt, ArrowLeft,
} from "lucide-react"
import { useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"
import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"

interface ManagerDashboardData {
  todaySales: number
  yesterdaySales: number
  salesChangePct: number
  todaySalesCount: number
  yesterdaySalesCount: number
  openShifts: Array<{ id: string; cashierName: string; openedAt: string; openingBalance: number }>
  lowStockProducts: Array<{ id: string; name: string; quantity: number; reorderLevel: number; barcode?: string | null }>
  pendingPurchaseOrders: Array<{ id: string; status: string; total: number; supplierName: string; createdAt: string }>
  outstandingPayables: Array<{ id: string; name: string; balance: number }>
  totalPayables: number
  voidRefundRate: number
  voidRefundCount: number
  totalSalesCount7d: number
  topProductsToday: Array<{ name: string; imageUrl?: string | null; qty: number; revenue: number }>
  generatedAt: string
}

export function ManagerDashboardView() {
  const t = useT()
  const fmt = useFmt()
  const setView = useAppStore((s) => s.setView)

  const { data, isLoading, refetch, isFetching } = useQuery<ManagerDashboardData>({
    queryKey: ["manager-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/manager")
      if (!res.ok) throw new Error("failed")
      return res.json()
    },
    refetchInterval: 60_000, // auto-refresh every 60s
    staleTime: 30_000,
  })

  function navigate(view: string) {
    setView(view as any)
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <PageHeader title="لوحة المدير" description="نظرة عملياتية سريعة" icon={<TrendingUp className="h-5 w-5" />} />
        <div className="grid gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-24 rounded-lg bg-muted/50 animate-pulse" />
              </CardContent>
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
        title="لوحة المدير"
        description="نظرة عملياتية سريعة على أداء المتجر"
        icon={<TrendingUp className="h-5 w-5" />}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            تحديث
          </Button>
        }
      />

      {/* KPI cards row */}
      <div className="grid gap-4 lg:grid-cols-4">
        {/* Today's sales vs yesterday */}
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <DollarSign className="h-4 w-4" />
                </span>
                <span className="text-sm text-muted-foreground">مبيعات اليوم</span>
              </div>
              <span className={cn(
                "flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded",
                salesUp ? "text-emerald-600 bg-emerald-500/10" : "text-rose-600 bg-rose-500/10"
              )}>
                {salesUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(data.salesChangePct)}%
              </span>
            </div>
            <p className="text-2xl font-bold tabular-nums mt-2">{fmt.currency(data.todaySales)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {data.todaySalesCount} فاتورة • أمس: {fmt.currency(data.yesterdaySales)}
            </p>
          </CardContent>
        </Card>

        {/* Open shifts */}
        <Card className="border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                <Clock className="h-4 w-4" />
              </span>
              <span className="text-sm text-muted-foreground">ورديات مفتوحة</span>
            </div>
            <p className="text-2xl font-bold tabular-nums mt-2">{data.openShifts.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {data.openShifts.length > 0
                ? data.openShifts.slice(0, 2).map((s) => s.cashierName).join("، ")
                : "لا توجد ورديات نشطة"}
            </p>
          </CardContent>
        </Card>

        {/* Low stock alerts */}
        <Card
          className={cn("cursor-pointer hover:shadow-md transition-shadow", data.lowStockProducts.length > 0 && "border-amber-500/30")}
          onClick={() => navigate("inventory")}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <span className="text-sm text-muted-foreground">نقص مخزون</span>
            </div>
            <p className="text-2xl font-bold tabular-nums mt-2">{data.lowStockProducts.length}</p>
            <p className="text-xs text-muted-foreground mt-1">منتج تحت حد إعادة الطلب</p>
          </CardContent>
        </Card>

        {/* Outstanding payables */}
        <Card
          className={cn("cursor-pointer hover:shadow-md transition-shadow", data.totalPayables > 0 && "border-rose-500/30")}
          onClick={() => navigate("purchases")}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600">
                <CreditCard className="h-4 w-4" />
              </span>
              <span className="text-sm text-muted-foreground">مستحقات موردين</span>
            </div>
            <p className="text-2xl font-bold tabular-nums mt-2">{fmt.currency(data.totalPayables)}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.outstandingPayables.length} مورد</p>
          </CardContent>
        </Card>
      </div>

      {/* Second row: alerts + details */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Low stock details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-amber-600" />
              تنبيهات نقص المخزون
              {data.lowStockProducts.length > 0 ? (
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-700">{data.lowStockProducts.length}</Badge>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">لا توجد منتجات تحت حد إعادة الطلب</p>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-1">
                  {data.lowStockProducts.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/30 cursor-pointer"
                      onClick={() => navigate("inventory")}
                    >
                      <span className="flex-1 min-w-0 truncate text-sm font-medium">{p.name}</span>
                      <Badge
                        variant={p.quantity === 0 ? "destructive" : "secondary"}
                        className="tabular-nums shrink-0"
                      >
                        {p.quantity} / {p.reorderLevel}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Pending POs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-blue-600" />
              أوامر شراء معلّقة
              {data.pendingPurchaseOrders.length > 0 ? (
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-700">{data.pendingPurchaseOrders.length}</Badge>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.pendingPurchaseOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">لا توجد أوامر شراء معلّقة</p>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-1">
                  {data.pendingPurchaseOrders.map((po) => (
                    <div
                      key={po.id}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/30 cursor-pointer"
                      onClick={() => navigate("purchases")}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{po.supplierName}</p>
                        <p className="text-xs text-muted-foreground">{new Date(po.createdAt).toLocaleDateString("ar")}</p>
                      </div>
                      <div className="text-end shrink-0">
                        <p className="text-sm font-bold tabular-nums">{fmt.currency(po.total)}</p>
                        <Badge variant="outline" className="text-[10px]">{po.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Open shifts detail */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              الورديات النشطة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.openShifts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">لا توجد ورديات مفتوحة</p>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-1">
                  {data.openShifts.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/30 cursor-pointer"
                      onClick={() => navigate("shifts")}
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {s.cashierName.charAt(0)}
                        </span>
                        <div>
                          <p className="text-sm font-medium">{s.cashierName}</p>
                          <p className="text-xs text-muted-foreground">
                            من {new Date(s.openedAt).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        رصيد افتتاحي: {fmt.currency(s.openingBalance)}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Top products today */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
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
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt="" className="h-8 w-8 rounded object-contain shrink-0" />
                    ) : null}
                    <span className="flex-1 min-w-0 truncate text-sm font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">{p.qty} وحدة</span>
                    <span className="text-sm font-bold tabular-nums text-primary shrink-0">{fmt.currency(p.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Void/refund rate footer */}
      <Card className={cn(
        "border-l-4",
        data.voidRefundRate > 10 ? "border-l-rose-500" : data.voidRefundRate > 5 ? "border-l-amber-500" : "border-l-emerald-500"
      )}>
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              data.voidRefundRate > 10 ? "bg-rose-500/10 text-rose-600" : data.voidRefundRate > 5 ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"
            )}>
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium">نسبة الحذف والمرتجعات (7 أيام)</p>
              <p className="text-xs text-muted-foreground">
                {data.voidRefundCount} عملية من أصل {data.totalSalesCount7d} مبيعة
              </p>
            </div>
          </div>
          <div className="text-end">
            <p className={cn(
              "text-2xl font-bold tabular-nums",
              data.voidRefundRate > 10 ? "text-rose-600" : data.voidRefundRate > 5 ? "text-amber-600" : "text-emerald-600"
            )}>
              {data.voidRefundRate}%
            </p>
            <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => navigate("audit")}>
              عرض التفاصيل
              <ArrowLeft className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
