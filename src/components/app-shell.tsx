"use client"

import * as React from "react"
import { AppSidebar, MobileSidebar, Topbar } from "@/components/app-sidebar"
import { useAppStore } from "@/lib/store"
import { NAV_ITEMS } from "@/components/nav-config"
import { UserProvider, type SessionUser } from "@/components/user-context"
import { Boxes, Heart } from "lucide-react"
import { DashboardView } from "@/components/dashboard/dashboard-view"
import { InventoryView } from "@/components/inventory/inventory-view"
import { PurchasesView } from "@/components/purchases/purchases-view"
import { SuppliersView } from "@/components/purchases/suppliers-view"
import { SalesView } from "@/components/sales/sales-view"
import { InvoicesView } from "@/components/sales/invoices-view"
import { IntegrationsView } from "@/components/integrations/integrations-view"
import { AccountingView } from "@/components/accounting/accounting-view"
import { CustomersView } from "@/components/customers/customers-view"
import { AnalyticsView } from "@/components/analytics/analytics-view"

export type { SessionUser }

export function AppShell({ user }: { user: SessionUser }) {
  const view = useAppStore((s) => s.view)
  const setView = useAppStore((s) => s.setView)

  // Rehydrate persisted UI state (e.g. last selected view) AFTER hydration.
  // This runs only on the client, so the server-rendered HTML and the first
  // client render both use the default `view` ("dashboard") — preventing the
  // hydration mismatch that would otherwise shift Radix `useId` identifiers.
  React.useEffect(() => {
    useAppStore.persist.rehydrate()
  }, [])

  // Ensure the current view is allowed for the role; otherwise reset to dashboard.
  // Runs after rehydration so the persisted (possibly stale) view is validated.
  React.useEffect(() => {
    const allowed = NAV_ITEMS.map((n) => n.view)
    if (!allowed.includes(view)) setView("dashboard")
  }, [view, setView])

  const current = NAV_ITEMS.find((n) => n.view === view)
  const title = current?.label ?? "لوحة التحكم"

  return (
    <UserProvider user={user}>
      <div className="min-h-screen flex bg-background">
        <AppSidebar user={user} />
        <MobileSidebar user={user} />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar user={user} title={title} />
          <main className="flex-1 px-4 sm:px-6 py-6 w-full max-w-[1400px] mx-auto">
            {view === "dashboard" && <DashboardView />}
            {view === "inventory" && <InventoryView />}
            {view === "purchases" && <PurchasesView />}
            {view === "suppliers" && <SuppliersView />}
            {view === "sales" && <SalesView />}
            {view === "invoices" && <InvoicesView />}
            {view === "customers" && <CustomersView />}
            {view === "analytics" && <AnalyticsView />}
            {view === "accounting" && <AccountingView />}
            {view === "integrations" && <IntegrationsView />}
          </main>
          <footer className="mt-auto border-t border-border/70 bg-muted/30">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Boxes className="h-3.5 w-3.5" />
                </span>
                <span>نظام المتجر — إدارة المبيعات والمخازن والمشتريات</span>
              </div>
              <div className="flex items-center gap-1">
                <span>صُنع بـ</span>
                <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
                <span>للمشاريع الصغيرة</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </UserProvider>
  )
}
