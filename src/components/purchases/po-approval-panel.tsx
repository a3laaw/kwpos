"use client"

import * as React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { TableSkeleton } from "@/components/shared/loading-state"
import { EmptyState } from "@/components/shared/empty-state"
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ClipboardCheck,
  Eye,
  AlertTriangle,
} from "lucide-react"
import {
  usePurchaseOrders,
  useApprovePO,
  useRejectPO,
} from "@/hooks/use-api"
import { useFmt } from "@/components/currency-context"
import { useT } from "@/components/i18n-context"
import type { PurchaseOrder } from "@/lib/types"

/**
 * Returns a short, human-friendly PO label (e.g. "PO-1A2B3C") derived from
 * the PO id's last 6 hex chars. Used purely for display — the API still
 * keys off the full cuid `id`.
 */
function poLabel(po: PurchaseOrder): string {
  return `PO-${(po.id || "").slice(-6).toUpperCase()}`
}

interface ItemEdit {
  quantity: string
  unitCost: string
}

export function PoApprovalPanel() {
  const fmt = useFmt()
  const t = useT()
  const { data, isLoading, isError, refetch } = usePurchaseOrders("PENDING_APPROVAL")
  const approveMut = useApprovePO()
  const rejectMut = useRejectPO()

  // Detail dialog state (the editor + actions)
  const [detail, setDetail] = React.useState<PurchaseOrder | null>(null)
  const [editedItems, setEditedItems] = React.useState<Record<string, ItemEdit>>({})

  // Confirm dialogs
  const [approveTarget, setApproveTarget] = React.useState<
    | { po: PurchaseOrder; withEdits: boolean }
    | null
  >(null)
  const [rejectTarget, setRejectTarget] = React.useState<PurchaseOrder | null>(null)
  const [rejectReason, setRejectReason] = React.useState("")

  const orders = React.useMemo(
    () => (data?.items ?? []).filter((o) => o.status === "PENDING_APPROVAL"),
    [data]
  )

  // Open the detail/editor dialog for a PO — initialise the editable
  // quantity/unitCost map from the PO items.
  function openDetail(po: PurchaseOrder) {
    setDetail(po)
    const init: Record<string, ItemEdit> = {}
    for (const it of po.items) {
      init[it.id] = {
        quantity: String(it.quantity),
        unitCost: String(it.unitCost),
      }
    }
    setEditedItems(init)
  }

  function closeDetail() {
    setDetail(null)
    setEditedItems({})
  }

  function updateItem(itemId: string, patch: Partial<ItemEdit>) {
    setEditedItems((m) => ({
      ...m,
      [itemId]: { ...(m[itemId] || { quantity: "1", unitCost: "0" }), ...patch },
    }))
  }

  // Compute live totals for the editor (uses the edited values when
  // available, else falls back to the original).
  const editorItems = detail
    ? detail.items.map((it) => {
        const e = editedItems[it.id]
        const qty = e ? Math.max(0, Number(e.quantity) || 0) : it.quantity
        const uc = e ? Math.max(0, Number(e.unitCost) || 0) : it.unitCost
        return { ...it, qty, uc, subtotal: qty * uc }
      })
    : []
  const editorTotal = editorItems.reduce((s, it) => s + it.subtotal, 0)

  // Has the user actually changed any line (so "تعديل وقبول" makes sense)?
  const hasEdits = detail
    ? detail.items.some((it) => {
        const e = editedItems[it.id]
        if (!e) return false
        return (
          Number(e.quantity) !== it.quantity ||
          Number(e.unitCost) !== it.unitCost
        )
      })
    : false

  async function handleApproveAsIs() {
    if (!approveTarget?.po) return
    try {
      const res: any = await approveMut.mutateAsync({ id: approveTarget.po.id })
      toast.success(t.poApproved, {
        description: `${poLabel(approveTarget.po)} — ${t.afterApprovalReadyDesc}`,
      })
      setApproveTarget(null)
      closeDetail()
    } catch (err: any) {
      toast.error(t.poApproveFailed, { description: err?.message })
    }
  }

  async function handleApproveWithEdits() {
    if (!approveTarget?.po) return
    const po = approveTarget.po
    const items = po.items.map((it) => {
      const e = editedItems[it.id]
      const qty = e ? Math.max(1, Math.round(Number(e.quantity) || 0)) : it.quantity
      const uc = e ? Math.max(0, Number(e.unitCost) || 0) : it.unitCost
      return { id: it.id, quantity: qty, unitCost: uc }
    })
    try {
      await approveMut.mutateAsync({ id: po.id, items })
      toast.success(t.poEditedAndApproved, {
        description: `${poLabel(po)} — ${t.afterApprovalReadyDesc}`,
      })
      setApproveTarget(null)
      closeDetail()
    } catch (err: any) {
      toast.error(t.poApproveFailed, { description: err?.message })
    }
  }

  async function handleReject() {
    if (!rejectTarget) return
    const reason = rejectReason.trim()
    if (!reason) {
      toast.error(t.rejectReasonRequired)
      return
    }
    try {
      await rejectMut.mutateAsync({ id: rejectTarget.id, rejectionReason: reason })
      toast.success(t.poRejected, {
        description: `${poLabel(rejectTarget)}`,
      })
      setRejectTarget(null)
      setRejectReason("")
      closeDetail()
    } catch (err: any) {
      toast.error(t.poRejectFailed, { description: err?.message })
    }
  }

  function openRejectFromList(po: PurchaseOrder) {
    setRejectTarget(po)
    setRejectReason("")
  }
  function openRejectFromDetail() {
    if (!detail) return
    setRejectTarget(detail)
    setRejectReason("")
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-amber-500/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400">
            <ClipboardCheck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{t.pendingManagementApproval}</h3>
            <p className="text-xs text-muted-foreground">
              {t.autoPoDraftsDescLong}
            </p>
          </div>
        </div>
        <Badge
          variant="secondary"
          className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1"
        >
          <Clock className="h-3 w-3" />
          {t.pendingReviewCount.replace("{count}", String(orders.length))}
        </Badge>
      </div>

      {isLoading ? (
        <div className="p-4">
          <TableSkeleton rows={3} />
        </div>
      ) : isError ? (
        <div className="p-4">
          <EmptyState
            title={t.approvalDraftsLoadFailed}
            action={<Button onClick={() => refetch()}>{t.retry}</Button>}
          />
        </div>
      ) : orders.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={<CheckCircle2 className="h-7 w-7" />}
            title={t.noApprovalDrafts}
            description={t.noApprovalDraftsDescLong}
          />
        </div>
      ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>{t.colOrderNo}</TableHead>
                <TableHead>{t.colSupplier}</TableHead>
                <TableHead className="hidden sm:table-cell">{t.colDate}</TableHead>
                <TableHead className="text-center">{t.colItemsCount}</TableHead>
                <TableHead className="text-center">{t.colTotal}</TableHead>
                <TableHead className="text-center w-40">{t.colActions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((po) => (
                <TableRow key={po.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs font-medium">
                    {poLabel(po)}
                  </TableCell>
                  <TableCell className="font-medium">{po.supplierName}</TableCell>
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
                    <div className="flex items-center justify-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5"
                        onClick={() => openDetail(po)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {t.open}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => openRejectFromList(po)}
                        aria-label={t.reject}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail / editor dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && closeDetail()}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-amber-600" />
              {t.reviewPoDraftTitle}
            </DialogTitle>
            <DialogDescription>
              {detail
                ? `${poLabel(detail)} — ${detail.supplierName} — ${fmt.dateTime(detail.createdAt)}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {detail ? (
            <div className="space-y-4">
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
                      <TableHead className="text-center w-28">{t.colQty}</TableHead>
                      <TableHead className="text-center w-32">{t.unitPrice}</TableHead>
                      <TableHead className="text-center">{t.colTotal}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editorItems.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell className="font-medium">{it.productName}</TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min={1}
                            className="h-8 text-center"
                            value={editedItems[it.id]?.quantity ?? ""}
                            onChange={(e) =>
                              updateItem(it.id, { quantity: e.target.value })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min={0}
                            step="0.001"
                            className="h-8 text-center"
                            value={editedItems[it.id]?.unitCost ?? ""}
                            onChange={(e) =>
                              updateItem(it.id, { unitCost: e.target.value })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center font-semibold tabular-nums">
                          {fmt.currency(it.subtotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-primary/5 px-4 py-3">
                <span className="text-sm font-medium">{t.totalAfterEdits}</span>
                <span className="text-lg font-bold tabular-nums text-primary">
                  {fmt.currency(editorTotal)}
                </span>
              </div>

              <DialogFooter className="sm:justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1.5 border-rose-500/40 text-rose-600 hover:bg-rose-500/5 hover:text-rose-700"
                  onClick={openRejectFromDetail}
                  disabled={rejectMut.isPending || approveMut.isPending}
                >
                  <XCircle className="h-4 w-4" />
                  {t.fullReject}
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() =>
                      setApproveTarget({ po: detail, withEdits: true })
                    }
                    disabled={approveMut.isPending || rejectMut.isPending}
                    title={hasEdits ? t.approveWithEditsTooltip : t.approveAsIsTooltip}
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    {t.editAndAccept}
                  </Button>
                  <Button
                    type="button"
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() =>
                      setApproveTarget({ po: detail, withEdits: false })
                    }
                    disabled={approveMut.isPending || rejectMut.isPending}
                  >
                    {approveMut.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {t.approveAndAccept}
                  </Button>
                </div>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Approve confirmation */}
      <ConfirmDialog
        open={!!approveTarget}
        onOpenChange={(o) => !o && setApproveTarget(null)}
        title={
          approveTarget?.withEdits
            ? t.editAndApprovePoTitle
            : t.approvePoTitle
        }
        description={
          approveTarget ? (
            <span className="flex flex-col gap-2 text-sm leading-relaxed">
              <span className="flex items-start gap-2 font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                {approveTarget.withEdits ? t.editAndApproveDescLong : t.approvePoDescLong}
              </span>
              <span>
                {t.poDetailsTitle}: <span className="font-mono">{poLabel(approveTarget.po)}</span>{" "}
                — {t.supplier}: <span className="font-semibold">{approveTarget.po.supplierName}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {t.afterApprovalReadyDesc}
              </span>
            </span>
          ) : null
        }
        confirmText={approveTarget?.withEdits ? t.editAndApproveButton : t.approveButton}
        destructive={false}
        confirmClassName="bg-emerald-600 hover:bg-emerald-700 text-white"
        loading={approveMut.isPending}
        onConfirm={approveTarget?.withEdits ? handleApproveWithEdits : handleApproveAsIs}
      />

      {/* Reject dialog (custom — needs a reason textarea) */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(o) => {
          if (!o) {
            setRejectTarget(null)
            setRejectReason("")
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" />
              {t.rejectPoTitleShort}
            </DialogTitle>
            <DialogDescription>
              {rejectTarget
                ? `${poLabel(rejectTarget)} — ${rejectTarget.supplierName}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">{t.rejectReason} *</Label>
            <Textarea
              id="reject-reason"
              placeholder={t.rejectReasonPlaceholderLong}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRejectTarget(null)
                setRejectReason("")
              }}
              disabled={rejectMut.isPending}
            >
              {t.cancel}
            </Button>
            <Button
              type="button"
              className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
              onClick={handleReject}
              disabled={rejectMut.isPending || !rejectReason.trim()}
            >
              {rejectMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {t.confirmRejectButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
