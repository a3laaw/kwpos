/**
 * i18n barrel file — assembles all module strings into the DICTS object.
 *
 * This is the public API of the i18n system. The original monolithic
 * i18n.ts (5583 lines) was split into per-module files (Split Module —
 * Fowler) for better maintainability:
 *   - Each module owns its strings (Open/Closed principle)
 *   - Adding a feature only touches one module file
 *   - Easier to find and edit strings
 *
 * The Dict interface + DICTS object are re-exported here so all existing
 * imports (`from "@/lib/i18n"`) continue to work without changes.
 */

export type Locale = "ar" | "en"

/**
 * The full dictionary interface.
 *
 * NOTE: This is a flat Record<string, string> rather than the original
 * strict interface. The original 1870-line interface was a Code Smell
 * (God Object) — it required editing 3 places (interface + ar + en) for
 * every new string. Now we use a plain Record and let TypeScript infer
 * the shape from the module files.
 */
export type Dict = Record<string, string>

// Import all module files from the i18n/ directory
import { ar_common, en_common } from "./i18n/common"
import { ar_common_entities, en_common_entities } from "./i18n/common-entities"
import { ar_sales, en_sales } from "./i18n/sales"
import { ar_inventory, en_inventory } from "./i18n/inventory"
import { ar_purchases, en_purchases } from "./i18n/purchases"
import { ar_customers, en_customers } from "./i18n/customers"
import { ar_accounting, en_accounting } from "./i18n/accounting"
import { ar_dashboard, en_dashboard } from "./i18n/dashboard"
import { ar_analytics, en_analytics } from "./i18n/analytics"
import { ar_reports, en_reports } from "./i18n/reports"
import { ar_shifts, en_shifts } from "./i18n/shifts"
import { ar_settings, en_settings } from "./i18n/settings"

/**
 * Assemble the full Arabic dictionary by spreading all module objects.
 * Later spreads override earlier ones (shouldn't happen — keys are unique).
 */
const ar: Dict = {
  ...ar_common,
  ...ar_common_entities,
  ...ar_sales,
  ...ar_inventory,
  ...ar_purchases,
  ...ar_customers,
  ...ar_accounting,
  ...ar_dashboard,
  ...ar_analytics,
  ...ar_reports,
  ...ar_shifts,
  ...ar_settings,
}

/**
 * Assemble the full English dictionary.
 */
const en: Dict = {
  ...en_common,
  ...en_common_entities,
  ...en_sales,
  ...en_inventory,
  ...en_purchases,
  ...en_customers,
  ...en_accounting,
  ...en_dashboard,
  ...en_analytics,
  ...en_reports,
  ...en_shifts,
  ...en_settings,
}

export const DICTS: Record<Locale, Dict> = { ar, en }
