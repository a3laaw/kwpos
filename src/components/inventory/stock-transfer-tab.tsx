"use client"

import * as React from "react"
import { toast } from "sonner"
import { EmptyState } from "@/components/shared/empty-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  ArrowRightLeft, Search, Loader2, CheckCircle2, ArrowLeft, ArrowRight, Truck, Trash2,
} from "lucide-react"
import {
  useProducts, useWarehouses,
  useStockTransfers, useCreateStockTransfer, useReceiveStockTransfer,
} from "@/hooks/use-api"
import { useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"

interface TransferLine {
  productId: string
  productName: string
  quantity: string
  unitCost: number
}

export function StockTransferTab() {
  const t = useT()
  const fmt = useFmt()
  const [fromWh, setFromWh] = React.useState("")
  const [toWh, setToWh] = React.useState("")
  const [lines, setLines] = React.useState<TransferLine[]>([])
  const [barcodeSearch, setBarcodeSearch] = React.useState("")
  const [note, setNote] = React.useState("")

  const { data: productsData } = useProducts()
  const { data: whs } = useWarehouses()
  const { data: transfersData, refetch } = useStockTransfers()
  const createMut = useCreateStockTransfer()
  const receiveMut = useReceiveStockTransfer()

  const products = productsData?.items ?? []
  const warehouses = whs?.items ?? []
  const transfers = transfersData?.items ?? []

  function addProduct(productId: string) {
    if (lines.find((l) => l.productId === productId)) return
    const p = products.find((pr) => pr.id === productId)
    if (!p) return
    setLines((arr) => [
      ...arr,
      { productId: p.id, productName: p.name, quantity: "1", unitCost: p.costPrice },
    ])
  }

  function handleBarcodeSearch(e: React.KeyboardEvent) {
    if (e.key !== "Enter") return
    const code = barcodeSearch.trim()
    if (!code) return
    const p = products.find((pr) => pr.name.includes(code) || pr.barcode === code)
    if (p) {
      addProduct(p.id)
      toast.info(`أضيف: ${p.name}`)
    } else {
      toast.error("لم يُعثر على الصنف")
    }
    setBarcodeSearch("")
  }

  function setQty(productId: string, qty: string) {
    setLines((arr) =>
      arr.map((l) => (l.productId === productId ? { ...l, quantity: qty } : l))
    )
  }
  function removeLine(productId: string) {
    setLines((arr) => arr.filter((l) => l.productId !== productId))
  }

  const total = lines.reduce(
    (s, l) => s + (Number(l.quantity) || 0) * l.unitCost,
    0
  )

  async function handleCreate() {
    if (!fromWh || !toWh) {
      toast.error(t.transferCreateFailed, { description: t.fromWarehouse })
      return
    }
    if (fromWh === toWh) {
      toast.error(t.transferSameWarehouse)
      return
    }
    if (lines.length === 0) {
      toast.error(t.transferCreateFailed, { description: t.newStockTransfer })
      return
    }
    try {
      const res = await createMut.mutateAsync({
        fromWarehouseId: fromWh,
        toWarehouseId: toWh,
        note: note.trim() || undefined,
        items: lines.map((l) => ({
          productId: l.productId,
          quantity: Number(l.quantity) || 0,
        })),
      })
      toast.success(t.transferCreated, {
        description: `${res.transferNo} — ${t.transferInTransit}`,
      })
      setLines([])
      setNote("")
    } catch (err: any) {
      toast.error(t.transferCreateFailed, { description: String(err?.message || err) })
    }
  }

  async function handleReceive(id: string) {
    try {
      const res = await receiveMut.mutateAsync(id)
      toast.success(t.transferReceived, { description: res.transferNo })
      refetch()
    } catch (err: any) {
      toast.error(t.transferReceiveFailed, { description: String(err?.message || err) })
    }
  }

  const statusMeta = (status: string) => {
    if (status === "RECEIVED")
      return { label: t.transferReceived, cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" }
    if (status === "CANCELLED")
      return { label: t.transferCancelled, cls: "bg-rose-500/15 text-rose-700 border-rose-500/30" }
    return { label: t.transferOut, cls: "bg-amber-500/15 text-amber-700 border-amber-500/30" }
  }

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left: create transfer */}
        <div className="lg:col-span-2 space-y-4">
          {/* Warehouses */}
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <ArrowRight className="h-3 w-3" /> {t.fromWarehouse}
                </Label>
                <Select value={fromWh} onValueChange={setFromWh}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <ArrowLeft className="h-3 w-3" /> {t.toWarehouse}
                </Label>
                <Select value={toWh} onValueChange={setToWh}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Barcode search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={barcodeSearch}
              onChange={(e) => setBarcodeSearch(e.target.value)}
              onKeyDown={handleBarcodeSearch}
              placeholder="ابحث بالباركود أو الاسم..."
              className="pr-9"
            />
          </div>

          {/* Items */}
          {lines.length === 0 ? (
            <EmptyState icon={<Truck className="h-7 w-7" />} title={t.noStockTransfers} />
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-start p-2.5 font-medium">{t.productName || "الصنف"}</th>
                        <th className="text-center p-2.5 font-medium w-20">{t.actualQty || "كمية"}</th>
                        <th className="text-center p-2.5 font-medium w-24">{t.varianceValue || "التكلفة"}</th>
                        <th className="text-center p-2.5 font-medium w-24">{t.returnTotal || "الإجمالي"}</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l) => (
                        <tr key={l.productId} className="border-t border-border/40 hover:bg-muted/20">
                          <td className="p-2.5 font-medium">{l.productName}</td>
                          <td className="p-2.5 text-center">
                            <Input
                              type="number"
                              min={1}
                              value={l.quantity}
                              onChange={(e) => setQty(l.productId, e.target.value)}
                              className="h-7 w-16 text-center tabular-nums mx-auto"
                            />
                          </td>
                          <td className="p-2.5 text-center tabular-nums">{fmt.currency(l.unitCost)}</td>
                          <td className="p-2.5 text-center tabular-nums font-medium">
                            {fmt.currency((Number(l.quantity) || 0) * l.unitCost)}
                          </td>
                          <td className="p-2.5 text-center">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeLine(l.productId)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: summary + create */}
        <div className="lg:col-span-1">
          <Card className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto scrollbar-thin">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-primary" />
                {t.stockTransferTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t.itemsCountLabel || "الأصناف"}</span>
                <span className="tabular-nums">{fmt.number(lines.length)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t.returnTotal}</span>
                <span className="tabular-nums font-bold text-primary">{fmt.currency(total)}</span>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t.note}</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="—" className="h-8 text-sm" />
              </div>
              <Separator />
              <Button
                onClick={handleCreate}
                disabled={lines.length === 0 || !fromWh || !toWh || createMut.isPending}
                className="w-full gap-2"
              >
                {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
                {t.newStockTransfer}
              </Button>
              <p className="text-[10px] text-muted-foreground">
                {t.stockTransferDesc}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transfer history */}
      {transfers.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.stockTransferTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-start p-2.5 font-medium">{t.returnNo || "رقم"}</th>
                    <th className="text-start p-2.5 font-medium hidden sm:table-cell">{t.fromWarehouse} ← {t.toWarehouse}</th>
                    <th className="text-center p-2.5 font-medium">{t.actualQty || "أصناف"}</th>
                    <th className="text-center p-2.5 font-medium">{t.returnTotal}</th>
                    <th className="text-center p-2.5 font-medium">{t.statementType || "الحالة"}</th>
                    <th className="text-center p-2.5 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((tr) => {
                    const meta = statusMeta(tr.status)
                    return (
                      <tr key={tr.id} className="border-t border-border/40 hover:bg-muted/20">
                        <td className="p-2.5 font-mono text-xs" dir="ltr">{tr.transferNo}</td>
                        <td className="p-2.5 hidden sm:table-cell text-xs text-muted-foreground">
                          {tr.fromWarehouseName} ← {tr.toWarehouseName}
                        </td>
                        <td className="p-2.5 text-center tabular-nums">{tr.items.length}</td>
                        <td className="p-2.5 text-center tabular-nums">{fmt.currency(tr.total)}</td>
                        <td className="p-2.5 text-center">
                          <Badge className={meta.cls}>{meta.label}</Badge>
                        </td>
                        <td className="p-2.5 text-center">
                          {tr.status === "OUT" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReceive(tr.id)}
                              disabled={receiveMut.isPending}
                              className="h-7 gap-1 text-xs"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              {t.receiveTransfer}
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
