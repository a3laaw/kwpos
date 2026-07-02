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
  useCreateSupplier,
  useUpdateSupplier,
} from "@/hooks/use-api"
import type { Supplier } from "@/lib/types"

interface SupplierFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier?: Supplier | null
}

interface FormState {
  name: string
  contact: string
  phone: string
  email: string
  address: string
}

const empty: FormState = { name: "", contact: "", phone: "", email: "", address: "" }

export function SupplierFormDialog({ open, onOpenChange, supplier }: SupplierFormDialogProps) {
  const isEdit = !!supplier
  const [form, setForm] = React.useState<FormState>(empty)
  const createMut = useCreateSupplier()
  const updateMut = useUpdateSupplier(supplier?.id ?? "")

  React.useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name,
        contact: supplier.contact ?? "",
        phone: supplier.phone ?? "",
        email: supplier.email ?? "",
        address: supplier.address ?? "",
      })
    } else {
      setForm(empty)
    }
  }, [supplier, open])

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error("اسم المورّد مطلوب")
      return
    }
    const payload = {
      name: form.name.trim(),
      contact: form.contact.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
    }
    try {
      if (isEdit) {
        await updateMut.mutateAsync(payload)
        toast.success("تم تحديث بيانات المورّد")
      } else {
        await createMut.mutateAsync(payload)
        toast.success("تمت إضافة المورّد")
      }
      onOpenChange(false)
    } catch (err: any) {
      toast.error("فشل الحفظ", { description: err?.message })
    }
  }

  const loading = createMut.isPending || updateMut.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "تعديل مورّد" : "إضافة مورّد جديد"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "عدّل بيانات المورّد." : "أدخل بيانات المورّد الجديد."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="s-name">اسم المورّد *</Label>
            <Input
              id="s-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="مثال: شركة الوطنية للأغذية"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="s-contact">مسؤول التواصل</Label>
              <Input
                id="s-contact"
                value={form.contact}
                onChange={(e) => set("contact", e.target.value)}
                placeholder="الاسم"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-phone">الهاتف</Label>
              <Input
                id="s-phone"
                dir="ltr"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="05xxxxxxxx"
                className="text-left"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-email">البريد الإلكتروني</Label>
              <Input
                id="s-email"
                dir="ltr"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="info@supplier.sa"
                className="text-left"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-address">العنوان</Label>
              <Input
                id="s-address"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="المدينة - الحي"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              إلغاء
            </Button>
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
