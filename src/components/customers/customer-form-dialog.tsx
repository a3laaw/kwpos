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
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Star, Crown } from "lucide-react"
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

type CustomerType = "RETAIL" | "WHOLESALE" | "CORPORATE"

interface FormState {
  name: string
  phone: string
  address: string
  type: CustomerType
}

const empty: FormState = { name: "", phone: "", address: "", type: "RETAIL" }

const CUSTOMER_TYPE_LABEL: Record<CustomerType, string> = {
  RETAIL: "تجزئة",
  WHOLESALE: "جملة",
  CORPORATE: "شركات",
}

function normalizeCustomerType(v: unknown): CustomerType {
  return v === "WHOLESALE" || v === "CORPORATE" ? v : "RETAIL"
}

export function CustomerFormDialog({ open, onOpenChange, customer }: CustomerFormDialogProps) {
  const isEdit = !!customer
  const t = useT()
  const [form, setForm] = React.useState<FormState>(empty)
  const createMut = useCreateCustomer()
  const updateMut = useUpdateCustomer(customer?.id ?? "")

  React.useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        type: normalizeCustomerType(customer.type),
      })
    } else {
      setForm(empty)
    }
  }, [customer, open])

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const loyaltyPoints: number = isEdit && customer ? Number(customer.loyaltyPoints ?? 0) : 0
  const loyaltyTier: string | null = isEdit && customer ? (customer.loyaltyTier ?? null) : null

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
      type: form.type,
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
          {/* Loyalty info — only in edit mode (read-only) */}
          {isEdit ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
              <span className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-300">
                <Star className="h-4 w-4" />
                نقاط الولاء:
                <Badge variant="secondary" className="tabular-nums">{loyaltyPoints}</Badge>
              </span>
              <span className="mx-1 text-muted-foreground">|</span>
              <span className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-300">
                <Crown className="h-4 w-4" />
                المستوى:
                <Badge variant="outline">{loyaltyTier || "—"}</Badge>
              </span>
            </div>
          ) : null}
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
              className="text-end"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-type">{t.cusCustomerType || "نوع العميل"}</Label>
            <Select
              value={form.type}
              onValueChange={(v) => set("type", v)}
            >
              <SelectTrigger id="c-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RETAIL">{CUSTOMER_TYPE_LABEL.RETAIL}</SelectItem>
                <SelectItem value="WHOLESALE">{CUSTOMER_TYPE_LABEL.WHOLESALE}</SelectItem>
                <SelectItem value="CORPORATE">{CUSTOMER_TYPE_LABEL.CORPORATE}</SelectItem>
              </SelectContent>
            </Select>
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
