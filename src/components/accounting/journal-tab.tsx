"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { LoadingState } from "@/components/shared/loading-state"
import { EmptyState } from "@/components/shared/empty-state"
import { BookOpen, FileText, Plus, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useJournalEntries, useTrialBalance, useExportExcel } from "@/hooks/use-api"
import { useFmt } from "@/components/currency-context"
import { ManualJournalDialog } from "@/components/accounting/manual-journal-dialog"
import { toast } from "sonner"
import type { JournalEntry } from "@/lib/types"

const SOURCE_LABELS: Record<string, { label: string; className: string }> = {
  SALE: { label: "مبيعات", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  EXPENSE: { label: "مصروف", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  PURCHASE: { label: "مشتريات", className: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30" },
  MANUAL: { label: "يدوي", className: "bg-muted text-muted-foreground" },
}

export function JournalTab() {
  const fmt = useFmt()
  const { data, isLoading } = useJournalEntries()
  const items = data?.items ?? []
  const [manualOpen, setManualOpen] = React.useState(false)
  const exportMut = useExportExcel()

  function handleExport() {
    exportMut.mutate(
      { type: "journal" },
      { onSuccess: () => toast.success("تم تصدير القيود إلى Excel"), onError: () => toast.error("فشل التصدير") }
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4 text-primary" />
                دفتر اليومية (القيود المحاسبية)
                <Badge variant="secondary" className="tabular-nums">{items.length}</Badge>
              </CardTitle>
              <CardDescription className="mt-1">
                قيود مزدوجة (مدين = دائن) — تُولّد تلقائياً عند البيع/المصروف/الاستلام، أو يدوياً
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleExport} disabled={exportMut.isPending} className="gap-1.5">
                <Download className="h-3.5 w-3.5" /> Excel
              </Button>
              <Button size="sm" onClick={() => setManualOpen(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> قيد يدوي
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState text="جارٍ تحميل القيود..." />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-7 w-7" />}
              title="لا توجد قيود محاسبية"
              description="ستظهر القيود هنا تلقائياً عند إجراء عمليات بيع أو تسجيل مصروفات."
            />
          ) : (
            <ScrollArea className="max-h-[70vh] pr-1 scrollbar-thin">
              <div className="space-y-3">
                {items.map((je) => (
                  <JournalEntryCard key={je.id} je={je} fmt={fmt} />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <ManualJournalDialog open={manualOpen} onOpenChange={setManualOpen} />
    </div>
  )
}

function JournalEntryCard({ je, fmt }: { je: JournalEntry; fmt: ReturnType<typeof useFmt> }) {
  const meta = SOURCE_LABELS[je.sourceType] ?? SOURCE_LABELS.MANUAL
  return (
    <div className="rounded-xl border border-border/70 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="outline" className={`gap-1 ${meta.className}`}>
            {meta.label}
          </Badge>
          <span className="font-mono font-semibold text-sm" dir="ltr">{je.entryNo}</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {fmt.dateTime(je.date)}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">إجمالي:</span>
          <span className="font-bold tabular-nums text-sm" dir="ltr">{fmt.currency(je.totalDebit)}</span>
        </div>
      </div>

      {/* Description */}
      <div className="px-4 py-2 text-sm border-b border-border/40">
        {je.description}
      </div>

      {/* Lines (T-account style) */}
      <div className="divide-y divide-border/30">
        {je.lines.map((l) => (
          <div key={l.id} className="flex items-center gap-3 px-4 py-2 text-sm">
            <span className="font-mono text-xs text-muted-foreground tabular-nums w-12" dir="ltr">{l.accountCode}</span>
            <span className="flex-1 min-w-0 truncate">{l.accountName}</span>
            <span className="w-28 text-left tabular-nums text-emerald-600 font-medium" dir="ltr">
              {l.debit > 0 ? fmt.currency(l.debit) : "—"}
            </span>
            <span className="w-28 text-left tabular-nums text-rose-600 font-medium" dir="ltr">
              {l.credit > 0 ? fmt.currency(l.credit) : "—"}
            </span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 border-t border-border/40 text-sm font-bold">
        <span className="flex-1">المجموع</span>
        <span className="w-28 text-left tabular-nums text-emerald-700" dir="ltr">{fmt.currency(je.totalDebit)}</span>
        <span className="w-28 text-left tabular-nums text-rose-700" dir="ltr">{fmt.currency(je.totalCredit)}</span>
      </div>
    </div>
  )
}

export function TrialBalanceTab() {
  const fmt = useFmt()
  const { data, isLoading } = useTrialBalance()

  if (isLoading) return <LoadingState text="جارٍ حساب ميزان المراجعة..." />
  if (!data) return null

  const balanced = Math.abs(data.totalDebit - data.totalCredit) < 0.001

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-primary" />
          ميزان المراجعة
          <Badge variant={balanced ? "default" : "destructive"} className="gap-1">
            {balanced ? "متوازن ✓" : "غير متوازن"}
          </Badge>
        </CardTitle>
        <CardDescription>أرصدة جميع الحسابات (مدين / دائن)</CardDescription>
      </CardHeader>
      <CardContent>
        {data.rows.length === 0 ? (
          <EmptyState title="لا توجد أرصدة" description="لا توجد حسابات بأرصدة غير صفرية." />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">الرمز</th>
                  <th className="text-right py-2 px-2 font-medium">اسم الحساب</th>
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground hidden sm:table-cell">النوع</th>
                  <th className="text-left py-2 px-2 font-medium text-emerald-700">مدين</th>
                  <th className="text-left py-2 px-2 font-medium text-rose-700">دائن</th>
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
                    <td className="py-2 px-2 text-left tabular-nums text-emerald-600" dir="ltr">
                      {r.debit > 0 ? fmt.currency(r.debit) : "—"}
                    </td>
                    <td className="py-2 px-2 text-left tabular-nums text-rose-600" dir="ltr">
                      {r.credit > 0 ? fmt.currency(r.credit) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-bold">
                  <td colSpan={3} className="py-3 px-2 text-left">المجموع</td>
                  <td className="py-3 px-2 text-left tabular-nums text-emerald-700" dir="ltr">{fmt.currency(data.totalDebit)}</td>
                  <td className="py-3 px-2 text-left tabular-nums text-rose-700" dir="ltr">{fmt.currency(data.totalCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
