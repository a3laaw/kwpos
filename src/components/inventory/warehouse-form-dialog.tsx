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
import { Loader2 } from "lucide-react"
import {
  useCreateWarehouse,
  useUpdateWarehouse,
} from "@/hooks/use-api"
import type { Warehouse } from "@/lib/types"

interface WarehouseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  warehouse?: Warehouse | null
}

interface FormState {
  name: string
  code: string
  location: string
}

const empty: FormState = { name: "", code: "", location: "" }

export function WarehouseFormDialog({ open, onOpenChange, warehouse }: WarehouseFormDialogProps) {
  const isEdit = !!warehouse
  const [form, setForm] = React.useState<FormState>(empty)
  const createMut = useCreateWarehouse()
  const updateMut = useUpdateWarehouse(warehouse?.id ?? "")

  React.useEffect(() => {
    if (warehouse) {
      setForm({ name: warehouse.name, code: warehouse.code ?? "", location: warehouse.location ?? "" })
    } else {
      setForm(empty)
    }
  }, [warehouse, open])

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error("اسم المخزن مطلوب")
      return
    }
    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || undefined,
      location: form.location.trim() || undefined,
    }
    try {
      if (isEdit) {
        await updateMut.mutateAsync(payload)
        toast.success("تم تحديث المخزن")
      } else {
        await createMut.mutateAsync(payload)
        toast.success("تمت إضافة المخزن")
      }
      onOpenChange(false)
    } catch (err: any) {
      toast.error("فشل الحفظ", { description: err?.message })
    }
  }

  const loading = createMut.isPending || updateMut.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "تعديل مخزن" : "إضافة مخزن جديد"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "عدّل بيانات المخزن." : "أضف مخزناً جديداً لإدارة أصناف متعددة."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="w-name">اسم المخزن *</Label>
            <Input id="w-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="مثال: المخزن الرئيسي" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="w-code">الرمز</Label>
              <Input id="w-code" dir="ltr" value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="WH-01" className="text-left" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="w-loc">الموقع</Label>
              <Input id="w-loc" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="المقر الرئيسي" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>إلغاء</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEdit ? "حفظ" : "إضافة"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
