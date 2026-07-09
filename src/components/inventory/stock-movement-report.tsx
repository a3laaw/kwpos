"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Download, ArrowLeftRight } from "lucide-react"
import { useProducts, useWarehouses } from "@/hooks/use-api"
import { useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"
import { cn } from "@/lib/utils"

interface StockMovementRow {
  date: string
  type:
    | "SALE"
    | "REFUND"
    | "EXCHANGE"
    | "PURCHASE_INVOICE"
    | "PURCHASE_RETURN"
    | "TRANSFER_OUT"
    | "TRANSFER_IN"
    | "STOCK_TAKE"
    | "SPOT_CHECK"
  productId: string
  productName: string
  quantityChange: number
  referenceNo: string
  userName: string | null
}

async function fetchMovements(params: {
  productId?: string
  warehouseId?: string
  from?: string
  to?: string
  type?: string
}): Promise<{ items: StockMovementRow[] }> {
  const qs = new URLSearchParams()
  if (params.productId) qs.set("productId", params.productId)
  if (params.warehouseId) qs.set("warehouseId", params.warehouseId)
  if (params.from) qs.set("from", params.from)
  if (params.to) qs.set("to", params.to)
  if (params.type) qs.set("type", params.type)
  const s = qs.toString()
  const res = await fetch(`/api/inventory/movements${s ? `?${s}` : ""}`, {
    headers: { Accept: "application/json" },
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error((e as any)?.error || `request-failed:${res.status}`)
  }
  return res.json() as Promise<{ items: StockMovementRow[] }>
}

const TYPE_BADGE_CLASS: Record<StockMovementRow["type"], string> = {
  SALE: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30",
  REFUND: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  EXCHANGE: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  PURCHASE_INVOICE: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
  PURCHASE_RETURN: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30",
  TRANSFER_OUT: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30",
  TRANSFER_IN: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/30",
  STOCK_TAKE: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30",
  SPOT_CHECK: "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400 border-fuchsia-500/30",
}

export function StockMovementReport() {
  const t = useT()
  const fmt = useFmt()
  const [productId, setProductId] = React.useState<string>("")
  const [warehouseId, setWarehouseId] = React.useState<string>("")
  const [from, setFrom] = React.useState("")
  const [to, setTo] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState<string>("")

  const { data: productsData } = useProducts()
  const products = productsData?.items ?? []
  const { data: warehousesData } = useWarehouses()
  const warehouses = warehousesData?.items ?? []

  // Defer the query until the user has selected at least one filter — the
  // unfiltered result set can be huge on a busy store, so we require an
  // explicit action (clicking "Load") before fetching.
  const [shouldFetch, setShouldFetch] = React.useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["stock-movements", productId, warehouseId, from, to, typeFilter, shouldFetch],
    queryFn: () =>
      fetchMovements({
        productId: productId || undefined,
        warehouseId: warehouseId || undefined,
        from: from || undefined,
        to: to || undefined,
        type: typeFilter || undefined,
      }),
    enabled: shouldFetch,
  })

  const items = data?.items ?? []

  const TYPE_LABEL: Record<StockMovementRow["type"], string> = {
    SALE: t.movementTypeSale,
    REFUND: t.movementTypeRefund,
    EXCHANGE: t.movementTypeExchange,
    PURCHASE_INVOICE: t.movementTypePurchaseInvoice,
    PURCHASE_RETURN: t.movementTypePurchaseReturn,
    TRANSFER_OUT: t.movementTypeTransferOut,
    TRANSFER_IN: t.movementTypeTransferIn,
    STOCK_TAKE: t.movementTypeStockTake,
    SPOT_CHECK: t.movementTypeSpotCheck,
  }

  function handleLoad() {
    setShouldFetch(true)
    // refetch isn't needed — `enabled: true` after setShouldFetch(true)
    // will trigger the query automatically.
  }

  function handleCsvExport() {
    const headers = [
      t.statementDate,
      t.statementType,
      t.product,
      t.movementQuantityChange,
      t.statementReference,
      t.movementUser,
    ]
    const lines = [headers.map(csvEscape).join(",")]
    for (const r of items) {
      lines.push(
        [
          new Date(r.date).toLocaleString("en-GB"),
          TYPE_LABEL[r.type] ?? r.type,
          r.productName,
          String(r.quantityChange),
          r.referenceNo,
          r.userName ?? "",
        ]
          .map(csvEscape)
          .join(",")
      )
    }
    // Prepend BOM so Excel detects UTF-8 (Arabic text would otherwise mojibake).
    const csv = "\uFEFF" + lines.join("\r\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    const safeProduct = productId ? products.find((p) => p.id === productId)?.name ?? "product" : "all"
    a.download = `stock-movements-${safeProduct}-${from || "all"}-${to || "now"}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">{t.stockMovementReport}</h3>
          </div>
          <p className="text-xs text-muted-foreground">{t.stockMovementDesc}</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="space-y-1 col-span-2 lg:col-span-1">
              <Label className="text-xs">{t.product}</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger className="h-9"><SelectValue placeholder={t.movementTypeAll} /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-2 lg:col-span-1">
              <Label className="text-xs">{t.stockTakeWarehouse}</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger className="h-9"><SelectValue placeholder={t.stockTakeAllWarehouses} /></SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
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
            <div className="space-y-1 col-span-2 lg:col-span-1">
              <Label className="text-xs">{t.statementType}</Label>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v === "__all__" ? "" : v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder={t.movementTypeAll} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t.movementTypeAll}</SelectItem>
                  <SelectItem value="SALE">{t.movementTypeSale}</SelectItem>
                  <SelectItem value="REFUND">{t.movementTypeRefund}</SelectItem>
                  <SelectItem value="EXCHANGE">{t.movementTypeExchange}</SelectItem>
                  <SelectItem value="PURCHASE_INVOICE">{t.movementTypePurchaseInvoice}</SelectItem>
                  <SelectItem value="PURCHASE_RETURN">{t.movementTypePurchaseReturn}</SelectItem>
                  <SelectItem value="TRANSFER_OUT">{t.movementTypeTransferOut}</SelectItem>
                  <SelectItem value="TRANSFER_IN">{t.movementTypeTransferIn}</SelectItem>
                  <SelectItem value="STOCK_TAKE">{t.movementTypeStockTake}</SelectItem>
                  <SelectItem value="SPOT_CHECK">{t.movementTypeSpotCheck}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleLoad} className="gap-1.5 h-9" disabled={isLoading}>
                {t.retry}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {!shouldFetch ? (
        <EmptyState
          icon={<ArrowLeftRight className="h-7 w-7" />}
          title={t.stockMovementReport}
          description={t.stockMovementDesc}
        />
      ) : isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <EmptyState
          title={t.stockMovementReport}
          action={<Button onClick={() => refetch()}>{t.retry}</Button>}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ArrowLeftRight className="h-7 w-7" />}
          title={t.movementNoData}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border/40">
              <p className="text-xs text-muted-foreground">
                {fmt.number(items.length)} {t.statementReference.toLowerCase()}
              </p>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCsvExport}>
                <Download className="h-3.5 w-3.5" />
                {t.movementExportCsv}
              </Button>
            </div>
            <ScrollArea className="max-h-[60vh] scrollbar-thin">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/60 z-10">
                  <TableRow>
                    <TableHead className="text-start">{t.statementDate}</TableHead>
                    <TableHead className="text-start">{t.statementType}</TableHead>
                    <TableHead className="text-start">{t.product}</TableHead>
                    <TableHead className="text-end">{t.movementQuantityChange}</TableHead>
                    <TableHead className="text-start">{t.statementReference}</TableHead>
                    <TableHead className="text-start">{t.movementUser}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs" dir="ltr">
                        {new Date(r.date).toLocaleString("en-GB")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs", TYPE_BADGE_CLASS[r.type])}>
                          {TYPE_LABEL[r.type] ?? r.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{r.productName}</TableCell>
                      <TableCell
                        className={cn(
                          "text-end tabular-nums font-bold",
                          r.quantityChange > 0
                            ? "text-emerald-600"
                            : r.quantityChange < 0
                              ? "text-rose-600"
                              : "text-muted-foreground"
                        )}
                      >
                        {r.quantityChange > 0 ? `+${r.quantityChange}` : r.quantityChange}
                      </TableCell>
                      <TableCell className="font-mono text-xs" dir="ltr">{r.referenceNo}</TableCell>
                      <TableCell className="text-xs">{r.userName ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/** Escape a CSV cell value: wrap in quotes if it contains a comma, quote, or newline. */
function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  const s = String(value)
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}
