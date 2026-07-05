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
import { useT } from "@/components/i18n-context"

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
  const t = useT()
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
      toast.error(t.warehouseNameRequired)
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
        toast.success(t.warehouseUpdated)
      } else {
        await createMut.mutateAsync(payload)
        toast.success(t.warehouseAdded)
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
          <DialogTitle>{isEdit ? t.editWarehouse : t.addWarehouseNew}</DialogTitle>
          <DialogDescription>
            {isEdit ? t.editWarehouseDesc : t.addWarehouseDesc}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="w-name">{t.warehouseName} *</Label>
            <Input id="w-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={t.warehouseNameInputPlaceholder} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="w-code">{t.warehouseCode}</Label>
              <Input id="w-code" dir="ltr" value={form.code} onChange={(e) => set("code", e.target.value)} placeholder={t.warehouseCodePlaceholder} className="text-left" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="w-loc">{t.warehouseLocation}</Label>
              <Input id="w-loc" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder={t.warehouseLocationInputPlaceholder} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>{t.cancel}</Button>
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
