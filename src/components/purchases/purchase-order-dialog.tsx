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
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2, Loader2, ShoppingCart } from "lucide-react"
import { useSuppliers, useProducts, useCreatePurchaseOrder } from "@/hooks/use-api"
import { formatCurrency } from "@/lib/format"

interface LineItem {
  key: string
  productId: string
  quantity: string
  unitCost: string
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
  const { data: sups } = useSuppliers()
  const { data: prods } = useProducts()
  const createMut = useCreatePurchaseOrder()

  const [supplierId, setSupplierId] = React.useState("")
  const [note, setNote] = React.useState("")
  const [items, setItems] = React.useState<LineItem[]>([
    { key: makeKey(), productId: "", quantity: "1", unitCost: "0" },
  ])

  React.useEffect(() => {
    if (open) {
      setSupplierId("")
      setNote("")
      setItems([{ key: makeKey(), productId: "", quantity: "1", unitCost: "0" }])
    }
  }, [open])

  const products = prods?.items ?? []
  const suppliers = sups?.items ?? []

  function updateItem(key: string, patch: Partial<LineItem>) {
    setItems((arr) =>
      arr.map((it) => (it.key === key ? { ...it, ...patch } : it))
    )
  }
  // when product selected, prefill unitCost from its cost price
  function selectProduct(key: string, productId: string) {
    const p = products.find((x) => x.id === productId)
    updateItem(key, { productId, unitCost: p ? String(p.costPrice) : "0" })
  }
  function addRow() {
    setItems((arr) => [...arr, { key: makeKey(), productId: "", quantity: "1", unitCost: "0" }])
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
      toast.error("اختر المورّد أولاً")
      return
    }
    if (validItems.length === 0) {
      toast.error("أضف منتجاً واحداً على الأقل")
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
        })),
      })
      toast.success("تم إنشاء أمر الشراء")
      onOpenChange(false)
    } catch (err: any) {
      toast.error("فشل إنشاء أمر الشراء", { description: err?.message })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            أمر شراء جديد
          </DialogTitle>
          <DialogDescription>
            أنشئ أمر شراء لتزويد المخزن بالمنتجات. لن تتأثر الكميات حتى تأكيد الاستلام.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>المورّد *</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المورّد" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="po-note">ملاحظة</Label>
              <Input
                id="po-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="اختياري"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>المنتجات</Label>
              <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-1">
                <Plus className="h-3.5 w-3.5" />
                إضافة سطر
              </Button>
            </div>

            <div className="space-y-2 max-h-[40vh] overflow-y-auto scrollbar-thin pl-1">
              {items.map((it) => {
                const subtotal = (Number(it.quantity) || 0) * (Number(it.unitCost) || 0)
                return (
                  <div
                    key={it.key}
                    className="grid grid-cols-12 gap-2 items-end rounded-lg border border-border/60 bg-muted/20 p-2"
                  >
                    <div className="col-span-12 sm:col-span-6 space-y-1">
                      <Label className="text-xs text-muted-foreground">المنتج</Label>
                      <Select
                        value={it.productId}
                        onValueChange={(v) => selectProduct(it.key, v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="اختر المنتج" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4 sm:col-span-2 space-y-1">
                      <Label className="text-xs text-muted-foreground">الكمية</Label>
                      <Input
                        type="number"
                        min={1}
                        className="h-9"
                        value={it.quantity}
                        onChange={(e) => updateItem(it.key, { quantity: e.target.value })}
                      />
                    </div>
                    <div className="col-span-5 sm:col-span-2 space-y-1">
                      <Label className="text-xs text-muted-foreground">سعر الوحدة</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="h-9"
                        value={it.unitCost}
                        onChange={(e) => updateItem(it.key, { unitCost: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1 text-center">
                      <p className="text-xs text-muted-foreground mb-1.5">الإجمالي</p>
                      <p className="text-xs font-semibold tabular-nums">
                        {formatCurrency(subtotal)}
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
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-primary/5 px-4 py-3">
            <span className="text-sm font-medium">إجمالي أمر الشراء</span>
            <span className="text-lg font-bold tabular-nums text-primary">
              {formatCurrency(total)}
            </span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={createMut.isPending}>
              إلغاء
            </Button>
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              إنشاء الأمر
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
