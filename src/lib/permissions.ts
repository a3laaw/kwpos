import type { Role } from "@/lib/types"

/**
 * Central, role-based permission model for KWPOS.
 *
 * This module is the SINGLE SOURCE OF TRUTH for action-level and field-level
 * permissions. View-level (page) permissions live in `ROLE_PERMISSIONS` in
 * `session.ts` — that controls which pages appear in the sidebar. This module
 * controls what a role can DO (delete, manage, export) and what it can SEE
 * (cost, margin, financial data).
 *
 * ─── Action permissions ────────────────────────────────────────────────
 * canDelete            → OWNER, ADMIN, MANAGER        (destructive ops)
 * canManageUsers       → OWNER, ADMIN                 (user accounts)
 * canManageProducts    → OWNER, ADMIN, MANAGER, WAREHOUSE (create/edit stock)
 * canManagePricing     → OWNER, ADMIN, MANAGER        (prices, promos)
 * canManageInventory   → OWNER, ADMIN, MANAGER, WAREHOUSE (stock-take, transfers)
 * canPostPurchaseInvoice → OWNER, ADMIN, WAREHOUSE
 * canApprove           → OWNER, ADMIN, MANAGER        (shifts, stock-takes)
 *
 * ─── Field / data permissions ─────────────────────────────────────────
 * canSeeCost           → OWNER, ADMIN, MANAGER, ACCOUNTANT, WAREHOUSE
 * canSeeFinancials     → OWNER, ADMIN, MANAGER, ACCOUNTANT
 *                         (accounting, journal, P&L, balance sheet, VAT)
 * canExportFinancials  → OWNER, ADMIN, MANAGER, ACCOUNTANT
 * canExportProducts    → OWNER, ADMIN, MANAGER, WAREHOUSE
 *
 * SALES and CASHIER are front-line roles: they can sell, view stock levels
 * (NOT cost), and manage customers (add/edit only — never delete).
 */

const ROLE_LIST = (r: Role[]) => r

export const DELETE_ROLES = ROLE_LIST(["OWNER", "ADMIN", "MANAGER"])
export const USER_MANAGE_ROLES = ROLE_LIST(["OWNER", "ADMIN"])
export const PRODUCT_MANAGE_ROLES = ROLE_LIST(["OWNER", "ADMIN", "MANAGER", "WAREHOUSE"])
export const PRICING_ROLES = ROLE_LIST(["OWNER", "ADMIN", "MANAGER"])
export const INVENTORY_MANAGE_ROLES = ROLE_LIST(["OWNER", "ADMIN", "MANAGER", "WAREHOUSE"])
export const APPROVE_ROLES = ROLE_LIST(["OWNER", "ADMIN", "MANAGER"])
export const COST_VISIBLE_ROLES = ROLE_LIST(["OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "WAREHOUSE"])
export const FINANCIAL_ROLES = ROLE_LIST(["OWNER", "ADMIN", "MANAGER", "ACCOUNTANT"])
export const PURCHASE_POST_ROLES = ROLE_LIST(["OWNER", "ADMIN", "WAREHOUSE"])

/** Check whether a role is in an allowed list. */
function inList(role: Role | undefined, allowed: Role[]): boolean {
  return !!role && allowed.includes(role)
}

/** Destructive (delete) operations — OWNER / ADMIN / MANAGER only. */
export function canDelete(role: Role | undefined): boolean {
  return inList(role, DELETE_ROLES)
}

/** Manage user accounts — OWNER / ADMIN only. */
export function canManageUsers(role: Role | undefined): boolean {
  return inList(role, USER_MANAGE_ROLES)
}

/** Create / edit products and stock — OWNER / ADMIN / MANAGER / WAREHOUSE. */
export function canManageProducts(role: Role | undefined): boolean {
  return inList(role, PRODUCT_MANAGE_ROLES)
}

/** Manage prices, promotions, bundles — OWNER / ADMIN / MANAGER. */
export function canManagePricing(role: Role | undefined): boolean {
  return inList(role, PRICING_ROLES)
}

/** Manage inventory operations (stock-take, transfers) — incl. WAREHOUSE. */
export function canManageInventory(role: Role | undefined): boolean {
  return inList(role, INVENTORY_MANAGE_ROLES)
}

/** Approve shifts / stock-takes / close periods — OWNER / ADMIN / MANAGER. */
export function canApprove(role: Role | undefined): boolean {
  return inList(role, APPROVE_ROLES)
}

/** See cost / margin / profit figures — NOT for SALES / CASHIER. */
export function canSeeCost(role: Role | undefined): boolean {
  return inList(role, COST_VISIBLE_ROLES)
}

/** Access financial accounting data (journal, P&L, balance sheet, VAT). */
export function canSeeFinancials(role: Role | undefined): boolean {
  return inList(role, FINANCIAL_ROLES)
}

/** Post / finalize purchase invoices. */
export function canPostPurchaseInvoice(role: Role | undefined): boolean {
  return inList(role, PURCHASE_POST_ROLES)
}

/**
 * Strip cost-price fields from a serialized product for roles that are not
 * allowed to see cost (SALES, CASHIER). Returns a shallow copy with costPrice
 * zeroed-out. Call this in API routes before sending product data to clients.
 */
export function stripProductCost<T extends { costPrice?: number }>(
  product: T,
  role: Role | undefined
): T {
  if (canSeeCost(role)) return product
  return { ...product, costPrice: 0 }
}

/**
 * Strip cost/profit fields from a serialized bundle for roles that can't see
 * cost (SALES, CASHIER). Zeros-out totalCost, profit, and per-item cost.
 */
export function stripBundleCost<T extends { totalCost?: number; profit?: number; items?: any[] }>(
  bundle: T,
  role: Role | undefined
): T {
  if (canSeeCost(role)) return bundle
  return {
    ...bundle,
    totalCost: 0,
    profit: 0,
    items: (bundle.items ?? []).map((it) =>
      it && it.product ? { ...it, product: { ...it.product, costPrice: 0 } } : it
    ),
  }
}
