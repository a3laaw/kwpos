"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Printer, FileDown, X } from "lucide-react"
import { useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"
import type { JournalEntry } from "@/lib/types"
import { cn } from "@/lib/utils"

interface JournalEntryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: JournalEntry | null
}

const SOURCE_META: Record<string, { labelKey: "accJournalSourceSale" | "accJournalSourceExpense" | "accJournalSourcePurchase" | "accJournalSourceManual"; className: string }> = {
  SALE: { labelKey: "accJournalSourceSale", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  EXPENSE: { labelKey: "accJournalSourceExpense", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  PURCHASE: { labelKey: "accJournalSourcePurchase", className: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30" },
  MANUAL: { labelKey: "accJournalSourceManual", className: "bg-muted text-muted-foreground" },
}

export function JournalEntryModal({ open, onOpenChange, entry }: JournalEntryModalProps) {
  const t = useT()
  const fmt = useFmt()

  if (!entry) return null

  const meta = SOURCE_META[entry.sourceType] ?? SOURCE_META.MANUAL
  const balanced = Math.abs(entry.totalDebit - entry.totalCredit) < 0.001

  function handlePrint() {
    window.print()
  }

  return (
    <>
      {/* Hidden print area — only visible during print */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 text-black">
        <PrintLayout entry={entry} t={t} fmt={fmt} />
      </div>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto print:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <span className="font-mono" dir="ltr">{entry.entryNo}</span>
              <Badge variant="outline" className={cn("text-[10px]", meta.className)}>
                {t[meta.labelKey]}
              </Badge>
              {balanced ? (
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                  ✓ {t.accBalanced}
                </Badge>
              ) : null}
            </DialogTitle>
          </DialogHeader>

          {/* Meta info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">{t.accJournalCreatedAt}</p>
              <p className="font-medium" dir="ltr">{fmt.dateTime(entry.date)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t.accJournalSourceType}</p>
              <p className="font-medium">{t[meta.labelKey]}</p>
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">{t.accDescription}</p>
            <p className="text-sm font-medium">{entry.description}</p>
          </div>

          <Separator />

          {/* Lines table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-start p-2 font-medium text-muted-foreground">{t.accCode}</th>
                  <th className="text-start p-2 font-medium">{t.accAccountName}</th>
                  <th className="text-end p-2 font-medium text-emerald-700">{t.accDebit}</th>
                  <th className="text-end p-2 font-medium text-rose-700">{t.accCredit}</th>
                </tr>
              </thead>
              <tbody>
                {entry.lines.map((l) => (
                  <tr key={l.id} className="border-t border-border/30">
                    <td className="p-2 font-mono text-xs text-muted-foreground" dir="ltr">{l.accountCode}</td>
                    <td className="p-2">{l.accountName}</td>
                    <td className="p-2 text-end tabular-nums text-emerald-600" dir="ltr">
                      {l.debit > 0 ? fmt.currency(l.debit) : "—"}
                    </td>
                    <td className="p-2 text-end tabular-nums text-rose-600" dir="ltr">
                      {l.credit > 0 ? fmt.currency(l.credit) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-bold bg-muted/30">
                  <td colSpan={2} className="p-2 text-end">{t.accSum}</td>
                  <td className="p-2 text-end tabular-nums text-emerald-700" dir="ltr">{fmt.currency(entry.totalDebit)}</td>
                  <td className="p-2 text-end tabular-nums text-rose-700" dir="ltr">{fmt.currency(entry.totalCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Footer actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5" />
              {t.accPrintJournal}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
              <FileDown className="h-3.5 w-3.5" />
              {t.accExportPdf}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-3.5 w-3.5" />
              {t.close}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Print-only layout for journal entry — clean, professional, no UI chrome. */
function PrintLayout({
  entry,
  t,
  fmt,
}: {
  entry: JournalEntry
  t: ReturnType<typeof useT>
  fmt: ReturnType<typeof useFmt>
}) {
  const meta = SOURCE_META[entry.sourceType] ?? SOURCE_META.MANUAL
  return (
    <div>
      <h1 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "4px" }}>
        {t.accJournalEntryDetail}
      </h1>
      <p style={{ fontSize: "14px", marginBottom: "16px" }}>
        {t.accJournalEntryNo}: <strong>{entry.entryNo}</strong> — {fmt.dateTime(entry.date)}
      </p>
      <p style={{ fontSize: "14px", marginBottom: "16px" }}>
        <strong>{t.accDescription}:</strong> {entry.description}
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #000" }}>
            <th style={{ textAlign: "start", padding: "6px" }}>{t.accCode}</th>
            <th style={{ textAlign: "start", padding: "6px" }}>{t.accAccountName}</th>
            <th style={{ textAlign: "end", padding: "6px" }}>{t.accDebit}</th>
            <th style={{ textAlign: "end", padding: "6px" }}>{t.accCredit}</th>
          </tr>
        </thead>
        <tbody>
          {entry.lines.map((l) => (
            <tr key={l.id} style={{ borderBottom: "1px solid #ccc" }}>
              <td style={{ padding: "6px", fontFamily: "monospace" }}>{l.accountCode}</td>
              <td style={{ padding: "6px" }}>{l.accountName}</td>
              <td style={{ padding: "6px", textAlign: "end" }}>{l.debit > 0 ? fmt.currency(l.debit) : "—"}</td>
              <td style={{ padding: "6px", textAlign: "end" }}>{l.credit > 0 ? fmt.currency(l.credit) : "—"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: "2px solid #000", fontWeight: "bold" }}>
            <td colSpan={2} style={{ padding: "6px", textAlign: "end" }}>{t.accSum}</td>
            <td style={{ padding: "6px", textAlign: "end" }}>{fmt.currency(entry.totalDebit)}</td>
            <td style={{ padding: "6px", textAlign: "end" }}>{fmt.currency(entry.totalCredit)}</td>
          </tr>
        </tfoot>
      </table>
      <p style={{ marginTop: "32px", fontSize: "12px", color: "#666" }}>
        {t.appName} — {new Date().toLocaleString("en-GB")}
      </p>
    </div>
  )
}
