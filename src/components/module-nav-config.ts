import type { MegaMenuGroup } from "@/components/shared/mega-menu-bar"
import {
  Wallet, Receipt, BookCopy, Scale, FileBarChart, Banknote, User2, Percent,
  Boxes, Warehouse as WarehouseIcon, ClipboardCheck, ArrowRightLeft,
  ShoppingCart, FileText, Tags, History, Percent as PercentIcon,
  TrendingUp, Coins, ArrowDown,
} from "lucide-react"
import type { Dict } from "@/lib/i18n"

/**
 * Module navigation config — defines MegaMenu groups for each module
 * that has sub-navigation. The Topbar reads this to render the menu bar
 * inline (Odoo-style) instead of a separate bar below.
 *
 * Views NOT listed here (dashboard, sales, invoices, suppliers, customers,
 * shifts, spotcheck, exchanges, integrations, users, audit, settings)
 * have no sub-navigation — they render directly.
 */
export const MODULE_NAV: Partial<Record<string, MegaMenuGroup[]>> = {
  accounting: [
    {
      labelKey: "accJournalEntries" as keyof Dict,
      items: [
        { value: "accounts", labelKey: "accJournalLedger" as keyof Dict, icon: Wallet },
        { value: "journal", labelKey: "accJournalEntries" as keyof Dict, icon: BookCopy },
        { value: "trial", labelKey: "accTrialBalance" as keyof Dict, icon: Scale },
      ],
    },
    {
      labelKey: "accBalanceSheet" as keyof Dict,
      items: [
        { value: "expenses", labelKey: "accExpenses" as keyof Dict, icon: Receipt },
        { value: "balance", labelKey: "accBalanceSheet" as keyof Dict, icon: Scale },
        { value: "cashflow", labelKey: "accCashFlow" as keyof Dict, icon: Banknote },
      ],
    },
    {
      labelKey: "accPnl" as keyof Dict,
      items: [
        { value: "pnl", labelKey: "accPnl" as keyof Dict, icon: FileBarChart },
        { value: "customer-statement", labelKey: "accCustomerStatement" as keyof Dict, icon: User2 },
        { value: "vat", labelKey: "accVatReport" as keyof Dict, icon: Percent },
      ],
    },
  ],
  inventory: [
    {
      labelKey: "invItemsTab" as keyof Dict,
      items: [
        { value: "products", labelKey: "invItemsTab" as keyof Dict, icon: Boxes },
        { value: "warehouses", labelKey: "warehouses" as keyof Dict, icon: WarehouseIcon },
      ],
    },
    {
      labelKey: "stockTakeTab" as keyof Dict,
      items: [
        { value: "stocktake", labelKey: "stockTakeTab" as keyof Dict, icon: ClipboardCheck },
        { value: "transfers", labelKey: "stockTransferTab" as keyof Dict, icon: ArrowRightLeft },
      ],
    },
  ],
  purchases: [
    {
      labelKey: "navPurchases" as keyof Dict,
      items: [
        { value: "orders", labelKey: "navPurchases" as keyof Dict, icon: ShoppingCart },
        { value: "invoices", labelKey: "navPurchaseInvoices" as keyof Dict, icon: FileText },
        { value: "payments", labelKey: "navSupplierPayments" as keyof Dict, icon: Banknote },
      ],
    },
  ],
  pricing: [
    {
      labelKey: "priceManagement" as keyof Dict,
      items: [
        { value: "prices", labelKey: "priceManagement" as keyof Dict, icon: Tags },
        { value: "promotions", labelKey: "promotionsAndDiscounts" as keyof Dict, icon: PercentIcon },
        { value: "audit", labelKey: "changeLog" as keyof Dict, icon: History },
      ],
    },
  ],
  analytics: [
    {
      labelKey: "anlOverview" as keyof Dict,
      items: [
        { value: "overview", labelKey: "anlOverview" as keyof Dict, icon: TrendingUp },
        { value: "top", labelKey: "anlTopProducts" as keyof Dict, icon: TrendingUp },
      ],
    },
    {
      labelKey: "anlStagnant" as keyof Dict,
      items: [
        { value: "stagnant", labelKey: "anlStagnant" as keyof Dict, icon: Coins },
        { value: "cost", labelKey: "anlCostAnalysis" as keyof Dict, icon: ArrowDown },
        { value: "margin", labelKey: "anlProfitability" as keyof Dict, icon: Percent },
      ],
    },
  ],
  reports: [
    {
      labelKey: "reportsTitle" as keyof Dict,
      items: [
        { value: "general", labelKey: "reportsTitle" as keyof Dict, icon: FileText },
        { value: "matrix", labelKey: "performanceMatrix" as keyof Dict, icon: FileBarChart },
      ],
    },
  ],
}

/** Get the MegaMenu groups for a given view (or null if no sub-nav). */
export function getModuleNav(view: string): MegaMenuGroup[] | null {
  return MODULE_NAV[view] ?? null
}
