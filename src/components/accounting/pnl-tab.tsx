"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { LoadingState } from "@/components/shared/loading-state"
import {
  FileBarChart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Coins,
  Percent,
} from "lucide-react"
import { usePnLReport } from "@/hooks/use-api"
import { useFmt } from "@/components/currency-context"
import { cn } from "@/lib/utils"

export function PnLTab() {
  const fmt = useFmt()
  const [from, setFrom] = React.useState("")
  const [to, setTo] = React.useState("")
  const [appliedFrom, setAppliedFrom] = React.useState<string | undefined>(undefined)
  const [appliedTo, setAppliedTo] = React.useState<string | undefined>(undefined)

  const { data, isLoading, isFetching } = usePnLReport(appliedFrom, appliedTo)

  function apply() {
    setAppliedFrom(from || undefined)
    setAppliedTo(to || undefined)
  }
  function reset() {
    setFrom("")
    setTo("")
    setAppliedFrom(undefined)
    setAppliedTo(undefined)
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="space-y-1.5 flex-1">
            <Label htmlFor="pfrom" className="text-xs flex items-center gap-1.5">
              <Calendar className="h-3 w-3" /> من تاريخ (اختياري)
            </Label>
            <Input id="pfrom" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5 flex-1">
            <Label htmlFor="pto" className="text-xs flex items-center gap-1.5">
              <Calendar className="h-3 w-3" /> إلى تاريخ (اختياري)
            </Label>
            <Input id="pto" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
          </div>
          <div className="flex gap-2">
            <Button onClick={apply} size="sm">تطبيق</Button>
            <Button onClick={reset} size="sm" variant="outline">كل الفترات</Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          تُجلب الإيرادات من جميع المبيعات (بما فيها أوامر شوبيفاي المُستوردة)، وتُخصم تكلفة البضاعة المباعة والرواتب والمصروفات الإدارية.
        </p>
      </Card>

      {isLoading ? (
        <LoadingState text="جارٍ حساب التقرير المالي..." />
      ) : !data ? null : (
        <div className="space-y-4">
          {/* Headline net profit */}
          <Card className={cn(
            "overflow-hidden border-2",
            data.netProfit >= 0 ? "border-emerald-500/40 bg-emerald-500/5" : "border-rose-500/40 bg-rose-500/5"
          )}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl",
                    data.netProfit >= 0 ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-600"
                  )}>
                    {data.netProfit >= 0 ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
                  </span>
                  <div>
                    <p className="text-sm text-muted-foreground">صافي الربح</p>
                    <p className={cn(
                      "text-3xl font-bold tabular-nums",
                      data.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {fmt.currency(data.netProfit)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {appliedFrom || appliedTo
                        ? `للفترة ${appliedFrom || "البداية"} ← ${appliedTo || "اليوم"}`
                        : "كل الفترات"}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="hidden sm:inline-flex">
                  {data.revenueCount} فاتورة
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* P&L breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileBarChart className="h-4 w-4 text-primary" />
                قائمة الأرباح والخسائر
              </CardTitle>
              <CardDescription>تفصيل الإيرادات والمصروفات</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {/* Revenue */}
              <PnLRow
                icon={<DollarSign className="h-4 w-4" />}
                label="إجمالي الإيرادات (مبيعات + شوبيفاي)"
                value={data.revenue}
                tone="positive"
                fmt={fmt}
              />
              <PnLRow
                icon={<Coins className="h-4 w-4" />}
                label="تكلفة البضاعة المباعة (COGS)"
                value={-data.cogs}
                tone="negative"
                indent
                fmt={fmt}
              />
              <Separator className="my-2" />
              <PnLRow
                label="إجمالي الربح"
                value={data.grossProfit}
                tone="positive"
                bold
                fmt={fmt}
              />
              <Separator className="my-2" />
              <PnLRow
                icon={<TrendingDown className="h-4 w-4" />}
                label="الرواتب"
                value={-data.salaries}
                tone="negative"
                indent
                fmt={fmt}
              />
              <PnLRow
                icon={<TrendingDown className="h-4 w-4" />}
                label="المصروفات الإدارية"
                value={-data.adminExpenses}
                tone="negative"
                indent
                fmt={fmt}
              />
              <Separator className="my-2" />
              <PnLRow
                label="إجمالي المصروفات التشغيلية"
                value={-data.totalOperatingExpenses}
                tone="negative"
                bold
                fmt={fmt}
              />
              <Separator className="my-2" />
              <PnLRow
                label="صافي الربح"
                value={data.netProfit}
                tone={data.netProfit >= 0 ? "positive" : "negative"}
                bold
                large
                fmt={fmt}
              />
            </CardContent>
          </Card>

          {/* Expense breakdown */}
          {data.expenseBreakdown.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">تفصيل المصروفات حسب الفئة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.expenseBreakdown.map((b) => {
                    const pct = data.totalOperatingExpenses > 0
                      ? Math.round((b.amount / data.totalOperatingExpenses) * 100)
                      : 0
                    return (
                      <div key={b.category} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                            {b.category}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="font-semibold tabular-nums">{fmt.currency(b.amount)}</span>
                            <Badge variant="outline" className="tabular-nums text-[10px]">{pct}%</Badge>
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {isFetching ? (
            <p className="text-xs text-muted-foreground text-center">جارٍ التحديث...</p>
          ) : null}
        </div>
      )}
    </div>
  )
}

function PnLRow({
  icon,
  label,
  value,
  tone = "neutral",
  indent = false,
  bold = false,
  large = false,
  fmt,
}: {
  icon?: React.ReactNode
  label: string
  value: number
  tone?: "positive" | "negative" | "neutral"
  indent?: boolean
  bold?: boolean
  large?: boolean
  fmt: ReturnType<typeof useFmt>
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "negative"
      ? "text-rose-600"
      : "text-foreground"
  return (
    <div className={cn("flex items-center justify-between gap-2 py-1.5", indent && "pr-6")}>
      <span className={cn("flex items-center gap-2 text-sm", !bold && "text-muted-foreground", bold && "font-medium")}>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums",
          bold ? "font-bold" : "font-medium",
          large ? "text-lg" : "text-sm",
          toneClass
        )}
        dir="ltr"
      >
        {fmt.currency(Math.abs(value))}
      </span>
    </div>
  )
}
