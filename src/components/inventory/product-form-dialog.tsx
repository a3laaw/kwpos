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
import { Loader2, Wand2, Tags } from "lucide-react"
import { ImageUpload } from "@/components/shared/image-upload"
import {
  useCategories,
  useCreateProduct,
  useSuppliers,
  useUpdateProduct,
  useUnits,
  useWarehouses,
} from "@/hooks/use-api"
import type { Product } from "@/lib/types"
import { useFmt } from "@/components/currency-context"
import { useT } from "@/components/i18n-context"
import { useUser } from "@/components/user-context"
import { useAppStore } from "@/lib/store"

interface ProductFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
}

interface FormState {
  name: string
  barcode: string
  categoryId: string
  supplierId: string
  quantity: string
  reorderLevel: string
  optimalOrderQty: string
  defaultSupplierId: string
  costPrice: string
  salePrice: string
  wholesalePrice: string
  corporatePrice: string
  unit: string
  imageUrl: string
}

const empty: FormState = {
  name: "",
  barcode: "",
  categoryId: "",
  supplierId: "",
  quantity: "",
  reorderLevel: "",
  optimalOrderQty: "",
  defaultSupplierId: "",
  costPrice: "",
  salePrice: "",
  wholesalePrice: "",
  corporatePrice: "",
  unit: "قطعة",
  imageUrl: "",
}

export function ProductFormDialog({ open, onOpenChange, product }: ProductFormDialogProps) {
  const isEdit = !!product
  const fmt = useFmt()
  const t = useT()
  const user = useUser()
  const setView = useAppStore((s) => s.setView)
  // Only ADMIN can edit sale prices directly from the product form. The
  // primary path for sale-price changes is the Pricing Engine screen —
  // this gate keeps the audit trail centralised. costPrice remains editable
  // for ADMIN (it's a cost, not a sale price). WAREHOUSE users can edit
  // costPrice too (they manage receiving/inventory valuation), but never
  // sale prices.
  const isAdmin = user.role === "ADMIN"
  const salePricesLocked = !isAdmin
  const [form, setForm] = React.useState<FormState>(empty)
  const [stockByWh, setStockByWh] = React.useState<Record<string, string>>({})
  const [barcodeLoading, setBarcodeLoading] = React.useState(false)
  const { data: cats } = useCategories()
  const { data: sups } = useSuppliers()
  const { data: units } = useUnits()
  const { data: whs } = useWarehouses()
  const createMut = useCreateProduct()
  const updateMut = useUpdateProduct(product?.id ?? "")

  React.useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        barcode: product.barcode ?? "",
        categoryId: product.categoryId ?? "",
        supplierId: product.supplierId ?? "",
        quantity: String(product.quantity),
        reorderLevel: String(product.reorderLevel),
        optimalOrderQty: product.optimalOrderQty ? String(product.optimalOrderQty) : "",
        defaultSupplierId: product.defaultSupplierId ?? "",
        costPrice: String(product.costPrice),
        salePrice: String(product.salePrice),
        wholesalePrice: String(product.wholesalePrice ?? 0),
        corporatePrice: String(product.corporatePrice ?? 0),
        unit: product.unit,
        imageUrl: product.imageUrl ?? "",
      })
      // populate warehouse stock
      const m: Record<string, string> = {}
      for (const s of product.stockByWarehouse ?? []) m[s.warehouseId] = String(s.quantity)
      setStockByWh(m)
    } else {
      setForm(empty)
      setStockByWh({})
    }
  }, [product, open])

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const margin =
    Number(form.costPrice) > 0
      ? (((Number(form.salePrice) - Number(form.costPrice)) / Number(form.costPrice)) * 100).toFixed(1)
      : "0"

  const warehouses = whs?.items ?? []
  const stockTotal = Object.values(stockByWh).reduce((a, b) => a + (Number(b) || 0), 0)

  // Auto-generate a barcode using the selected category's short code + per-
  // category sequence. Only runs on explicit user click — never auto-fills.
  async function handleGenerateBarcode() {
    if (!form.categoryId) {
      toast.error(t.selectCategoryFirst)
      return
    }
    setBarcodeLoading(true)
    try {
      const res = await fetch(
        `/api/products/generate-barcode?categoryId=${encodeURIComponent(form.categoryId)}`,
        { headers: { Accept: "application/json" } }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((data as any)?.error || `request-failed:${res.status}`)
      }
      const barcode = (data as any)?.barcode
      if (typeof barcode === "string" && barcode) {
        set("barcode", barcode)
        toast.success(t.barcodeGenerated, { description: barcode })
      }
    } catch (err: any) {
      toast.error(t.barcodeGenerateFailed, { description: err?.message })
    } finally {
      setBarcodeLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error(t.productNameRequired)
      return
    }
    const warehouseStock = Object.entries(stockByWh)
      .filter(([, q]) => Number(q) > 0)
      .map(([warehouseId, q]) => ({ warehouseId, quantity: Number(q) }))
    const payload = {
      name: form.name.trim(),
      barcode: form.barcode.trim() || null,
      categoryId: form.categoryId || null,
      supplierId: form.supplierId || null,
      quantity: Number(form.quantity) || 0,
      reorderLevel: Number(form.reorderLevel) || 0,
      optimalOrderQty: Number(form.optimalOrderQty) || 0,
      defaultSupplierId: form.defaultSupplierId || null,
      costPrice: Number(form.costPrice) || 0,
      salePrice: Number(form.salePrice) || 0,
      wholesalePrice: Number(form.wholesalePrice) || 0,
      corporatePrice: Number(form.corporatePrice) || 0,
      unit: form.unit.trim() || "قطعة",
      imageUrl: form.imageUrl.trim() || null,
      warehouseStock,
    }
    try {
      if (isEdit) {
        await updateMut.mutateAsync(payload)
        toast.success(t.productUpdated)
      } else {
        await createMut.mutateAsync(payload)
        toast.success(t.productAdded)
      }
      onOpenChange(false)
    } catch (err: any) {
      toast.error(t.saveFailed, { description: err?.message })
    }
  }

  const loading = createMut.isPending || updateMut.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>{isEdit ? t.editProduct : t.addProductNew}</DialogTitle>
          <DialogDescription>
            {isEdit ? t.editProductDesc : t.addProductDesc}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <ImageUpload
            value={form.imageUrl}
            onChange={(url) => setForm((f) => ({ ...f, imageUrl: url ?? "" }))}
            label={t.productImage}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="p-name">{t.productName} *</Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder={t.productNamePlaceholder}
                autoFocus
              />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="p-barcode">{t.barcode}</Label>
              <div className="flex gap-2">
                <Input
                  id="p-barcode"
                  dir="ltr"
                  value={form.barcode}
                  onChange={(e) => set("barcode", e.target.value)}
                  placeholder={t.barcodePlaceholder}
                  className="text-left flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateBarcode}
                  disabled={barcodeLoading || !form.categoryId}
                  className="shrink-0 gap-1.5"
                  title={form.categoryId ? t.autoGenerateBarcodeTitle : t.selectCategoryFirst}
                >
                  {barcodeLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">{t.autoGenerate}</span>
                </Button>
              </div>
              {!form.categoryId ? (
                <p className="text-[11px] text-muted-foreground">{t.selectCategoryForAutoHint}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>{t.unit}</Label>
              <Select value={form.unit} onValueChange={(v) => set("unit", v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t.selectUnit} />
                </SelectTrigger>
                <SelectContent>
                  {(units?.items ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.unit && !(units?.items ?? []).some((u) => u.name === form.unit) ? (
                <p className="text-xs text-amber-600">{t.unitNotInList.replace("{unit}", form.unit)}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>{t.category}</Label>
              <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t.selectCategory} />
                </SelectTrigger>
                <SelectContent>
                  {(cats?.items ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.supplier}</Label>
              <Select value={form.supplierId} onValueChange={(v) => set("supplierId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t.selectSupplier} />
                </SelectTrigger>
                <SelectContent>
                  {(sups?.items ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-qty">{t.totalQtyLabel}</Label>
              <Input
                id="p-qty"
                type="number"
                min={0}
                value={form.quantity}
                onChange={(e) => set("quantity", e.target.value)}
                className={stockTotal > 0 && stockTotal !== Number(form.quantity) ? "border-amber-500" : ""}
              />
              {stockTotal > 0 && stockTotal !== Number(form.quantity) ? (
                <p className="text-xs text-amber-600">{t.warehouseStockSum.replace("{total}", String(stockTotal))}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-reorder">{t.reorderLevel}</Label>
              <Input
                id="p-reorder"
                type="number"
                min={0}
                value={form.reorderLevel}
                onChange={(e) => set("reorderLevel", e.target.value)}
                placeholder="5"
              />
            </div>

            {/* Reorder planning — optimal qty + preferred supplier (for auto-PO) */}
            <div className="space-y-2">
              <Label htmlFor="p-opt" className="flex items-center justify-between">
                <span>{t.optimalOrderQty}</span>
                <span className="text-[10px] text-muted-foreground">{t.optimalOrderQtyHint}</span>
              </Label>
              <Input
                id="p-opt"
                type="number"
                min={0}
                value={form.optimalOrderQty}
                onChange={(e) => set("optimalOrderQty", e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.defaultSupplier}</Label>
              <Select
                value={form.defaultSupplierId}
                onValueChange={(v) => set("defaultSupplierId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.selectDefaultSupplier} />
                </SelectTrigger>
                <SelectContent>
                  {(sups?.items ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">{t.defaultSupplierHint}</p>
            </div>

            {/* Warehouse stock distribution */}
            {warehouses.length > 0 ? (
              <div className="sm:col-span-2 space-y-2">
                <Label className="text-xs">{t.distributeQtyAcrossWarehouses}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-border/60 bg-muted/20 p-3">
                  {warehouses.map((w) => (
                    <div key={w.id} className="flex items-center gap-2">
                      <span className="flex-1 min-w-0 text-sm truncate">
                        <span className="font-medium">{w.name}</span>
                        {w.code ? <span className="text-xs text-muted-foreground font-mono" dir="ltr"> {w.code}</span> : null}
                      </span>
                      <Input
                        type="number"
                        min={0}
                        value={stockByWh[w.id] ?? ""}
                        onChange={(e) => setStockByWh((s) => ({ ...s, [w.id]: e.target.value }))}
                        className="h-8 w-24 tabular-nums"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {t.totalAcrossWarehouses}: <strong className="tabular-nums">{stockTotal}</strong>
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="p-cost">{t.costPrice} ({fmt.symbol})</Label>
              <Input
                id="p-cost"
                type="number"
                min={0}
                step="0.01"
                value={form.costPrice}
                onChange={(e) => set("costPrice", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-sale">{t.salePrice} ({fmt.symbol})</Label>
              <Input
                id="p-sale"
                type="number"
                min={0}
                step="0.001"
                inputMode="decimal"
                value={form.salePrice}
                onChange={(e) => set("salePrice", e.target.value)}
                disabled={salePricesLocked}
                className={salePricesLocked ? "opacity-70 cursor-not-allowed" : ""}
                title={salePricesLocked ? t.salePriceEditLockedTitle : undefined}
              />
            </div>
          </div>

          {/* Multi-tier pricing — wholesale + corporate (optional, 0 = use retail) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="p-wholesale" className="flex items-center gap-1">
                <span>{t.wholesalePrice}</span>
                <span className="text-[10px] text-muted-foreground">{t.zeroMeansRetail}</span>
              </Label>
              <Input
                id="p-wholesale"
                type="number"
                min={0}
                step="0.001"
                inputMode="decimal"
                value={form.wholesalePrice}
                onChange={(e) => set("wholesalePrice", e.target.value)}
                disabled={salePricesLocked}
                className={salePricesLocked ? "opacity-70 cursor-not-allowed" : ""}
                title={salePricesLocked ? t.salePriceEditLockedTitle : undefined}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-corporate" className="flex items-center gap-1">
                <span>{t.corporatePrice}</span>
                <span className="text-[10px] text-muted-foreground">{t.zeroMeansRetail}</span>
              </Label>
              <Input
                id="p-corporate"
                type="number"
                min={0}
                step="0.001"
                inputMode="decimal"
                value={form.corporatePrice}
                onChange={(e) => set("corporatePrice", e.target.value)}
                disabled={salePricesLocked}
                className={salePricesLocked ? "opacity-70 cursor-not-allowed" : ""}
                title={salePricesLocked ? t.salePriceEditLockedTitle : undefined}
              />
            </div>
          </div>

          {/* Pricing-engine redirect hint — shown whenever the sale-price
              fields are locked (non-ADMIN) OR for ADMIN as a discoverability
              nudge toward the dedicated pricing screen. */}
          <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 border border-border/60 px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Tags className="h-3.5 w-3.5 shrink-0" />
              <span>{t.editSalePricesInPricing}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => {
                onOpenChange(false)
                setView("pricing")
              }}
            >
              <Tags className="h-3 w-3" />
              {t.openPricingScreen}
            </Button>
          </div>

          {Number(form.costPrice) > 0 && Number(form.salePrice) > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">{t.estimatedProfitMargin}</span>
              <span
                className={`font-semibold ${
                  Number(margin) >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {margin}%
              </span>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              {t.cancel}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEdit ? t.saveChanges : t.addProductButton}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
