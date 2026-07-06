"use client"

import * as React from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { SupplierFormDialog } from "@/components/purchases/supplier-form-dialog"
import { SupplierPaymentDialog } from "@/components/purchases/supplier-payment-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Truck,
  Plus,
  Phone,
  Mail,
  MapPin,
  User,
  Pencil,
  Trash2,
  MoreVertical,
  Package,
  ShoppingCart,
  Wallet,
} from "lucide-react"
import { useUser } from "@/components/user-context"
import { useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"
import { useSuppliers, useDeleteSupplier, useSupplierBalances } from "@/hooks/use-api"
import type { Supplier } from "@/lib/types"

export function SuppliersView() {
  const t = useT()
  const user = useUser()
  const fmt = useFmt()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Supplier | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Supplier | null>(null)
  const [payTargetId, setPayTargetId] = React.useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useSuppliers()
  const { data: balancesData } = useSupplierBalances()
  const deleteMut = useDeleteSupplier()

  const canManage = user.role === "ADMIN" || user.role === "WAREHOUSE"
  const balanceMap = React.useMemo(
    () => new Map((balancesData?.items ?? []).map((b) => [b.supplierId, b.balance])),
    [balancesData]
  )

  function openAdd() {
    setEditing(null)
    setDialogOpen(true)
  }
  function openEdit(s: Supplier) {
    setEditing(s)
    setDialogOpen(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMut.mutateAsync(deleteTarget.id)
      toast.success(t.supplierDeleted)
      setDeleteTarget(null)
    } catch (err: any) {
      const msg = err?.message === "cannot-delete-linked"
        ? t.cannotDeleteLinkedSupplier
        : err?.message
      toast.error(t.deleteFailed, { description: msg })
    }
  }

  const suppliers = data?.items ?? []

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.suppliersTitle}
        description={t.suppliersDescLong}
        icon={<Truck className="h-5 w-5" />}
        actions={
          canManage ? (
            <Button onClick={openAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              {t.addSupplier}
            </Button>
          ) : null
        }
      />

      {isError ? (
        <EmptyState
          title={t.suppliersLoadFailedShort}
          action={<Button onClick={() => refetch()}>{t.retry}</Button>}
        />
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : suppliers.length === 0 ? (
        <EmptyState
          icon={<Truck className="h-7 w-7" />}
          title={t.noSuppliers}
          description={t.noSuppliersDesc}
          action={
            canManage ? (
              <Button onClick={openAdd} className="gap-2">
                <Plus className="h-4 w-4" />
                {t.addSupplier}
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s) => (
            <Card key={s.id} className="relative overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{s.name}</p>
                      {s.contact ? (
                        <p className="text-xs text-muted-foreground truncate">
                          {s.contact}
                        </p>
                      ) : null}
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
                        <DropdownMenuItem onClick={() => setPayTargetId(s.id)} className="gap-2">
                          <Wallet className="h-4 w-4" />
                          {t.paySupplier}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(s)} className="gap-2">
                          <Pencil className="h-4 w-4" />
                          {t.edit}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(s)}
                          className="gap-2 text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          {t.delete}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  {s.phone ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span dir="ltr" className="font-mono text-xs">{s.phone}</span>
                    </div>
                  ) : null}
                  {s.email ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4 shrink-0" />
                      <span dir="ltr" className="truncate text-xs">{s.email}</span>
                    </div>
                  ) : null}
                  {s.address ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="truncate text-xs">{s.address}</span>
                    </div>
                  ) : null}
                  {!s.phone && !s.email && !s.address ? (
                    <div className="flex items-center gap-2 text-muted-foreground/60">
                      <User className="h-4 w-4" />
                      <span className="text-xs">{t.noContactData}</span>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 flex items-center gap-2 pt-3 border-t border-border/60">
                  <Badge variant="secondary" className="gap-1">
                    <Package className="h-3 w-3" />
                    {t.productsCountLabel.replace("{count}", String(s.productsCount ?? 0))}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <ShoppingCart className="h-3 w-3" />
                    {t.ordersCountLabel.replace("{count}", String(s.ordersCount ?? 0))}
                  </Badge>
                  {(() => {
                    const bal = balanceMap.get(s.id) ?? 0
                    return (
                      <Badge
                        variant="outline"
                        className={`gap-1 ms-auto ${
                          bal > 0
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        }`}
                        title={t.supplierBalance}
                      >
                        <Wallet className="h-3 w-3" />
                        {fmt.currency(bal)}
                      </Badge>
                    )
                  })()}
                </div>

                {canManage ? (
                  <Button
                    onClick={() => setPayTargetId(s.id)}
                    variant="outline"
                    size="sm"
                    className="w-full mt-3 gap-2"
                  >
                    <Wallet className="h-4 w-4" />
                    {t.paySupplier}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SupplierFormDialog open={dialogOpen} onOpenChange={setDialogOpen} supplier={editing} />
      <SupplierPaymentDialog
        open={!!payTargetId}
        onOpenChange={(o) => !o && setPayTargetId(null)}
        supplierId={payTargetId}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t.deleteSupplierTitle}
        description={
          <>
            {t.deleteSupplierConfirmLong.replace("{name}", deleteTarget?.name ?? "")}
          </>
        }
        confirmText={t.delete}
        loading={deleteMut.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}
