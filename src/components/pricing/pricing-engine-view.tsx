"use client"

import * as React from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
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
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog"
import {
  Tags,
  Search,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  Percent,
  Tag,
  History,
  Lock,
  Ban,
  Plus,
} from "lucide-react"
import { useUser } from "@/components/user-context"
import { useFmt } from "@/components/currency-context"
import { useT } from "@/components/i18n-context"
import {
  usePricingItems,
  useUpdatePrices,
  usePriceChangeAudit,
  usePromotions,
  useCreatePromotion,
  useDeactivatePromotion,
  useProducts,
  useCategories,
  type PricingItem,
  type PriceChangeEntry,
  type PromotionItem,
  type PromotionScope,
  type PriceTier,
  type BelowCostWarning,
} from "@/hooks/use-api"
import { cn } from "@/lib/utils"

/* ───────────────────────────── Helpers ────────────────────────────── */

/** Build the price-type label map using the current locale's dictionary. */
function usePriceTypeLabels(): Record<PriceTier, string> {
  const t = useT()
  return {
    RETAIL: t.tierRetail,
    WHOLESALE: t.tierWholesale,
    CORPORATE: t.tierCorporate,
  }
}

/** Format an ISO datetime-local string for the input value (yyyy-MM-ddTHH:mm). */
function toLocalInputValue(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso
  if (isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/* ──────────────────────── Confirm Dialog primitive ─────────────────── */
/**
 * A reusable confirmation dialog for the pricing engine that:
 *  - Blocks lone Enter (only Ctrl+Enter or explicit click confirms).
 *  - Disables backdrop/escape close (so a stray click can't abort the
 *    deliberate confirmation flow).
 *
 * Mirrors the pattern used by `SaleConfirmDialog`.
 */
function PricingConfirmDialog({
  open,
  onOpenChange,
  loading,
  onConfirm,
  title,
  description,
  confirmText,
  children,
  destructive = false,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  loading: boolean
  onConfirm: () => void
  title: string
  description: React.ReactNode
  confirmText: string
  children?: React.ReactNode
  destructive?: boolean
}) {
  const t = useT()
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !loading) {
      e.preventDefault()
      onConfirm()
    }
    if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      const target = e.target as HTMLElement
      if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
        e.preventDefault()
      }
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o && loading) return
        onOpenChange(o)
      }}
    >
      <AlertDialogContent
        className="max-w-md p-0 gap-0 overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        <div className="px-6 pt-6 pb-4 shrink-0 border-b border-border/60 text-center">
          <div
            className={cn(
              "mx-auto flex h-14 w-14 items-center justify-center rounded-full",
              destructive
                ? "bg-rose-500/10 text-rose-600"
                : "bg-amber-500/10 text-amber-600"
            )}
          >
            {destructive ? <AlertTriangle className="h-7 w-7" /> : <CheckCircle2 className="h-7 w-7" />}
          </div>
          <AlertDialogTitle className="mt-3 text-lg font-bold">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-xs mt-1 text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </div>

        {children ? <div className="px-6 py-4 max-h-[50vh] overflow-y-auto scrollbar-thin">{children}</div> : null}

        <div className="shrink-0 border-t border-border/60 bg-muted/20 px-6 py-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-1.5 border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              <X className="h-4 w-4" />
              {t.prcBack}
            </Button>
            <Button
              className={cn(
                "flex-1 gap-1.5 text-white",
                destructive
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              )}
              onClick={onConfirm}
              disabled={loading}
              title={t.prcConfirmTooltip}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {loading ? t.applying : confirmText}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            {t.prcCtrlEnterHint}{" "}
            <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">Ctrl</kbd>{" "}
            +{" "}
            <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">Enter</kbd>
          </p>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/* ──────────────────────── Price Management Tab ─────────────────────── */

interface StagedChange {
  productId: string
  priceType: PriceTier
  newPrice: number
  note?: string
}

function PriceManagementTab() {
  const fmt = useFmt()
  const t = useT()
  const user = useUser()
  const isAdmin = user.role === "ADMIN"
  const { data, isLoading, isError, refetch } = usePricingItems()
  const updateMut = useUpdatePrices()

  const [q, setQ] = React.useState("")
  // Staged changes keyed by `${productId}:${priceType}` so a single cell edit
  // overrides the same cell but doesn't collide with another tier.
  const [staged, setStaged] = React.useState<Record<string, StagedChange>>({})
  // The confirmation modal flow has three states:
  //   "closed" → no modal
  //   "simple" → simple "approve X changes?" modal (no below-cost items)
  //   "below-cost" → modal listing the below-cost items + warning
  const [modal, setModal] = React.useState<"closed" | "simple" | "below-cost">("closed")
  // The below-cost warnings captured from the 409 response (re-displayed
  // after the manager re-confirms with `confirm: true`).
  const [belowCost, setBelowCost] = React.useState<BelowCostWarning[]>([])

  const items = data?.items ?? []

  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return items
    return items.filter(
      (it) =>
        it.name.toLowerCase().includes(query) ||
        (it.barcode ?? "").toLowerCase().includes(query)
    )
  }, [items, q])

  const stagedList = React.useMemo(() => Object.values(staged), [staged])
  const stagedCount = stagedList.length

  function stageChange(productId: string, priceType: PriceTier, raw: string, originalPrice: number) {
    if (!isAdmin) return
    if (raw === "") {
      // Empty input → drop any previously staged change for this cell
      const key = `${productId}:${priceType}`
      setStaged((s) => {
        if (!s[key]) return s
        const next = { ...s }
        delete next[key]
        return next
      })
      return
    }
    const v = Number(raw)
    if (!Number.isFinite(v) || v < 0) return
    const key = `${productId}:${priceType}`
    setStaged((s) => {
      const next = { ...s }
      // Same as original → drop the staged change
      if (v === originalPrice) {
        delete next[key]
      } else {
        next[key] = { productId, priceType, newPrice: v }
      }
      return next
    })
  }

  function effectivePrice(it: PricingItem, tier: PriceTier): number {
    const key = `${it.id}:${tier}`
    if (staged[key]) return staged[key].newPrice
    if (tier === "WHOLESALE") return it.wholesalePrice
    if (tier === "CORPORATE") return it.corporatePrice
    return it.salePrice
  }

  function clearStaged() {
    setStaged({})
  }

  /** Initiate the apply flow. Sends confirm=false first; on 409 below-cost,
   * switches to the below-cost modal. On success, applies directly. */
  async function startApply() {
    if (stagedCount === 0) {
      toast.error(t.noChangesToApprove)
      return
    }
    // Pre-check client-side so we can offer the below-cost modal without a
    // round-trip. The server still re-checks for safety.
    const warnings: BelowCostWarning[] = []
    for (const c of stagedList) {
      const p = items.find((x) => x.id === c.productId)
      if (!p) continue
      if (c.newPrice < p.costPrice) {
        warnings.push({
          productId: p.id,
          name: p.name,
          costPrice: p.costPrice,
          newPrice: c.newPrice,
        })
      }
    }
    if (warnings.length > 0) {
      setBelowCost(warnings)
      setModal("below-cost")
    } else {
      setModal("simple")
    }
  }

  async function doApply(confirm: boolean) {
    try {
      const res = await updateMut.mutateAsync({
        changes: stagedList.map((c) => ({
          productId: c.productId,
          priceType: c.priceType,
          newPrice: c.newPrice,
          note: c.note,
        })),
        confirm,
      })
      toast.success(t.pricesApproved, {
        description: t.prcAppliedToastDesc
          .replace("{applied}", String(res.applied))
          .replace("{audits}", String(res.auditEntries)),
      })
      clearStaged()
      setModal("closed")
      setBelowCost([])
    } catch (err: any) {
      // Server-side cost guard: should be redundant with the client check
      // but handle it for safety (e.g. prices changed between load & submit).
      if (err?.error === "below-cost" && Array.isArray(err.warnings)) {
        setBelowCost(err.warnings as BelowCostWarning[])
        setModal("below-cost")
        toast.error(t.prcBelowCostAlertToast, {
          description: t.prcBelowCostAlertToastDesc,
        })
        return
      }
      toast.error(t.applyPricesFailed, { description: err?.message || String(err) })
    }
  }

  return (
    <div className="space-y-4">
      {/* Search + actions */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.searchNameBarcodePlaceholder}
            className="pr-9 h-10"
          />
        </div>
        {!isAdmin ? (
          <Badge variant="outline" className="gap-1.5 text-amber-700 border-amber-300 bg-amber-50">
            <Lock className="h-3.5 w-3.5" />
            {t.prcViewOnlyAdminCanEditBadge}
          </Badge>
        ) : null}
        {stagedCount > 0 ? (
          <Button variant="outline" size="sm" onClick={clearStaged} disabled={updateMut.isPending}>
            {t.prcCancelChangesCount.replace("{count}", fmt.number(stagedCount))}
          </Button>
        ) : null}
      </div>

      {/* Price table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.loadingPrices}
            </div>
          ) : isError ? (
            <div className="p-8 text-center text-sm text-rose-600">
              {t.pricesLoadFailed}{" "}
              <Button variant="link" className="h-auto p-0" onClick={() => refetch()}>
                {t.retry}
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">{t.noMatchingProducts}</div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-start">{t.colProduct}</TableHead>
                    <TableHead className="text-start">{t.colBarcode}</TableHead>
                    <TableHead className="text-start">{t.colCategory}</TableHead>
                    <TableHead className="text-center">{t.colCostPrice}</TableHead>
                    <TableHead className="text-center">{t.tierRetail}</TableHead>
                    <TableHead className="text-center">{t.tierWholesale}</TableHead>
                    <TableHead className="text-center">{t.tierCorporate}</TableHead>
                    <TableHead className="text-center">{t.promoActive}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((it) => {
                    const hasPromo = !!it.activePromotion
                    return (
                      <TableRow key={it.id} className={cn(hasPromo && "bg-emerald-50/40 dark:bg-emerald-950/10")}>
                        <TableCell className="font-medium max-w-[220px]">
                          <div className="truncate" title={it.name}>{it.name}</div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono" dir="ltr">
                          {it.barcode || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{it.categoryName || "—"}</TableCell>
                        <TableCell className="text-center tabular-nums text-muted-foreground">
                          {fmt.currency(it.costPrice)}
                        </TableCell>
                        {(["RETAIL", "WHOLESALE", "CORPORATE"] as PriceTier[]).map((tier) => {
                          const key = `${it.id}:${tier}`
                          const val = effectivePrice(it, tier)
                          const original = tier === "WHOLESALE" ? it.wholesalePrice : tier === "CORPORATE" ? it.corporatePrice : it.salePrice
                          const dirty = !!staged[key]
                          const belowCost = isAdmin && Number(val) < it.costPrice
                          return (
                            <TableCell key={tier} className="text-center">
                              <Input
                                type="number"
                                min={0}
                                step="0.001"
                                inputMode="decimal"
                                disabled={!isAdmin}
                                value={val}
                                onChange={(e) => stageChange(it.id, tier, e.target.value, original)}
                                className={cn(
                                  "h-8 w-24 mx-auto text-center tabular-nums",
                                  dirty && "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20",
                                  belowCost && "border-rose-400 bg-rose-50/60 dark:bg-rose-950/20",
                                  !isAdmin && "opacity-80 cursor-not-allowed"
                                )}
                                title={isAdmin ? undefined : t.prcInputLockedTitle}
                              />
                            </TableCell>
                          )
                        })}
                        <TableCell className="text-center">
                          {hasPromo ? (
                            <Badge variant="outline" className="gap-1 bg-emerald-500/10 text-emerald-700 border-emerald-300">
                              <Percent className="h-3 w-3" />
                              {it.activePromotion!.discountType === "PERCENT"
                                ? `−${fmt.number(it.activePromotion!.discountValue)}%`
                                : `−${fmt.currency(it.activePromotion!.discountValue)}`}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sticky footer — apply bar */}
      {isAdmin ? (
        <div className="sticky bottom-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-background/95 backdrop-blur border-t border-border/70 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {stagedCount > 0 ? (
                <>
                  {t.prcPendingCountDesc.replace("{count}", fmt.number(stagedCount))}
                </>
              ) : (
                t.editCellToEnable
              )}
            </div>
            <Button
              className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={stagedCount === 0 || updateMut.isPending}
              onClick={startApply}
            >
              {updateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {t.prcApproveAndApplyNew}
              {stagedCount > 0 ? <Badge className="bg-white/20 ml-1 tabular-nums">{fmt.number(stagedCount)}</Badge> : null}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Simple confirmation modal (no below-cost items) */}
      <PricingConfirmDialog
        open={modal === "simple"}
        onOpenChange={(o) => !o && setModal("closed")}
        loading={updateMut.isPending}
        onConfirm={() => doApply(false)}
        title={t.prcApproveCountTitle}
        description={
          <>
            {t.prcApproveCountDesc.replace("{count}", fmt.number(stagedCount))}
          </>
        }
        confirmText={t.approveAndApply}
      />

      {/* Below-cost warning modal */}
      <PricingConfirmDialog
        open={modal === "below-cost"}
        onOpenChange={(o) => !o && setModal("closed")}
        loading={updateMut.isPending}
        onConfirm={() => doApply(true)}
        title={t.prcBelowCostTitleFull}
        description={t.prcBelowCostDescFull}
        confirmText={t.confirmApplyAll}
      >
        <div className="space-y-2">
          <div className="rounded-lg border border-rose-200 bg-rose-50/60 dark:bg-rose-950/20 p-2.5 text-xs text-rose-700 dark:text-rose-300">
            <AlertTriangle className="inline h-3.5 w-3.5 mb-0.5 ml-1" />
            {t.violatingItemsCount.replace("{count}", fmt.number(belowCost.length))}
          </div>
          <div className="rounded-lg border border-border/70 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-start text-xs">{t.colItem}</TableHead>
                  <TableHead className="text-center text-xs">{t.colCostPrice}</TableHead>
                  <TableHead className="text-center text-xs">{t.prcNewPriceCol}</TableHead>
                  <TableHead className="text-center text-xs">{t.colVariance}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {belowCost.map((w) => (
                  <TableRow key={w.productId}>
                    <TableCell className="text-xs font-medium">{w.name}</TableCell>
                    <TableCell className="text-center tabular-nums text-xs">{fmt.currency(w.costPrice)}</TableCell>
                    <TableCell className="text-center tabular-nums text-xs font-semibold text-rose-600">{fmt.currency(w.newPrice)}</TableCell>
                    <TableCell className="text-center tabular-nums text-xs text-rose-600">
                      −{fmt.currency(w.costPrice - w.newPrice)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </PricingConfirmDialog>
    </div>
  )
}

/* ────────────────────────── Promotions Tab ─────────────────────────── */

function PromotionsTab() {
  const fmt = useFmt()
  const t = useT()
  const user = useUser()
  const isAdmin = user.role === "ADMIN"
  const { data, isLoading, isError, refetch } = usePromotions()
  const createMut = useCreatePromotion()
  const deactivateMut = useDeactivatePromotion()
  const { data: prodsData } = useProducts()
  const { data: catsData } = useCategories()

  // Scope: PRODUCT | CATEGORY | ALL | ALL_EXCEPT_CATEGORIES
  const [scope, setScope] = React.useState<PromotionScope>("PRODUCT")
  const [productId, setProductId] = React.useState("")
  const [selectedCatIds, setSelectedCatIds] = React.useState<string[]>([])
  const [discountType, setDiscountType] = React.useState<"PERCENT" | "AMOUNT">("PERCENT")
  const [discountValue, setDiscountValue] = React.useState("")
  // Default start = now (truncated to minute), end = +7 days.
  const [startAt, setStartAt] = React.useState(() => toLocalInputValue(new Date()))
  const [endAt, setEndAt] = React.useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return toLocalInputValue(d)
  })
  const [note, setNote] = React.useState("")

  const products = prodsData?.items ?? []
  const categories = catsData?.items ?? []
  const promos = data?.items ?? []

  function toggleCat(id: string) {
    setSelectedCatIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    // Scope-specific validation
    if (scope === "PRODUCT" && !productId) {
      toast.error(t.selectProductFirst)
      return
    }
    if ((scope === "CATEGORY" || scope === "ALL_EXCEPT_CATEGORIES") && selectedCatIds.length === 0) {
      toast.error(scope === "CATEGORY" ? t.prcSelectOneCategoryMin : t.prcSelectExcludedCategories)
      return
    }
    if (!discountValue || Number(discountValue) <= 0) {
      toast.error(t.discountMustBePositive)
      return
    }
    if (discountType === "PERCENT" && Number(discountValue) > 100) {
      toast.error(t.discountMax100)
      return
    }
    if (!startAt || !endAt) {
      toast.error(t.prcDateRangeRequired)
      return
    }
    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      toast.error(t.prcEndDateAfterStart)
      return
    }
    try {
      await createMut.mutateAsync({
        scope,
        productId: scope === "PRODUCT" ? productId : undefined,
        categoryIds: scope === "CATEGORY" || scope === "ALL_EXCEPT_CATEGORIES" ? selectedCatIds : undefined,
        discountType,
        discountValue: Number(discountValue),
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        note: note.trim() || undefined,
      })
      toast.success(t.promoCreated)
      setProductId("")
      setSelectedCatIds([])
      setDiscountValue("")
      setNote("")
      setStartAt(toLocalInputValue(new Date()))
      const d = new Date()
      d.setDate(d.getDate() + 7)
      setEndAt(toLocalInputValue(d))
    } catch (err: any) {
      toast.error(t.promoCreateFailed, { description: err?.message })
    }
  }

  async function handleDeactivate(p: PromotionItem) {
    const names = p.categoryNames.join(t.scopeCategory === "أقسام" ? "، " : ", ")
    const label = p.scope === "PRODUCT" ? (p.productName || "—")
      : p.scope === "CATEGORY" ? t.prcScopeCategoriesLabel.replace("{names}", names || "—")
      : p.scope === "ALL" ? t.prcScopeAllLabel
      : t.prcScopeAllExceptLabel.replace("{names}", names || "—")
    if (!confirm(t.prcDeactivateConfirm.replace("{label}", label))) return
    try {
      await deactivateMut.mutateAsync(p.id)
      toast.success(t.promoDeactivated)
    } catch (err: any) {
      toast.error(t.promoDeactivateFailed, { description: err?.message })
    }
  }

  const now = Date.now()
  const isLive = (p: PromotionItem) =>
    p.isActive && now >= new Date(p.startAt).getTime() && now <= new Date(p.endAt).getTime()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      {/* Create form */}
      {isAdmin ? (
        <Card className="lg:col-span-2 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4 text-primary" />
              {t.newPromotion}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-3">
              {/* Scope selector — drives which products the promo applies to */}
              <div className="space-y-1.5">
                <Label className="text-xs">{t.applyScope} *</Label>
                <Select value={scope} onValueChange={(v) => setScope(v as PromotionScope)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRODUCT">{t.scopeProduct}</SelectItem>
                    <SelectItem value="CATEGORY">{t.scopeCategory}</SelectItem>
                    <SelectItem value="ALL">{t.scopeAll}</SelectItem>
                    <SelectItem value="ALL_EXCEPT_CATEGORIES">{t.scopeAllExcept}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Conditional target based on scope */}
              {scope === "PRODUCT" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.product} *</Label>
                  <Select value={productId} onValueChange={setProductId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.selectProduct} />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {scope === "CATEGORY" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.includedCategories} *</Label>
                  <div className="max-h-40 overflow-y-auto scrollbar-thin rounded-lg border border-border/70 p-2 space-y-1">
                    {categories.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">{t.noCategories}</p>
                    ) : (
                      categories.map((c) => (
                        <label key={c.id} className="flex items-center gap-2 cursor-pointer rounded px-1.5 py-1 hover:bg-muted/50">
                          <input
                            type="checkbox"
                            checked={selectedCatIds.includes(c.id)}
                            onChange={() => toggleCat(c.id)}
                            className="h-4 w-4 accent-primary"
                          />
                          <span className="text-sm">{c.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                  {selectedCatIds.length > 0 ? (
                    <p className="text-[10px] text-muted-foreground">{fmt.number(selectedCatIds.length)} {t.categoriesSelected}</p>
                  ) : null}
                </div>
              ) : null}

              {scope === "ALL" ? (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5 text-xs text-muted-foreground">
                  {t.applyToAllDesc}
                </div>
              ) : null}

              {scope === "ALL_EXCEPT_CATEGORIES" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.excludedCategories} *</Label>
                  <div className="max-h-40 overflow-y-auto scrollbar-thin rounded-lg border border-border/70 p-2 space-y-1">
                    {categories.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">{t.noCategories}</p>
                    ) : (
                      categories.map((c) => (
                        <label key={c.id} className="flex items-center gap-2 cursor-pointer rounded px-1.5 py-1 hover:bg-muted/50">
                          <input
                            type="checkbox"
                            checked={selectedCatIds.includes(c.id)}
                            onChange={() => toggleCat(c.id)}
                            className="h-4 w-4 accent-primary"
                          />
                          <span className="text-sm">{c.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                  {selectedCatIds.length > 0 ? (
                    <p className="text-[10px] text-muted-foreground">{fmt.number(selectedCatIds.length)} {t.categoriesExcluded}</p>
                  ) : null}
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.discountType}</Label>
                  <Select value={discountType} onValueChange={(v) => setDiscountType(v as "PERCENT" | "AMOUNT")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENT">{t.percent}</SelectItem>
                      <SelectItem value="AMOUNT">{t.fixedAmount}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {t.value} {discountType === "PERCENT" ? "(%)" : `(${fmt.symbol})`}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step={discountType === "PERCENT" ? "1" : "0.001"}
                    inputMode="decimal"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === "PERCENT" ? t.prcDiscountPlaceholderPercent : t.prcDiscountPlaceholderAmount}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.fromDate2}</Label>
                  <Input
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.toDate2}</Label>
                  <Input
                    type="datetime-local"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">{t.noteOptional}</Label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t.prcNotePlaceholder}
                />
              </div>

              <Button type="submit" className="w-full gap-1.5" disabled={createMut.isPending}>
                {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {t.createPromotion}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {/* Promotions list */}
      <Card className={isAdmin ? "lg:col-span-3" : "lg:col-span-5"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Tag className="h-4 w-4 text-primary" />
            {t.currentPromotions}
            {!isLoading ? (
              <Badge variant="secondary" className="tabular-nums">{fmt.number(promos.length)}</Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.prcLoadingPromos}
            </div>
          ) : promos.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {t.noPromotions}{" "}{isAdmin ? t.createFirstPromo : ""}
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto scrollbar-thin pl-1">
              {promos.map((p) => {
                const live = isLive(p)
                const names = p.categoryNames.join(t.scopeCategory === "أقسام" ? "، " : ", ")
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "rounded-lg border p-3 flex items-start gap-3",
                      live
                        ? "border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/15"
                        : p.isActive
                          ? "border-amber-300 bg-amber-50/30 dark:bg-amber-950/10"
                          : "border-border/70 bg-muted/20 opacity-70"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">
                          {p.scope === "PRODUCT" ? (p.productName || "—")
                            : p.scope === "CATEGORY" ? t.prcScopeCategoriesLabel.replace("{names}", names || "—")
                            : p.scope === "ALL" ? t.prcScopeAllLabel
                            : t.prcScopeAllExceptLabel.replace("{names}", names || "—")}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-primary/10 text-primary border-primary/30"
                        >
                          {p.scope === "PRODUCT" ? t.scopeProductShort : p.scope === "CATEGORY" ? t.scopeCategoryShort : p.scope === "ALL" ? t.scopeAllShort : t.scopeAllExceptShort}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "tabular-nums",
                            live
                              ? "bg-emerald-500/15 text-emerald-700 border-emerald-300"
                              : p.isActive
                                ? "bg-amber-500/15 text-amber-700 border-amber-300"
                                : "bg-muted text-muted-foreground"
                          )}
                        >
                          {live ? t.activeNow : p.isActive ? t.scheduled : t.stopped}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 tabular-nums">
                        {p.discountType === "PERCENT"
                          ? t.prcDiscountValueLabel.replace("{value}", `${fmt.number(p.discountValue)}%`)
                          : t.prcDiscountValueLabel.replace("{value}", fmt.currency(p.discountValue))}
                        {" · "}
                        <span dir="ltr" className="font-mono">
                          {fmt.dateTime(p.startAt)} ← {fmt.dateTime(p.endAt)}
                        </span>
                      </div>
                      {p.note ? (
                        <div className="text-xs text-muted-foreground mt-1">📝 {p.note}</div>
                      ) : null}
                      {p.createdByName ? (
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {t.prcCreatedByLabel.replace("{name}", p.createdByName)}
                        </div>
                      ) : null}
                    </div>
                    {isAdmin && p.isActive ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        disabled={deactivateMut.isPending}
                        onClick={() => handleDeactivate(p)}
                      >
                        <Ban className="h-3.5 w-3.5" />
                        {t.deactivate}
                      </Button>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
          {isError ? (
            <div className="p-4 text-center">
              <Button variant="link" onClick={() => refetch()}>{t.prcReload}</Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

/* ────────────────────────── Audit Log Tab ──────────────────────────── */

function AuditLogTab() {
  const fmt = useFmt()
  const t = useT()
  const priceTypeLabel = usePriceTypeLabels()
  const { data, isLoading, isError, refetch } = usePriceChangeAudit()
  const [q, setQ] = React.useState("")

  const items: PriceChangeEntry[] = data?.items ?? []
  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return items
    return items.filter(
      (it) =>
        it.productName.toLowerCase().includes(query) ||
        (it.barcode ?? "").toLowerCase().includes(query) ||
        (it.changedByName ?? "").toLowerCase().includes(query)
    )
  }, [items, q])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.prcSearchAuditPlaceholder}
            className="pr-9 h-10"
          />
        </div>
        <Badge variant="outline" className="gap-1.5 text-amber-700 border-amber-300 bg-amber-50">
          <Lock className="h-3.5 w-3.5" />
          {t.prcAuditReadOnlyNotice}
        </Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.prcLoadingAuditShort}
            </div>
          ) : isError ? (
            <div className="p-8 text-center text-sm text-rose-600">
              {t.auditLoadFailed}{" "}
              <Button variant="link" className="h-auto p-0" onClick={() => refetch()}>
                {t.retry}
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">{t.prcNoMatchingLogEntries}</div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin max-h-[70vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/60 backdrop-blur z-10">
                  <TableRow>
                    <TableHead className="text-start">{t.colDate}</TableHead>
                    <TableHead className="text-start">{t.colItem}</TableHead>
                    <TableHead className="text-center">{t.colType}</TableHead>
                    <TableHead className="text-center">{t.colFrom}</TableHead>
                    <TableHead className="text-center">{t.colTo}</TableHead>
                    <TableHead className="text-center">{t.colChange}</TableHead>
                    <TableHead className="text-start">{t.colBy}</TableHead>
                    <TableHead className="text-start">{t.colNote}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const delta = r.newPrice - r.oldPrice
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs text-muted-foreground tabular-nums" dir="ltr">
                          {fmt.dateTime(r.changedAt)}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="truncate max-w-[200px]" title={r.productName}>{r.productName}</div>
                          {r.barcode ? (
                            <div className="text-[10px] text-muted-foreground font-mono" dir="ltr">{r.barcode}</div>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[10px]">
                            {priceTypeLabel[r.priceType] || r.priceType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center tabular-nums text-xs">{fmt.currency(r.oldPrice)}</TableCell>
                        <TableCell className="text-center tabular-nums text-xs font-semibold">{fmt.currency(r.newPrice)}</TableCell>
                        <TableCell className={cn("text-center tabular-nums text-xs font-medium", delta >= 0 ? "text-emerald-600" : "text-rose-600")}>
                          {delta >= 0 ? "+" : "−"}
                          {fmt.currency(Math.abs(delta))}
                        </TableCell>
                        <TableCell className="text-xs">{r.changedByName || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate" title={r.note ?? ""}>
                          {r.note || "—"}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/* ─────────────────────────── Main View ─────────────────────────────── */

export function PricingEngineView() {
  const t = useT()
  const [tab, setTab] = React.useState<"prices" | "promotions" | "audit">("prices")
  return (
    <div className="space-y-4">
      <PageHeader
        title={t.prcPageTitle}
        description={t.pricingDesc}
        icon={<Tags className="h-5 w-5" />}
      />


      {tab === "prices" && <PriceManagementTab />}
      {tab === "promotions" && <PromotionsTab />}
      {tab === "audit" && <AuditLogTab />}
    </div>
  )
}
