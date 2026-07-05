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
  useCreateCustomer,
  useUpdateCustomer,
} from "@/hooks/use-api"
import { useT } from "@/components/i18n-context"
import type { Customer } from "@/lib/types"

interface CustomerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: Customer | null
}

interface FormState {
  name: string
  phone: string
  address: string
}

const empty: FormState = { name: "", phone: "", address: "" }

export function CustomerFormDialog({ open, onOpenChange, customer }: CustomerFormDialogProps) {
  const isEdit = !!customer
  const t = useT()
  const [form, setForm] = React.useState<FormState>(empty)
  const createMut = useCreateCustomer()
  const updateMut = useUpdateCustomer(customer?.id ?? "")

  React.useEffect(() => {
    if (customer) {
      setForm({ name: customer.name, phone: customer.phone, address: customer.address })
    } else {
      setForm(empty)
    }
  }, [customer, open])

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error(t.cusCustomerNameRequired)
      return
    }
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
    }
    try {
      if (isEdit) {
        await updateMut.mutateAsync(payload)
        toast.success(t.cusCustomerUpdated)
      } else {
        await createMut.mutateAsync(payload)
        toast.success(t.cusCustomerAdded)
      }
      onOpenChange(false)
    } catch (err: any) {
      toast.error(t.saveFailed, { description: err?.message })
    }
  }

  const loading = createMut.isPending || updateMut.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t.cusEditCustomer : t.cusAddNewTitle}</DialogTitle>
          <DialogDescription>
            {isEdit ? t.cusEditDesc : t.cusAddDesc}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="c-name">{t.cusCustomerName} *</Label>
            <Input
              id="c-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={t.cusNamePlaceholder}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-phone">{t.phone}</Label>
            <Input
              id="c-phone"
              dir="ltr"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+965 5xxx xxxx"
              className="text-left"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-address">{t.address}</Label>
            <Input
              id="c-address"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder={t.cusAddressPlaceholder}
            />
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
