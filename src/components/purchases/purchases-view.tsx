"use client"

import * as React from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { TableSkeleton } from "@/components/shared/loading-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { PurchaseOrderDialog } from "@/components/purchases/purchase-order-dialog"
import { Button } from "@/components/ui/button"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ShoppingCart,
  Plus,
  MoreVertical,
  CheckCircle2,
  XCircle,
  PackageCheck,
  Eye,
  Calendar,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAppStore } from "@/lib/store"
import {
  usePurchaseOrders,
  useReceivePurchaseOrder,
  useCancelPurchaseOrder,
  useDeletePurchaseOrder,
} from "@/hooks/use-api"
import { formatCurrency, formatDateTime } from "@/lib/format"
import type { PurchaseOrder } from "@/lib/types"

const statusMeta: Record<
  PurchaseOrder["status"],
  { label: string; variant: "secondary" | "default" | "outline"; className: string; icon: any }
> = {
  PENDING: { label: "معلّق", variant: "secondary", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30", icon: Calendar },
  RECEIVED: { label: "مستلم", variant: "default", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  CANCELLED: { label: "ملغي", variant: "outline", className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30", icon: XCircle },
}

export function PurchasesView() {
  const user = useAppStore((s) => s.user)
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [detail, setDetail] = React.useState<PurchaseOrder | null>(null)
  const [receiveTarget, setReceiveTarget] = React.useState<PurchaseOrder | null>(null)
  const [cancelTarget, setCancelTarget] = React.useState<PurchaseOrder | null>(null)

  const { data, isLoading, isError, refetch } = usePurchaseOrders(
    statusFilter === "all" ? undefined : statusFilter
  )
  const receiveMut = useReceivePurchaseOrder()
  const cancelMut = useCancelPurchaseOrder()
  const deleteMut = useDeletePurchaseOrder()

  const canManage = user?.role === "ADMIN" || user?.role === "WAREHOUSE"
  const orders = data?.items ?? []

  async function handleReceive() {
    if (!receiveTarget) return
    try {
      await receiveMut.mutateAsync(receiveTarget.id)
      toast.success("تم استلام الأمر وتحديث المخزون", {
        description: "أُضيفت الكميات إلى المنتجات تلقائياً.",
      })
      setReceiveTarget(null)
    } catch (err: any) {
      toast.error("فشل تأكيد الاستلام", { description: err?.message })
    }
  }

  async function handleCancel() {
    if (!cancelTarget) return
    try {
      await cancelMut.mutateAsync(cancelTarget.id)
      toast.success("تم إلغاء أمر الشراء")
      setCancelTarget(null)
    } catch (err: any) {
      toast.error("فشل الإلغاء", { description: err?.message })
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMut.mutateAsync(id)
      toast.success("تم حذف أمر الشراء")
    } catch (err: any) {
      toast.error("فشل الحذف", { description: err?.message })
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="المشتريات وأوامر الشراء"
        description="إنشاء أوامر شراء لتزويد المخزن وتأكيد الاستلام لتحديث الكميات تلقائياً."
        icon={<ShoppingCart className="h-5 w-5" />}
        actions={
          canManage ? (
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              أمر شراء جديد
            </Button>
          ) : null
        }
      />

      <Card className="p-3 sm:p-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="PENDING">معلّقة</SelectItem>
            <SelectItem value="RECEIVED">مستلمة</SelectItem>
            <SelectItem value="CANCELLED">ملغاة</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-4"><TableSkeleton rows={5} /></div>
        ) : isError ? (
          <div className="p-4">
            <EmptyState title="تعذّر تحميل أوامر الشراء" action={<Button onClick={() => refetch()}>إعادة المحاولة</Button>} />
          </div>
        ) : orders.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<ShoppingCart className="h-7 w-7" />}
              title="لا توجد أوامر شراء"
              description="أنشئ أول أمر شراء لتزويد المخزن بالمنتجات."
              action={
                canManage ? (
                  <Button onClick={() => setCreateOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    أمر شراء جديد
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
                  <TableHead>المورّد</TableHead>
                  <TableHead className="hidden sm:table-cell">التاريخ</TableHead>
                  <TableHead className="text-center">عدد الأصناف</TableHead>
                  <TableHead className="text-center">الإجمالي</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                  <TableHead className="w-12 text-center"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((po) => {
                  const meta = statusMeta[po.status]
                  const Icon = meta.icon
                  return (
                    <TableRow key={po.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setDetail(po)}>
                      <TableCell>
                        <div className="font-medium">{po.supplierName}</div>
                        <div className="text-xs text-muted-foreground sm:hidden">
                          {formatDateTime(po.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {formatDateTime(po.createdAt)}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {po.items.length}
                      </TableCell>
                      <TableCell className="text-center font-semibold tabular-nums">
                        {formatCurrency(po.total)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={meta.variant} className={`gap-1 ${meta.className}`}>
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDetail(po)} className="gap-2">
                              <Eye className="h-4 w-4" />
                              عرض التفاصيل
                            </DropdownMenuItem>
                            {canManage && po.status === "PENDING" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => setReceiveTarget(po)}
                                  className="gap-2 text-emerald-600 focus:text-emerald-600"
                                >
                                  <PackageCheck className="h-4 w-4" />
                                  تأكيد الاستلام
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setCancelTarget(po)}
                                  className="gap-2 text-amber-600 focus:text-amber-600"
                                >
                                  <XCircle className="h-4 w-4" />
                                  إلغاء الأمر
                                </DropdownMenuItem>
                              </>
                            )}
                            {canManage && po.status !== "RECEIVED" && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(po.id)}
                                className="gap-2 text-destructive focus:text-destructive"
                              >
                                حذف
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل أمر الشراء</DialogTitle>
            <DialogDescription className="sr-only">
              عرض أصناف أمر الشراء والإجمالي.
            </DialogDescription>
          </DialogHeader>
          {detail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">المورّد</p>
                  <p className="font-medium">{detail.supplierName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">التاريخ</p>
                  <p className="font-medium">{formatDateTime(detail.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">الحالة</p>
                  <Badge variant={statusMeta[detail.status].variant} className={`gap-1 ${statusMeta[detail.status].className}`}>
                    {statusMeta[detail.status].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">الإجمالي</p>
                  <p className="font-semibold text-primary">{formatCurrency(detail.total)}</p>
                </div>
              </div>
              {detail.note ? (
                <div className="rounded-lg bg-muted/40 p-3 text-sm">
                  <p className="text-xs text-muted-foreground mb-1">ملاحظة</p>
                  {detail.note}
                </div>
              ) : null}
              <div className="rounded-lg border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>المنتج</TableHead>
                      <TableHead className="text-center">الكمية</TableHead>
                      <TableHead className="text-center">سعر الوحدة</TableHead>
                      <TableHead className="text-center">الإجمالي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell className="font-medium">{it.productName}</TableCell>
                        <TableCell className="text-center tabular-nums">{it.quantity}</TableCell>
                        <TableCell className="text-center tabular-nums">{formatCurrency(it.unitCost)}</TableCell>
                        <TableCell className="text-center font-semibold tabular-nums">{formatCurrency(it.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <PurchaseOrderDialog open={createOpen} onOpenChange={setCreateOpen} />

      <ConfirmDialog
        open={!!receiveTarget}
        onOpenChange={(o) => !o && setReceiveTarget(null)}
        title="تأكيد استلام أمر الشراء"
        description={
          <>
            سيتم تحويل الأمر إلى “مستلم” وإضافة الكميات إلى المخزون. لا يمكن التراجع
            عن هذه العملية.
          </>
        }
        confirmText="تأكيد الاستلام"
        destructive={false}
        loading={receiveMut.isPending}
        onConfirm={handleReceive}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(o) => !o && setCancelTarget(null)}
        title="إلغاء أمر الشراء"
        description={
          <>
            سيتم إلغاء أمر الشراء من{" "}
            <span className="font-semibold">“{cancelTarget?.supplierName}”</span>.
          </>
        }
        confirmText="إلغاء الأمر"
        loading={cancelMut.isPending}
        onConfirm={handleCancel}
      />
    </div>
  )
}
