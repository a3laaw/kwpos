"use client"

import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Wallet, Receipt, FileBarChart, BookCopy, Scale } from "lucide-react"
import { ChartOfAccountsTab } from "@/components/accounting/chart-of-accounts-tab"
import { ExpensesTab } from "@/components/accounting/expenses-tab"
import { PnLTab } from "@/components/accounting/pnl-tab"
import { JournalTab, TrialBalanceTab } from "@/components/accounting/journal-tab"
import { useAccounts } from "@/hooks/use-api"
import { cn } from "@/lib/utils"

type AccTab = "accounts" | "expenses" | "journal" | "pnl" | "trial"

export function AccountingView() {
  const [tab, setTab] = React.useState<AccTab>("accounts")
  const { data: accountsData } = useAccounts()
  const accountsCount = accountsData?.flat?.length ?? 0

  const cards: Array<{
    key: AccTab
    label: string
    icon: any
    kpi?: string
    hint: string
    tone: string
    iconBg: string
  }> = [
    { key: "accounts", label: "شجرة الحسابات", icon: Wallet, kpi: String(accountsCount), hint: "حساب", tone: "text-primary", iconBg: "bg-primary/10" },
    { key: "expenses", label: "المصروفات", icon: Receipt, hint: "رواتب ومصروفات إدارية", tone: "text-amber-600", iconBg: "bg-amber-500/10" },
    { key: "journal", label: "القيود المحاسبية", icon: BookCopy, hint: "دفتر اليومية المزدوج", tone: "text-[#055BE5]", iconBg: "bg-[#055BE5]/10" },
    { key: "pnl", label: "الأرباح والخسائر", icon: FileBarChart, hint: "قائمة P&L", tone: "text-[#5CDE9D]", iconBg: "bg-[#5CDE9D]/10" },
    { key: "trial", label: "ميزان المراجعة", icon: Scale, hint: "أرصدة الحسابات", tone: "text-[#185B6B]", iconBg: "bg-[#185B6B]/10" },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="المحاسبة والمصروفات"
        description="شجرة الحسابات، القيود المحاسبية المزدوجة، الرواتب والمصروفات، والتقارير المالية."
        icon={<BookOpen className="h-5 w-5" />}
      />

      {/* Clickable report cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((c) => {
          const Icon = c.icon
          const active = tab === c.key
          return (
            <button
              key={c.key}
              onClick={() => setTab(c.key)}
              className={cn(
                "group relative flex flex-col gap-2 rounded-xl border p-4 text-right transition-all",
                active
                  ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-sm"
                  : "border-border/70 hover:border-primary/40 hover:shadow-sm bg-card"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", c.iconBg, c.tone)}>
                  <Icon className="h-4.5 w-4.5" />
                </span>
                {active ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{c.label}</p>
                {c.kpi ? (
                  <p className={cn("text-lg font-bold tabular-nums leading-tight mt-0.5", c.tone)}>{c.kpi}</p>
                ) : (
                  <p className="text-sm font-medium mt-0.5 truncate">{c.hint}</p>
                )}
                {c.kpi ? <p className="text-[10px] text-muted-foreground truncate">{c.hint}</p> : null}
              </div>
            </button>
          )
        })}
      </div>

      {/* Active tab content */}
      {tab === "accounts" && <ChartOfAccountsTab />}
      {tab === "expenses" && <ExpensesTab />}
      {tab === "journal" && <JournalTab />}
      {tab === "pnl" && <PnLTab />}
      {tab === "trial" && <TrialBalanceTab />}
    </div>
  )
}
