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
  useCreateSupplier,
  useUpdateSupplier,
} from "@/hooks/use-api"
import type { Supplier } from "@/lib/types"
import { useT } from "@/components/i18n-context"

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
  supplierType: "LOCAL" | "FOREIGN"
}

const empty: FormState = { name: "", contact: "", phone: "", email: "", address: "", supplierType: "LOCAL" }

export function SupplierFormDialog({ open, onOpenChange, supplier }: SupplierFormDialogProps) {
  const isEdit = !!supplier
  const t = useT()
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
        supplierType: supplier.supplierType ?? "LOCAL",
      })
    } else {
      setForm(empty)
    }
  }, [supplier, open])

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error(t.supplierNameRequired)
      return
    }
    const payload = {
      name: form.name.trim(),
      contact: form.contact.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      supplierType: form.supplierType,
    }
    try {
      if (isEdit) {
        await updateMut.mutateAsync(payload)
        toast.success(t.supplierUpdated)
      } else {
        await createMut.mutateAsync(payload)
        toast.success(t.supplierAdded)
      }
      onOpenChange(false)
    } catch (err: any) {
      toast.error(t.saveFailed, { description: err?.message })
    }
  }

  const loading = createMut.isPending || updateMut.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>{isEdit ? t.editSupplier : t.addSupplierNew}</DialogTitle>
          <DialogDescription>
            {isEdit ? t.editSupplierDesc : t.addSupplierDesc}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="s-name">{t.supplierName} *</Label>
            <Input
              id="s-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={t.supplierNameInputPlaceholder}
              autoFocus
            />
          </div>
          {/* Supplier Type — mandatory. Determines fee fields on purchase invoice:
              LOCAL → only tax + discount (no customs/shipping)
              FOREIGN → customs + shipping + other charges + tax + discount */}
          <div className="space-y-2">
            <Label htmlFor="s-type">{t.supplierTypeLabel} *</Label>
            <Select
              value={form.supplierType}
              onValueChange={(v) => set("supplierType", v as "LOCAL" | "FOREIGN")}
            >
              <SelectTrigger id="s-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOCAL">{t.supplierTypeLocal}</SelectItem>
                <SelectItem value="FOREIGN">{t.supplierTypeForeign}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="s-contact">{t.contactPerson}</Label>
              <Input
                id="s-contact"
                value={form.contact}
                onChange={(e) => set("contact", e.target.value)}
                placeholder={t.contactPersonPlaceholder}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-phone">{t.phone}</Label>
              <Input
                id="s-phone"
                dir="ltr"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder={t.phoneInputPlaceholder}
                className="text-end"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-email">{t.email}</Label>
              <Input
                id="s-email"
                dir="ltr"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder={t.emailInputPlaceholder}
                className="text-end"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-address">{t.address}</Label>
              <Input
                id="s-address"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder={t.addressInputPlaceholder}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
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
