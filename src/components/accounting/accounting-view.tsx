"use client"

import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { ContextDropdown, type ContextNavItem } from "@/components/shared/context-dropdown"
import { Breadcrumbs } from "@/components/shared/breadcrumbs"
import { BookOpen, Wallet, Receipt, FileBarChart, BookCopy, Scale, Banknote, User2, Percent } from "lucide-react"
import { ChartOfAccountsTab } from "@/components/accounting/chart-of-accounts-tab"
import { ExpensesTab } from "@/components/accounting/expenses-tab"
import { PnLTab } from "@/components/accounting/pnl-tab"
import { JournalTab, TrialBalanceTab } from "@/components/accounting/journal-tab"
import { BalanceSheetTab } from "@/components/accounting/balance-sheet-tab"
import { CashFlowTab } from "@/components/accounting/cash-flow-tab"
import { CustomerStatementTab } from "@/components/accounting/customer-statement-tab"
import { VatReportTab } from "@/components/accounting/vat-report-tab"
import { useT } from "@/components/i18n-context"
import type { Dict } from "@/lib/i18n"

type AccTab =
  | "accounts"
  | "expenses"
  | "journal"
  | "pnl"
  | "trial"
  | "balance"
  | "cashflow"
  | "customer-statement"
  | "vat"

const TAB_LABELS: Record<AccTab, keyof Dict> = {
  accounts: "accJournalLedger",
  expenses: "accExpenses",
  journal: "accJournalEntries",
  pnl: "accPnl",
  trial: "accTrialBalance",
  balance: "accBalanceSheet",
  cashflow: "accCashFlow",
  "customer-statement": "accCustomerStatement",
  vat: "accVatReport",
}

export function AccountingView() {
  const t = useT()
  const [tab, setTab] = React.useState<AccTab>("accounts")

  const items: ContextNavItem[] = [
    { value: "accounts", labelKey: "accJournalLedger", icon: Wallet },
    { value: "expenses", labelKey: "accExpenses", icon: Receipt },
    { value: "journal", labelKey: "accJournalEntries", icon: BookCopy },
    { value: "pnl", labelKey: "accPnl", icon: FileBarChart },
    { value: "trial", labelKey: "accTrialBalance", icon: Scale },
    { value: "balance", labelKey: "accBalanceSheet", icon: Scale },
    { value: "cashflow", labelKey: "accCashFlow", icon: Banknote },
    { value: "customer-statement", labelKey: "accCustomerStatement", icon: User2 },
    { value: "vat", labelKey: "accVatReport", icon: Percent },
  ]

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { labelKey: "navAccounting" },
          { labelKey: TAB_LABELS[tab] },
        ]}
      />

      <PageHeader
        title={t.accountingTitle}
        description={t.accountingDesc}
        icon={<BookOpen className="h-5 w-5" />}
      />

      {/* Context dropdown for 9 items (replaces horizontal SubNav) */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <ContextDropdown
          sectionLabel={t.navAccounting}
          items={items}
          value={tab}
          onChange={(v) => setTab(v as AccTab)}
        />
      </div>

      {tab === "accounts" && <ChartOfAccountsTab />}
      {tab === "expenses" && <ExpensesTab />}
      {tab === "journal" && <JournalTab />}
      {tab === "pnl" && <PnLTab />}
      {tab === "trial" && <TrialBalanceTab />}
      {tab === "balance" && <BalanceSheetTab />}
      {tab === "cashflow" && <CashFlowTab />}
      {tab === "customer-statement" && <CustomerStatementTab />}
      {tab === "vat" && <VatReportTab />}
    </div>
  )
}
