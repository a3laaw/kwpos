"use client"

import * as React from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { WarehouseFormDialog } from "@/components/inventory/warehouse-form-dialog"
import {
  Warehouse as WarehouseIcon,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  MapPin,
  Package,
  Boxes,
} from "lucide-react"
import { useUser } from "@/components/user-context"
import { useT } from "@/components/i18n-context"
import { useWarehouses, useDeleteWarehouse } from "@/hooks/use-api"
import type { Warehouse } from "@/lib/types"

export function WarehouseManager() {
  const t = useT()
  const user = useUser()
  const { data, isLoading } = useWarehouses()
  const deleteMut = useDeleteWarehouse()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Warehouse | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Warehouse | null>(null)

  const canManage = user.role === "ADMIN" || user.role === "WAREHOUSE"
  const warehouses = data?.items ?? []

  function openAdd() {
    setEditing(null)
    setDialogOpen(true)
  }
  function openEdit(w: Warehouse) {
    setEditing(w)
    setDialogOpen(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMut.mutateAsync(deleteTarget.id)
      toast.success(t.warehouseDeleted)
      setDeleteTarget(null)
    } catch (err: any) {
      toast.error(t.deleteFailed, { description: err?.message === "has-stock" ? t.warehouseHasStock : err?.message })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t.warehouseManagerDesc}
        </p>
        {canManage ? (
          <Button onClick={openAdd} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            {t.addWarehouse}
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-36 rounded-xl bg-muted/50 animate-pulse" />)}
        </div>
      ) : warehouses.length === 0 ? (
        <EmptyState
          icon={<WarehouseIcon className="h-7 w-7" />}
          title={t.noWarehouses}
          description={t.noWarehousesDesc}
          action={canManage ? <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />{t.addWarehouse}</Button> : null}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {warehouses.map((w) => (
            <Card key={w.id} className="relative hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <WarehouseIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{w.name}</p>
                      {w.code ? <p className="text-xs text-muted-foreground font-mono" dir="ltr">{w.code}</p> : null}
                    </div>
                  </div>
                  {canManage ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(w)} className="gap-2">
                          <Pencil className="h-4 w-4" /> {t.edit}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(w)}
                          className="gap-2 text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" /> {t.delete}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>

                {w.location ? (
                  <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{w.location}</span>
                  </div>
                ) : null}

                <div className="mt-4 flex items-center gap-2 pt-3 border-t border-border/60">
                  <Badge variant="secondary" className="gap-1">
                    <Package className="h-3 w-3" />
                    {t.itemsCountLabel.replace("{count}", String(w.productsCount ?? 0))}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Boxes className="h-3 w-3" />
                    {t.warehouseUnitsCount.replace("{count}", String(w.totalStock ?? 0))}
                  </Badge>
                  {w.isActive ? null : (
                    <Badge variant="outline" className="text-muted-foreground">{t.warehouseInactive}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <WarehouseFormDialog open={dialogOpen} onOpenChange={setDialogOpen} warehouse={editing} />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t.deleteWarehouseTitle}
        description={<>{t.deleteWarehouseConfirmLong.replace("{name}", deleteTarget?.name ?? "")}</>}
        confirmText={t.delete}
        loading={deleteMut.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}
