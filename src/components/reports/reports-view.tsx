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
import { PageHeader } from "@/components/shared/page-header"
import { LoadingState } from "@/components/shared/loading-state"
import { EmptyState } from "@/components/shared/empty-state"
import { StatCard } from "@/components/shared/stat-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FileBarChart,
  Filter,
  RotateCcw,
  TrendingUp,
  DollarSign,
  Package,
  Percent,
  Download,
  Calendar,
} from "lucide-react"
import { useReport, type ReportFilters } from "@/hooks/use-api"
import { useFmt } from "@/components/currency-context"

const PIE_COLORS = ["#055BE5", "#5CDE9D", "#185B6B", "#f59e0b", "#8b5cf6", "#ec4899", "#0ea5e9"]

export function ReportsView() {
  const fmt = useFmt()
  const [from, setFrom] = React.useState("")
  const [to, setTo] = React.useState("")
  const [productId, setProductId] = React.useState("")
  const [categoryId, setCategoryId] = React.useState("")
  const [paymentMethod, setPaymentMethod] = React.useState("")
  const [source, setSource] = React.useState("")

  const [applied, setApplied] = React.useState<ReportFilters>({})

  const { data, isLoading, isError, refetch } = useReport(applied)

  function applyFilters() {
    setApplied({
      from: from || undefined,
      to: to || undefined,
      productId: productId || undefined,
      categoryId: categoryId || undefined,
      paymentMethod: paymentMethod || undefined,
      source: source || undefined,
    })
  }

  function resetFilters() {
    setFrom("")
    setTo("")
    setProductId("")
    setCategoryId("")
    setPaymentMethod("")
    setSource("")
    setApplied({})
  }

  function setQuickRange(days: number) {
    const t = new Date()
    const f = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    setFrom(f.toISOString().slice(0, 10))
    setTo(t.toISOString().slice(0, 10))
  }

  const activeFiltersCount = Object.values(applied).filter(Boolean).length
  const products = data?.products ?? []
  const categories = data?.categories ?? []

  return (
    <div className="space-y-5">
      <PageHeader
        title="التقارير"
        description="تقارير مبيعات شاملة بفلاتر مرنة — نطاق تاريخ، منتج، فئة، طريقة دفع، مصدر."
        icon={<FileBarChart className="h-5 w-5" />}
        actions={
          <Button variant="outline" className="gap-2" onClick={() => window.print()}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">تصدير / طباعة</span>
          </Button>
        }
      />

      {/* Filters card */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4 text-primary" />
              الفلاتر
              {activeFiltersCount > 0 ? (
                <Badge className="tabular-nums">{activeFiltersCount} مفعّل</Badge>
              ) : null}
            </CardTitle>
            <div className="flex gap-1.5 flex-wrap">
              <Button size="sm" variant="ghost" onClick={() => setQuickRange(7)} className="h-7 text-xs">٧ أيام</Button>
              <Button size="sm" variant="ghost" onClick={() => setQuickRange(30)} className="h-7 text-xs">٣٠ يوم</Button>
              <Button size="sm" variant="ghost" onClick={() => setQuickRange(90)} className="h-7 text-xs">٩٠ يوم</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> من</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> إلى</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">الفئة</Label>
              <Select value={categoryId} onValueChange={(v) => setCategoryId(v === "all" ? "" : v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="الكل" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الفئات</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">المنتج</Label>
              <Select value={productId} onValueChange={(v) => setProductId(v === "all" ? "" : v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="الكل" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المنتجات</SelectItem>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">طريقة الدفع</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v === "all" ? "" : v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="الكل" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="CASH">نقدي</SelectItem>
                  <SelectItem value="CARD">بطاقة</SelectItem>
                  <SelectItem value="TRANSFER">تحويل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">المصدر</Label>
              <Select value={source} onValueChange={(v) => setSource(v === "all" ? "" : v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="الكل" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="POS">نقاط البيع</SelectItem>
                  <SelectItem value="SHOPIFY">شوبيفاي</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={resetFilters} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> إعادة تعيين
            </Button>
            <Button size="sm" onClick={applyFilters} className="gap-1.5">
              <Filter className="h-3.5 w-3.5" /> تطبيق الفلاتر
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <LoadingState text="جارٍ حساب التقرير..." />
      ) : isError ? (
        <EmptyState title="تعذّر تحميل التقرير" action={<Button onClick={() => refetch()}>إعادة المحاولة</Button>} />
      ) : !data ? null : (
        <>
          {/* Summary KPIs */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard title="إجمالي الإيرادات" value={fmt.currency(data.summary.totalRevenue)} hint={`${fmt.number(data.summary.salesCount)} فاتورة`} icon={<DollarSign className="h-5 w-5" />} tone="default" />
            <StatCard title="إجمالي التكلفة" value={fmt.currency(data.summary.totalCost)} hint={`${fmt.number(data.summary.itemsSold)} وحدة مباعة`} icon={<Package className="h-5 w-5" />} tone="info" />
            <StatCard title="إجمالي الربح" value={fmt.currency(data.summary.grossProfit)} hint={`هامش ${fmt.number(data.summary.marginPct)}%`} icon={<TrendingUp className="h-5 w-5" />} tone="success" />
            <StatCard title="متوسط الفاتورة" value={fmt.currency(data.summary.avgSale)} hint={`خصم: ${fmt.currency(data.summary.totalDiscount)}`} icon={<Percent className="h-5 w-5" />} tone="default" />
          </div>

          {/* Charts row */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Revenue trend */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">اتجاه الإيرادات اليومي</CardTitle>
                <CardDescription>الإيرادات وعدد الفواتير حسب اليوم</CardDescription>
              </CardHeader>
              <CardContent>
                {data.byDay.length === 0 ? (
                  <EmptyState title="لا توجد بيانات" />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={data.byDay} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="repGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#055BE5" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#055BE5" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={50} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} formatter={(v: number) => fmt.currency(v)} />
                      <Area type="monotone" dataKey="revenue" stroke="#055BE5" strokeWidth={2.5} fill="url(#repGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Payment methods pie */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">طرق الدفع</CardTitle>
                <CardDescription>توزيع الإيرادات</CardDescription>
              </CardHeader>
              <CardContent>
                {data.byPayment.length === 0 ? (
                  <EmptyState title="لا توجد بيانات" />
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={data.byPayment} dataKey="revenue" nameKey="method" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}>
                          {data.byPayment.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => fmt.currency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 mt-2">
                      {data.byPayment.map((p, i) => (
                        <div key={p.method} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                            {p.method === "CASH" ? "نقدي" : p.method === "CARD" ? "بطاقة" : "تحويل"}
                          </span>
                          <span className="font-medium tabular-nums">{fmt.currency(p.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Category breakdown bar chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">الإيرادات حسب الفئة</CardTitle>
              <CardDescription>مقارنة الإيرادات والربح عبر الفئات</CardDescription>
            </CardHeader>
            <CardContent>
              {data.byCategory.length === 0 ? (
                <EmptyState title="لا توجد بيانات" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.byCategory} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="category" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={50} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} formatter={(v: number) => fmt.currency(v)} />
                    <Bar dataKey="revenue" name="الإيراد" fill="#055BE5" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="profit" name="الربح" fill="#5CDE9D" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Product breakdown table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">تفصيل حسب المنتج</CardTitle>
              <CardDescription>الكمية، الإيراد، التكلفة، والربح لكل منتج</CardDescription>
            </CardHeader>
            <CardContent>
              {data.byProduct.length === 0 ? (
                <EmptyState title="لا توجد منتجات" />
              ) : (
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-right py-2 px-2 font-medium">المنتج</th>
                        <th className="text-right py-2 px-2 font-medium hidden sm:table-cell">الفئة</th>
                        <th className="text-center py-2 px-2 font-medium">كمية</th>
                        <th className="text-center py-2 px-2 font-medium">إيراد</th>
                        <th className="text-center py-2 px-2 font-medium hidden md:table-cell">تكلفة</th>
                        <th className="text-center py-2 px-2 font-medium">ربح</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byProduct.map((p: any, i: number) => (
                        <tr key={i} className="border-b border-border/40 hover:bg-muted/20">
                          <td className="py-2 px-2 font-medium">{p.name}</td>
                          <td className="py-2 px-2 hidden sm:table-cell"><Badge variant="outline" className="text-[10px]">{p.category}</Badge></td>
                          <td className="py-2 px-2 text-center tabular-nums">{fmt.number(p.qty)}</td>
                          <td className="py-2 px-2 text-center tabular-nums font-medium">{fmt.currency(p.revenue)}</td>
                          <td className="py-2 px-2 text-center tabular-nums text-muted-foreground hidden md:table-cell">{fmt.currency(p.cost)}</td>
                          <td className="py-2 px-2 text-center tabular-nums font-medium text-[#5CDE9D]">{fmt.currency(p.profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
