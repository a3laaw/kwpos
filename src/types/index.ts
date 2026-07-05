/**
 * Centralized shared types for KWPOS.
 *
 * These types are used across the application to reduce duplication
 * and improve type safety. Module-specific types remain in their
 * respective files (e.g. src/lib/types.ts) and are re-exported here
 * for convenience.
 */

// ─── User & Auth ───────────────────────────────────────────────────
export type UserRole = "ADMIN" | "SALES" | "WAREHOUSE"

// ─── Sales & Payments ──────────────────────────────────────────────
export type PaymentMethod = "CASH" | "CARD" | "TRANSFER"

export type PriceTier = "RETAIL" | "WHOLESALE" | "CORPORATE"

export type CustomerType = "RETAIL" | "WHOLESALE" | "CORPORATE"

export type SaleRefundStatus = "NONE" | "PARTIAL" | "FULL"

// ─── Inventory ─────────────────────────────────────────────────────
export type PromotionScope = "PRODUCT" | "CATEGORY" | "ALL" | "ALL_EXCEPT_CATEGORIES"

export type PromotionDiscountType = "PERCENT" | "AMOUNT"

export type PriceChangeType = "RETAIL" | "WHOLESALE" | "CORPORATE"

// ─── Purchases ─────────────────────────────────────────────────────
export type PurchaseOrderStatus =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "PENDING"
  | "RECEIVED"
  | "CANCELLED"
  | "REJECTED"

// ─── Accounting ────────────────────────────────────────────────────
export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE"

export type JournalSourceType =
  | "SALE"
  | "PURCHASE"
  | "EXPENSE"
  | "REFUND"
  | "SHIFT"
  | "MANUAL"
  | "EXCHANGE"

// ─── API Response Patterns ─────────────────────────────────────────

/** A discriminated union for API responses — success carries data, failure carries error. */
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }

/** Standard paginated result for list endpoints. */
export type PaginatedResult<T> = {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/** Standard error response shape. */
export type ErrorResponse = {
  success: false
  error: string
  code?: string
}

// ─── Re-exports from lib/types.ts ──────────────────────────────────
// Re-export the existing AppView and other view-related types so
// consumers can import from a single location.
export type {
  AppView,
  Product,
  Sale,
  SaleItem,
  Customer,
  Supplier,
  Warehouse,
  Category,
  Account,
  JournalEntry,
  JournalLine,
  DashboardStats,
} from "@/lib/types"
