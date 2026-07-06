"use client"

import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { LoadingState } from "@/components/shared/loading-state"
import { EmptyState } from "@/components/shared/empty-state"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChevronDown,
  ChevronLeft,
  Filter,
  RotateCcw,
  Calendar,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Layers,
  Package,
  TrendingUp,
  DollarSign,
  Gauge,
  Clock,
  Warehouse as WarehouseIcon,
} from "lucide-react"
import { useReportMatrix, type MatrixFilters } from "@/hooks/use-api"
import { useI18n, useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"
import { cn } from "@/lib/utils"

type SortKey =
  | "name"
  | "netQty"
  | "revenue"
  | "cost"
  | "grossProfit"
  | "marginPct"
  | "turnoverRate"
  | "avgDaysInInv"

type SortDir = "asc" | "desc"

interface ProductRow {
  productId: string
  name: string
  barcode: string | null
  categoryId: string | null
  categoryName: string
  supplierName: string | null
  netQty: number
  revenue: number
  cost: number
  grossProfit: number
  marginPct: number
  avgInventory: number
  turnoverRate: number
  avgDaysInInv: number
}

interface CategoryRow {
  categoryId: string | null
  categoryName: string
  productCount: number
  netQty: number
  revenue: number
  cost: number
  grossProfit: number
  marginPct: number
  avgInventory: number
  turnoverRate: number
  avgDaysInInv: number
  children: ProductRow[]
}

export function PerformanceMatrix() {
  const t = useT()
  const fmt = useFmt()
  const { locale } = useI18n()
  const isRTL = locale === "ar"
  const ClosedChevron = isRTL ? ChevronLeft : ChevronDown

  // Local filter state (applied on "تطبيق الفلاتر" click).
  const [from, setFrom] = React.useState("")
  const [to, setTo] = React.useState("")
  const [warehouseId, setWarehouseId] = React.useState("")
  const [supplierId, setSupplierId] = React.useState("")
  const [applied, setApplied] = React.useState<MatrixFilters>({})

  const { data, isLoading, isError, refetch } = useReportMatrix(applied)

  // Sort state — applies to BOTH category-level and product-level rows.
  const [sortKey, setSortKey] = React.useState<SortKey>("revenue")
  const [sortDir, setSortDir] = React.useState<SortDir>("desc")

  // Which categories are expanded (by categoryId key, or "__uncategorized__").
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set())

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir(key === "name" ? "asc" : "desc")
    }
  }

  function toggleExpand(catKey: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(catKey)) next.delete(catKey)
      else next.add(catKey)
      return next
    })
  }

  function expandAll() {
    const all = new Set<string>()
    for (const c of data?.categories || []) all.add(c.categoryId || "__uncategorized__")
    setExpanded(all)
  }

  function collapseAll() {
    setExpanded(new Set())
  }

  function applyFilters() {
    setApplied({
      from: from || undefined,
      to: to || undefined,
      warehouseId: warehouseId || undefined,
      supplierId: supplierId || undefined,
    })
  }

  function resetFilters() {
    setFrom("")
    setTo("")
    setWarehouseId("")
    setSupplierId("")
    setApplied({})
  }

  function setQuickRange(days: number) {
    const t = new Date()
    const f = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    setFrom(f.toISOString().slice(0, 10))
    setTo(t.toISOString().slice(0, 10))
  }

  // Generic comparator factory for both category + product rows (they share the metric keys).
  const compare = React.useCallback(
    <T extends Record<string, any>>(a: T, b: T): number => {
      const av = a[sortKey]
      const bv = b[sortKey]
      let r: number
      if (typeof av === "string" && typeof bv === "string") {
        r = av.localeCompare(bv, "ar")
      } else {
        r = (Number(av) || 0) - (Number(bv) || 0)
      }
      return sortDir === "asc" ? r : -r
    },
    [sortKey, sortDir]
  )

  const categories: CategoryRow[] = React.useMemo(() => {
    const list = (data?.categories || []) as CategoryRow[]
    const sorted = [...list].sort(compare)
    // Build new category objects with sorted children (avoid mutating inputs).
    return sorted.map((c) => ({
      ...c,
      children: [...c.children].sort(compare),
    }))
  }, [data, compare])

  const warehouses: { id: string; name: string; code?: string | null }[] =
    data?.warehouses ?? []
  const suppliers: { id: string; name: string }[] = data?.suppliers ?? []
  const activeFiltersCount = Object.values(applied).filter(Boolean).length
  const periodDays = data?.periodDays ?? 0

  // Aggregate totals across all categories (for the header KPI strip).
  const totals = React.useMemo(() => {
    let revenue = 0,
      cost = 0,
      profit = 0,
      qty = 0,
      inv = 0
    for (const c of categories) {
      revenue += c.revenue
      cost += c.cost
      profit += c.grossProfit
      qty += c.netQty
      inv += c.avgInventory
    }
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0
    const turnover = inv > 0 ? cost / inv : 0
    const days = turnover > 0 ? periodDays / turnover : periodDays
    return { revenue, cost, profit, qty, margin, turnover, days, catCount: categories.length }
  }, [categories, periodDays])

  return (
    <div className="space-y-4">
      <PageHeader
        title={t.matrixTitleFull}
        description={t.matrixLongDescFull}
        icon={<Layers className="h-5 w-5" />}
      />

      {/* Filters card */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4 text-primary" />
              {t.reportFilters}
              {activeFiltersCount > 0 ? (
                <Badge className="tabular-nums">{activeFiltersCount} {t.activeLabel}</Badge>
              ) : null}
            </CardTitle>
            <div className="flex gap-1.5 flex-wrap">
              <Button size="sm" variant="ghost" onClick={() => setQuickRange(7)} className="h-7 text-xs">{t.last7Days}</Button>
              <Button size="sm" variant="ghost" onClick={() => setQuickRange(30)} className="h-7 text-xs">{t.last30Days}</Button>
              <Button size="sm" variant="ghost" onClick={() => setQuickRange(90)} className="h-7 text-xs">{t.last90Days}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> {t.from}</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> {t.to}</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><WarehouseIcon className="h-3 w-3" /> {t.branchWarehouse2}</Label>
              <Select value={warehouseId} onValueChange={(v) => setWarehouseId(v === "all" ? "" : v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder={t.allBranches} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allBranches}</SelectItem>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}{w.code ? ` (${w.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t.supplier}</Label>
              <Select value={supplierId} onValueChange={(v) => setSupplierId(v === "all" ? "" : v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder={t.allSuppliers} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allSuppliers}</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={resetFilters} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> {t.reset}
            </Button>
            <Button size="sm" onClick={applyFilters} className="gap-1.5">
              <Filter className="h-3.5 w-3.5" /> {t.applyFilters}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <LoadingState text={t.calculatingMatrix} />
      ) : isError ? (
        <EmptyState title={t.reportLoadFailed} action={<Button onClick={() => refetch()}>{t.retry}</Button>} />
      ) : !data || categories.length === 0 ? (
        <EmptyState title={t.matrixNoDataForPeriod} />
      ) : (
        <>
          {/* KPI strip */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <KpiTile icon={<DollarSign className="h-4 w-4" />} label={t.repTotalRevenue} value={fmt.currency(totals.revenue)} tone="default" />
            <KpiTile icon={<Package className="h-4 w-4" />} label={t.matrixCogsLabel} value={fmt.currency(totals.cost)} tone="info" />
            <KpiTile icon={<TrendingUp className="h-4 w-4" />} label={t.repGrossProfit} value={fmt.currency(totals.profit)} hint={t.repMarginPctLabel.replace("{x}", fmt.number(totals.margin))} tone="success" />
            <KpiTile icon={<Gauge className="h-4 w-4" />} label={t.matrixKpiTurnover} value={fmt.number(totals.turnover)} hint={t.matrixStagnantDaysHint.replace("{x}", fmt.number(totals.days))} tone="default" />
          </div>

          {/* Matrix table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    {t.matrixTableTitle.replace("{count}", fmt.number(totals.catCount))}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {t.matrixHintFull}
                  </CardDescription>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={expandAll} className="h-7 text-xs gap-1">
                    <ChevronDown className="h-3.5 w-3.5" /> {t.expandAll}
                  </Button>
                  <Button size="sm" variant="outline" onClick={collapseAll} className="h-7 text-xs gap-1">
                    <ClosedChevron className="h-3.5 w-3.5" /> {t.collapseAll}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm min-w-[920px]">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr className="border-b border-border">
                      <th className="py-2.5 px-2 font-semibold text-muted-foreground text-start w-8" />
                      <SortHeaderCell k="name" label={t.matrixColCategoryItem} align="start" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                      <th className="py-2.5 px-2 font-semibold text-muted-foreground text-center hidden lg:table-cell">{t.colBarcode}</th>
                      <SortHeaderCell k="netQty" label={t.matrixColNetQty} sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                      <SortHeaderCell k="revenue" label={t.matrixColSales} sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                      <SortHeaderCell k="cost" label={t.matrixKpiCost} sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                      <SortHeaderCell k="grossProfit" label={t.matrixColGrossProfit} sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                      <SortHeaderCell k="marginPct" label={t.matrixColMarginPct} sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                      <SortHeaderCell k="turnoverRate" label={t.matrixKpiTurnover} sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                      <SortHeaderCell k="avgDaysInInv" label={t.matrixColStagnantDays} sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat) => {
                      const catKey = cat.categoryId || "__uncategorized__"
                      const isOpen = expanded.has(catKey)
                      return (
                        <React.Fragment key={catKey}>
                          {/* Category (parent) row */}
                          <tr
                            className="border-b border-border/60 bg-sidebar-accent/30 cursor-pointer hover:bg-sidebar-accent/50 transition-colors"
                            onClick={() => toggleExpand(catKey)}
                          >
                            <td className="py-3 px-2 text-center">
                              {isOpen ? (
                                <ChevronDown className="h-4 w-4 inline text-primary" />
                              ) : (
                                <ClosedChevron className="h-4 w-4 inline text-muted-foreground" />
                              )}
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                  <Layers className="h-3.5 w-3.5" />
                                </span>
                                <span className="font-bold text-foreground">{cat.categoryName}</span>
                                <Badge variant="outline" className="text-[10px] tabular-nums">{t.itemsCountLabel.replace("{count}", fmt.number(cat.productCount))}</Badge>
                              </div>
                            </td>
                            <td className="py-3 px-2 text-center text-muted-foreground hidden lg:table-cell">—</td>
                            <td className="py-3 px-2 text-center tabular-nums font-medium">{fmt.number(cat.netQty)}</td>
                            <td className="py-3 px-2 text-center tabular-nums font-medium">{fmt.currency(cat.revenue)}</td>
                            <td className="py-3 px-2 text-center tabular-nums text-muted-foreground">{fmt.currency(cat.cost)}</td>
                            <td className="py-3 px-2 text-center tabular-nums font-medium text-[#DFC196]">{fmt.currency(cat.grossProfit)}</td>
                            <td className="py-3 px-2 text-center tabular-nums">
                              <Badge className={cn("tabular-nums", cat.marginPct >= 30 ? "bg-emerald-500/15 text-emerald-600" : cat.marginPct >= 10 ? "bg-amber-500/15 text-amber-600" : "bg-rose-500/15 text-rose-600")}>
                                {fmt.number(cat.marginPct)}%
                              </Badge>
                            </td>
                            <td className="py-3 px-2 text-center tabular-nums font-medium">{fmt.number(cat.turnoverRate)}×</td>
                            <td className="py-3 px-2 text-center tabular-nums text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3 opacity-50" />
                                {fmt.number(cat.avgDaysInInv)}
                              </span>
                            </td>
                          </tr>
                          {/* Product (child) rows — rendered when expanded */}
                          {isOpen &&
                            cat.children.map((p) => (
                              <tr key={p.productId} className="border-b border-border/30 hover:bg-muted/20">
                                <td className="py-2 px-2" />
                                <td className="py-2 px-2 ps-6">
                                  <div className="flex items-center gap-2">
                                    <span className="flex h-6 w-6 items-center justify-center rounded bg-muted/60 text-muted-foreground">
                                      <Package className="h-3 w-3" />
                                    </span>
                                    <span className="font-medium text-foreground/90">{p.name}</span>
                                  </div>
                                </td>
                                <td className="py-2 px-2 text-center text-muted-foreground font-mono text-xs hidden lg:table-cell" dir="ltr">
                                  {p.barcode || "—"}
                                </td>
                                <td className="py-2 px-2 text-center tabular-nums">{fmt.number(p.netQty)}</td>
                                <td className="py-2 px-2 text-center tabular-nums">{fmt.currency(p.revenue)}</td>
                                <td className="py-2 px-2 text-center tabular-nums text-muted-foreground">{fmt.currency(p.cost)}</td>
                                <td className="py-2 px-2 text-center tabular-nums font-medium text-[#DFC196]">{fmt.currency(p.grossProfit)}</td>
                                <td className="py-2 px-2 text-center tabular-nums">
                                  <span className={cn("text-xs", p.marginPct >= 30 ? "text-emerald-600" : p.marginPct >= 10 ? "text-amber-600" : "text-rose-600")}>
                                    {fmt.number(p.marginPct)}%
                                  </span>
                                </td>
                                <td className="py-2 px-2 text-center tabular-nums">{fmt.number(p.turnoverRate)}×</td>
                                <td className="py-2 px-2 text-center tabular-nums text-muted-foreground">{fmt.number(p.avgDaysInInv)}</td>
                              </tr>
                            ))}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                  {/* Grand total footer */}
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/30 font-bold">
                      <td className="py-3 px-2" />
                      <td className="py-3 px-2 text-start" colSpan={2}>{t.matrixGrandTotal.replace("{count}", fmt.number(totals.catCount))}</td>
                      <td className="py-3 px-2 text-center tabular-nums">{fmt.number(totals.qty)}</td>
                      <td className="py-3 px-2 text-center tabular-nums">{fmt.currency(totals.revenue)}</td>
                      <td className="py-3 px-2 text-center tabular-nums">{fmt.currency(totals.cost)}</td>
                      <td className="py-3 px-2 text-center tabular-nums text-[#DFC196]">{fmt.currency(totals.profit)}</td>
                      <td className="py-3 px-2 text-center tabular-nums">{fmt.number(totals.margin)}%</td>
                      <td className="py-3 px-2 text-center tabular-nums">{fmt.number(totals.turnover)}×</td>
                      <td className="py-3 px-2 text-center tabular-nums">{fmt.number(totals.days)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function SortHeaderCell({
  k,
  label,
  align = "center",
  sortKey,
  sortDir,
  onToggle,
}: {
  k: SortKey
  label: string
  align?: "start" | "center" | "end"
  sortKey: SortKey
  sortDir: SortDir
  onToggle: (k: SortKey) => void
}) {
  return (
    <th
      className={cn(
        "py-2.5 px-2 font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors",
        align === "center" && "text-center",
        align === "start" && "text-start",
        align === "end" && "text-end"
      )}
      onClick={() => onToggle(k)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === k ? (
          sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </span>
    </th>
  )
}

function KpiTile({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
  tone: "default" | "info" | "success"
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              tone === "success" ? "bg-emerald-500/10 text-emerald-600" : tone === "info" ? "bg-sky-500/10 text-sky-600" : "bg-primary/10 text-primary"
            )}
          >
            {icon}
          </span>
        </div>
        <p className="mt-2 text-lg font-bold tabular-nums">{value}</p>
        {hint ? <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}
