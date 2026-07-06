"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { TableSkeleton } from "@/components/shared/loading-state"
import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react"
import { useCashFlow } from "@/hooks/use-api"
import { useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"
import { cn } from "@/lib/utils"

const SOURCE_LABEL: Record<string, string> = {
  SALE: "مبيعات",
  EXPENSE: "مصروفات",
  PURCHASE: "مشتريات/سداد",
  MANUAL: "أخرى",
}

export function CashFlowTab() {
  const t = useT()
  const fmt = useFmt()
  const [from, setFrom] = React.useState("")
  const [to, setTo] = React.useState("")
  const { data, isLoading } = useCashFlow(from || undefined, to || undefined)

  if (isLoading) return <TableSkeleton />

  const totalIn = (data?.inflows || []).reduce((s, i) => s + i.amount, 0)
  const totalOut = (data?.outflows || []).reduce((s, o) => s + o.amount, 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <div className="space-y-1">
          <Label className="text-xs">{t.statementFrom}</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} dir="ltr" className="h-9 text-left" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t.statementTo}</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} dir="ltr" className="h-9 text-left" />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t.accOpeningCash}</p>
            <p className="text-lg font-bold tabular-nums text-amber-600">{fmt.currency(data?.openingCash || 0)}</p>
          </CardContent>
        </Card>
        <Card className={cn((data?.netCashFlow || 0) >= 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-rose-500/5 border-rose-500/20")}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t.accNetCashFlow}</p>
            <p className={cn("text-lg font-bold tabular-nums", (data?.netCashFlow || 0) >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {fmt.currency(data?.netCashFlow || 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t.accClosingCash}</p>
            <p className="text-lg font-bold tabular-nums text-primary">{fmt.currency(data?.closingCash || 0)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2"><ArrowDownCircle className="h-4 w-4 text-emerald-600" /> {t.accInflows}</span>
              <span className="tabular-nums text-emerald-600">{fmt.currency(totalIn)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.inflows || []).length === 0 ? <p className="text-xs text-muted-foreground">—</p> : (
              <div className="space-y-1">
                {data?.inflows.map((i, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm py-1 border-b border-border/30 last:border-0">
                    <Badge variant="outline" className="text-xs">{SOURCE_LABEL[i.source] || i.source}</Badge>
                    <span className="tabular-nums font-medium text-emerald-600">+{fmt.currency(i.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2"><ArrowUpCircle className="h-4 w-4 text-rose-600" /> {t.accOutflows}</span>
              <span className="tabular-nums text-rose-600">{fmt.currency(totalOut)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.outflows || []).length === 0 ? <p className="text-xs text-muted-foreground">—</p> : (
              <div className="space-y-1">
                {data?.outflows.map((o, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm py-1 border-b border-border/30 last:border-0">
                    <Badge variant="outline" className="text-xs">{SOURCE_LABEL[o.source] || o.source}</Badge>
                    <span className="tabular-nums font-medium text-rose-600">−{fmt.currency(o.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
