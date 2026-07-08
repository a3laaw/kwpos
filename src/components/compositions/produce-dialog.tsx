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
  AlertCircle,
  Loader2,
  FlaskConical,
  Package,
  ArrowDown,
  Plus,
} from "lucide-react"
import {
  useProduceComposition,
  type InsufficientIngredient,
} from "@/hooks/use-compositions"
import type { Composition } from "@/lib/types"
import { useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"

interface ProduceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  composition: Composition | null
}

export function ProduceDialog({
  open,
  onOpenChange,
  composition,
}: ProduceDialogProps) {
  const t = useT()
  const fmt = useFmt()
  const [batches, setBatches] = React.useState("1")
  const [insufficient, setInsufficient] = React.useState<InsufficientIngredient[] | null>(
    null
  )

  const produceMut = useProduceComposition(composition?.id ?? "")

  // Reset state whenever the dialog target changes.
  React.useEffect(() => {
    if (open) {
      setBatches("1")
      setInsufficient(null)
    }
  }, [open, composition?.id])

  if (!composition) return null

  const batchesNum = Math.max(1, Math.floor(Number(batches) || 1))
  const yieldQty = Number(composition.yieldQty ?? 0)
  const producedQty = yieldQty * batchesNum
  const costPerBatch = Number(composition.costPerBatch ?? 0)
  const totalCost = costPerBatch * batchesNum

  // Compute client-side stock preview. The server is authoritative — we use
  // the product's aggregate `quantity` (sum across warehouses) for display.
  const preview = composition.ingredients.map((ing) => {
    const required = Number(ing.quantity ?? 0) * batchesNum
    const available = Number(ing.product?.quantity ?? 0)
    const short = available < required
    return {
      ingredient: ing,
      required,
      available,
      short,
    }
  })
  const anyClientShort = preview.some((p) => p.short)

  async function handleConfirm() {
    if (!composition) return
    setInsufficient(null)
    try {
      await produceMut.mutateAsync({ batches: batchesNum })
      toast.success(t.compProduceSuccess, {
        description: `${composition.outputProduct?.name ?? ""}: ${producedQty} ${
          composition.yieldUnit ?? ""
        }`,
      })
      onOpenChange(false)
    } catch (err: any) {
      const payload = (err as any)?.payload as
        | { error?: string; ingredients?: InsufficientIngredient[] }
        | undefined
      if (payload?.error === "insufficient-stock" && payload.ingredients) {
        setInsufficient(payload.ingredients)
        toast.error(t.compInsufficientStock, {
          description: t.compProduceInsufficientDesc,
        })
      } else if (payload?.error === "no-warehouse") {
        toast.error(t.compProduceFailed, {
          description: t.compProduceInsufficientDesc,
        })
      } else {
        toast.error(t.compProduceFailed, { description: err?.message })
      }
    }
  }

  const loading = produceMut.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            {t.compProduce}
          </DialogTitle>
          <DialogDescription>
            {composition.name}
            {composition.outputProduct
              ? ` · ${composition.outputProduct.name}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Batches input + produced summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="p-batches">{t.compProduceBatchQty} *</Label>
              <Input
                id="p-batches"
                type="number"
                min="1"
                step="1"
                dir="ltr"
                value={batches}
                onChange={(e) => setBatches(e.target.value)}
                className="text-end"
              />
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Plus className="h-3.5 w-3.5" />
                {t.compYieldQty}
              </span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {producedQty} {composition.yieldUnit}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {composition.outputProduct?.name}
              </span>
            </div>
          </div>

          {/* Ingredients consumed preview */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              {t.compIngredients}
            </Label>
            <div className="rounded-lg border border-border/70 divide-y divide-border/70 max-h-72 overflow-y-auto">
              {preview.map((p) => (
                <div
                  key={p.ingredient.productId}
                  className="flex items-center gap-2 px-3 py-2"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Package className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {p.ingredient.product?.name ?? p.ingredient.productId}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {Number(p.ingredient.quantity ?? 0)} {p.ingredient.unit} ×{" "}
                      {batchesNum} ={" "}
                      <span className="font-medium text-foreground">
                        {p.required} {p.ingredient.unit}
                      </span>
                    </p>
                  </div>
                  <div className="text-end shrink-0">
                    <p className="text-[11px] text-muted-foreground">
                      {t.available}
                    </p>
                    <p
                      className={`text-sm font-semibold ${
                        p.short
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {p.available}
                    </p>
                  </div>
                  {p.short && (
                    <Badge
                      variant="outline"
                      className="bg-rose-500/10 text-rose-600 border-rose-500/30 dark:text-rose-400 shrink-0"
                    >
                      <AlertCircle className="h-3 w-3 me-1" />
                      {t.compInsufficientStock}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Server-side insufficient-stock result */}
          {insufficient && insufficient.length > 0 && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 space-y-2">
              <p className="text-sm font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" />
                {t.compInsufficientStock}
              </p>
              <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80">
                {t.compProduceInsufficientDesc}
              </p>
              <ul className="space-y-1">
                {insufficient.map((it) => (
                  <li
                    key={it.productId}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="font-medium truncate">{it.name}</span>
                    <span className="text-rose-700 dark:text-rose-300 shrink-0">
                      {t.available}: {it.available} / {it.required} {it.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Cost summary */}
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 border border-border/60 p-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-muted-foreground">
                {t.compCostPerBatch}
              </span>
              <span className="text-sm font-semibold">
                {fmt.currency(costPerBatch)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <ArrowDown className="h-3 w-3" />
                {t.compCostPerBatch} × {batchesNum}
              </span>
              <span className="text-sm font-semibold">
                {fmt.currency(totalCost)}
              </span>
            </div>
          </div>
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
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={loading || batchesNum < 1}
            className="gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t.compProduceConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
