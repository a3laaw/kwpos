"use client"

import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Wallet, Receipt, FileBarChart } from "lucide-react"
import { ChartOfAccountsTab } from "@/components/accounting/chart-of-accounts-tab"
import { ExpensesTab } from "@/components/accounting/expenses-tab"
import { PnLTab } from "@/components/accounting/pnl-tab"

export function AccountingView() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="المحاسبة والمصروفات"
        description="شجرة الحسابات، تسجيل الرواتب والمصروفات الإدارية، والتقارير المالية (قائمة الأرباح والخسائر)."
        icon={<BookOpen className="h-5 w-5" />}
      />

      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="accounts" className="gap-1.5">
            <Wallet className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">شجرة الحسابات</span>
            <span className="sm:hidden">الحسابات</span>
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-1.5">
            <Receipt className="h-3.5 w-3.5" />
            المصروفات
          </TabsTrigger>
          <TabsTrigger value="pnl" className="gap-1.5">
            <FileBarChart className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">الأرباح والخسائر</span>
            <span className="sm:hidden">P&L</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4 mt-0">
          <ChartOfAccountsTab />
        </TabsContent>
        <TabsContent value="expenses" className="mt-0">
          <ExpensesTab />
        </TabsContent>
        <TabsContent value="pnl" className="mt-0">
          <PnLTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
