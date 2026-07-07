"use client"

import * as React from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { TableSkeleton } from "@/components/shared/loading-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { PurchaseOrderDialog } from "@/components/purchases/purchase-order-dialog"
import { PoApprovalPanel } from "@/components/purchases/po-approval-panel"
import {
  PurchaseInvoiceDialog,
  type PurchaseInvoicePrefill,
} from "@/components/purchases/purchase-invoice-dialog"
import { PurchaseInvoicesView } from "@/components/purchases/purchase-invoices-view"
import { SupplierPaymentsView } from "@/components/purchases/supplier-payments-view"
import { PurchaseReturnDialog } from "@/components/purchases/purchase-return-dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MegaMenuBar } from "@/components/shared/mega-menu-bar"
import { Breadcrumbs } from "@/components/shared/breadcrumbs"
import { WorkflowBar, type WorkflowStep } from "@/components/shared/workflow-bar"
import { Loader2 } from "lucide-react"
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
  Clock,
  FileCheck2,
  Ban,
  AlertTriangle,
  Truck,
  Sparkles,
  FileText,
  Wallet,
  RotateCcw,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useUser } from "@/components/user-context"
import { useT } from "@/components/i18n-context"
import {
  usePurchaseOrders,
  useReceivePurchaseOrder,
  useCancelPurchaseOrder,
  useDeletePurchaseOrder,
  useSuppliers,
  useAutoDraftPO,
} from "@/hooks/use-api"
import { useFmt } from "@/components/currency-context"
import type { PurchaseOrder } from "@/lib/types"

const STATUS_META: Record<
  PurchaseOrder["status"],
  { labelKey: keyof import("@/lib/i18n").Dict; variant: "secondary" | "default" | "outline"; className: string; icon: any }
> = {
  PENDING_APPROVAL: { labelKey: "poStatusPendingApproval", variant: "secondary", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30", icon: Clock },
  APPROVED: { labelKey: "poStatusApproved", variant: "secondary", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  PENDING: { labelKey: "poStatusPending", variant: "secondary", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30", icon: Calendar },
  RECEIVED: { labelKey: "poStatusReceived", variant: "default", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30", icon: PackageCheck },
  CANCELLED: { labelKey: "poStatusCancelled", variant: "outline", className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30", icon: XCircle },
  REJECTED: { labelKey: "poStatusRejected", variant: "outline", className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30", icon: Ban },
}

export function PurchasesView() {
  const fmt = useFmt()
  const t = useT()
  const user = useUser()
  const [tab, setTab] = React.useState<"orders" | "invoices" | "payments">("orders")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [detail, setDetail] = React.useState<PurchaseOrder | null>(null)
  const [receiveTarget, setReceiveTarget] = React.useState<PurchaseOrder | null>(null)
  const [cancelTarget, setCancelTarget] = React.useState<PurchaseOrder | null>(null)
  const [returnTarget, setReturnTarget] = React.useState<PurchaseOrder | null>(null)
  const [autoDraftOpen, setAutoDraftOpen] = React.useState(false)
  const [autoDraftSupplier, setAutoDraftSupplier] = React.useState("")
  // Purchase-invoice dialog (used by the "Receive & Create Invoice" action
  // on APPROVED/PENDING POs). Pre-filled with the PO's supplier + items.
  const [piOpen, setPiOpen] = React.useState(false)
  const [piPrefill, setPiPrefill] = React.useState<PurchaseInvoicePrefill | null>(null)

  const { data, isLoading, isError, refetch } = usePurchaseOrders(
    statusFilter === "all" ? undefined : statusFilter
  )
  const { data: sups } = useSuppliers()
  const receiveMut = useReceivePurchaseOrder()
  const cancelMut = useCancelPurchaseOrder()
  const deleteMut = useDeletePurchaseOrder()
  const autoDraftMut = useAutoDraftPO()

  const canManage = user.role === "ADMIN" || user.role === "WAREHOUSE"
  const isAdmin = user.role === "ADMIN"
  const orders = data?.items ?? []
  const suppliers = sups?.items ?? []

  function poLabel(po: PurchaseOrder): string {
    return `PO-${(po.id || "").slice(-6).toUpperCase()}`
  }

  /** Open the purchase-invoice dialog pre-filled from a PO. */
  function receiveAndCreateInvoice(po: PurchaseOrder) {
    setPiPrefill({
      purchaseOrderId: po.id,
      supplierId: po.supplierId,
      warehouseId: null,
      items: po.items.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        quantity: it.quantity,
        unitCost: it.unitCost,
        purchaseOrderItemId: it.id,
      })),
    })
    setPiOpen(true)
  }

  async function handleAutoDraft() {
    if (!autoDraftSupplier) {
      toast.error(t.selectSupplierFirst)
      return
    }
    try {
      const res: any = await autoDraftMut.mutateAsync({ supplierId: autoDraftSupplier })
      // The auto-draft endpoint returns either a PurchaseOrder (has `id`)
      // or `{ message: "no-items-needed", count: 0 }` when nothing was
      // low-stock for the selected supplier.
      if (res && typeof res === "object" && typeof res.id === "string") {
        toast.success(t.poDraftCreated, {
          description: t.poDraftPendingApprovalDesc.replace("{poLabel}", poLabel(res as PurchaseOrder)),
        })
        setAutoDraftOpen(false)
        setAutoDraftSupplier("")
      } else if (res && (res as any).message === "no-items-needed") {
        toast.info(t.noItemsNeedReorderForSupplier, {
          description: t.noItemsNeedReorderForSupplierDesc,
        })
      } else {
        toast.success(t.poDraftCreated)
        setAutoDraftOpen(false)
        setAutoDraftSupplier("")
      }
    } catch (err: any) {
      toast.error(t.poDraftCreateFailed, { description: err?.message })
    }
  }

  async function handleReceive() {
    if (!receiveTarget) return
    try {
      await receiveMut.mutateAsync(receiveTarget.id)
      toast.success(t.poReceived, {
        description: t.poReceivedWithStockDesc,
      })
      setReceiveTarget(null)
    } catch (err: any) {
      toast.error(t.poReceiveFailedShort, { description: err?.message })
    }
  }

  async function handleCancel() {
    if (!cancelTarget) return
    try {
      await cancelMut.mutateAsync(cancelTarget.id)
      toast.success(t.poCancelled)
      setCancelTarget(null)
    } catch (err: any) {
      toast.error(t.poCancelFailedShort, { description: err?.message })
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMut.mutateAsync(id)
      toast.success(t.poDeleted)
    } catch (err: any) {
      toast.error(t.poDeleteFailedShort, { description: err?.message })
    }
  }

  const PUR_TAB_LABELS: Record<string, any> = {
    orders: "navPurchases",
    invoices: "navPurchaseInvoices",
    payments: "navSupplierPayments",
  }

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { labelKey: "navInventoryPurchases" },
          { labelKey: PUR_TAB_LABELS[tab] || "navPurchases" },
        ]}
      />
      <PageHeader
        title={t.purchasesTitleLong}
        description={t.purchasesDescLong}
        icon={<ShoppingCart className="h-5 w-5" />}
      />

      <MegaMenuBar
        groups={[
          {
            labelKey: "navPurchases",
            items: [
              { value: "orders", labelKey: "navPurchases", icon: ShoppingCart },
              { value: "invoices", labelKey: "navPurchaseInvoices", icon: FileText },
              { value: "payments", labelKey: "navSupplierPayments", icon: Wallet },
            ],
          },
        ]}
        value={tab}
        onChange={(v) => setTab(v as typeof tab)}
      />

      {tab === "invoices" && <PurchaseInvoicesView />}
      {tab === "payments" && <SupplierPaymentsView />}

      {tab === "orders" && (
        <div className="mt-4 space-y-5">
          {/* Inner header with PO-specific actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {t.purchasesDescLong}
            </div>
            {canManage ? (
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => setAutoDraftOpen(true)}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {t.fetchSupplierRequiredItems}
                </Button>
                <Button onClick={() => setCreateOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t.newPurchaseOrder}
                </Button>
              </div>
            ) : null}
          </div>

          {/* ADMIN-only auto-draft approval panel */}
          {isAdmin ? <PoApprovalPanel /> : null}

          <Card className="p-3 sm:p-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allStatuses}</SelectItem>
                <SelectItem value="PENDING_APPROVAL">{t.poStatusPendingApproval}</SelectItem>
                <SelectItem value="APPROVED">{t.poStatusApproved}</SelectItem>
                <SelectItem value="PENDING">{t.poStatusPending}</SelectItem>
                <SelectItem value="RECEIVED">{t.poStatusReceived}</SelectItem>
                <SelectItem value="CANCELLED">{t.poStatusCancelled}</SelectItem>
                <SelectItem value="REJECTED">{t.poStatusRejected}</SelectItem>
              </SelectContent>
            </Select>
          </Card>

          <Card className="overflow-hidden">
            {isLoading ? (
              <div className="p-4"><TableSkeleton rows={5} /></div>
            ) : isError ? (
              <div className="p-4">
                <EmptyState title={t.poLoadFailed} action={<Button onClick={() => refetch()}>{t.retry}</Button>} />
              </div>
            ) : orders.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={<ShoppingCart className="h-7 w-7" />}
                  title={t.noPurchaseOrders}
                  description={t.noPurchaseOrdersDesc}
                  action={
                    canManage ? (
                      <Button onClick={() => setCreateOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        {t.newPurchaseOrder}
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
                      <TableHead>{t.colSupplier}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t.colDate}</TableHead>
                      <TableHead className="text-center">{t.colItemsCount}</TableHead>
                      <TableHead className="text-center">{t.colTotal}</TableHead>
                      <TableHead className="text-center">{t.colStatus}</TableHead>
                      <TableHead className="w-12 text-center"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((po) => {
                      const meta = STATUS_META[po.status]
                      const Icon = meta.icon
                      return (
                        <TableRow key={po.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setDetail(po)}>
                          <TableCell>
                            <div className="font-medium">{po.supplierName}</div>
                            <div className="text-xs text-muted-foreground sm:hidden">
                              {fmt.dateTime(po.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                            {fmt.dateTime(po.createdAt)}
                          </TableCell>
                          <TableCell className="text-center tabular-nums">
                            {po.items.length}
                          </TableCell>
                          <TableCell className="text-center font-semibold tabular-nums">
                            {fmt.currency(po.total)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={meta.variant} className={`gap-1 ${meta.className}`}>
                              <Icon className="h-3 w-3" />
                              {t[meta.labelKey]}
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
                                  {t.viewDetails}
                                </DropdownMenuItem>
                                {canManage && po.status === "PENDING" && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => setReceiveTarget(po)}
                                      className="gap-2 text-emerald-600 focus:text-emerald-600"
                                    >
                                      <PackageCheck className="h-4 w-4" />
                                      {t.confirmReceipt}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => receiveAndCreateInvoice(po)}
                                      className="gap-2 text-primary focus:text-primary"
                                    >
                                      <FileText className="h-4 w-4" />
                                      {t.piReceiveFromPO}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => setCancelTarget(po)}
                                      className="gap-2 text-amber-600 focus:text-amber-600"
                                    >
                                      <XCircle className="h-4 w-4" />
                                      {t.cancelOrder}
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {canManage && po.status === "APPROVED" && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => setReceiveTarget(po)}
                                      className="gap-2 text-emerald-600 focus:text-emerald-600"
                                    >
                                      <PackageCheck className="h-4 w-4" />
                                      {t.confirmReceipt}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => receiveAndCreateInvoice(po)}
                                      className="gap-2 text-primary focus:text-primary"
                                    >
                                      <FileText className="h-4 w-4" />
                                      {t.piReceiveFromPO}
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {canManage && po.status === "RECEIVED" && (
                                  <DropdownMenuItem
                                    onClick={() => setReturnTarget(po)}
                                    className="gap-2 text-amber-600 focus:text-amber-600"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                    {t.newPurchaseReturn}
                                  </DropdownMenuItem>
                                )}
                                {canManage && po.status !== "RECEIVED" && (
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(po.id)}
                                    className="gap-2 text-destructive focus:text-destructive"
                                  >
                                    {t.delete}
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
      </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.poDetailsTitle}</DialogTitle>
            <DialogDescription className="sr-only">
              {t.poDetailsDescLong}
            </DialogDescription>
          </DialogHeader>
          {detail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">{t.supplier}</p>
                  <p className="font-medium">{detail.supplierName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.date}</p>
                  <p className="font-medium">{fmt.dateTime(detail.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.status}</p>
                  <Badge variant={STATUS_META[detail.status].variant} className={`gap-1 ${STATUS_META[detail.status].className}`}>
                    {t[STATUS_META[detail.status].labelKey]}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.total}</p>
                  <p className="font-semibold text-primary">{fmt.currency(detail.total)}</p>
                </div>
              </div>
              {(() => {
                const poSteps: WorkflowStep[] = [
                  { key: "PENDING_APPROVAL", label: t.poStatusPendingApproval, status: ["PENDING_APPROVAL", "APPROVED", "PENDING", "RECEIVED"].includes(detail.status) ? "completed" : "pending" },
                  { key: "APPROVED", label: t.poStatusApproved, status: ["APPROVED", "PENDING", "RECEIVED"].includes(detail.status) ? "completed" : detail.status === "PENDING_APPROVAL" ? "current" : "pending" },
                  { key: "RECEIVED", label: t.poStatusReceived, status: detail.status === "RECEIVED" ? "completed" : detail.status === "PENDING" || detail.status === "APPROVED" ? "current" : "pending" },
                ]
                return <WorkflowBar steps={poSteps} />
              })()}
              {detail.note ? (
                <div className="rounded-lg bg-muted/40 p-3 text-sm">
                  <p className="text-xs text-muted-foreground mb-1">{t.note}</p>
                  {detail.note}
                </div>
              ) : null}
              <div className="rounded-lg border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>{t.colProduct}</TableHead>
                      <TableHead className="text-center">{t.colQty}</TableHead>
                      <TableHead className="text-center">{t.unitPrice}</TableHead>
                      <TableHead className="text-center">{t.colTotal}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell className="font-medium">{it.productName}</TableCell>
                        <TableCell className="text-center tabular-nums">{it.quantity}</TableCell>
                        <TableCell className="text-center tabular-nums">{fmt.currency(it.unitCost)}</TableCell>
                        <TableCell className="text-center font-semibold tabular-nums">{fmt.currency(it.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {(() => {
                const customs = Number(detail.customsAmount) || 0
                const shipping = Number(detail.shippingAmount) || 0
                const other = Number(detail.otherCharges) || 0
                const extraTotal = customs + shipping + other
                if (extraTotal <= 0) return null
                const applied = detail.landedCostApplied && detail.status === "RECEIVED"
                return (
                  <div
                    className={`rounded-lg border p-3 text-sm ${
                      applied
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-amber-500/30 bg-amber-500/5"
                    }`}
                  >
                    <p className="mb-2 flex items-center gap-2 font-medium">
                      <Truck className="h-4 w-4 text-primary" />
                      {t.landedCostSectionTitle}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">{t.customs}</span>
                        <p className="font-semibold tabular-nums">{fmt.currency(customs)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t.shipping}</span>
                        <p className="font-semibold tabular-nums">{fmt.currency(shipping)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t.otherFees}</span>
                        <p className="font-semibold tabular-nums">{fmt.currency(other)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t.total}</span>
                        <p className="font-semibold tabular-nums text-primary">
                          {fmt.currency(extraTotal)}
                        </p>
                      </div>
                    </div>
                    <p
                      className={`mt-2 text-xs leading-relaxed ${
                        applied
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      {applied ? t.landedCostAppliedLong : t.landedCostPreviewLongDetail}
                    </p>
                  </div>
                )
              })()}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <PurchaseOrderDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* Auto-draft dialog — summon low-stock items for a supplier */}
      <Dialog
        open={autoDraftOpen}
        onOpenChange={(o) => {
          setAutoDraftOpen(o)
          if (!o) setAutoDraftSupplier("")
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t.autoDraftDialogTitle}
            </DialogTitle>
            <DialogDescription>
              {t.autoDraftDialogDesc}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t.supplier} *</Label>
            <Select value={autoDraftSupplier} onValueChange={setAutoDraftSupplier}>
              <SelectTrigger>
                <SelectValue placeholder={t.selectSupplier} />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t.suggestedQtyFormulaLong}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAutoDraftOpen(false)
                setAutoDraftSupplier("")
              }}
              disabled={autoDraftMut.isPending}
            >
              {t.cancel}
            </Button>
            <Button
              type="button"
              onClick={handleAutoDraft}
              disabled={autoDraftMut.isPending || !autoDraftSupplier}
              className="gap-1.5"
            >
              {autoDraftMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {t.createDraftButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!receiveTarget}
        onOpenChange={(o) => !o && setReceiveTarget(null)}
        title={
          receiveTarget &&
          (Number(receiveTarget.customsAmount) || 0) +
            (Number(receiveTarget.shippingAmount) || 0) +
            (Number(receiveTarget.otherCharges) || 0) >
            0
            ? t.updateCostPricesTitle
            : t.confirmPoReceipt
        }
        description={
          receiveTarget &&
          (Number(receiveTarget.customsAmount) || 0) +
            (Number(receiveTarget.shippingAmount) || 0) +
            (Number(receiveTarget.otherCharges) || 0) >
            0 ? (
            <span className="flex flex-col gap-2 text-sm leading-relaxed">
              <span className="flex items-start gap-2 font-medium text-amber-700 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {t.updateCostPricesTitle}
              </span>
              <span>
                {t.updateCostPricesConfirmDesc}
              </span>
              <span className="text-xs text-muted-foreground">
                {t.customs}: {fmt.currency(Number(receiveTarget.customsAmount) || 0)} — {t.shipping}: {fmt.currency(Number(receiveTarget.shippingAmount) || 0)} — {t.otherFees}: {fmt.currency(Number(receiveTarget.otherCharges) || 0)}
              </span>
              <span className="font-medium">{t.proceedQuestion}</span>
            </span>
          ) : (
            <>
              {t.confirmReceiptDescLong}
            </>
          )
        }
        confirmText={t.confirmReceipt}
        destructive={false}
        cancelClassName={
          receiveTarget &&
          (Number(receiveTarget.customsAmount) || 0) +
            (Number(receiveTarget.shippingAmount) || 0) +
            (Number(receiveTarget.otherCharges) || 0) >
            0
            ? "border-destructive/40 text-destructive hover:bg-destructive/5"
            : undefined
        }
        loading={receiveMut.isPending}
        onConfirm={handleReceive}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(o) => !o && setCancelTarget(null)}
        title={t.cancelPoTitle}
        description={
          <>
            {t.cancelPoConfirmLong.replace("{supplier}", cancelTarget?.supplierName ?? "")}
          </>
        }
        confirmText={t.cancelOrder}
        loading={cancelMut.isPending}
        onConfirm={handleCancel}
      />

      {/* Purchase-invoice dialog (opened from a PO via "Receive & Create Invoice") */}
      <PurchaseInvoiceDialog
        open={piOpen}
        onOpenChange={setPiOpen}
        prefill={piPrefill}
      />

      {/* Purchase-return dialog (opened from a RECEIVED PO) */}
      <PurchaseReturnDialog
        open={!!returnTarget}
        onOpenChange={(o) => !o && setReturnTarget(null)}
        po={returnTarget}
      />
    </div>
  )
}
