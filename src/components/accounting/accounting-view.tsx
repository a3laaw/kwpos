"use client"

import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { BookOpen, Wallet, Receipt, FileBarChart, BookCopy, Scale, Banknote, User2, Percent, FileText } from "lucide-react"
import { ChartOfAccountsTab } from "@/components/accounting/chart-of-accounts-tab"
import { ExpensesTab } from "@/components/accounting/expenses-tab"
import { PnLTab } from "@/components/accounting/pnl-tab"
import { JournalTab, TrialBalanceTab } from "@/components/accounting/journal-tab"
import { BalanceSheetTab } from "@/components/accounting/balance-sheet-tab"
import { CashFlowTab } from "@/components/accounting/cash-flow-tab"
import { CustomerStatementTab } from "@/components/accounting/customer-statement-tab"
import { VatReportTab } from "@/components/accounting/vat-report-tab"
import { GeneralLedgerTab } from "@/components/accounting/general-ledger-tab"
import { useT } from "@/components/i18n-context"
import { useModuleTab } from "@/lib/module-tab-store"
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
  | "general-ledger"

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
  "general-ledger": "generalLedger",
}

export function AccountingView() {
  const t = useT()
  const [tab] = useModuleTab("accounting", "accounts")

  return (
    <div className="space-y-4">
      <PageHeader
        title={t.accountingTitle}
        description={t.accountingDesc}
        icon={<BookOpen className="h-5 w-5" />}
        breadcrumbItems={[
          { labelKey: "navAccounting" },
          { labelKey: TAB_LABELS[tab as AccTab] },
        ]}
      />

      {tab === "accounts" && <ChartOfAccountsTab />}
      {tab === "expenses" && <ExpensesTab />}
      {tab === "journal" && <JournalTab />}
      {tab === "pnl" && <PnLTab />}
      {tab === "trial" && <TrialBalanceTab />}
      {tab === "balance" && <BalanceSheetTab />}
      {tab === "cashflow" && <CashFlowTab />}
      {tab === "customer-statement" && <CustomerStatementTab />}
      {tab === "vat" && <VatReportTab />}
      {tab === "general-ledger" && <GeneralLedgerTab />}
    </div>
  )
}
