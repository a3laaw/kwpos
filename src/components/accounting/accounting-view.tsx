"use client"

import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

export function AccountingView() {
  const t = useT()

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.accountingTitle}
        description={t.accountingDesc}
        icon={<BookOpen className="h-5 w-5" />}
      />

      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="accounts" className="gap-1.5">
            <Wallet className="h-4 w-4" />
            {t.accJournalLedger}
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-1.5">
            <Receipt className="h-4 w-4" />
            {t.accExpenses}
          </TabsTrigger>
          <TabsTrigger value="journal" className="gap-1.5">
            <BookCopy className="h-4 w-4" />
            {t.accJournalEntries}
          </TabsTrigger>
          <TabsTrigger value="pnl" className="gap-1.5">
            <FileBarChart className="h-4 w-4" />
            {t.accPnl}
          </TabsTrigger>
          <TabsTrigger value="trial" className="gap-1.5">
            <Scale className="h-4 w-4" />
            {t.accTrialBalance}
          </TabsTrigger>
          <TabsTrigger value="balance" className="gap-1.5">
            <Scale className="h-4 w-4" />
            {t.accBalanceSheet}
          </TabsTrigger>
          <TabsTrigger value="cashflow" className="gap-1.5">
            <Banknote className="h-4 w-4" />
            {t.accCashFlow}
          </TabsTrigger>
          <TabsTrigger value="customer-statement" className="gap-1.5">
            <User2 className="h-4 w-4" />
            {t.accCustomerStatement}
          </TabsTrigger>
          <TabsTrigger value="vat" className="gap-1.5">
            <Percent className="h-4 w-4" />
            {t.accVatReport}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-0">
          <ChartOfAccountsTab />
        </TabsContent>
        <TabsContent value="expenses" className="mt-0">
          <ExpensesTab />
        </TabsContent>
        <TabsContent value="journal" className="mt-0">
          <JournalTab />
        </TabsContent>
        <TabsContent value="pnl" className="mt-0">
          <PnLTab />
        </TabsContent>
        <TabsContent value="trial" className="mt-0">
          <TrialBalanceTab />
        </TabsContent>
        <TabsContent value="balance" className="mt-0">
          <BalanceSheetTab />
        </TabsContent>
        <TabsContent value="cashflow" className="mt-0">
          <CashFlowTab />
        </TabsContent>
        <TabsContent value="customer-statement" className="mt-0">
          <CustomerStatementTab />
        </TabsContent>
        <TabsContent value="vat" className="mt-0">
          <VatReportTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
