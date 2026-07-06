"use client"

import * as React from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { TableSkeleton } from "@/components/shared/loading-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { SupplierPaymentDialog } from "@/components/purchases/supplier-payment-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Wallet, Plus, Trash2, FileText } from "lucide-react"
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
import { MoreVertical } from "lucide-react"
import { useUser } from "@/components/user-context"
import { useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"
import {
  useSupplierPayments,
  useDeleteSupplierPayment,
} from "@/hooks/use-api"

export function SupplierPaymentsView() {
  const t = useT()
  const fmt = useFmt()
  const user = useUser()

  const { data, isLoading, isError, refetch } = useSupplierPayments()
  const deleteMut = useDeleteSupplierPayment()

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; paymentNo: string } | null>(null)

  const canManage = user.role === "ADMIN" || user.role === "WAREHOUSE"
  const payments = data?.items ?? []

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMut.mutateAsync(deleteTarget.id)
      toast.success(t.supplierPaymentDeleted)
      setDeleteTarget(null)
    } catch (err: any) {
      toast.error(t.supplierPaymentDeleteFailed, { description: String(err?.message || err) })
    }
  }

  const methodBadge = (m: string) => {
    const label = m === "CASH" ? t.paymentMethodCash : m === "BANK" ? t.paymentMethodBank : t.paymentMethodCheck
    const cls =
      m === "CASH"
        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
        : m === "BANK"
        ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30"
        : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
    return (
      <Badge variant="outline" className={`gap-1 ${cls}`}>
        <Wallet className="h-3 w-3" />
        {label}
      </Badge>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            {t.supplierPaymentsTitle}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{t.supplierPaymentsDesc}</p>
        </div>
        {canManage ? (
          <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            {t.newSupplierPayment}
          </Button>
        ) : null}
      </div>

      {isError ? (
        <EmptyState
          title={t.supplierPaymentCreateFailed}
          action={<Button onClick={() => refetch()}>{t.retry}</Button>}
        />
      ) : isLoading ? (
        <TableSkeleton />
      ) : payments.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-7 w-7" />}
          title={t.noSupplierPayments}
          action={
            canManage ? (
              <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                {t.newSupplierPayment}
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-start">{t.paymentNoLabel}</TableHead>
                <TableHead className="text-start">{t.colSupplier}</TableHead>
                <TableHead className="text-start">{t.amountPaid}</TableHead>
                <TableHead className="text-start">{t.paymentMethodLabel}</TableHead>
                <TableHead className="text-start hidden sm:table-cell">{t.paymentDateLabel}</TableHead>
                <TableHead className="text-start hidden md:table-cell">{t.referenceNo}</TableHead>
                <TableHead className="text-start hidden lg:table-cell">{t.note}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs" dir="ltr">{p.paymentNo}</TableCell>
                  <TableCell className="font-medium">{p.supplierName}</TableCell>
                  <TableCell className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {fmt.currency(p.amount)}
                  </TableCell>
                  <TableCell>{methodBadge(p.paymentMethod)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden sm:table-cell" dir="ltr">
                    {new Date(p.paymentDate).toLocaleDateString("en-GB")}
                  </TableCell>
                  <TableCell className="text-xs font-mono hidden md:table-cell" dir="ltr">
                    {p.referenceNo || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden lg:table-cell max-w-[200px] truncate">
                    {p.note || "—"}
                  </TableCell>
                  <TableCell>
                    {user.role === "ADMIN" ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget({ id: p.id, paymentNo: p.paymentNo })}
                            className="gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            {t.delete}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SupplierPaymentDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t.delete}
        description={
          <>
            {t.supplierPaymentDeleteFailed.replace("فشل ", "")}: <span className="font-mono" dir="ltr">{deleteTarget?.paymentNo}</span>
          </>
        }
        confirmText={t.delete}
        loading={deleteMut.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}
