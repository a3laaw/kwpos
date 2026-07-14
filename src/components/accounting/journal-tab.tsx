"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { LoadingState } from "@/components/shared/loading-state"
import { EmptyState } from "@/components/shared/empty-state"
import { BookOpen, FileText, Plus, Download, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { useJournalEntries, useTrialBalance, useExportExcel } from "@/hooks/use-api"
import { useFmt } from "@/components/currency-context"
import { useT } from "@/components/i18n-context"
import { ManualJournalDialog } from "@/components/accounting/manual-journal-dialog"
import { JournalEntryModal } from "@/components/accounting/journal-entry-modal"
import { ExportToolbar } from "@/components/shared/export-toolbar"
import { toast } from "sonner"
import type { JournalEntry } from "@/lib/types"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 10

export function JournalTab() {
  const fmt = useFmt()
  const t = useT()
  const { data, isLoading } = useJournalEntries()
  const items = data?.items ?? []
  const [manualOpen, setManualOpen] = React.useState(false)
  const [detailEntry, setDetailEntry] = React.useState<JournalEntry | null>(null)
  const [search, setSearch] = React.useState("")
  const [page, setPage] = React.useState(1)
  const exportMut = useExportExcel()

  const SOURCE_LABELS: Record<string, { label: string; className: string }> = {
    SALE: { label: t.accJournalSourceSale, className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
    EXPENSE: { label: t.accJournalSourceExpense, className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30" },
    PURCHASE: { label: t.accJournalSourcePurchase, className: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30" },
    MANUAL: { label: t.accJournalSourceManual, className: "bg-muted text-muted-foreground" },
  }

  // Filter by search
  const filtered = React.useMemo(() => {
    if (!search.trim()) return items
    const q = search.trim().toLowerCase()
    return items.filter(
      (je) =>
        je.entryNo.toLowerCase().includes(q) ||
        je.description.toLowerCase().includes(q)
    )
  }, [items, search])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedData = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function handleExport() {
    exportMut.mutate(
      { type: "journal" },
      { onSuccess: () => toast.success(t.exportedToExcel), onError: () => toast.error(t.exportFailed) }
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4 text-primary" />
                {t.accJournalLedgerFull}
                <Badge variant="secondary" className="tabular-nums">{filtered.length}</Badge>
              </CardTitle>
              <CardDescription className="mt-1">{t.accJournalDescFull}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleExport} disabled={exportMut.isPending} className="gap-1.5">
                <Download className="h-3.5 w-3.5" /> Excel
              </Button>
              <Button size="sm" onClick={() => setManualOpen(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> {t.accManualEntry}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search bar */}
          <div className="relative mb-3">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder={t.accSearchJournal}
              className="pr-9 h-9"
            />
          </div>

          {isLoading ? (
            <LoadingState text={t.accLoadingJournal} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-7 w-7" />}
              title={t.accNoJournalEntries}
              description={t.accNoJournalEntriesDesc}
            />
          ) : (
            <>
              {/* Flat compact list */}
              <div className="space-y-2">
                {pagedData.map((je) => {
                  const meta = SOURCE_LABELS[je.sourceType] ?? SOURCE_LABELS.MANUAL
                  return (
                    <button
                      key={je.id}
                      onClick={() => setDetailEntry(je)}
                      className="w-full text-start rounded-lg border border-border/60 hover:border-primary/40 hover:bg-muted/20 transition-all p-3 group cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        {/* Left: badge + entry no + date */}
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="outline" className={cn("text-[10px] gap-0.5 shrink-0", meta.className)}>
                            {meta.label}
                          </Badge>
                          <span className="font-mono text-sm font-bold text-primary group-hover:underline" dir="ltr">
                            {je.entryNo}
                          </span>
                          <span className="text-xs text-muted-foreground hidden sm:inline" dir="ltr">
                            {fmt.dateTime(je.date)}
                          </span>
                        </div>
                        {/* Right: total */}
                        <span className="font-bold tabular-nums text-sm shrink-0" dir="ltr">
                          {fmt.currency(je.totalDebit)}
                        </span>
                      </div>
                      {/* Description (truncated, one line) */}
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {je.description}
                      </p>
                    </button>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 ? (
                <div className="flex items-center justify-between gap-2 pt-3">
                  <p className="text-xs text-muted-foreground">
                    {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–
                    {Math.min(currentPage * PAGE_SIZE, filtered.length)} / {filtered.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setPage(Math.max(1, currentPage - 1))}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium tabular-nums">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <ManualJournalDialog open={manualOpen} onOpenChange={setManualOpen} />
      <JournalEntryModal
        open={!!detailEntry}
        onOpenChange={(o) => !o && setDetailEntry(null)}
        entry={detailEntry}
      />
    </div>
  )
}

export function TrialBalanceTab() {
  const fmt = useFmt()
  const t = useT()
  const { data, isLoading } = useTrialBalance()

  if (isLoading) return <LoadingState text={t.accCalculatingTrialBalance} />
  if (!data) return null

  const balanced = Math.abs(data.totalDebit - data.totalCredit) < 0.001

  // Build export rows: code, account, type, debit, credit + totals row at the end.
  const exportHeaders = [t.accCode, t.accAccountName, t.colType || "النوع", t.accDebit, t.accCredit]
  const exportRows: any[][] = data.rows.map((r) => [
    r.code,
    r.name,
    r.type,
    r.debit > 0 ? fmt.currency(r.debit) : "",
    r.credit > 0 ? fmt.currency(r.credit) : "",
  ])
  exportRows.push(["", t.accSum, "", fmt.currency(data.totalDebit), fmt.currency(data.totalCredit)])

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              {t.accTrialBalance}
              <Badge variant={balanced ? "default" : "destructive"} className="gap-1">
                {balanced ? `${t.accBalanced} ✓` : t.accNotBalanced}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1">{t.accTrialBalanceDescFull}</CardDescription>
          </div>
          <ExportToolbar
            title={t.accTrialBalance}
            headers={exportHeaders}
            rows={exportRows}
            filename={`trial-balance-${new Date().toISOString().slice(0, 10)}`}
          />
        </div>
      </CardHeader>
      <CardContent>
        {data.rows.length === 0 ? (
          <EmptyState title={t.accNoBalances} description={t.accNoBalancesDesc} />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-start py-2 px-2 font-medium text-muted-foreground">{t.accCode}</th>
                  <th className="text-start py-2 px-2 font-medium">{t.accAccountName}</th>
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground hidden sm:table-cell">{t.colType || "النوع"}</th>
                  <th className="text-end py-2 px-2 font-medium text-emerald-700">{t.accDebit}</th>
                  <th className="text-end py-2 px-2 font-medium text-rose-700">{t.accCredit}</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.accountId} className="border-b border-border/40 hover:bg-muted/20">
                    <td className="py-2 px-2 font-mono text-xs text-muted-foreground tabular-nums" dir="ltr">{r.code}</td>
                    <td className="py-2 px-2 font-medium">{r.name}</td>
                    <td className="py-2 px-2 text-center hidden sm:table-cell">
                      <Badge variant="outline" className="text-[10px]">{r.type}</Badge>
                    </td>
                    <td className="py-2 px-2 text-end tabular-nums text-emerald-600" dir="ltr">
                      {r.debit > 0 ? fmt.currency(r.debit) : "—"}
                    </td>
                    <td className="py-2 px-2 text-end tabular-nums text-rose-600" dir="ltr">
                      {r.credit > 0 ? fmt.currency(r.credit) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-bold">
                  <td colSpan={3} className="py-3 px-2 text-end">{t.accSum}</td>
                  <td className="py-3 px-2 text-end tabular-nums text-emerald-700" dir="ltr">{fmt.currency(data.totalDebit)}</td>
                  <td className="py-3 px-2 text-end tabular-nums text-rose-700" dir="ltr">{fmt.currency(data.totalCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
