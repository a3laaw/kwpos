"use client"

import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Wallet, Receipt, FileBarChart, BookCopy, Scale } from "lucide-react"
import { ChartOfAccountsTab } from "@/components/accounting/chart-of-accounts-tab"
import { ExpensesTab } from "@/components/accounting/expenses-tab"
import { PnLTab } from "@/components/accounting/pnl-tab"
import { JournalTab, TrialBalanceTab } from "@/components/accounting/journal-tab"

export function AccountingView() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="المحاسبة والمصروفات"
        description="شجرة الحسابات، القيود المحاسبية المزدوجة، الرواتب والمصروفات، والتقارير المالية."
        icon={<BookOpen className="h-5 w-5" />}
      />

      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 max-w-2xl">
          <TabsTrigger value="accounts" className="gap-1.5">
            <Wallet className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">الحسابات</span>
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-1.5">
            <Receipt className="h-3.5 w-3.5" />
            المصروفات
          </TabsTrigger>
          <TabsTrigger value="journal" className="gap-1.5">
            <BookCopy className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">القيود</span>
          </TabsTrigger>
          <TabsTrigger value="pnl" className="gap-1.5">
            <FileBarChart className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">الأرباح</span>
          </TabsTrigger>
          <TabsTrigger value="trial" className="gap-1.5">
            <Scale className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">الميزان</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4 mt-0">
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
      </Tabs>
    </div>
  )
}
