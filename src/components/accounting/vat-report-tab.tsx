"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { TableSkeleton } from "@/components/shared/loading-state"
import { EmptyState } from "@/components/shared/empty-state"
import { ExportToolbar } from "@/components/shared/export-toolbar"
import { Receipt, TrendingUp, TrendingDown, Scale } from "lucide-react"
import { useVatReport } from "@/hooks/use-api"
import { useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"
import { cn } from "@/lib/utils"

export function VatReportTab() {
  const t = useT()
  const fmt = useFmt()
  const [from, setFrom] = React.useState("")
  const [to, setTo] = React.useState("")
  const { data, isLoading, isError, refetch } = useVatReport(from || undefined, to || undefined)

  if (isLoading) return <TableSkeleton />
  if (isError) return <EmptyState title={t.accVatReport} action={<button onClick={() => refetch()}>{t.retry}</button>} />

  // Export: a simple Field/Value summary
  const exportHeaders = [t.statementDescription, t.accDebit, t.accCredit]
  const exportRows: any[][] = [
    [t.accOutputVat, fmt.currency(data?.outputVat || 0), ""],
    [t.accInputVat, "", fmt.currency(data?.inputVat || 0)],
    [t.accNetVat, fmt.currency(Math.max(0, data?.netVat || 0)), fmt.currency(Math.min(0, data?.netVat || 0) === 0 ? 0 : -(data?.netVat || 0))],
    [t.accSalesVatTotal, fmt.currency(data?.salesTotal || 0), ""],
    [t.accPurchasesVatTotal, "", fmt.currency(data?.purchasesTotal || 0)],
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <div className="space-y-1">
            <Label className="text-xs">{t.statementFrom}</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} dir="ltr" className="h-9 text-end" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t.statementTo}</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} dir="ltr" className="h-9 text-end" />
          </div>
        </div>
        <ExportToolbar
          title={t.accVatReport}
          headers={exportHeaders}
          rows={exportRows}
          filename={`vat-report-${from || "all"}-${to || "now"}`}
        />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">{t.accOutputVat}</span>
            </div>
            <p className="text-lg font-bold tabular-nums text-blue-600">{fmt.currency(data?.outputVat || 0)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{t.accSalesVatTotal}: {fmt.currency(data?.salesTotal || 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-violet-500/5 border-violet-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-violet-600" />
              <span className="text-xs text-muted-foreground">{t.accInputVat}</span>
            </div>
            <p className="text-lg font-bold tabular-nums text-violet-600">{fmt.currency(data?.inputVat || 0)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{t.accPurchasesVatTotal}: {fmt.currency(data?.purchasesTotal || 0)}</p>
          </CardContent>
        </Card>
        <Card className={cn((data?.netVat || 0) >= 0 ? "bg-rose-500/5 border-rose-500/20" : "bg-emerald-500/5 border-emerald-500/20")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Scale className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">{t.accNetVat}</span>
            </div>
            <p className={cn("text-lg font-bold tabular-nums", (data?.netVat || 0) >= 0 ? "text-rose-600" : "text-emerald-600")}>
              {fmt.currency(data?.netVat || 0)}
            </p>
            <Badge variant="outline" className="text-[10px] mt-1">
              {(data?.netVat || 0) >= 0 ? "مستحقة السداد" : "قابلة للاسترداد"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t.accSalesVatTotal} + {t.accPurchasesVatTotal}</span>
            </div>
            <p className="text-lg font-bold tabular-nums">{fmt.currency((data?.salesTotal || 0) + (data?.purchasesTotal || 0))}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
