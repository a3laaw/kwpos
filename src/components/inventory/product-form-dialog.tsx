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
import { Loader2 } from "lucide-react"
import {
  useCategories,
  useCreateProduct,
  useSuppliers,
  useUpdateProduct,
  useUnits,
} from "@/hooks/use-api"
import type { Product } from "@/lib/types"

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
  costPrice: string
  salePrice: string
  unit: string
}

const empty: FormState = {
  name: "",
  barcode: "",
  categoryId: "",
  supplierId: "",
  quantity: "0",
  reorderLevel: "5",
  costPrice: "0",
  salePrice: "0",
  unit: "قطعة",
}

export function ProductFormDialog({ open, onOpenChange, product }: ProductFormDialogProps) {
  const isEdit = !!product
  const [form, setForm] = React.useState<FormState>(empty)
  const { data: cats } = useCategories()
  const { data: sups } = useSuppliers()
  const { data: units } = useUnits()
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
        costPrice: String(product.costPrice),
        salePrice: String(product.salePrice),
        unit: product.unit,
      })
    } else {
      setForm(empty)
    }
  }, [product, open])

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const margin =
    Number(form.costPrice) > 0
      ? (((Number(form.salePrice) - Number(form.costPrice)) / Number(form.costPrice)) * 100).toFixed(1)
      : "0"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error("اسم المنتج مطلوب")
      return
    }
    const payload = {
      name: form.name.trim(),
      barcode: form.barcode.trim() || null,
      categoryId: form.categoryId || null,
      supplierId: form.supplierId || null,
      quantity: Number(form.quantity) || 0,
      reorderLevel: Number(form.reorderLevel) || 0,
      costPrice: Number(form.costPrice) || 0,
      salePrice: Number(form.salePrice) || 0,
      unit: form.unit.trim() || "قطعة",
    }
    try {
      if (isEdit) {
        await updateMut.mutateAsync(payload)
        toast.success("تم تحديث المنتج")
      } else {
        await createMut.mutateAsync(payload)
        toast.success("تمت إضافة المنتج")
      }
      onOpenChange(false)
    } catch (err: any) {
      toast.error("فشل الحفظ", { description: err?.message })
    }
  }

  const loading = createMut.isPending || updateMut.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>{isEdit ? "تعديل منتج" : "إضافة منتج جديد"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "عدّل بيانات المنتج ثم احفظ التغييرات."
              : "أدخل بيانات المنتج الجديد لإضافته إلى المخزون."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="p-name">اسم المنتج *</Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="مثال: أرز بسمتي 5كجم"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-barcode">الباركود</Label>
              <Input
                id="p-barcode"
                dir="ltr"
                value={form.barcode}
                onChange={(e) => set("barcode", e.target.value)}
                placeholder="6281000..."
                className="text-left"
              />
            </div>
            <div className="space-y-2">
              <Label>الوحدة</Label>
              <Select value={form.unit} onValueChange={(v) => set("unit", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الوحدة" />
                </SelectTrigger>
                <SelectContent>
                  {(units?.items ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.unit && !(units?.items ?? []).some((u) => u.name === form.unit) ? (
                <p className="text-xs text-amber-600">«{form.unit}» غير موجودة في قائمة الوحدات — أضفها من الإعدادات</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>الفئة</Label>
              <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفئة" />
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
              <Label>المورّد</Label>
              <Select value={form.supplierId} onValueChange={(v) => set("supplierId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المورّد" />
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
              <Label htmlFor="p-qty">الكمية الحالية</Label>
              <Input
                id="p-qty"
                type="number"
                min={0}
                value={form.quantity}
                onChange={(e) => set("quantity", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-reorder">حد إعادة الطلب</Label>
              <Input
                id="p-reorder"
                type="number"
                min={0}
                value={form.reorderLevel}
                onChange={(e) => set("reorderLevel", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-cost">سعر التكلفة (ر.س)</Label>
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
              <Label htmlFor="p-sale">سعر البيع (ر.س)</Label>
              <Input
                id="p-sale"
                type="number"
                min={0}
                step="0.01"
                value={form.salePrice}
                onChange={(e) => set("salePrice", e.target.value)}
              />
            </div>
          </div>

          {Number(form.costPrice) > 0 && Number(form.salePrice) > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">هامش الربح التقديري</span>
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
              إلغاء
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEdit ? "حفظ التغييرات" : "إضافة المنتج"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
