import type { AppView } from "@/lib/types"
import {
  LayoutDashboard,
  Boxes,
  ShoppingCart,
  Truck,
  Calculator,
  ReceiptText,
  Plug,
  BookOpen,
  Users,
  BarChart3,
  Settings as SettingsIcon,
  FileBarChart,
} from "lucide-react"
import type { Dict } from "@/lib/i18n"

export interface NavItem {
  view: AppView
  /** key into the i18n Dict for the localized label */
  labelKey: keyof Dict
  icon: typeof LayoutDashboard
}

export const NAV_ITEMS: NavItem[] = [
  { view: "dashboard", labelKey: "navDashboard", icon: LayoutDashboard },
  { view: "sales", labelKey: "navSales", icon: Calculator },
  { view: "invoices", labelKey: "navInvoices", icon: ReceiptText },
  { view: "reports", labelKey: "navReports", icon: FileBarChart },
  { view: "inventory", labelKey: "navInventory", icon: Boxes },
  { view: "purchases", labelKey: "navPurchases", icon: ShoppingCart },
  { view: "suppliers", labelKey: "navSuppliers", icon: Truck },
  { view: "customers", labelKey: "navCustomers", icon: Users },
  { view: "analytics", labelKey: "navAnalytics", icon: BarChart3 },
  { view: "accounting", labelKey: "navAccounting", icon: BookOpen },
  { view: "integrations", labelKey: "navIntegrations", icon: Plug },
  { view: "settings", labelKey: "navSettings", icon: SettingsIcon },
]

/** Map a view to its page-title dict key + description dict key. */
export const VIEW_META: Record<AppView, { titleKey: keyof Dict; descKey: keyof Dict }> = {
  dashboard: { titleKey: "dashboardTitle", descKey: "dashboardDesc" },
  sales: { titleKey: "salesTitle", descKey: "salesDesc" },
  invoices: { titleKey: "invoicesTitle", descKey: "invoicesDesc" },
  reports: { titleKey: "reportsTitle", descKey: "reportsDesc" },
  inventory: { titleKey: "inventoryTitle", descKey: "inventoryDesc" },
  purchases: { titleKey: "purchasesTitle", descKey: "purchasesDesc" },
  suppliers: { titleKey: "suppliersTitle", descKey: "suppliersDesc" },
  customers: { titleKey: "customersTitle", descKey: "customersDesc" },
  analytics: { titleKey: "analyticsTitle", descKey: "analyticsDesc" },
  accounting: { titleKey: "accountingTitle", descKey: "accountingDesc" },
  integrations: { titleKey: "integrationsTitle", descKey: "integrationsDesc" },
  settings: { titleKey: "settingsTitle", descKey: "settingsDesc" },
}
