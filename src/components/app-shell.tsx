"use client"

import * as React from "react"
import { AppSidebar, MobileSidebar, Topbar } from "@/components/app-sidebar"
import { useAppStore } from "@/lib/store"
import { VIEW_META } from "@/components/nav-config"
import { ROLE_PERMISSIONS } from "@/lib/session"
import { useT } from "@/components/i18n-context"
import { UserProvider, type SessionUser } from "@/components/user-context"
import { CurrencyProvider } from "@/components/currency-context"
import type { CountryConfig } from "@/lib/countries"
import { Boxes, Heart } from "lucide-react"
import { DashboardView } from "@/components/dashboard/dashboard-view"
import { ManagerDashboardView } from "@/components/dashboard/manager-dashboard-view"
import { OwnerDashboardView } from "@/components/dashboard/owner-dashboard-view"
import { InventoryView } from "@/components/inventory/inventory-view"
import { PurchasesView } from "@/components/purchases/purchases-view"
import { SuppliersView } from "@/components/purchases/suppliers-view"
import { SalesView } from "@/components/sales/sales-view"
import { InvoicesView } from "@/components/sales/invoices-view"
import { IntegrationsView } from "@/components/integrations/integrations-view"
import { AccountingView } from "@/components/accounting/accounting-view"
import { CustomersView } from "@/components/customers/customers-view"
import { AnalyticsView } from "@/components/analytics/analytics-view"
import { ReportsView } from "@/components/reports/reports-view"
import { SettingsView } from "@/components/settings/settings-view"
import { UsersView } from "@/components/settings/users-view"
import { AuditView } from "@/components/audit/audit-view"
import { ShiftView } from "@/components/shift/shift-view"
import { SpotCheckView } from "@/components/spotcheck/spotcheck-view"
import { ExchangeView } from "@/components/sales/exchange-view"
import { PricingEngineView } from "@/components/pricing/pricing-engine-view"
import { BundlesView } from "@/components/bundles/bundles-view"
import { CompositionsView } from "@/components/compositions/compositions-view"

export type { SessionUser }

export function AppShell({
  user,
  country,
}: {
  user: SessionUser
  country: CountryConfig
}) {
  const view = useAppStore((s) => s.view)
  const setView = useAppStore((s) => s.setView)

  // Rehydrate persisted UI state (e.g. last selected view) AFTER hydration.
  // This runs only on the client, so the server-rendered HTML and the first
  // client render both use the default `view` ("dashboard") — preventing the
  // hydration mismatch that would otherwise shift Radix `useId` identifiers.
  React.useEffect(() => {
    useAppStore.persist.rehydrate()
  }, [])

  // Ensure the current view is allowed for the role; otherwise redirect.
  // CASHIER → goes directly to POS (no dashboard).
  // Other roles → default to dashboard if allowed, else their first
  // allowed view (e.g. ACCOUNTANT → accounting, WAREHOUSE → inventory).
  React.useEffect(() => {
    const allowed = ROLE_PERMISSIONS[user.role].views
    if (!allowed.includes(view)) {
      const fallback = allowed.includes("dashboard")
        ? "dashboard"
        : allowed[0] ?? "sales"
      setView(fallback)
    }
  }, [view, setView, user.role])

  const t = useT()
  const meta = VIEW_META[view]
  const title = meta ? t[meta.titleKey] : t.dashboardTitle

  // Defense-in-depth: never render a view the role is not allowed to see,
  // even if the persisted store somehow holds a disallowed view. The
  // useEffect above will correct the store, but until it runs (first paint)
  // we render nothing for disallowed views instead of leaking the component.
  const allowedViews = ROLE_PERMISSIONS[user.role].views
  const isViewAllowed = allowedViews.includes(view)

  return (
    <CurrencyProvider country={country}>
      <UserProvider user={user}>
        <div className="h-screen flex bg-background overflow-hidden">
          <AppSidebar user={user} />
          <MobileSidebar user={user} />
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <Topbar user={user} title={title} country={country} />
            <main className="flex-1 px-4 sm:px-6 py-6 w-full overflow-y-auto min-h-0 scrollbar-thin">
              {!isViewAllowed ? null : (
                <>
              {view === "dashboard" && <DashboardView />}
              {view === "ownerDashboard" && <OwnerDashboardView />}
              {view === "managerDashboard" && <ManagerDashboardView />}
              {view === "inventory" && <InventoryView />}
              {view === "purchases" && <PurchasesView />}
              {view === "suppliers" && <SuppliersView />}
              {view === "sales" && <SalesView />}
              {view === "invoices" && <InvoicesView />}
              {view === "customers" && <CustomersView />}
              {view === "analytics" && <AnalyticsView />}
              {view === "reports" && <ReportsView />}
              {view === "accounting" && <AccountingView />}
              {view === "integrations" && <IntegrationsView />}
              {view === "shifts" && <ShiftView />}
              {view === "spotcheck" && <SpotCheckView />}
              {view === "exchanges" && <ExchangeView />}
              {view === "pricing" && <PricingEngineView />}
              {view === "users" && <UsersView />}
              {view === "audit" && <AuditView />}
              {view === "settings" && <SettingsView />}
              {view === "bundles" && <BundlesView />}
              {view === "compositions" && <CompositionsView />}
                </>
              )}
            </main>
            <footer className="mt-auto border-t border-border/70 bg-muted/30">
              <div className="w-full px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Boxes className="h-3.5 w-3.5" />
                  </span>
                  <span>{t.appName} — {t.appTagline}</span>
                  <span className="text-base leading-none">{country.flag}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>{t.appMadeWith}</span>
                  <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
                  <span>{t.appForSmallProjects}</span>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </UserProvider>
    </CurrencyProvider>
  )
}
