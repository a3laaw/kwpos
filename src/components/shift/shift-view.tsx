"use client"

import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { LoadingState } from "@/components/shared/loading-state"
import { EmptyState } from "@/components/shared/empty-state"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Clock,
  Play,
  Square,
  Wallet,
  CreditCard,
  Banknote,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  TrendingUp,
  TrendingDown,
} from "lucide-react"
import { useShifts, useOpenShift, useCloseShift, type ShiftItem } from "@/hooks/use-api"
import { useFmt } from "@/components/currency-context"
import { useT } from "@/components/i18n-context"
import { cn } from "@/lib/utils"

export function ShiftView() {
  const t = useT()
  const fmt = useFmt()
  const { data, isLoading, refetch } = useShifts()
  const openMut = useOpenShift()
  const closeMut = useCloseShift()

  const items = data?.items ?? []
  const activeShift = items.find((s) => s.status === "OPEN") || null
  const closedShifts = items.filter((s) => s.status === "CLOSED")

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.shiftsTitle}
        description={t.shfDescFull}
        icon={<Clock className="h-5 w-5" />}
        breadcrumbItems={[
          { labelKey: "navOperations" },
          { labelKey: "navShifts" },
        ]}
        actions={
          !activeShift ? (
            <Button onClick={() => openMut.mutate()} disabled={openMut.isPending} className="gap-2">
              {openMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {t.shfOpenNewShift}
            </Button>
          ) : null
        }
      />

      {isLoading ? (
        <LoadingState text={t.loadingShifts} />
      ) : !data ? (
        <EmptyState title={t.shfLoadFailed} action={<Button onClick={() => refetch()}>{t.retry}</Button>} />
      ) : activeShift ? (
        <CloseShiftForm shift={activeShift} onClose={(body) => closeMut.mutate(body)} loading={closeMut.isPending} />
      ) : (
        <EmptyState
          title={t.shfNoOpenShift}
          description={t.shfNoOpenShiftDesc}
          action={
            <Button onClick={() => openMut.mutate()} disabled={openMut.isPending} className="gap-2">
              {openMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {t.shfOpenShift}
            </Button>
          }
        />
      )}

      {/* Closed shifts history */}
      {closedShifts.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.shfClosedShiftsHistory}</CardTitle>
            <CardDescription className="text-xs">{t.shfLastShiftsCount.replace("{count}", fmt.number(closedShifts.length))}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm min-w-[800px]">
                <thead className="bg-muted/40">
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-start py-2.5 px-3 font-semibold">{t.shfColShiftNo}</th>
                    <th className="text-center py-2.5 px-3 font-semibold">{t.shfColPeriod}</th>
                    <th className="text-center py-2.5 px-3 font-semibold">{t.shfColCashVariance}</th>
                    <th className="text-center py-2.5 px-3 font-semibold">{t.shfColKnetVariance}</th>
                    <th className="text-center py-2.5 px-3 font-semibold">{t.shfColVisaVariance}</th>
                  </tr>
                </thead>
                <tbody>
                  {closedShifts.map((s) => (
                    <tr key={s.id} className="border-b border-border/40 hover:bg-muted/20">
                      <td className="py-2 px-3 font-mono text-xs">{s.shiftNo}</td>
                      <td className="py-2 px-3 text-center text-xs text-muted-foreground">
                        {fmt.dateTime(s.openedAt)} ← {s.closedAt ? fmt.dateTime(s.closedAt) : "—"}
                      </td>
                      <td className="py-2 px-3 text-center tabular-nums">
                        <span>{fmt.currency(s.countedCash)}</span>
                        <VarianceBadge value={s.cashVariance} />
                      </td>
                      <td className="py-2 px-3 text-center tabular-nums">
                        <span>{fmt.currency(s.countedKnet)}</span>
                        <VarianceBadge value={s.knetVariance} />
                      </td>
                      <td className="py-2 px-3 text-center tabular-nums">
                        <span>{fmt.currency(s.countedVisa)}</span>
                        <VarianceBadge value={s.visaVariance} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function CloseShiftForm({
  shift,
  onClose,
  loading,
}: {
  shift: ShiftItem
  onClose: (body: { id: string; countedCash: number; countedKnet: number; countedVisa: number; note?: string }) => void
  loading: boolean
}) {
  const t = useT()
  const fmt = useFmt()
  const [countedCash, setCountedCash] = React.useState("")
  const [countedKnet, setCountedKnet] = React.useState("")
  const [countedVisa, setCountedVisa] = React.useState("")
  const [note, setNote] = React.useState("")

  // Expected totals are computed at close on the server. The active shift row
  // may not have them yet (0 until closed). We show the server's authoritative
  // expected values only after close; before that, prompt the cashier to enter
  // counted amounts which the server will reconcile.
  const expectedCash = shift.expectedCash || 0
  const expectedKnet = shift.expectedKnet || 0
  const expectedVisa = shift.expectedVisa || 0

  const cCash = Number(countedCash) || 0
  const cKnet = Number(countedKnet) || 0
  const cVisa = Number(countedVisa) || 0
  const cashVar = cCash - expectedCash
  const knetVar = cKnet - expectedKnet
  const visaVar = cVisa - expectedVisa

  function handleSubmit() {
    onClose({
      id: shift.id,
      countedCash: cCash,
      countedKnet: cKnet,
      countedVisa: cVisa,
      note: note.trim() || undefined,
    })
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              {t.shfActiveShiftLabel.replace("{no}", shift.shiftNo)}
            </CardTitle>
            <CardDescription className="text-xs">
              {t.shfOpenedAtDesc.replace("{x}", fmt.dateTime(shift.openedAt))}
            </CardDescription>
          </div>
          <Badge className="bg-emerald-500/15 text-emerald-600">{t.shfOpen}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Expected vs counted — 3 columns: Cash, K-Net, Visa */}
        <div className="grid gap-3 sm:grid-cols-3">
          <ReconcileColumn
            icon={<Wallet className="h-4 w-4" />}
            label={t.shfCashLabel}
            expected={expectedCash}
            counted={cCash}
            variance={cashVar}
            value={countedCash}
            onChange={setCountedCash}
            fmt={fmt}
            t={t}
          />
          <ReconcileColumn
            icon={<CreditCard className="h-4 w-4" />}
            label={t.shfKnet}
            expected={expectedKnet}
            counted={cKnet}
            variance={knetVar}
            value={countedKnet}
            onChange={setCountedKnet}
            fmt={fmt}
            t={t}
          />
          <ReconcileColumn
            icon={<Banknote className="h-4 w-4" />}
            label={t.shfVisaMasterShort}
            expected={expectedVisa}
            counted={cVisa}
            variance={visaVar}
            value={countedVisa}
            onChange={setCountedVisa}
            fmt={fmt}
            t={t}
          />
        </div>

        {/* Electronic payment variance warning */}
        {(Math.abs(knetVar) > 0.001 || Math.abs(visaVar) > 0.001) ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-medium">
              <AlertTriangle className="h-4 w-4" />
              {t.shfElectronicPaymentVariances}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t.shfVarianceExplanation}
            </p>
            <div className="mt-2 flex gap-4 text-xs">
              <span>{t.shfKnetVariance}: <strong className={cn(knetVar < 0 ? "text-rose-600" : "text-emerald-600")}>{fmt.currency(knetVar)}</strong></span>
              <span>{t.shfVisaVariance}: <strong className={cn(visaVar < 0 ? "text-rose-600" : "text-emerald-600")}>{fmt.currency(visaVar)}</strong></span>
            </div>
          </div>
        ) : null}

        <div>
          <Label htmlFor="shift-note" className="text-xs">{t.noteOptional}</Label>
          <Input id="shift-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.shfNotePlaceholder} className="h-9" />
        </div>

        <Separator />
        <div className="flex justify-end gap-2">
          <Button onClick={handleSubmit} disabled={loading} className="gap-2 bg-rose-600 hover:bg-rose-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
            {t.shfCloseShiftAndReconcile}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ReconcileColumn({
  icon,
  label,
  expected,
  counted,
  variance,
  value,
  onChange,
  fmt,
  t,
}: {
  icon: React.ReactNode
  label: string
  expected: number
  counted: number
  variance: number
  value: string
  onChange: (v: string) => void
  fmt: ReturnType<typeof useFmt>
  t: ReturnType<typeof useT>
}) {
  return (
    <div className="rounded-lg border border-border/70 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {icon}
          {label}
        </span>
        {Math.abs(variance) < 0.001 && counted > 0 ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : null}
      </div>
      <div className="text-xs text-muted-foreground">
        {t.shfExpectedBook}: <span className="tabular-nums font-medium text-foreground">{fmt.currency(expected)}</span>
      </div>
      <div>
        <Label className="text-[10px] text-muted-foreground">{t.shfActualFromMachine}</Label>
        <Input
          type="number"
          min={0}
          step="0.001"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 tabular-nums"
          placeholder="0.000"
        />
      </div>
      {counted > 0 ? (
        <div className={cn(
          "flex items-center justify-between text-xs rounded px-2 py-1",
          Math.abs(variance) < 0.001 ? "bg-emerald-500/10 text-emerald-600" : variance < 0 ? "bg-rose-500/10 text-rose-600" : "bg-sky-500/10 text-sky-600"
        )}>
          <span className="flex items-center gap-1">
            {variance < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
            {t.shfVariance}
          </span>
          <span className="tabular-nums font-bold">{fmt.currency(variance)}</span>
        </div>
      ) : null}
    </div>
  )
}

function VarianceBadge({ value }: { value: number }) {
  if (Math.abs(value) < 0.001) {
    return <span className="text-[10px] text-emerald-600 ms-1">✓</span>
  }
  return (
    <span className={cn("text-[10px] ms-1 tabular-nums", value < 0 ? "text-rose-600" : "text-sky-600")}>
      ({value > 0 ? "+" : ""}{value.toFixed(3)})
    </span>
  )
}
