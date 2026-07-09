"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Printer, FileText, Wallet, RotateCcw } from "lucide-react"
import { useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"
import { useSupplierStatement } from "@/hooks/use-api"
import { ExportToolbar } from "@/components/shared/export-toolbar"

interface SupplierStatementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplierId: string | null
  supplierName?: string | null
}

export function SupplierStatementDialog({
  open,
  onOpenChange,
  supplierId,
  supplierName,
}: SupplierStatementDialogProps) {
  const t = useT()
  const fmt = useFmt()

  const [from, setFrom] = React.useState<string>("")
  const [to, setTo] = React.useState<string>("")

  const { data, isLoading, isError } = useSupplierStatement(
    open ? supplierId : null,
    from || undefined,
    to || undefined
  )

  const txs = data?.transactions ?? []

  const typeMeta = (type: string) => {
    if (type === "INVOICE") {
      return {
        label: t.statementInvoice,
        icon: FileText,
        cls: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
      }
    }
    if (type === "PAYMENT") {
      return {
        label: t.statementPayment,
        icon: Wallet,
        cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
      }
    }
    return {
      label: t.statementReturn,
      icon: RotateCcw,
      cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    }
  }

  // Export rows
  const exportHeaders = [t.statementDate, t.statementType, t.statementReference, t.statementDescription, t.statementDebit, t.statementCredit, t.statementBalance]
  const exportRows: any[][] = txs.map((tx) => {
    const m = typeMeta(tx.type)
    return [
      new Date(tx.date).toLocaleDateString("en-GB"),
      m.label,
      tx.referenceNo,
      tx.description ?? "",
      tx.debit > 0 ? fmt.currency(tx.debit) : "",
      tx.credit > 0 ? fmt.currency(tx.credit) : "",
      fmt.currency(tx.balance),
    ]
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {t.supplierStatementTitle}
          </DialogTitle>
          <DialogDescription>
            {supplierName ?? data?.supplier?.name ?? "—"} — {t.supplierStatementDesc}
          </DialogDescription>
        </DialogHeader>

        {/* Date filters + export toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 print:hidden">
          <div className="grid grid-cols-2 gap-3 flex-1">
            <div className="space-y-1.5">
              <Label htmlFor="stmt-from" className="text-xs">{t.statementFrom}</Label>
              <Input
                id="stmt-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                dir="ltr"
                className="text-end h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stmt-to" className="text-xs">{t.statementTo}</Label>
              <Input
                id="stmt-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                dir="ltr"
                className="text-end h-9"
              />
            </div>
          </div>
          {txs.length > 0 ? (
            <ExportToolbar
              title={`${t.supplierStatementTitle} - ${data?.supplier?.name ?? supplierName ?? ""}`}
              headers={exportHeaders}
              rows={exportRows}
              filename={`supplier-statement-${data?.supplier?.name ?? supplierName ?? "supplier"}-${from || "all"}-${to || "now"}`}
            />
          ) : null}
        </div>

        {/* Summary cards */}
        {data ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <SummaryCard label={t.statementOpeningBalance} value={fmt.currency(data.openingBalance)} tone="muted" />
            <SummaryCard label={t.statementInvoicesTotal} value={fmt.currency(data.invoicesTotal)} tone="blue" />
            <SummaryCard label={t.statementPaymentsTotal} value={fmt.currency(data.paymentsTotal)} tone="emerald" />
            <SummaryCard label={t.statementClosingBalance} value={fmt.currency(data.closingBalance)} tone={data.closingBalance > 0 ? "rose" : "emerald"} />
          </div>
        ) : null}

        {/* Transactions table */}
        <div className="rounded-lg border border-border flex-1 min-h-0">
          <ScrollArea className="h-[320px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : isError ? (
              <div className="flex items-center justify-center h-full py-10 text-sm text-destructive">
                {t.statementNoTransactions}
              </div>
            ) : txs.length === 0 ? (
              <div className="flex items-center justify-center h-full py-10 text-sm text-muted-foreground">
                {t.statementNoTransactions}
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-muted/60">
                  <TableRow>
                    <TableHead className="text-start">{t.statementDate}</TableHead>
                    <TableHead className="text-start">{t.statementType}</TableHead>
                    <TableHead className="text-start">{t.statementReference}</TableHead>
                    <TableHead className="text-start hidden md:table-cell">{t.statementDescription}</TableHead>
                    <TableHead className="text-end">{t.statementDebit}</TableHead>
                    <TableHead className="text-end">{t.statementCredit}</TableHead>
                    <TableHead className="text-end">{t.statementBalance}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txs.map((tx, i) => {
                    const m = typeMeta(tx.type)
                    const Icon = m.icon
                    return (
                      <TableRow key={i}>
                        <TableCell className="text-xs" dir="ltr">
                          {new Date(tx.date).toLocaleDateString("en-GB")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`gap-1 ${m.cls}`}>
                            <Icon className="h-3 w-3" />
                            {m.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs" dir="ltr">{tx.referenceNo}</TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden md:table-cell max-w-[200px] truncate">
                          {tx.description}
                        </TableCell>
                        <TableCell className="text-end tabular-nums font-medium">
                          {tx.debit > 0 ? fmt.currency(tx.debit) : "—"}
                        </TableCell>
                        <TableCell className="text-end tabular-nums font-medium">
                          {tx.credit > 0 ? fmt.currency(tx.credit) : "—"}
                        </TableCell>
                        <TableCell className={`text-end tabular-nums font-bold ${tx.balance > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                          {fmt.currency(tx.balance)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </div>

        {/* Footer with print */}
        <div className="flex justify-end gap-2 pt-2 print:hidden">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.close}
          </Button>
          <Button onClick={() => window.print()} disabled={txs.length === 0} className="gap-2">
            <Printer className="h-4 w-4" />
            {t.statementPrint}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: "muted" | "blue" | "emerald" | "rose"
}) {
  const toneCls = {
    muted: "bg-muted/40 text-foreground",
    blue: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  }[tone]
  return (
    <div className={`rounded-lg px-3 py-2 ${toneCls}`}>
      <div className="text-[10px] font-medium opacity-80">{label}</div>
      <div className="text-sm font-bold tabular-nums">{value}</div>
    </div>
  )
}
