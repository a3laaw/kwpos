"use client"

import * as React from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { TableSkeleton } from "@/components/shared/loading-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import {
  PurchaseInvoiceDialog,
  type PurchaseInvoicePrefill,
} from "@/components/purchases/purchase-invoice-dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Plus, Eye, PackageCheck, Trash2, AlertTriangle } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Ship } from "lucide-react"
import { useUser } from "@/components/user-context"
import { useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"
import {
  usePurchaseInvoices,
  usePostPurchaseInvoice,
  useDeletePurchaseInvoice,
  useCustomsAnnexes,
  type PurchaseInvoice,
} from "@/hooks/use-api"
import { CustomsAnnexDialog } from "@/components/purchases/customs-annex-dialog"

const STATUS_META: Record<
  PurchaseInvoice["status"],
  { labelKey: "piDraft" | "piPosted" | "piCancelled"; className: string }
> = {
  DRAFT: {
    labelKey: "piDraft",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  },
  POSTED: {
    labelKey: "piPosted",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  },
  CANCELLED: {
    labelKey: "piCancelled",
    className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
  },
}

export function PurchaseInvoicesView() {
  const fmt = useFmt()
  const t = useT()
  const user = useUser()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [detail, setDetail] = React.useState<PurchaseInvoice | null>(null)
  const [postTarget, setPostTarget] = React.useState<PurchaseInvoice | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<PurchaseInvoice | null>(null)
  const [annexTarget, setAnnexTarget] = React.useState<PurchaseInvoice | null>(null)
  const [prefill, setPrefill] = React.useState<PurchaseInvoicePrefill | null>(null)

  const { data, isLoading, isError, refetch } = usePurchaseInvoices()
  const { data: annexesData } = useCustomsAnnexes()
  const postMut = usePostPurchaseInvoice()
  const deleteMut = useDeletePurchaseInvoice()

  const canManage = user.role === "ADMIN" || user.role === "WAREHOUSE"
  const isAdmin = user.role === "ADMIN"
  const invoices = data?.items ?? []

  // Set of invoice IDs that have at least one customs annex (any status).
  const invoicesWithAnnex = React.useMemo(() => {
    const set = new Set<string>()
    for (const a of annexesData?.items ?? []) {
      set.add(a.purchaseInvoiceId)
    }
    return set
  }, [annexesData])

  async function handlePost() {
    if (!postTarget) return
    try {
      await postMut.mutateAsync(postTarget.id)
      toast.success(t.piPostedSuccess)
      setPostTarget(null)
    } catch (err: any) {
      toast.error(t.piPostedSuccess, { description: err?.message })
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMut.mutateAsync(deleteTarget.id)
      toast.success(t.piDeleted)
      setDeleteTarget(null)
    } catch (err: any) {
      // 409 = cannot delete posted
      if (String(err?.message || "").includes("cannot-delete-posted")) {
        toast.error(t.piCannotDeletePosted)
      } else {
        toast.error(t.piDeleted, { description: err?.message })
      }
    }
  }

  function openNewDialog() {
    setPrefill(null)
    setCreateOpen(true)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.piTitle}
        description={t.piDesc}
        icon={<FileText className="h-5 w-5" />}
        actions={
          canManage ? (
            <Button onClick={openNewDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              {t.piNew}
            </Button>
          ) : null
        }
      />

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={5} />
          </div>
        ) : isError ? (
          <div className="p-4">
            <EmptyState
              title={t.piNoInvoices}
              action={<Button onClick={() => refetch()}>{t.retry}</Button>}
            />
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<FileText className="h-7 w-7" />}
              title={t.piNoInvoices}
              action={
                canManage ? (
                  <Button onClick={openNewDialog} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t.piNew}
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
                  <TableHead>{t.piNo}</TableHead>
                  <TableHead>{t.colSupplier}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t.date}</TableHead>
                  <TableHead className="text-center">{t.piItems}</TableHead>
                  <TableHead className="text-center">{t.piTotal}</TableHead>
                  <TableHead className="text-center">{t.colStatus}</TableHead>
                  <TableHead className="w-12 text-center"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const meta = STATUS_META[inv.status]
                  return (
                    <TableRow
                      key={inv.id}
                      className="hover:bg-muted/30 cursor-pointer"
                      onClick={() => setDetail(inv)}
                    >
                      <TableCell className="font-mono text-sm font-medium">
                        {inv.invoiceNo}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{inv.supplierName}</div>
                        <div className="text-xs text-muted-foreground sm:hidden">
                          {fmt.dateTime(inv.invoiceDate)}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {fmt.dateTime(inv.invoiceDate)}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {inv.items.length}
                      </TableCell>
                      <TableCell className="text-center font-semibold tabular-nums">
                        {fmt.currency(inv.total)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Badge variant="secondary" className={`gap-1 ${meta.className}`}>
                            {t[meta.labelKey]}
                          </Badge>
                          {inv.status === "POSTED" && invoicesWithAnnex.has(inv.id) ? (
                            <Badge
                              variant="outline"
                              className="gap-1 border-primary/30 bg-primary/5 text-primary"
                              title={t.annexBtn}
                            >
                              <Ship className="h-3 w-3" />
                              {t.annexBtn}
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell
                        className="text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setDetail(inv)}
                              className="gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              {t.viewDetails}
                            </DropdownMenuItem>
                            {canManage && inv.status === "DRAFT" && (
                              <DropdownMenuItem
                                onClick={() => setPostTarget(inv)}
                                className="gap-2 text-emerald-600 focus:text-emerald-600"
                              >
                                <PackageCheck className="h-4 w-4" />
                                {t.piPost}
                              </DropdownMenuItem>
                            )}
                            {inv.status === "POSTED" && (
                              <DropdownMenuItem
                                onClick={() => setAnnexTarget(inv)}
                                className="gap-2"
                              >
                                <Ship className="h-4 w-4" />
                                {t.annexBtn}
                              </DropdownMenuItem>
                            )}
                            {isAdmin && inv.status === "DRAFT" && (
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(inv)}
                                className="gap-2 text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
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

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detail?.invoiceNo}</DialogTitle>
            <DialogDescription className="sr-only">{t.piDesc}</DialogDescription>
          </DialogHeader>
          {detail ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">{t.supplier}</p>
                  <p className="font-medium">{detail.supplierName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.warehouse}</p>
                  <p className="font-medium">{detail.warehouseName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.date}</p>
                  <p className="font-medium">{fmt.dateTime(detail.invoiceDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.colStatus}</p>
                  <Badge
                    variant="secondary"
                    className={`gap-1 ${STATUS_META[detail.status].className}`}
                  >
                    {t[STATUS_META[detail.status].labelKey]}
                  </Badge>
                </div>
              </div>
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
                        <TableCell className="text-center tabular-nums">
                          {it.quantity}
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          {fmt.currency(it.unitCost)}
                        </TableCell>
                        <TableCell className="text-center font-semibold tabular-nums">
                          {fmt.currency(it.subtotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t.piSubtotal}</span>
                  <span className="font-medium tabular-nums">
                    {fmt.currency(detail.subtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t.piTaxAmount} ({detail.taxRate}%)
                  </span>
                  <span className="font-medium tabular-nums">
                    {fmt.currency(detail.taxAmount)}
                  </span>
                </div>
                {(detail.shipping || detail.customs || detail.otherCharges) > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t.piLandedCost}</span>
                    <span className="font-medium tabular-nums">
                      {fmt.currency(
                        detail.shipping + detail.customs + detail.otherCharges
                      )}
                    </span>
                  </div>
                ) : null}
                {detail.discount > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t.discount}</span>
                    <span className="font-medium tabular-nums text-destructive">
                      −{fmt.currency(detail.discount)}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between pt-1 border-t border-border/60">
                  <span className="font-medium">{t.piTotal}</span>
                  <span className="text-lg font-bold tabular-nums text-primary">
                    {fmt.currency(detail.total)}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <PurchaseInvoiceDialog open={createOpen} onOpenChange={setCreateOpen} prefill={prefill} />

      {/* Customs annex dialog (only meaningful for POSTED invoices) */}
      <CustomsAnnexDialog
        open={!!annexTarget}
        onOpenChange={(o) => !o && setAnnexTarget(null)}
        invoice={annexTarget}
      />

      {/* Post confirmation */}
      <ConfirmDialog
        open={!!postTarget}
        onOpenChange={(o) => !o && setPostTarget(null)}
        title={t.piPost}
        description={
          <span className="flex items-start gap-2 text-sm leading-relaxed">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>{t.piPostConfirm}</span>
          </span>
        }
        confirmText={t.piPost}
        destructive={false}
        loading={postMut.isPending}
        onConfirm={handlePost}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t.delete}
        description={t.piDeleted}
        confirmText={t.delete}
        loading={deleteMut.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}

/** Exposed so the parent Purchases view can open the dialog pre-filled from a PO. */
export function useOpenPurchaseInvoiceDialog() {
  const [open, setOpen] = React.useState(false)
  const [prefill, setPrefill] = React.useState<PurchaseInvoicePrefill | null>(null)
  const openWith = React.useCallback((p: PurchaseInvoicePrefill | null) => {
    setPrefill(p)
    setOpen(true)
  }, [])
  const close = React.useCallback(() => setOpen(false), [])
  return { open, prefill, openWith, close }
}
