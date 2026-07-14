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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import {
  Loader2,
  Plus,
  Trash2,
  Package,
  TrendingDown,
  Calculator,
} from "lucide-react"
import { ImageUpload } from "@/components/shared/image-upload"
import { useProducts, useUnits } from "@/hooks/use-api"
import {
  useCreateComposition,
  useUpdateComposition,
  type CompositionIngredientInput,
} from "@/hooks/use-compositions"
import type { Composition, Product } from "@/lib/types"
import { useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"

interface CompositionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  composition?: Composition | null
}

interface FormState {
  name: string
  description: string
  imageUrl: string
  outputProductId: string
  createNewProduct: boolean
  profitAmount: string // fixed profit amount in currency (added to costPrice)
  yieldQty: string
  yieldUnit: string
  isActive: boolean
  notes: string
}

const empty: FormState = {
  name: "",
  description: "",
  imageUrl: "",
  outputProductId: "",
  createNewProduct: true, // default: create a new product (factory model)
  profitAmount: "0", // default: no profit (salePrice = costPrice)
  yieldQty: "1",
  yieldUnit: "قطعة",
  isActive: true,
  notes: "",
}

interface IngredientRow {
  productId: string
  quantity: number
  unit: string
  notes: string
  /** Snapshot of product info for display + live cost math. */
  product?: Product
}

const DEFAULT_UNITS = ["جرام", "مل", "قطعة", "كيلو", "لتر"]

export function CompositionFormDialog({
  open,
  onOpenChange,
  composition,
}: CompositionFormDialogProps) {
  const isEdit = !!composition
  const t = useT()
  const fmt = useFmt()
  const [form, setForm] = React.useState<FormState>(empty)
  const [ingredients, setIngredients] = React.useState<IngredientRow[]>([])
  const [productSearch, setProductSearch] = React.useState("")
  const [selectedProductId, setSelectedProductId] = React.useState<string>("")

  const createMut = useCreateComposition()
  const updateMut = useUpdateComposition(composition?.id ?? "")

  // Search products by name (used both for output product select + ingredients).
  const { data: productsData, isLoading: productsLoading } = useProducts(
    productSearch ? { q: productSearch } : undefined
  )
  const productOptions = productsData?.items ?? []
  // Load units from Settings → Units (like the product form does).
  const { data: unitsData } = useUnits()
  const units = unitsData?.items ?? []

  // Combobox options for the output product selector — excludes products
  // already added as ingredients.
  const outputProductComboboxOptions = React.useMemo<ComboboxOption[]>(
    () =>
      productOptions
        .filter((p) => !ingredients.some((it) => it.productId === p.id))
        .map((p) => ({
          value: p.id,
          label: `${p.name} (${fmt.currency(p.salePrice)})`,
        })),
    [productOptions, ingredients, fmt]
  )

  // Combobox options for the ingredient selector — excludes products already
  // added as ingredients AND the output product.
  const ingredientComboboxOptions = React.useMemo<ComboboxOption[]>(
    () =>
      productOptions
        .filter(
          (p) =>
            !ingredients.some((it) => it.productId === p.id) &&
            p.id !== form.outputProductId
        )
        .map((p) => ({
          value: p.id,
          label: `${p.name} (${fmt.currency(p.costPrice)})`,
        })),
    [productOptions, ingredients, form.outputProductId, fmt]
  )

  // Hydrate the form when opening / when the target composition changes.
  React.useEffect(() => {
    if (composition) {
      setForm({
        name: composition.name,
        description: composition.description ?? "",
        imageUrl: composition.imageUrl ?? "",
        outputProductId: composition.outputProductId,
        createNewProduct: false, // editing existing — don't create new product
        profitAmount: "0",
        yieldQty: String(composition.yieldQty ?? 1),
        yieldUnit: composition.yieldUnit ?? "قطعة",
        isActive: composition.isActive,
        notes: composition.notes ?? "",
      })
      setIngredients(
        (composition.ingredients ?? []).map((ing) => ({
          productId: ing.productId,
          quantity: Number(ing.quantity ?? 0),
          unit: String(ing.unit ?? "جرام"),
          notes: ing.notes ?? "",
          product: ing.product,
        }))
      )
    } else {
      setForm(empty)
      setIngredients([])
    }
    setProductSearch("")
    setSelectedProductId("")
  }, [composition, open])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  /* --------------------------- ingredient actions ------------------------- */
  function addSelectedIngredient() {
    if (!selectedProductId) {
      toast.error(t.compSelectIngredient)
      return
    }
    if (ingredients.some((it) => it.productId === selectedProductId)) {
      toast.error(t.compSelectIngredient)
      return
    }
    if (selectedProductId === form.outputProductId) {
      toast.error(t.compSelectIngredient)
      return
    }
    const prod = productOptions.find((p) => p.id === selectedProductId)
    setIngredients((prev) => [
      ...prev,
      {
        productId: selectedProductId,
        quantity: 1,
        unit: prod?.unit ?? "جرام",
        notes: "",
        product: prod,
      },
    ])
    setSelectedProductId("")
    setProductSearch("")
  }

  function updateIngredient(
    productId: string,
    patch: Partial<IngredientRow>
  ) {
    setIngredients((prev) =>
      prev.map((it) => (it.productId === productId ? { ...it, ...patch } : it))
    )
  }

  function removeIngredient(productId: string) {
    setIngredients((prev) => prev.filter((it) => it.productId !== productId))
  }

  /* --------------------------- live cost summary ------------------------- */
  const yieldQtyNum = Math.max(0, Number(form.yieldQty) || 0)
  const totals = React.useMemo(() => {
    const costPerBatch = ingredients.reduce(
      (sum, it) =>
        sum + Number(it.product?.costPrice ?? 0) * Number(it.quantity ?? 0),
      0
    )
    const costPerUnit = yieldQtyNum > 0 ? costPerBatch / yieldQtyNum : 0
    return { costPerBatch, costPerUnit }
  }, [ingredients, yieldQtyNum])

  /* ------------------------------- submit -------------------------------- */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error(t.compName)
      return
    }
    // Output product is required UNLESS we're creating a new one.
    if (!form.createNewProduct && !form.outputProductId) {
      toast.error(t.compOutputProduct)
      return
    }
    if (yieldQtyNum <= 0) {
      toast.error(t.compYieldQty)
      return
    }
    const cleanIngredients: CompositionIngredientInput[] = ingredients
      .filter((it) => it.productId && it.quantity > 0)
      .map((it) => ({
        productId: it.productId,
        quantity: Number(it.quantity),
        unit: it.unit.trim() || "جرام",
        notes: it.notes.trim() || null,
      }))
    if (cleanIngredients.length === 0) {
      toast.error(t.compNoIngredients)
      return
    }
    // An ingredient can't also be the output product (only when using existing).
    if (!form.createNewProduct && cleanIngredients.some((it) => it.productId === form.outputProductId)) {
      toast.error(t.compOutputProduct)
      return
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      outputProductId: form.outputProductId || undefined,
      createNewProduct: !isEdit && form.createNewProduct, // only on create
      profitAmount: Number(form.profitAmount) || 0,
      yieldQty: 1, // simplified: always 1 unit per recipe (no batch concept)
      yieldUnit: form.yieldUnit.trim() || "قطعة",
      isActive: form.isActive,
      notes: form.notes.trim() || null,
      ingredients: cleanIngredients,
    }

    try {
      if (isEdit) {
        await updateMut.mutateAsync(payload)
      } else {
        await createMut.mutateAsync(payload)
      }
      toast.success(t.compSaveSuccess)
      onOpenChange(false)
    } catch (err: any) {
      const code = err?.message
      const desc =
        code === "name-exists"
          ? t.compName
          : code === "ingredients-required"
            ? t.compNoIngredients
            : code === "output-product-required"
              ? t.compOutputProduct
              : code === "yield-required"
                ? t.compYieldQty
                : code
      toast.error(t.saveFailed, { description: desc })
    }
  }

  const loading = createMut.isPending || updateMut.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>{isEdit ? t.compEditTitle : t.compAddNew}</DialogTitle>
          <DialogDescription>{t.compositionsDesc}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Image + name */}
          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-start">
            <ImageUpload
              value={form.imageUrl || null}
              onChange={(url) => set("imageUrl", url ?? "")}
              label={t.compName}
            />
            <div className="space-y-4 w-full">
              <div className="space-y-2">
                <Label htmlFor="c-name">{t.compName} *</Label>
                <Input
                  id="c-name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder={t.compNamePlaceholder}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-desc">{t.compDescription}</Label>
                <Textarea
                  id="c-desc"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder={t.compDescription}
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Output product + yield */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="c-output">{t.compOutputProduct} *</Label>
              {/* Toggle: create a new product (factory model) vs use existing */}
              {!isEdit ? (
                <div className="flex gap-2 mb-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={form.createNewProduct ? "default" : "outline"}
                    onClick={() => set("createNewProduct", true)}
                    className="flex-1 gap-1.5"
                  >
                    {t.compCreateNewProduct}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={!form.createNewProduct ? "default" : "outline"}
                    onClick={() => set("createNewProduct", false)}
                    className="flex-1 gap-1.5"
                  >
                    {t.compUseExistingProduct}
                  </Button>
                </div>
              ) : null}
              {form.createNewProduct && !isEdit ? (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {t.compNewProductAutoHint}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">
                        {t.compProfitAmount}
                      </Label>
                      <Input
                        dir="ltr"
                        type="number"
                        min="0"
                        step="0.001"
                        value={form.profitAmount}
                        onChange={(e) => set("profitAmount", e.target.value)}
                        className="text-end h-8"
                      />
                      {/* Auto-calculated percentage display */}
                      {(() => {
                        const amt = Number(form.profitAmount) || 0
                        const cost = totals.costPerUnit
                        const pct = cost > 0 ? (amt / cost) * 100 : 0
                        return (
                          <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                            ≈ {pct.toFixed(1)}% {t.compOfCost}
                          </p>
                        )
                      })()}
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">
                        {t.compAutoSalePrice}
                      </Label>
                      <div className="h-8 flex items-center justify-end px-2 rounded-md bg-muted/50 text-xs tabular-nums">
                        {fmt.currency(
                          totals.costPerUnit + (Number(form.profitAmount) || 0)
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                        {t.compCostPerUnit}: {fmt.currency(totals.costPerUnit)}
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {t.compYieldUnit}: {form.yieldUnit || "قطعة"}
                  </p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                    {t.compStartsWithZeroStock}
                  </p>
                </div>
              ) : (
                <>
                  <Combobox
                    value={form.outputProductId}
                    onValueChange={(v) => set("outputProductId", v)}
                    placeholder={t.compSelectIngredient}
                    searchPlaceholder={t.compSelectIngredient}
                    disabled={productsLoading}
                    options={outputProductComboboxOptions}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {t.compOutputProductHint}
                  </p>
                </>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="c-unit">{t.compYieldUnit}</Label>
                <Select value={form.yieldUnit} onValueChange={(v) => set("yieldUnit", v)}>
                  <SelectTrigger id="c-unit">
                    <SelectValue placeholder={t.selectUnit} />
                  </SelectTrigger>
                  <SelectContent>
                    {units.length === 0 ? (
                      <>
                        {/* Fallback to common defaults if no units defined yet */}
                        <SelectItem value="قطعة">قطعة</SelectItem>
                        <SelectItem value="جرام">جرام</SelectItem>
                        <SelectItem value="كيلو">كيلو</SelectItem>
                        <SelectItem value="مل">مل</SelectItem>
                        <SelectItem value="لتر">لتر</SelectItem>
                      </>
                    ) : (
                      units.map((u) => (
                        <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Notes + active */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-start">
            <div className="space-y-2">
              <Label htmlFor="c-notes">{t.compNotes}</Label>
              <Textarea
                id="c-notes"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder={t.compNotesPlaceholder}
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2 pt-7">
              <Checkbox
                id="c-active"
                checked={form.isActive}
                onCheckedChange={(v) => set("isActive", v === true)}
              />
              <Label htmlFor="c-active" className="cursor-pointer">
                {t.compIsActive}
              </Label>
            </div>
          </div>

          {/* Ingredients section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-base font-semibold">
                {t.compIngredients}
              </Label>
              <span className="text-xs text-muted-foreground">
                {ingredients.length} {t.compIngredients}
              </span>
            </div>

            {/* Add ingredient row */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder={t.compSearchPlaceholder}
                className="sm:max-w-[40%]"
              />
              <Combobox
                value={selectedProductId}
                onValueChange={(v) => setSelectedProductId(v)}
                placeholder={t.compSelectIngredient}
                searchPlaceholder={t.compSelectIngredient}
                disabled={productsLoading}
                className="flex-1"
                options={ingredientComboboxOptions}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={addSelectedIngredient}
                disabled={!selectedProductId}
                className="gap-2 shrink-0"
              >
                <Plus className="h-4 w-4" />
                {t.compAddIngredient}
              </Button>
            </div>

            {/* Ingredients list */}
            {ingredients.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                {t.compNoIngredients}
              </div>
            ) : (
              <div className="rounded-lg border border-border/70 divide-y divide-border/70 max-h-80 overflow-y-auto">
                {ingredients.map((it) => {
                  const unitCost = Number(it.product?.costPrice ?? 0)
                  const lineCost = unitCost * it.quantity
                  return (
                    <div
                      key={it.productId}
                      className="flex flex-col gap-2 px-3 py-2 hover:bg-muted/30"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Package className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {it.product?.name ?? it.productId}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {t.compCostPerUnit}: {fmt.currency(unitCost)} ×{" "}
                            {it.quantity} ={" "}
                            <span className="font-medium">
                              {fmt.currency(lineCost)}
                            </span>
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                          onClick={() => removeIngredient(it.productId)}
                          aria-label={t.compRemoveIngredient}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 ps-10">
                        <div className="flex items-center gap-1">
                          <Label
                            htmlFor={`iq-${it.productId}`}
                            className="text-[11px] text-muted-foreground"
                          >
                            {t.compIngredientQty}
                          </Label>
                          <Input
                            id={`iq-${it.productId}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={String(it.quantity)}
                            onChange={(e) =>
                              updateIngredient(it.productId, {
                                quantity: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className="h-8 w-20 text-end"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <Label
                            htmlFor={`iu-${it.productId}`}
                            className="text-[11px] text-muted-foreground"
                          >
                            {t.compIngredientUnit}
                          </Label>
                          <Select
                            value={it.unit}
                            onValueChange={(v) =>
                              updateIngredient(it.productId, { unit: v })
                            }
                          >
                            <SelectTrigger
                              id={`iu-${it.productId}`}
                              className="h-8 w-24"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {units.length === 0
                                ? DEFAULT_UNITS.map((u) => (
                                    <SelectItem key={u} value={u}>
                                      {u}
                                    </SelectItem>
                                  ))
                                : units.map((u) => (
                                    <SelectItem key={u.id} value={u.name}>
                                      {u.name}
                                    </SelectItem>
                                  ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Input
                          placeholder={t.compIngredientNotes}
                          value={it.notes}
                          onChange={(e) =>
                            updateIngredient(it.productId, {
                              notes: e.target.value,
                            })
                          }
                          className="h-8 flex-1 min-w-[120px]"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Live cost summary */}
            {ingredients.length > 0 && (
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 border border-border/60 p-4">
                <SummaryCell
                  icon={<TrendingDown className="h-3.5 w-3.5" />}
                  label={t.compCostPerBatch}
                  value={fmt.currency(totals.costPerBatch)}
                  tone="muted"
                />
                <SummaryCell
                  icon={<Calculator className="h-3.5 w-3.5" />}
                  label={t.compCostPerUnit}
                  value={fmt.currency(totals.costPerUnit)}
                  tone="muted"
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
