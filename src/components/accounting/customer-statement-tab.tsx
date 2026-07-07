"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TableSkeleton } from "@/components/shared/loading-state"
import { EmptyState } from "@/components/shared/empty-state"
import { ExportToolbar } from "@/components/shared/export-toolbar"
import { User2 } from "lucide-react"
import { useCustomers, useCustomerStatement } from "@/hooks/use-api"
import { useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"
import { cn } from "@/lib/utils"

export function CustomerStatementTab() {
  const t = useT()
  const fmt = useFmt()
  const [customerId, setCustomerId] = React.useState<string>("")
  const [from, setFrom] = React.useState("")
  const [to, setTo] = React.useState("")

  const { data: customersData } = useCustomers()
  const customers = customersData?.items ?? []
  const { data, isLoading, isError, refetch } = useCustomerStatement(
    customerId || null,
    from || undefined,
    to || undefined
  )

  // Export rows (only meaningful when a customer is selected and data loaded)
  const exportHeaders = [t.statementDate, t.statementType, t.statementReference, t.statementDebit, t.statementCredit, t.statementBalance]
  const exportRows: any[][] = (data?.transactions ?? []).map((tx) => [
    new Date(tx.date).toLocaleDateString("en-GB"),
    tx.type === "SALE" ? t.statementInvoice : t.statementReturn,
    tx.referenceNo,
    tx.debit > 0 ? fmt.currency(tx.debit) : "",
    tx.credit > 0 ? fmt.currency(tx.credit) : "",
    fmt.currency(tx.balance),
  ])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1">
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <Label className="text-xs">{t.accCustomerStatement}</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
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
        {customerId && data ? (
          <ExportToolbar
            title={`${t.accCustomerStatement} - ${data.customer.name}`}
            headers={exportHeaders}
            rows={exportRows}
            filename={`customer-statement-${data.customer.name}-${from || "all"}-${to || "now"}`}
          />
        ) : null}
      </div>

      {!customerId ? (
        <EmptyState icon={<User2 className="h-7 w-7" />} title={t.accCustomerStatement} />
      ) : isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <EmptyState title={t.accCustomerStatement} action={<button onClick={() => refetch()}>{t.retry}</button>} />
      ) : data ? (
        <>
          <div className="grid sm:grid-cols-3 gap-3">
            <Card className="bg-amber-500/5 border-amber-500/20"><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{t.statementOpeningBalance}</p>
              <p className="text-lg font-bold tabular-nums text-amber-600">{fmt.currency(data.openingBalance)}</p>
            </CardContent></Card>
            <Card className="bg-primary/5 border-primary/20"><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{t.statementClosingBalance}</p>
              <p className="text-lg font-bold tabular-nums text-primary">{fmt.currency(data.closingBalance)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{t.customer || "العميل"}</p>
              <p className="text-sm font-bold truncate">{data.customer.name}</p>
              <p className="text-xs text-muted-foreground truncate" dir="ltr">{data.customer.phone || "—"}</p>
            </CardContent></Card>
          </div>
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[50vh] scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-start">{t.statementDate}</TableHead>
                      <TableHead className="text-start">{t.statementType}</TableHead>
                      <TableHead className="text-start">{t.statementReference}</TableHead>
                      <TableHead className="text-end">{t.statementDebit}</TableHead>
                      <TableHead className="text-end">{t.statementCredit}</TableHead>
                      <TableHead className="text-end">{t.statementBalance}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.transactions.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t.statementNoTransactions}</TableCell></TableRow>
                    ) : data.transactions.map((tx, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs" dir="ltr">{new Date(tx.date).toLocaleDateString("en-GB")}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-xs", tx.type === "SALE" ? "bg-blue-500/10 text-blue-700" : "bg-orange-500/10 text-orange-700")}>
                            {tx.type === "SALE" ? t.statementInvoice : t.statementReturn}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs" dir="ltr">{tx.referenceNo}</TableCell>
                        <TableCell className="text-end tabular-nums">{tx.debit > 0 ? fmt.currency(tx.debit) : "—"}</TableCell>
                        <TableCell className="text-end tabular-nums">{tx.credit > 0 ? fmt.currency(tx.credit) : "—"}</TableCell>
                        <TableCell className="text-end tabular-nums font-bold">{fmt.currency(tx.balance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
