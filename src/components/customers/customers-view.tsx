"use client"

import * as React from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
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
} from "lucide-react"
import { useCustomers, useDeleteCustomer } from "@/hooks/use-api"
import { useFmt } from "@/components/currency-context"
import type { Customer } from "@/lib/types"

export function CustomersView() {
  const fmt = useFmt()
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
      toast.success("تم حذف العميل")
      setDeleteTarget(null)
    } catch (err: any) {
      toast.error("فشل الحذف", { description: err?.message })
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="دليل العملاء"
        description="سجل بسيط لبيانات العملاء: الاسم، رقم الهاتف، والعنوان."
        icon={<Users className="h-5 w-5" />}
        actions={
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            إضافة عميل
          </Button>
        }
      />

      <Card className="p-3 sm:p-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث بالاسم أو الهاتف أو العنوان..."
            className="pr-9"
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-4"><TableSkeleton rows={6} /></div>
        ) : isError ? (
          <div className="p-4">
            <EmptyState title="تعذّر تحميل العملاء" action={<Button onClick={() => refetch()}>إعادة المحاولة</Button>} />
          </div>
        ) : customers.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<UserPlus className="h-7 w-7" />}
              title={q ? "لا توجد نتائج مطابقة" : "لا يوجد عملاء"}
              description={q ? "جرّب كلمة بحث أخرى." : "ابدأ بإضافة أول عميل."}
              action={
                !q ? (
                  <Button onClick={openAdd} className="gap-2">
                    <Plus className="h-4 w-4" />
                    إضافة عميل
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
                  <TableHead>اسم العميل</TableHead>
                  <TableHead>رقم الهاتف</TableHead>
                  <TableHead className="hidden sm:table-cell">العنوان</TableHead>
                  <TableHead className="hidden md:table-cell">تاريخ الإضافة</TableHead>
                  <TableHead className="w-12 text-center"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {c.name.slice(0, 2)}
                        </span>
                        {c.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 font-mono text-sm" dir="ltr">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        {c.phone || "—"}
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(c)} className="gap-2">
                            <Pencil className="h-4 w-4" />
                            تعديل
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(c)}
                            className="gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          إجمالي <Badge variant="secondary" className="tabular-nums">{customers.length}</Badge> عميل
        </p>
      </div>

      <CustomerFormDialog open={dialogOpen} onOpenChange={setDialogOpen} customer={editing} />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="حذف العميل"
        description={
          <>
            سيتم حذف العميل{" "}
            <span className="font-semibold">“{deleteTarget?.name}”</span> نهائياً.
          </>
        }
        confirmText="حذف"
        loading={deleteMut.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}
