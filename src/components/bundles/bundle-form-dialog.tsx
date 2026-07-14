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
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import { Loader2, Plus, Trash2, Package, TrendingDown, TrendingUp, Percent } from "lucide-react"
import { ImageUpload } from "@/components/shared/image-upload"
import { useProducts } from "@/hooks/use-api"
import {
  useCreateBundle,
  useUpdateBundle,
  type BundleItemInput,
} from "@/hooks/use-bundles"
import type { Bundle, Product } from "@/lib/types"
import { useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"

interface BundleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bundle?: Bundle | null
}

interface FormState {
  name: string
  description: string
  imageUrl: string
  salePrice: string
  isActive: boolean
  startDate: string
  endDate: string
  category: string
}

const empty: FormState = {
  name: "",
  description: "",
  imageUrl: "",
  salePrice: "",
  isActive: true,
  startDate: "",
  endDate: "",
  category: "",
}

/** Convert an ISO date string to a `yyyy-MM-dd` value usable in <input type="date">. */
function toDateInputValue(iso?: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  // Format as yyyy-MM-dd using local time to avoid timezone drift.
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

interface ItemRow {
  productId: string
  quantity: number
  /** Snapshot of product info for display + live cost math. */
  product?: Product
}

export function BundleFormDialog({ open, onOpenChange, bundle }: BundleFormDialogProps) {
  const isEdit = !!bundle
  const t = useT()
  const fmt = useFmt()
  const [form, setForm] = React.useState<FormState>(empty)
  const [items, setItems] = React.useState<ItemRow[]>([])
  const [productSearch, setProductSearch] = React.useState("")
  const [selectedProductId, setSelectedProductId] = React.useState<string>("")

  const createMut = useCreateBundle()
  const updateMut = useUpdateBundle(bundle?.id ?? "")

  // Search products by name. Limit to a reasonable page size.
  const { data: productsData, isLoading: productsLoading } = useProducts(
    productSearch ? { q: productSearch } : undefined
  )
  const productOptions = productsData?.items ?? []

  // Combobox options for the bundle-item product selector — excludes
  // products already added as bundle items.
  const bundleProductComboboxOptions = React.useMemo<ComboboxOption[]>(
    () =>
      productOptions
        .filter((p) => !items.some((it) => it.productId === p.id))
        .map((p) => ({
          value: p.id,
          label: `${p.name} (${fmt.currency(p.salePrice)})`,
        })),
    [productOptions, items, fmt]
  )

  // Hydrate the form when opening / when the target bundle changes.
  React.useEffect(() => {
    if (bundle) {
      setForm({
        name: bundle.name,
        description: bundle.description ?? "",
        imageUrl: bundle.imageUrl ?? "",
        salePrice: String(bundle.salePrice ?? ""),
        isActive: bundle.isActive,
        startDate: toDateInputValue(bundle.startDate),
        endDate: toDateInputValue(bundle.endDate),
        category: bundle.category ?? "",
      })
      setItems(
        (bundle.items ?? []).map((it) => ({
          productId: it.productId,
          quantity: Number(it.quantity ?? 0),
          product: it.product,
        }))
      )
    } else {
      setForm(empty)
      setItems([])
    }
    setProductSearch("")
    setSelectedProductId("")
  }, [bundle, open])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  /* ----------------------------- item actions ---------------------------- */
  function addSelectedItem() {
    if (!selectedProductId) {
      toast.error(t.bundleSelectProduct)
      return
    }
    if (items.some((it) => it.productId === selectedProductId)) {
      toast.error(t.bundleSelectProduct)
      return
    }
    const prod = productOptions.find((p) => p.id === selectedProductId)
    setItems((prev) => [
      ...prev,
      { productId: selectedProductId, quantity: 1, product: prod },
    ])
    setSelectedProductId("")
    setProductSearch("")
  }

  function updateItemQty(productId: string, qty: number) {
    setItems((prev) =>
      prev.map((it) =>
        it.productId === productId ? { ...it, quantity: Math.max(0, qty) } : it
      )
    )
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((it) => it.productId !== productId))
  }

  /* --------------------------- live cost summary ------------------------- */
  const salePriceNum = Number(form.salePrice) || 0
  const totals = React.useMemo(() => {
    const totalCost = items.reduce(
      (sum, it) => sum + Number(it.product?.costPrice ?? 0) * Number(it.quantity ?? 0),
      0
    )
    const retailTotal = items.reduce(
      (sum, it) => sum + Number(it.product?.salePrice ?? 0) * Number(it.quantity ?? 0),
      0
    )
    const profit = salePriceNum - totalCost
    const discountPct =
      retailTotal > 0 ? ((retailTotal - salePriceNum) / retailTotal) * 100 : 0
    return { totalCost, retailTotal, profit, discountPct }
  }, [items, salePriceNum])

  /* ------------------------------- submit -------------------------------- */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error(t.bundleName)
      return
    }
    if (salePriceNum <= 0) {
      toast.error(t.bundleSalePrice)
      return
    }
    const cleanItems: BundleItemInput[] = items
      .filter((it) => it.productId && it.quantity > 0)
      .map((it) => ({ productId: it.productId, quantity: Number(it.quantity) }))
    if (cleanItems.length === 0) {
      toast.error(t.bundleNoItems)
      return
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      salePrice: salePriceNum,
      isActive: form.isActive,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
      category: form.category.trim() || null,
      items: cleanItems,
    }

    try {
      if (isEdit) {
        await updateMut.mutateAsync(payload)
      } else {
        await createMut.mutateAsync(payload)
      }
      toast.success(t.bundleSaveSuccess)
      onOpenChange(false)
    } catch (err: any) {
      const code = err?.message
      const desc =
        code === "name-exists"
          ? t.bundleName
          : code === "items-required"
            ? t.bundleNoItems
            : code
      toast.error(t.saveFailed, { description: desc })
    }
  }

  const loading = createMut.isPending || updateMut.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>{isEdit ? t.bundleEditTitle : t.bundleAddNew}</DialogTitle>
          <DialogDescription>{t.bundlesDesc}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Image + name */}
          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-start">
            <ImageUpload
              value={form.imageUrl || null}
              onChange={(url) => set("imageUrl", url ?? "")}
              label={t.bundleName}
            />
            <div className="space-y-4 w-full">
              <div className="space-y-2">
                <Label htmlFor="b-name">{t.bundleName} *</Label>
                <Input
                  id="b-name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder={t.bundleNamePlaceholder}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="b-category">{t.bundleCategory}</Label>
                <Input
                  id="b-category"
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                  placeholder={t.bundleCategory}
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="b-desc">{t.bundleDescription}</Label>
            <Textarea
              id="b-desc"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder={t.bundleDescription}
              rows={2}
            />
          </div>

          {/* Price + active + dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="b-price">{t.bundleSalePrice} *</Label>
              <Input
                id="b-price"
                dir="ltr"
                type="number"
                min="0"
                step="0.01"
                value={form.salePrice}
                onChange={(e) => set("salePrice", e.target.value)}
                placeholder="0.00"
                className="text-end"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="b-start">{t.bundleStartDate}</Label>
              <Input
                id="b-start"
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="b-end">{t.bundleEndDate}</Label>
              <Input
                id="b-end"
                type="date"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 pt-7">
              <Checkbox
                id="b-active"
                checked={form.isActive}
                onCheckedChange={(v) => set("isActive", v === true)}
              />
              <Label htmlFor="b-active" className="cursor-pointer">
                {t.bundleIsActive}
              </Label>
            </div>
          </div>

          {/* Items section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-base font-semibold">{t.bundleItems}</Label>
              <span className="text-xs text-muted-foreground">
                {items.length} {t.bundleItems}
              </span>
            </div>

            {/* Add product row */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder={t.bundleSearchPlaceholder}
                className="sm:max-w-[40%]"
              />
              <Combobox
                value={selectedProductId}
                onValueChange={(v) => setSelectedProductId(v)}
                placeholder={t.bundleSelectProduct}
                searchPlaceholder={t.bundleSelectProduct}
                disabled={productsLoading}
                className="flex-1"
                options={bundleProductComboboxOptions}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={addSelectedItem}
                disabled={!selectedProductId}
                className="gap-2 shrink-0"
              >
                <Plus className="h-4 w-4" />
                {t.bundleAddItem}
              </Button>
            </div>

            {/* Items list */}
            {items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                {t.bundleNoItems}
              </div>
            ) : (
              <div className="rounded-lg border border-border/70 divide-y divide-border/70 max-h-72 overflow-y-auto">
                {items.map((it) => {
                  const unitCost = Number(it.product?.costPrice ?? 0)
                  const unitSale = Number(it.product?.salePrice ?? 0)
                  const lineCost = unitCost * it.quantity
                  const lineSale = unitSale * it.quantity
                  return (
                    <div
                      key={it.productId}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Package className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {it.product?.name ?? it.productId}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {t.bundleTotalCost}: {fmt.currency(unitCost)} × {it.quantity} ={" "}
                          <span className="font-medium">{fmt.currency(lineCost)}</span>
                          {" · "}
                          {t.bundleRetailTotal}: {fmt.currency(lineSale)}
                        </p>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={String(it.quantity)}
                        onChange={(e) =>
                          updateItemQty(it.productId, Number(e.target.value) || 0)
                        }
                        className="h-8 w-20 text-end"
                        aria-label={t.bundleQuantity}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => removeItem(it.productId)}
                        aria-label={t.bundleRemoveItem}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Live cost summary */}
            {items.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-lg bg-muted/40 border border-border/60 p-4">
                <SummaryCell
                  icon={<TrendingDown className="h-3.5 w-3.5" />}
                  label={t.bundleTotalCost}
                  value={fmt.currency(totals.totalCost)}
                  tone="muted"
                />
                <SummaryCell
                  icon={<Package className="h-3.5 w-3.5" />}
                  label={t.bundleRetailTotal}
                  value={fmt.currency(totals.retailTotal)}
                  tone="muted"
                />
                <SummaryCell
                  icon={<TrendingUp className="h-3.5 w-3.5" />}
                  label={t.bundleProfit}
                  value={fmt.currency(totals.profit)}
                  tone={totals.profit >= 0 ? "good" : "bad"}
                />
                <SummaryCell
                  icon={<Percent className="h-3.5 w-3.5" />}
                  label={t.bundleDiscountPct}
                  value={`${totals.discountPct.toFixed(1)}%`}
                  tone={totals.discountPct >= 0 ? "good" : "bad"}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t.cancel}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEdit ? t.save : t.add}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------ helpers ------------------------------- */

function SummaryCell({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone: "muted" | "good" | "bad"
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "bad"
        ? "text-rose-600 dark:text-rose-400"
        : "text-foreground"
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className={`text-sm font-semibold ${toneClass}`}>{value}</span>
    </div>
  )
}
