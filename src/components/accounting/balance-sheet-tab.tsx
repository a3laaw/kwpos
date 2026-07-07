"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TableSkeleton } from "@/components/shared/loading-state"
import { EmptyState } from "@/components/shared/empty-state"
import { ExportToolbar } from "@/components/shared/export-toolbar"
import { CheckCircle2, XCircle } from "lucide-react"
import { useBalanceSheet } from "@/hooks/use-api"
import { useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"
import { cn } from "@/lib/utils"

function Section({
  title,
  rows,
  total,
  tone,
  fmt,
}: {
  title: string
  rows: { code: string; name: string; balance: number }[]
  total: number
  tone: string
  fmt: ReturnType<typeof useFmt>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>{title}</span>
          <span className={cn("tabular-nums font-bold", tone)}>{fmt.currency(total)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">—</p>
        ) : (
          <div className="space-y-1">
            {rows.map((r) => (
              <div key={r.code} className="flex items-center justify-between text-sm py-1 border-b border-border/30 last:border-0">
                <span className="font-mono text-xs text-muted-foreground">{r.code}</span>
                <span className="flex-1 mx-2 truncate">{r.name}</span>
                <span className="tabular-nums font-medium">{fmt.currency(r.balance)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function BalanceSheetTab() {
  const t = useT()
  const fmt = useFmt()
  const { data, isLoading, isError, refetch } = useBalanceSheet()

  if (isLoading) return <TableSkeleton />
  if (isError) return <EmptyState title={t.accBalanceSheet} action={<button onClick={() => refetch()}>{t.retry}</button>} />

  const balanced = data
    ? Math.abs(data.totals.assets - (data.totals.liabilities + data.totals.equity)) < 0.01
    : false

  // Build export rows: section label + code + name + balance, with section
  // totals interleaved. Keeps the exported file readable in Excel/PDF.
  const exportHeaders = [t.accBalanceSheet, t.accCode, t.accAccountName, t.accAssets]
  const exportRows: any[][] = []
  for (const r of data?.assets.rows ?? []) {
    exportRows.push([t.accAssets, r.code, r.name, fmt.currency(r.balance)])
  }
  if (data) exportRows.push([t.accAssets, "", t.accAssets, fmt.currency(data.assets.total)])
  for (const r of data?.liabilities.rows ?? []) {
    exportRows.push([t.accLiabilities, r.code, r.name, fmt.currency(r.balance)])
  }
  if (data) exportRows.push([t.accLiabilities, "", t.accLiabilities, fmt.currency(data.liabilities.total)])
  for (const r of data?.equity.rows ?? []) {
    exportRows.push([t.accEquity, r.code, r.name, fmt.currency(r.balance)])
  }
  if (data) exportRows.push([t.accEquity, "", t.accEquity, fmt.currency(data.equity.total)])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className={cn("rounded-lg p-3 flex items-center gap-2 flex-1", balanced ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-700")}>
          {balanced ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          <span className="font-bold">{balanced ? t.accBalanceSheetBalanced : t.accBalanceSheetNotBalanced}</span>
          <Badge variant="outline" className="ms-auto tabular-nums">
            {t.accAssets}: {fmt.currency(data?.totals.assets || 0)} = {t.accLiabilities} + {t.accEquity}: {fmt.currency((data?.totals.liabilities || 0) + (data?.totals.equity || 0))}
          </Badge>
        </div>
        <ExportToolbar
          title={t.accBalanceSheet}
          headers={exportHeaders}
          rows={exportRows}
          filename={`balance-sheet-${new Date().toISOString().slice(0, 10)}`}
        />
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Section title={t.accAssets} rows={data?.assets.rows ?? []} total={data?.assets.total || 0} tone="text-primary" fmt={fmt} />
        <Section title={t.accLiabilities} rows={data?.liabilities.rows ?? []} total={data?.liabilities.total || 0} tone="text-rose-600" fmt={fmt} />
        <Section title={t.accEquity} rows={data?.equity.rows ?? []} total={data?.equity.total || 0} tone="text-emerald-600" fmt={fmt} />
      </div>
    </div>
  )
}
