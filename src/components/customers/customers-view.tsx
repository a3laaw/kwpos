"use client"

import * as React from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { ExcelExportButton, ExcelImportButton } from "@/components/shared/excel-buttons"
import { EmptyState } from "@/components/shared/empty-state"
import { TableSkeleton } from "@/components/shared/loading-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Phone,
  MapPin,
  UserPlus,
  Star,
} from "lucide-react"
import { useCustomers, useDeleteCustomer } from "@/hooks/use-api"
import { useFmt } from "@/components/currency-context"
import { useT } from "@/components/i18n-context"
import { useUser } from "@/components/user-context"
import { canDelete } from "@/lib/permissions"
import type { Role, Customer } from "@/lib/types"

export function CustomersView() {
  const fmt = useFmt()
  const t = useT()
  const user = useUser()
  // Customer write (add/edit): OWNER / ADMIN / MANAGER / SALES.
  // SALES needs this to register walk-in customers during a sale.
  const canWrite =
    user.role === "OWNER" ||
    user.role === "ADMIN" ||
    user.role === "MANAGER" ||
    user.role === "SALES"
  // Customer delete: OWNER / ADMIN / MANAGER only (central canDelete helper).
  const canDel = canDelete(user.role as Role)
  // Excel import/export is a bulk data-management operation — restricted
  // to OWNER / ADMIN / MANAGER. SALES can add customers one-by-one in the
  // POS, but cannot bulk-import or export the customer database.
  const canManageCustomers =
    user.role === "OWNER" ||
    user.role === "ADMIN" ||
    user.role === "MANAGER"
  const [q, setQ] = React.useState("")
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Customer | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Customer | null>(null)

  const debouncedQ = React.useDeferredValue(q)
  const { data, isLoading, isError, refetch } = useCustomers(debouncedQ || undefined)
  const deleteMut = useDeleteCustomer()

  const customers = data?.items ?? []

  function openAdd() {
    setEditing(null)
    setDialogOpen(true)
  }
  function openEdit(c: Customer) {
    setEditing(c)
    setDialogOpen(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMut.mutateAsync(deleteTarget.id)
      toast.success(t.cusCustomerDeleted)
      setDeleteTarget(null)
    } catch (err: any) {
      toast.error(t.deleteFailed, { description: err?.message })
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.cusPageTitle}
        description={t.cusPageDesc}
        icon={<Users className="h-5 w-5" />}
        breadcrumbItems={[
          { labelKey: "navAccountingCustomers" },
          { labelKey: "navCustomers" },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {canManageCustomers ? <ExcelImportButton type="customers" /> : null}
            {canManageCustomers ? <ExcelExportButton type="customers" /> : null}
            {canWrite ? (
              <Button onClick={openAdd} className="gap-2">
                <Plus className="h-4 w-4" />
                {t.cusAddCustomer}
              </Button>
            ) : null}
          </div>
        }
      />

      <Card className="p-3 sm:p-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.cusSearchPlaceholder}
            className="pr-9"
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-4"><TableSkeleton rows={6} /></div>
        ) : isError ? (
          <div className="p-4">
            <EmptyState title={t.cusLoadFailed} action={<Button onClick={() => refetch()}>{t.retry}</Button>} />
          </div>
        ) : customers.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<UserPlus className="h-7 w-7" />}
              title={q ? t.cusNoMatching : t.cusNoCustomers}
              description={q ? t.tryAnotherKeyword : t.cusAddFirstCustomer}
              action={
                !q && canWrite ? (
                  <Button onClick={openAdd} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t.cusAddCustomer}
                  </Button>
                ) : null
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>{t.cusCustomerName}</TableHead>
                  <TableHead>{t.cusCustomerPhone}</TableHead>
                  <TableHead className="hidden md:table-cell">{t.cusCustomerType || "نوع العميل"}</TableHead>
                  <TableHead className="hidden lg:table-cell">نقاط الولاء</TableHead>
                  <TableHead className="hidden sm:table-cell">{t.address}</TableHead>
                  <TableHead className="hidden md:table-cell">{t.cusDateAdded}</TableHead>
                  <TableHead className="w-12 text-center"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => {
                  const typeLabel =
                    c.type === "WHOLESALE"
                      ? "جملة"
                      : c.type === "CORPORATE"
                      ? "شركات"
                      : "تجزئة"
                  const typeVariant: "default" | "secondary" | "outline" =
                    c.type === "WHOLESALE"
                      ? "default"
                      : c.type === "CORPORATE"
                      ? "secondary"
                      : "outline"
                  return (
                  <TableRow key={c.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {c.name.slice(0, 2)}
                        </span>
                        <span className="flex flex-col">
                          <span>{c.name}</span>
                          <span className="md:hidden text-[11px] text-muted-foreground">{typeLabel}</span>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 font-mono text-sm" dir="ltr">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        {c.phone || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={typeVariant}>{typeLabel}</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="flex items-center gap-1.5">
                        <Star className="h-3.5 w-3.5 text-amber-500" />
                        <span className="tabular-nums font-medium">{Number(c.loyaltyPoints ?? 0)}</span>
                        {c.loyaltyTier ? (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5">{c.loyaltyTier}</Badge>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {c.address || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {fmt.date(c.createdAt)}
                    </TableCell>
                    <TableCell className="text-center">
                      {canWrite || canDel ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canWrite ? (
                              <DropdownMenuItem onClick={() => openEdit(c)} className="gap-2">
                                <Pencil className="h-4 w-4" />
                                {t.edit}
                              </DropdownMenuItem>
                            ) : null}
                            {canDel ? (
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(c)}
                                className="gap-2 text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                {t.delete}
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </TableCell>
                  </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {t.cusTotalCountLabel.replace("{count}", String(customers.length))}
        </p>
      </div>

      <CustomerFormDialog open={dialogOpen} onOpenChange={setDialogOpen} customer={editing} />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t.cusDeleteTitle}
        description={
          <>
            {t.cusDeleteConfirm.replace("{name}", deleteTarget?.name ?? "")}
          </>
        }
        confirmText={t.delete}
        loading={deleteMut.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}
