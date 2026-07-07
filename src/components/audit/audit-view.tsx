"use client"

import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { TableSkeleton } from "@/components/shared/loading-state"
import { StatCard } from "@/components/shared/stat-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import {
  ShieldCheck, AlertTriangle, TrendingDown, Eye, Ban, Trash2,
  Lock, FileText, CheckCircle2, ShieldAlert, ArrowLeftRight, Tag,
} from "lucide-react"
import { useAuditLogs, useVoidRate } from "@/hooks/use-api"
import { useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"
import { cn } from "@/lib/utils"

export function AuditView() {
  const t = useT()
  const fmt = useFmt()
  const [actionFilter, setActionFilter] = React.useState("all")

  const { data: logsData, isLoading, isError, refetch } = useAuditLogs(
    actionFilter !== "all" ? { action: actionFilter } : undefined
  )
  const { data: voidRateData } = useVoidRate()

  const logs = logsData?.items ?? []
  const voidRows = voidRateData?.rows ?? []
  const flaggedCount = voidRateData?.flaggedCount ?? 0

  const totalLogs = logs.length
  const voidCount = logs.filter((l: any) => l.action === "VOID_ITEM").length
  const cancelCount = logs.filter((l: any) => l.action === "CANCEL_TXN").length
  const drawerCount = logs.filter((l: any) => l.action === "DRAWER_OPEN").length

  const ACTION_META: Record<string, { label: string; icon: any; className: string }> = {
    DRAWER_OPEN: { label: t.auditActionDrawerOpen, icon: Lock, className: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
    VOID_ITEM: { label: t.auditActionVoidItem, icon: Trash2, className: "bg-rose-500/15 text-rose-700 border-rose-500/30" },
    CANCEL_TXN: { label: t.auditActionCancelTxn, icon: Ban, className: "bg-rose-500/15 text-rose-700 border-rose-500/30" },
    HOLD_BILL: { label: t.auditActionHoldBill, icon: FileText, className: "bg-sky-500/15 text-sky-700 border-sky-500/30" },
    MANUAL_DISCOUNT: { label: t.auditActionManualDiscount, icon: Tag, className: "bg-violet-500/15 text-violet-700 border-violet-500/30" },
    REFUND: { label: t.auditActionRefund, icon: ArrowLeftRight, className: "bg-orange-500/15 text-orange-700 border-orange-500/30" },
    EXCHANGE: { label: t.auditActionExchange, icon: ArrowLeftRight, className: "bg-blue-500/15 text-blue-700 border-blue-500/30" },
    MANAGER_APPROVAL: { label: t.auditActionManagerApproval, icon: ShieldCheck, className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" },
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.auditTitle}
        description={t.auditDesc}
        icon={<ShieldCheck className="h-5 w-5" />}
        breadcrumbItems={[
          { labelKey: "navSystem" },
          { labelKey: "navAudit" },
        ]}
      />

      {/* KPI row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title={t.auditLogs} value={fmt.number(totalLogs)} icon={<Eye className="h-5 w-5" />} tone="default" />
        <StatCard title={t.auditActionVoidItem} value={fmt.number(voidCount)} icon={<Trash2 className="h-5 w-5" />} tone="danger" />
        <StatCard title={t.auditActionCancelTxn} value={fmt.number(cancelCount)} icon={<Ban className="h-5 w-5" />} tone="warning" />
        <StatCard title={t.auditActionDrawerOpen} value={fmt.number(drawerCount)} icon={<Lock className="h-5 w-5" />} tone="info" />
      </div>

      {/* Void rate alert */}
      {flaggedCount > 0 ? (
        <Card className="border-rose-500/40 bg-rose-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <ShieldAlert className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-700 dark:text-rose-400">
                {fmt.number(flaggedCount)} {t.auditSuspicious} — {t.auditVoidRate} &gt; 3%
              </p>
              <p className="text-sm text-muted-foreground mt-1">{t.auditVoidThresholdHint}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Void rate table */}
      {voidRows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-4 w-4 text-primary" />
              {t.auditVoidRate}
            </CardTitle>
            <CardDescription>{t.auditVoidThresholdHint}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {voidRows.map((r: any) => (
                <div key={r.userId} className="flex items-center gap-3">
                  <span className="w-28 text-sm font-medium truncate shrink-0">{r.userName}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(r.voidRate, 10)} className="h-2 flex-1" />
                      <span className={cn(
                        "text-sm font-bold tabular-nums w-16 text-end",
                        r.suspicious ? "text-rose-600" : "text-muted-foreground"
                      )}>
                        {fmt.number(r.voidRate)}%
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {fmt.number(r.voidCount)} / {fmt.number(r.totalItems)}
                    </p>
                  </div>
                  {r.suspicious ? (
                    <Badge variant="destructive" className="gap-1 shrink-0">
                      <AlertTriangle className="h-3 w-3" /> {t.auditSuspicious}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 shrink-0 text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" /> {t.auditNormal}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Filter + logs table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">{t.auditLogs}</CardTitle>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.all || "الكل"}</SelectItem>
                <SelectItem value="VOID_ITEM">{t.auditActionVoidItem}</SelectItem>
                <SelectItem value="CANCEL_TXN">{t.auditActionCancelTxn}</SelectItem>
                <SelectItem value="DRAWER_OPEN">{t.auditActionDrawerOpen}</SelectItem>
                <SelectItem value="HOLD_BILL">{t.auditActionHoldBill}</SelectItem>
                <SelectItem value="MANUAL_DISCOUNT">{t.auditActionManualDiscount}</SelectItem>
                <SelectItem value="REFUND">{t.auditActionRefund}</SelectItem>
                <SelectItem value="EXCHANGE">{t.auditActionExchange}</SelectItem>
                <SelectItem value="MANAGER_APPROVAL">{t.auditActionManagerApproval}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton />
          ) : isError ? (
            <EmptyState title={t.auditLogs} action={<Button onClick={() => refetch()}>{t.retry}</Button>} />
          ) : logs.length === 0 ? (
            <EmptyState icon={<ShieldCheck className="h-7 w-7" />} title={t.auditLogs} description={t.auditDesc} />
          ) : (
            <ScrollArea className="max-h-[60vh] scrollbar-thin pr-1">
              <div className="space-y-1.5">
                {logs.map((log: any) => {
                  const meta = ACTION_META[log.action] || { label: log.action, icon: Eye, className: "bg-muted text-muted-foreground" }
                  const Icon = meta.icon
                  return (
                    <div key={log.id} className="flex items-start gap-3 rounded-lg border border-border/60 bg-card p-3">
                      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", meta.className)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn("text-[10px]", meta.className)}>{meta.label}</Badge>
                          <span className="text-sm font-medium">{log.userName}</span>
                          {log.supervisorName ? (
                            <Badge variant="secondary" className="text-[10px] gap-1">
                              <ShieldCheck className="h-2.5 w-2.5" />
                              {log.supervisorName}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{log.description}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5" dir="ltr">
                          {new Date(log.createdAt).toLocaleString("en-GB")}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
