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
  Users as UsersIcon,
  BarChart3,
  Settings as SettingsIcon,
  FileBarChart,
  FolderOpen,
  Warehouse,
  Clock,
  ClipboardCheck,
  ArrowLeftRight,
  Tags,
  Cog,
  ShieldCheck,
  PackageOpen,
  FlaskConical,
  TrendingUp,
  Crown,
} from "lucide-react"
import type { Dict } from "@/lib/i18n"

export interface NavLeaf {
  view: AppView
  /** key into the i18n Dict for the localized label */
  labelKey: keyof Dict
  icon: typeof LayoutDashboard
}

/** A nav entry is either a standalone leaf or a grouped parent with children. */
export type NavEntry =
  | { type: "leaf"; view: AppView; labelKey: keyof Dict; icon: typeof LayoutDashboard }
  | {
      type: "group"
      /** key into the i18n Dict for the localized parent label */
      labelKey: keyof Dict
      icon: typeof LayoutDashboard
      children: NavLeaf[]
    }

/**
 * Restructured sidebar — long flat lists are grouped under collapsible parents
 * (accordion) to reduce vertical height and avoid scrolling.
 *
 * Standalone items: dashboard, sales
 * Grouped parents:
 *   - الفواتير والتقارير → invoices, reports, analytics
 *   - إدارة المخازن والمشتريات → inventory, purchases, suppliers, pricing, spotcheck
 *   - الحسابات والعملاء → accounting, customers
 *   - العمليات اليومية → shifts, exchanges
 *   - الإعدادات → integrations, users, settings
 */
export const NAV_ENTRIES: NavEntry[] = [
  { type: "leaf", view: "dashboard", labelKey: "navDashboard", icon: LayoutDashboard },
  { type: "leaf", view: "ownerDashboard", labelKey: "navOwnerDashboard", icon: Crown },
  { type: "leaf", view: "managerDashboard", labelKey: "navManagerDashboard", icon: TrendingUp },
  { type: "leaf", view: "sales", labelKey: "navSales", icon: Calculator },
  {
    type: "group",
    labelKey: "navInvoicesReports",
    icon: ReceiptText,
    children: [
      { view: "invoices", labelKey: "navInvoices", icon: ReceiptText },
      { view: "reports", labelKey: "navReports", icon: FileBarChart },
      { view: "analytics", labelKey: "navAnalytics", icon: BarChart3 },
    ],
  },
  {
    type: "group",
    labelKey: "navInventoryPurchases",
    icon: Warehouse,
    children: [
      { view: "inventory", labelKey: "navInventory", icon: Boxes },
      { view: "purchases", labelKey: "navPurchases", icon: ShoppingCart },
      { view: "suppliers", labelKey: "navSuppliers", icon: Truck },
      { view: "pricing", labelKey: "navPricing", icon: Tags },
      { view: "spotcheck", labelKey: "navSpotCheck", icon: ClipboardCheck },
      { view: "bundles", labelKey: "navBundles", icon: PackageOpen },
      { view: "compositions", labelKey: "navCompositions", icon: FlaskConical },
    ],
  },
  {
    type: "group",
    labelKey: "navAccountingCustomers",
    icon: FolderOpen,
    children: [
      { view: "accounting", labelKey: "navAccounting", icon: BookOpen },
      { view: "customers", labelKey: "navCustomers", icon: Users },
    ],
  },
  {
    type: "group",
    labelKey: "navOperations",
    icon: Clock,
    children: [
      { view: "shifts", labelKey: "navShifts", icon: Clock },
      { view: "exchanges", labelKey: "navExchanges", icon: ArrowLeftRight },
    ],
  },
  {
    type: "group",
    labelKey: "navSystem",
    icon: Cog,
    children: [
      { view: "integrations", labelKey: "navIntegrations", icon: Plug },
      { view: "users", labelKey: "navUsers", icon: UsersIcon },
      { view: "audit", labelKey: "navAudit", icon: ShieldCheck },
      { view: "settings", labelKey: "navSettings", icon: SettingsIcon },
    ],
  },
]

/**
 * Flat list of all leaf views (kept for backward compatibility with
 * ROLE_PERMISSIONS validation and VIEW_META lookups).
 */
export const NAV_ITEMS: NavLeaf[] = NAV_ENTRIES.flatMap((e) =>
  e.type === "leaf" ? [{ view: e.view, labelKey: e.labelKey, icon: e.icon }] : e.children
)

/** Map a view to its page-title dict key + description dict key. */
export const VIEW_META: Record<AppView, { titleKey: keyof Dict; descKey: keyof Dict }> = {
  dashboard: { titleKey: "dashboardTitle", descKey: "dashboardDesc" },
  managerDashboard: { titleKey: "managerDashboardTitle", descKey: "managerDashboardDesc" },
  ownerDashboard: { titleKey: "ownerDashboardTitle", descKey: "ownerDashboardDesc" },
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
  shifts: { titleKey: "shiftsTitle", descKey: "shiftsDesc" },
  spotcheck: { titleKey: "spotCheckTitle", descKey: "spotCheckDesc" },
  exchanges: { titleKey: "exchangesTitle", descKey: "exchangesDesc" },
  pricing: { titleKey: "pricingTitle", descKey: "pricingDesc" },
  users: { titleKey: "usersTitle", descKey: "usersDesc" },
  audit: { titleKey: "auditTitle", descKey: "auditDesc" },
  bundles: { titleKey: "bundlesTitle", descKey: "bundlesDesc" },
  compositions: { titleKey: "compositionsTitle", descKey: "compositionsDesc" },
}
