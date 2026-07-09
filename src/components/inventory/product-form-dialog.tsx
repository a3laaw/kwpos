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
  useUpdateProduct,
} from "@/hooks/use-api"
import type { Product } from "@/lib/types"
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
  imageUrl: string
}

const empty: FormState = {
  name: "",
  barcode: "",
  categoryId: "",
  imageUrl: "",
}

export function ProductFormDialog({ open, onOpenChange, product }: ProductFormDialogProps) {
  const isEdit = !!product
  const t = useT()
  const user = useUser()
  const setView = useAppStore((s) => s.setView)
  const isAdmin = user.role === "ADMIN"
  const [form, setForm] = React.useState<FormState>(empty)
  const [barcodeLoading, setBarcodeLoading] = React.useState(false)
  const { data: cats } = useCategories()
  const createMut = useCreateProduct()
  const updateMut = useUpdateProduct(product?.id ?? "")

  React.useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        barcode: product.barcode ?? "",
        categoryId: product.categoryId ?? "",
        imageUrl: product.imageUrl ?? "",
      })
    } else {
      setForm(empty)
    }
  }, [product, open])

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }))

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
        throw Error((data as Record<string, unknown>)?.error ? String((data as Record<string, unknown>).error) : `request-failed:${res.status}`)
      }
      const barcode = (data as Record<string, unknown>)?.barcode as string | undefined
      if (typeof barcode === "string" && barcode) {
        set("barcode", barcode)
        toast.success(t.barcodeGenerated, { description: barcode })
      }
    } catch (err: unknown) {
      toast.error(t.barcodeGenerateFailed, { description: (err as Error)?.message })
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

    // When editing, preserve existing values for fields not in the simplified form.
    // When creating, use safe defaults (0 / null).
    const payload = isEdit
      ? {
          name: form.name.trim(),
          barcode: form.barcode.trim() || null,
          categoryId: form.categoryId || null,
          imageUrl: form.imageUrl.trim() || null,
          // Preserve existing values
          supplierId: product?.supplierId ?? null,
          quantity: product?.quantity ?? 0,
          reorderLevel: product?.reorderLevel ?? 0,
          optimalOrderQty: product?.optimalOrderQty ?? 0,
          defaultSupplierId: product?.defaultSupplierId ?? null,
          costPrice: product?.costPrice ?? 0,
          salePrice: product?.salePrice ?? 0,
          wholesalePrice: product?.wholesalePrice ?? 0,
          corporatePrice: product?.corporatePrice ?? 0,
          taxRate: product?.taxRate ?? 0,
          unit: product?.unit ?? "قطعة",
        }
      : {
          name: form.name.trim(),
          barcode: form.barcode.trim() || null,
          categoryId: form.categoryId || null,
          imageUrl: form.imageUrl.trim() || null,
          // Defaults for new product
          supplierId: null,
          quantity: 0,
          reorderLevel: 0,
          optimalOrderQty: 0,
          defaultSupplierId: null,
          costPrice: 0,
          salePrice: 0,
          wholesalePrice: 0,
          taxRate: 0,
          corporatePrice: 0,
          unit: "قطعة",
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
    } catch (err: unknown) {
      toast.error(t.saveFailed, { description: (err as Error)?.message })
    }
  }

  const loading = createMut.isPending || updateMut.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>{isEdit ? t.editProduct : t.addProductNew}</DialogTitle>
          <DialogDescription>
            {isEdit ? t.editProductDesc : t.addProductDesc}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image */}
          <ImageUpload
            value={form.imageUrl}
            onChange={(url) => setForm((f) => ({ ...f, imageUrl: url ?? "" }))}
            label={t.productImage}
          />

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="p-name">{t.productName} *</Label>
            <Input
              id="p-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={t.productNamePlaceholder}
              autoFocus
            />
          </div>

          {/* Barcode + auto-generate */}
          <div className="space-y-2">
            <Label htmlFor="p-barcode">{t.barcode}</Label>
            <div className="flex gap-2">
              <Input
                id="p-barcode"
                dir="ltr"
                value={form.barcode}
                onChange={(e) => set("barcode", e.target.value)}
                placeholder={t.barcodePlaceholder}
                className="text-end flex-1"
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

          {/* Category */}
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

          {/* Pricing hint — for ADMIN, nudge to pricing screen */}
          {isAdmin ? (
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
          ) : null}

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
