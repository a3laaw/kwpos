"use client"

import * as React from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { BundleFormDialog } from "@/components/bundles/bundle-form-dialog"
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
  PackageOpen,
  Plus,
  Pencil,
  Trash2,
  MoreVertical,
  Package,
  CalendarClock,
  Search,
  X,
} from "lucide-react"
import { useUser } from "@/components/user-context"
import { useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"
import { useBundles, useDeleteBundle } from "@/hooks/use-bundles"
import type { Bundle } from "@/lib/types"

export function BundlesView() {
  const t = useT()
  const user = useUser()
  const fmt = useFmt()

  const [search, setSearch] = React.useState("")
  const [activeOnly, setActiveOnly] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Bundle | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Bundle | null>(null)

  const { data, isLoading, isError, refetch } = useBundles(
    search.trim() || undefined,
    activeOnly
  )
  const deleteMut = useDeleteBundle()

  const canManage = user.role === "ADMIN" || user.role === "WAREHOUSE"
  const canDelete = user.role === "ADMIN"

  function openAdd() {
    setEditing(null)
    setDialogOpen(true)
  }
  function openEdit(b: Bundle) {
    setEditing(b)
    setDialogOpen(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMut.mutateAsync(deleteTarget.id)
      toast.success(t.bundleSaveSuccess)
      setDeleteTarget(null)
    } catch (err: any) {
      toast.error(t.saveFailed, { description: err?.message })
    }
  }

  const bundles = data?.items ?? []

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.bundlesTitle}
        description={t.bundlesDesc}
        icon={<PackageOpen className="h-5 w-5" />}
        breadcrumbItems={[
          { labelKey: "navInventoryPurchases" },
          { labelKey: "navBundles" },
        ]}
        actions={
          canManage ? (
            <Button onClick={openAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              {t.bundleAddNew}
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
            placeholder={t.bundleSearchPlaceholder}
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
          <span className="text-sm">{t.bundleActiveOnly}</span>
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
            <div key={i} className="h-56 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : bundles.length === 0 ? (
        <EmptyState
          icon={<PackageOpen className="h-7 w-7" />}
          title={t.bundleNoBundles}
          description={t.bundlesDesc}
          action={
            canManage ? (
              <Button onClick={openAdd} className="gap-2">
                <Plus className="h-4 w-4" />
                {t.bundleAddNew}
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bundles.map((b) => (
            <BundleCard
              key={b.id}
              bundle={b}
              fmt={fmt}
              t={t}
              canManage={canManage}
              canDelete={canDelete}
              onEdit={() => openEdit(b)}
              onDelete={() => setDeleteTarget(b)}
            />
          ))}
        </div>
      )}

      <BundleFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        bundle={editing}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t.bundleDeleteConfirm}
        description={
          <span>
            {t.bundleDeleteConfirm}: <strong>{deleteTarget?.name ?? ""}</strong>
          </span>
        }
        confirmText={t.delete}
        loading={deleteMut.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}

/* --------------------------- bundle card --------------------------- */

function BundleCard({
  bundle,
  fmt,
  t,
  canManage,
  canDelete,
  onEdit,
  onDelete,
}: {
  bundle: Bundle
  fmt: ReturnType<typeof useFmt>
  t: ReturnType<typeof useT>
  canManage: boolean
  canDelete: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const itemsCount = bundle.items.length
  const discount = Number(bundle.discountPct ?? 0)
  const isSeasonal = !!(bundle.startDate || bundle.endDate)
  const isActive = bundle.isActive

  return (
    <Card className="relative overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <CardContent className="p-0 flex flex-col flex-1">
        {/* Image / icon header */}
        <div className="relative h-36 bg-muted/40">
          {bundle.imageUrl ? (
            <img
              src={bundle.imageUrl}
              alt={bundle.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
              <PackageOpen className="h-12 w-12" />
            </div>
          )}

          {/* Top-left badges */}
          <div className="absolute top-2 start-2 flex flex-wrap gap-1">
            {isActive ? (
              <Badge className="bg-emerald-500/90 text-white border-transparent">
                {t.bundleIsActive}
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30">
                {t.bundleInactive}
              </Badge>
            )}
            {isSeasonal && (
              <Badge className="bg-amber-500/90 text-white border-transparent gap-1">
                <CalendarClock className="h-3 w-3" />
                {t.bundleSeasonal}
              </Badge>
            )}
          </div>

          {/* Discount badge */}
          {discount > 0 && (
            <div className="absolute top-2 end-2 flex h-12 w-12 flex-col items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
              <span className="text-[10px] leading-none">{t.bundleDiscountPct}</span>
              <span className="text-sm font-bold leading-none">
                {discount.toFixed(0)}%
              </span>
            </div>
          )}

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
        <div className="flex flex-col gap-2 p-4 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold truncate">{bundle.name}</p>
              {bundle.category ? (
                <p className="text-[11px] text-muted-foreground truncate">
                  {bundle.category}
                </p>
              ) : null}
            </div>
            <Badge variant="outline" className="gap-1 shrink-0">
              <Package className="h-3 w-3" />
              {itemsCount}
            </Badge>
          </div>

          {bundle.description ? (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {bundle.description}
            </p>
          ) : null}

          {/* Date range if seasonal */}
          {isSeasonal && (
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <CalendarClock className="h-3 w-3" />
              {bundle.startDate ? fmt.date(bundle.startDate) : "—"}
              {" → "}
              {bundle.endDate ? fmt.date(bundle.endDate) : "—"}
            </p>
          )}

          {/* Footer: price + discount summary */}
          <div className="mt-auto pt-3 border-t border-border/60 flex items-end justify-between gap-2">
            <div>
              <p className="text-[11px] text-muted-foreground">{t.bundleSalePrice}</p>
              <p className="text-lg font-bold text-primary leading-tight">
                {fmt.currency(bundle.salePrice)}
              </p>
            </div>
            <div className="text-end">
              {bundle.itemsRetailTotal !== undefined && bundle.itemsRetailTotal > 0 && (
                <>
                  <p className="text-[11px] text-muted-foreground">
                    {t.bundleRetailTotal}
                  </p>
                  <p className="text-xs text-muted-foreground line-through">
                    {fmt.currency(bundle.itemsRetailTotal)}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
