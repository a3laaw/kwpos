"use client"

import * as React from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { CompositionFormDialog } from "@/components/compositions/composition-form-dialog"
import { ProduceDialog } from "@/components/compositions/produce-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  FlaskConical,
  Plus,
  Pencil,
  Trash2,
  MoreVertical,
  Package,
  Search,
  X,
  Factory,
} from "lucide-react"
import { useUser } from "@/components/user-context"
import { useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"
import { useCompositions, useDeleteComposition } from "@/hooks/use-compositions"
import type { Composition } from "@/lib/types"

export function CompositionsView() {
  const t = useT()
  const user = useUser()
  const fmt = useFmt()

  const [search, setSearch] = React.useState("")
  const [activeOnly, setActiveOnly] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Composition | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Composition | null>(null)
  const [produceTarget, setProduceTarget] = React.useState<Composition | null>(
    null
  )

  const { data, isLoading, isError, refetch } = useCompositions(
    search.trim() || undefined,
    activeOnly
  )
  const deleteMut = useDeleteComposition()

  const canManage = user.role === "ADMIN" || user.role === "WAREHOUSE"
  const canDelete = user.role === "ADMIN"

  function openAdd() {
    setEditing(null)
    setDialogOpen(true)
  }
  function openEdit(c: Composition) {
    setEditing(c)
    setDialogOpen(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMut.mutateAsync(deleteTarget.id)
      toast.success(t.compSaveSuccess)
      setDeleteTarget(null)
    } catch (err: any) {
      toast.error(t.saveFailed, { description: err?.message })
    }
  }

  const compositions = data?.items ?? []

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.compositionsTitle}
        description={t.compositionsDesc}
        icon={<FlaskConical className="h-5 w-5" />}
        breadcrumbItems={[
          { labelKey: "navInventoryPurchases" },
          { labelKey: "navCompositions" },
        ]}
        actions={
          canManage ? (
            <Button onClick={openAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              {t.compAddNew}
            </Button>
          ) : null
        }
      />

      {/* Search + active-only filter */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.compSearchPlaceholder}
            className="pr-9 h-9"
          />
          {search ? (
            <button
              onClick={() => setSearch("")}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <label className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border/70 bg-background cursor-pointer select-none h-9">
          <Checkbox
            checked={activeOnly}
            onCheckedChange={(v) => setActiveOnly(v === true)}
          />
          <span className="text-sm">{t.compIsActive}</span>
        </label>
      </div>

      {/* Body */}
      {isError ? (
        <EmptyState
          title={t.saveFailed}
          action={<Button onClick={() => refetch()}>{t.retry}</Button>}
        />
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : compositions.length === 0 ? (
        <EmptyState
          icon={<FlaskConical className="h-7 w-7" />}
          title={t.compNoCompositions}
          description={t.compositionsDesc}
          action={
            canManage ? (
              <Button onClick={openAdd} className="gap-2">
                <Plus className="h-4 w-4" />
                {t.compAddNew}
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {compositions.map((c) => (
            <CompositionCard
              key={c.id}
              composition={c}
              fmt={fmt}
              t={t}
              canManage={canManage}
              canDelete={canDelete}
              onEdit={() => openEdit(c)}
              onDelete={() => setDeleteTarget(c)}
              onProduce={() => setProduceTarget(c)}
            />
          ))}
        </div>
      )}

      <CompositionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        composition={editing}
      />

      <ProduceDialog
        open={!!produceTarget}
        onOpenChange={(o) => !o && setProduceTarget(null)}
        composition={produceTarget}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t.compDeleteConfirm}
        description={
          <span>
            {t.compDeleteConfirm}: <strong>{deleteTarget?.name ?? ""}</strong>
          </span>
        }
        confirmText={t.delete}
        loading={deleteMut.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}

/* ------------------------- composition card ------------------------- */

function CompositionCard({
  composition,
  fmt,
  t,
  canManage,
  canDelete,
  onEdit,
  onDelete,
  onProduce,
}: {
  composition: Composition
  fmt: ReturnType<typeof useFmt>
  t: ReturnType<typeof useT>
  canManage: boolean
  canDelete: boolean
  onEdit: () => void
  onDelete: () => void
  onProduce: () => void
}) {
  const ingredientsCount = composition.ingredients.length
  const isActive = composition.isActive
  const yieldQty = Number(composition.yieldQty ?? 0)
  const costPerBatch = Number(composition.costPerBatch ?? 0)
  const costPerUnit = Number(composition.costPerUnit ?? 0)

  return (
    <Card className="relative overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <CardContent className="p-0 flex flex-col flex-1">
        {/* Image / icon header */}
        <div className="relative h-32 bg-muted/40">
          {composition.imageUrl ? (
            <img
              src={composition.imageUrl}
              alt={composition.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
              <FlaskConical className="h-12 w-12" />
            </div>
          )}

          {/* Top-start badges */}
          <div className="absolute top-2 start-2 flex flex-wrap gap-1">
            {isActive ? (
              <Badge className="bg-emerald-500/90 text-white border-transparent">
                {t.compIsActive}
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
              >
                {t.compIsActive}
              </Badge>
            )}
          </div>

          {/* Yield badge */}
          <div className="absolute top-2 end-2 flex h-12 min-w-12 px-2 flex-col items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
            <span className="text-[10px] leading-none">{t.compYieldQty}</span>
            <span className="text-sm font-bold leading-none">
              {yieldQty} {composition.yieldUnit}
            </span>
          </div>

          {/* Manager menu */}
          {canManage && (
            <div className="absolute bottom-2 end-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 bg-background/85 backdrop-blur shadow"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit} className="gap-2">
                    <Pencil className="h-4 w-4" />
                    {t.edit}
                  </DropdownMenuItem>
                  {canDelete && (
                    <DropdownMenuItem
                      onClick={onDelete}
                      className="gap-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      {t.delete}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Body */}
        <button
          type="button"
          onClick={onEdit}
          className="flex flex-col gap-2 p-4 flex-1 text-start hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold truncate">{composition.name}</p>
              {composition.outputProduct?.name ? (
                <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  {composition.outputProduct.name}
                </p>
              ) : null}
            </div>
            <Badge variant="outline" className="gap-1 shrink-0">
              <Package className="h-3 w-3" />
              {ingredientsCount}
            </Badge>
          </div>

          {composition.description ? (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {composition.description}
            </p>
          ) : null}

          {/* Cost footer */}
          <div className="mt-auto pt-3 border-t border-border/60 grid grid-cols-2 gap-2">
            <div>
              <p className="text-[11px] text-muted-foreground">
                {t.compCostPerBatch}
              </p>
              <p className="text-sm font-bold text-primary leading-tight">
                {fmt.currency(costPerBatch)}
              </p>
            </div>
            <div className="text-end">
              <p className="text-[11px] text-muted-foreground">
                {t.compCostPerUnit}
              </p>
              <p className="text-sm font-bold text-primary leading-tight">
                {fmt.currency(costPerUnit)}
              </p>
            </div>
          </div>
        </button>

        {/* Produce action (manager only) */}
        {canManage && (
          <div className="px-4 pb-4">
            <Button
              type="button"
              variant="secondary"
              className="w-full gap-2"
              onClick={onProduce}
              disabled={ingredientsCount === 0}
            >
              <Factory className="h-4 w-4" />
              {t.compProduce}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
