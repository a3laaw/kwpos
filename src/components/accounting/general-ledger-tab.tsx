"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TableSkeleton } from "@/components/shared/loading-state"
import { EmptyState } from "@/components/shared/empty-state"
import { ExportToolbar } from "@/components/shared/export-toolbar"
import { BookOpen } from "lucide-react"
import { useAccounts, useGeneralLedger } from "@/hooks/use-api"
import { useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"
import { cn } from "@/lib/utils"

export function GeneralLedgerTab() {
  const t = useT()
  const fmt = useFmt()
  const [accountId, setAccountId] = React.useState<string>("")
  const [from, setFrom] = React.useState("")
  const [to, setTo] = React.useState("")

  const { data: accountsData } = useAccounts()
  const accounts = accountsData?.flat ?? []
  const { data, isLoading, isError, refetch } = useGeneralLedger(
    accountId || null,
    from || undefined,
    to || undefined
  )

  // Combobox options for the account selector (potentially large list).
  // Each label embeds `code — name` so the built-in search matches both.
  const accountComboboxOptions = React.useMemo<ComboboxOption[]>(
    () =>
      accounts.map((a) => ({
        value: a.id,
        label: `${a.code} — ${a.name}`,
      })),
    [accounts]
  )

  // Export rows: opening balance as first row, then each line, then closing.
  const exportHeaders = [t.glDate, t.glEntryNo, t.glDescription, t.accDebit, t.accCredit, t.glRunningBalance]
  const exportRows: any[][] = []
  if (data) {
    exportRows.push(["", "", t.glOpeningBalance, "", "", fmt.currency(data.openingBalance)])
    for (const l of data.lines) {
      exportRows.push([
        new Date(l.date).toLocaleDateString("en-GB"),
        l.entryNo,
        l.description ?? "",
        l.debit > 0 ? fmt.currency(l.debit) : "",
        l.credit > 0 ? fmt.currency(l.credit) : "",
        fmt.currency(l.balance),
      ])
    }
    exportRows.push(["", "", t.accClosingCash, fmt.currency(data.totalDebit), fmt.currency(data.totalCredit), fmt.currency(data.closingBalance)])
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1">
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <Label className="text-xs">{t.glSelectAccount}</Label>
            <Combobox
              value={accountId}
              onValueChange={setAccountId}
              placeholder="—"
              searchPlaceholder="—"
              className="h-9"
              options={accountComboboxOptions}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t.statementFrom}</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} dir="ltr" className="h-9 text-end" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t.statementTo}</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} dir="ltr" className="h-9 text-end" />
          </div>
        </div>
        {accountId && data ? (
          <ExportToolbar
            title={`${t.generalLedger} - ${data.account.code} ${data.account.name}`}
            headers={exportHeaders}
            rows={exportRows}
            filename={`general-ledger-${data.account.code}-${from || "all"}-${to || "now"}`}
          />
        ) : null}
      </div>

      {!accountId ? (
        <EmptyState icon={<BookOpen className="h-7 w-7" />} title={t.generalLedger} description={t.glNoAccountSelected} />
      ) : isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <EmptyState title={t.generalLedger} action={<button onClick={() => refetch()}>{t.retry}</button>} />
      ) : data ? (
        <>
          <div className="grid sm:grid-cols-3 gap-3">
            <Card className="bg-amber-500/5 border-amber-500/20"><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{t.glOpeningBalance}</p>
              <p className="text-lg font-bold tabular-nums text-amber-600">{fmt.currency(data.openingBalance)}</p>
            </CardContent></Card>
            <Card className="bg-primary/5 border-primary/20"><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{t.glRunningBalance}</p>
              <p className="text-lg font-bold tabular-nums text-primary">{fmt.currency(data.closingBalance)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{t.accAccount}</p>
              <p className="text-sm font-bold truncate">
                <span className="font-mono text-xs text-muted-foreground me-2">{data.account.code}</span>
                {data.account.name}
              </p>
              <Badge variant="outline" className="text-[10px] mt-1">{data.account.type}</Badge>
            </CardContent></Card>
          </div>
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[60vh] scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-start">{t.glDate}</TableHead>
                      <TableHead className="text-start">{t.glEntryNo}</TableHead>
                      <TableHead className="text-start">{t.glDescription}</TableHead>
                      <TableHead className="text-end">{t.accDebit}</TableHead>
                      <TableHead className="text-end">{t.accCredit}</TableHead>
                      <TableHead className="text-end">{t.glRunningBalance}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.lines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          {t.glNoMovements}
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.lines.map((l, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs" dir="ltr">{new Date(l.date).toLocaleDateString("en-GB")}</TableCell>
                          <TableCell className="font-mono text-xs" dir="ltr">{l.entryNo}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate">
                            {l.description ?? "—"}
                          </TableCell>
                          <TableCell className="text-end tabular-nums">{l.debit > 0 ? fmt.currency(l.debit) : "—"}</TableCell>
                          <TableCell className="text-end tabular-nums">{l.credit > 0 ? fmt.currency(l.credit) : "—"}</TableCell>
                          <TableCell className={cn("text-end tabular-nums font-bold", l.balance >= 0 ? "text-primary" : "text-rose-600")}>
                            {fmt.currency(l.balance)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                  {data.lines.length > 0 ? (
                    <TableBody>
                      <TableRow className="bg-muted/30 font-bold border-t-2 border-border">
                        <TableCell colSpan={3} className="text-end">{t.accSum}</TableCell>
                        <TableCell className="text-end tabular-nums">{fmt.currency(data.totalDebit)}</TableCell>
                        <TableCell className="text-end tabular-nums">{fmt.currency(data.totalCredit)}</TableCell>
                        <TableCell className="text-end tabular-nums">{fmt.currency(data.closingBalance)}</TableCell>
                      </TableRow>
                    </TableBody>
                  ) : null}
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
