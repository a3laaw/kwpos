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
  ClipboardCheck,
  ScanLine,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Package,
  Search,
} from "lucide-react"
import { useProducts, useSpotChecks, useCreateSpotCheck, type SpotCheckItem } from "@/hooks/use-api"
import { useFmt } from "@/components/currency-context"
import { useT } from "@/components/i18n-context"
import { cn } from "@/lib/utils"

export function SpotCheckView() {
  const t = useT()
  const fmt = useFmt()
  const { data: productsData } = useProducts()
  const { data: checksData, isLoading } = useSpotChecks()
  const createMut = useCreateSpotCheck()

  const products = productsData?.items ?? []
  const checks = checksData?.items ?? []

  // The count form — BLIND: product selector shows name + barcode only,
  // NO book quantity is revealed until after the count is submitted.
  const [selectedProductId, setSelectedProductId] = React.useState("")
  const [countedQty, setCountedQty] = React.useState("")
  const [note, setNote] = React.useState("")
  const [search, setSearch] = React.useState("")
  const [lastResult, setLastResult] = React.useState<SpotCheckItem | null>(null)

  const filteredProducts = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.barcode || "").toLowerCase().includes(q)
    )
  }, [products, search])

  function handleSubmit() {
    if (!selectedProductId) return
    const qty = Number(countedQty)
    if (!Number.isFinite(qty) || qty < 0) return
    createMut.mutate(
      { productId: selectedProductId, countedQty: qty, note: note.trim() || undefined },
      {
        onSuccess: (res: any) => {
          setLastResult(res)
          setSelectedProductId("")
          setCountedQty("")
          setNote("")
        },
      }
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.spotCheckTitle}
        description={t.spcSpotCheckDesc}
        icon={<ClipboardCheck className="h-5 w-5" />}
        breadcrumbItems={[
          { labelKey: "navInventoryPurchases" },
          { labelKey: "navSpotCheck" },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Blind count form */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ScanLine className="h-4 w-4 text-primary" />
              {t.spcBlindItemCount}
            </CardTitle>
            <CardDescription className="text-xs">
              {t.spcSpotCheckDesc}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.searchNameBarcodePlaceholder}
                className="pr-9 h-10"
              />
            </div>

            {/* Product selector — NO book qty shown */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t.spcItemToCount}</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger className="h-10"><SelectValue placeholder={t.spcSelectItemPlaceholder} /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {filteredProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{p.name}</span>
                        {p.barcode ? <span className="text-[10px] text-muted-foreground font-mono" dir="ltr">{p.barcode}</span> : null}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                ⓘ {t.spcBookQtyHiddenHint}
              </p>
            </div>

            {/* Counted qty */}
            <div className="space-y-1.5">
              <Label htmlFor="counted" className="text-xs">{t.spcActualQtyOnShelf}</Label>
              <Input
                id="counted"
                type="number"
                min={0}
                value={countedQty}
                onChange={(e) => setCountedQty(e.target.value)}
                className="h-10 tabular-nums text-lg"
                placeholder="0"
                inputMode="numeric"
              />
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label htmlFor="sc-note" className="text-xs">{t.noteOptional}</Label>
              <Input id="sc-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.spcNotePlaceholder} className="h-9" />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!selectedProductId || countedQty === "" || createMut.isPending}
              className="w-full gap-2"
            >
              {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
              {t.spcApproveCountAndCalcVariance}
            </Button>

            {/* Immediate result */}
            {lastResult ? (
              <div className={cn(
                "rounded-lg border p-3 space-y-1.5",
                lastResult.variance === 0
                  ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30"
                  : lastResult.variance < 0
                  ? "border-rose-300 bg-rose-50 dark:bg-rose-950/30"
                  : "border-sky-300 bg-sky-50 dark:bg-sky-950/30"
              )}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{lastResult.productName}</span>
                  {lastResult.variance === 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : lastResult.variance < 0 ? (
                    <TrendingDown className="h-4 w-4 text-rose-500" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-sky-500" />
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">{t.spcBook}</div>
                    <div className="font-bold tabular-nums">{fmt.number(lastResult.bookQty)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{t.spcActual}</div>
                    <div className="font-bold tabular-nums">{fmt.number(lastResult.countedQty)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{t.colVariance}</div>
                    <div className={cn(
                      "font-bold tabular-nums",
                      lastResult.variance === 0 ? "text-emerald-600" : lastResult.variance < 0 ? "text-rose-600" : "text-sky-600"
                    )}>
                      {lastResult.variance > 0 ? "+" : ""}{fmt.number(lastResult.variance)}
                    </div>
                  </div>
                </div>
                {lastResult.variance !== 0 ? (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 pt-1">
                    <AlertTriangle className="h-3 w-3" />
                    {lastResult.variance < 0 ? t.spcResultShortageLabel : t.spcResultSurplusLabel}
                  </p>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.spcBlindCountHistory}</CardTitle>
            <CardDescription className="text-xs">{t.spcLastCountsCount.replace("{count}", fmt.number(checks.length))}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <LoadingState text={t.loading} />
            ) : checks.length === 0 ? (
              <EmptyState title={t.spcNoCountsYet} />
            ) : (
              <div className="overflow-y-auto scrollbar-thin max-h-[60vh]">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-start py-2 px-3 font-semibold text-xs">{t.colItem}</th>
                      <th className="text-center py-2 px-3 font-semibold text-xs">{t.spcBook}</th>
                      <th className="text-center py-2 px-3 font-semibold text-xs">{t.spcActual}</th>
                      <th className="text-center py-2 px-3 font-semibold text-xs">{t.colVariance}</th>
                      <th className="text-center py-2 px-3 font-semibold text-xs hidden sm:table-cell">{t.colUser}</th>
                      <th className="text-center py-2 px-3 font-semibold text-xs hidden sm:table-cell">{t.colDate}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checks.map((c) => (
                      <tr key={c.id} className="border-b border-border/40 hover:bg-muted/20">
                        <td className="py-2 px-3">
                          <div className="font-medium text-xs">{c.productName}</div>
                          {c.barcode ? <div className="text-[10px] text-muted-foreground font-mono" dir="ltr">{c.barcode}</div> : null}
                        </td>
                        <td className="py-2 px-3 text-center tabular-nums text-xs">{fmt.number(c.bookQty)}</td>
                        <td className="py-2 px-3 text-center tabular-nums text-xs">{fmt.number(c.countedQty)}</td>
                        <td className="py-2 px-3 text-center">
                          <Badge className={cn(
                            "tabular-nums text-[10px]",
                            c.variance === 0 ? "bg-emerald-500/15 text-emerald-600" : c.variance < 0 ? "bg-rose-500/15 text-rose-600" : "bg-sky-500/15 text-sky-600"
                          )}>
                            {c.variance > 0 ? "+" : ""}{fmt.number(c.variance)}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-center text-[10px] text-muted-foreground hidden sm:table-cell">{c.userName || "—"}</td>
                        <td className="py-2 px-3 text-center text-[10px] text-muted-foreground hidden sm:table-cell">{fmt.dateTime(c.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
