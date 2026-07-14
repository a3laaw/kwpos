"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import { Separator } from "@/components/ui/separator"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Plus, Trash2, Loader2, ShoppingCart, ChevronDown, Truck, Tags } from "lucide-react"
import { useSuppliers, useProducts, useCategories, useCreatePurchaseOrder } from "@/hooks/use-api"
import { useFmt } from "@/components/currency-context"
import { useT } from "@/components/i18n-context"

interface LineItem {
  key: string
  productId: string
  quantity: string
  unitCost: string
  suggestedSalePrice: string
}

let keySeq = 0
const makeKey = () => `row-${++keySeq}`

export function PurchaseOrderDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const fmt = useFmt()
  const t = useT()
  const { data: sups } = useSuppliers()
  const { data: prods } = useProducts()
  const { data: catsData } = useCategories()
  const createMut = useCreatePurchaseOrder()

  // Cascading category filter — when set, the product dropdown shows ONLY
  // products in that category. "all" (default) shows every product.
  const [categoryFilter, setCategoryFilter] = React.useState("all")

  const [supplierId, setSupplierId] = React.useState("")
  const [note, setNote] = React.useState("")
  const [items, setItems] = React.useState<LineItem[]>([
    { key: makeKey(), productId: "", quantity: "1", unitCost: "0", suggestedSalePrice: "" },
  ])
  React.useEffect(() => {
    if (open) {
      setSupplierId("")
      setNote("")
      setItems([{ key: makeKey(), productId: "", quantity: "1", unitCost: "0", suggestedSalePrice: "" }])
    }
  }, [open])

  const products = prods?.items ?? []
  const suppliers = sups?.items ?? []
  const categories = catsData?.items ?? []
  // Apply the cascading category filter to the product list shown in the
  // dropdown. Products already selected on existing rows are always visible
  // (so the user can still see/edit them) even if they don't match the
  // current filter.
  const selectedProductIds = new Set(items.map((it) => it.productId).filter(Boolean))
  const filteredProducts = products.filter(
    (p) => categoryFilter === "all" || p.categoryId === categoryFilter || selectedProductIds.has(p.id)
  )

  // Pre-compute Combobox option lists (high-volume selectors).
  const supplierOptions = React.useMemo<ComboboxOption[]>(
    () => suppliers.map((s) => ({ value: s.id, label: s.name })),
    [suppliers]
  )
  const productOptions = React.useMemo<ComboboxOption[]>(
    () => filteredProducts.map((p) => ({ value: p.id, label: p.name })),
    [filteredProducts]
  )

  function updateItem(key: string, patch: Partial<LineItem>) {
    setItems((arr) =>
      arr.map((it) => (it.key === key ? { ...it, ...patch } : it))
    )
  }
  // when product selected, prefill unitCost from its cost price and the
  // suggested sale price from its current salePrice (so the manager can
  // tweak rather than re-type).
  function selectProduct(key: string, productId: string) {
    const p = products.find((x) => x.id === productId)
    updateItem(key, {
      productId,
      unitCost: p ? String(p.costPrice) : "0",
      suggestedSalePrice: p ? String(p.salePrice) : "",
    })
  }
  function addRow() {
    setItems((arr) => [...arr, { key: makeKey(), productId: "", quantity: "1", unitCost: "0", suggestedSalePrice: "" }])
  }
  function removeRow(key: string) {
    setItems((arr) => (arr.length > 1 ? arr.filter((it) => it.key !== key) : arr))
  }

  const total = items.reduce((acc, it) => {
    if (!it.productId) return acc
    return acc + (Number(it.quantity) || 0) * (Number(it.unitCost) || 0)
  }, 0)

  const validItems = items.filter((it) => it.productId && Number(it.quantity) > 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supplierId) {
      toast.error(t.selectSupplierFirst)
      return
    }
    if (validItems.length === 0) {
      toast.error(t.addAtLeastOneProduct)
      return
    }
    try {
      await createMut.mutateAsync({
        supplierId,
        note: note.trim() || undefined,
        items: validItems.map((it) => ({
          productId: it.productId,
          quantity: Number(it.quantity),
          unitCost: Number(it.unitCost),
          suggestedSalePrice: it.suggestedSalePrice ? Number(it.suggestedSalePrice) : 0,
        })),
      })
      toast.success(t.poCreated)
      onOpenChange(false)
    } catch (err: any) {
      toast.error(t.poCreateFailed, { description: err?.message })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            {t.newPurchaseOrder}
          </DialogTitle>
          <DialogDescription>
            {t.newPoDescLong}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t.supplier} *</Label>
              <Combobox
                value={supplierId}
                onValueChange={setSupplierId}
                placeholder={t.selectSupplier}
                searchPlaceholder={t.selectSupplier}
                options={supplierOptions}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="po-note">{t.note}</Label>
              <Input
                id="po-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t.optional}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label>{t.poProducts}</Label>
              <div className="flex items-center gap-2">
                {/* Cascading category filter — restricts the product dropdown */}
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-8 w-44 text-xs">
                    <Tags className="h-3 w-3 text-muted-foreground ms-1 me-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allCategories}</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  {t.addLine}
                </Button>
              </div>
            </div>

            <div className="space-y-2 max-h-[44vh] overflow-y-auto scrollbar-thin pl-1">
              {items.map((it) => {
                const subtotal = (Number(it.quantity) || 0) * (Number(it.unitCost) || 0)
                return (
                  <div
                    key={it.key}
                    className="rounded-lg border border-border/60 bg-muted/20 p-2 space-y-2"
                  >
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-12 sm:col-span-6 space-y-1">
                        <Label className="text-xs text-muted-foreground">{t.product}</Label>
                        <Combobox
                          value={it.productId}
                          onValueChange={(v) => selectProduct(it.key, v)}
                          placeholder={t.selectProduct}
                          searchPlaceholder={t.selectProduct}
                          className="h-9"
                          options={productOptions}
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2 space-y-1">
                        <Label className="text-xs text-muted-foreground">{t.qty}</Label>
                        <Input
                          type="number"
                          min={1}
                          className="h-9"
                          value={it.quantity}
                          onChange={(e) => updateItem(it.key, { quantity: e.target.value })}
                        />
                      </div>
                      <div className="col-span-5 sm:col-span-2 space-y-1">
                        <Label className="text-xs text-muted-foreground">{t.unitPrice}</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.001"
                          inputMode="decimal"
                          className="h-9"
                          value={it.unitCost}
                          onChange={(e) => updateItem(it.key, { unitCost: e.target.value })}
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1 text-center">
                        <p className="text-xs text-muted-foreground mb-1.5">{t.colTotal}</p>
                        <p className="text-xs font-semibold tabular-nums">
                          {fmt.currency(subtotal)}
                        </p>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-destructive hover:text-destructive"
                          onClick={() => removeRow(it.key)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {/* Suggested sale price — optional. When set (> 0) and
                        different from the product's current salePrice, the
                        receive flow writes a PriceChange audit row + updates
                        the product's salePrice via the pricing engine. */}
                    <div className="grid grid-cols-12 gap-2 items-center pt-1 border-t border-border/40">
                      <div className="col-span-12 sm:col-span-6 sm:col-start-7 space-y-1">
                        <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Tags className="h-3 w-3" />
                          {t.suggestedSalePriceHint.replace("{symbol}", fmt.symbol)}
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.001"
                          inputMode="decimal"
                          className="h-8 text-xs"
                          placeholder={t.emptyMeansNoChangeInput}
                          value={it.suggestedSalePrice}
                          onChange={(e) => updateItem(it.key, { suggestedSalePrice: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="space-y-2 rounded-lg bg-primary/5 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t.grandTotalLong}</span>
              <span className="text-lg font-bold tabular-nums text-primary">
                {fmt.currency(total)}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={createMut.isPending}>
              {t.cancel}
            </Button>
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t.createOrder}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
