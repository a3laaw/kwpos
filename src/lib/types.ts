// Shared application types

export type Role = "ADMIN" | "SALES" | "WAREHOUSE"

export interface Category {
  id: string
  name: string
  /** Short code used for auto-barcode generation (e.g. "03"). Optional. */
  code?: string | null
  imageUrl?: string | null
  createdAt: string
}

export interface Supplier {
  id: string
  name: string
  contact?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  createdAt: string
}

export interface Product {
  id: string
  name: string
  barcode?: string | null
  categoryId?: string | null
  categoryName?: string | null
  supplierId?: string | null
  supplierName?: string | null
  quantity: number
  reorderLevel: number
  /** Optimal reorder quantity (0 = not set). Used by auto-PO suggestions. */
  optimalOrderQty: number
  /** Preferred supplier for auto-PO generation. */
  defaultSupplierId?: string | null
  defaultSupplierName?: string | null
  costPrice: number
  salePrice: number
  wholesalePrice: number
  corporatePrice: number
  unit: string
  unitId?: string | null
  imageUrl?: string | null
  stockByWarehouse?: { warehouseId: string; warehouseName: string; warehouseCode?: string | null; quantity: number }[]
  createdAt: string
  updatedAt: string
}

export interface Warehouse {
  id: string
  name: string
  code?: string | null
  location?: string | null
  isActive: boolean
  productsCount?: number
  totalStock?: number
  createdAt: string
}

export interface PurchaseOrderItem {
  id: string
  productId: string
  productName: string
  quantity: number
  unitCost: number
  subtotal: number
  /** Optional manager-suggested retail sale price (0 = not set). Applied
   *  to the pricing engine on PO receive if > 0 and different from current salePrice. */
  suggestedSalePrice?: number
}

export interface PurchaseOrder {
  id: string
  supplierId: string
  supplierName: string
  status:
    | "PENDING_APPROVAL"
    | "APPROVED"
    | "PENDING"
    | "RECEIVED"
    | "CANCELLED"
    | "REJECTED"
  total: number
  // Landed cost (تكلفة الوصول) — extra charges saved on the PO and
  // allocated across items on receipt using the weighted-average method.
  customsAmount: number
  shippingAmount: number
  otherCharges: number
  landedCostApplied: boolean
  rejectionReason?: string | null
  note?: string | null
  items: PurchaseOrderItem[]
  createdAt: string
  updatedAt: string
}

export interface SaleItem {
  id: string
  productId: string
  productName: string
  quantity: number
  returnedQty: number
  unitPrice: number
  subtotal: number
}

export interface Sale {
  id: string
  invoiceNo: string
  customerName?: string | null
  customerPhone?: string | null
  customerId?: string | null
  subtotal: number
  taxRate: number
  taxAmount: number
  discount: number
  total: number
  paid: number
  refundTotal: number
  refundStatus: "NONE" | "PARTIAL" | "FULL"
  paymentMethod: "CASH" | "CARD" | "TRANSFER"
  deliveryFee: number
  driverName?: string | null
  userId?: string | null
  userName?: string | null
  items: SaleItem[]
  createdAt: string
}

export interface DashboardStats {
  totalSales: number
  salesCount: number
  productsCount: number
  lowStockCount: number
  pendingPurchases: number
  inventoryValue: number
  todaySales: number
  lowStockProducts: Product[]
  recentSales: Sale[]
  salesTrend: { date: string; total: number; label: string }[]
  topProducts: { productName: string; qty: number; total: number }[]
  categoryDistribution: { categoryName: string; total: number }[]
}

export type AppView =
  | "dashboard"
  | "inventory"
  | "purchases"
  | "suppliers"
  | "sales"
  | "invoices"
  | "integrations"
  | "accounting"
  | "customers"
  | "analytics"
  | "reports"
  | "settings"
  | "shifts"
  | "spotcheck"
  | "exchanges"
  | "pricing"

// ─── Accounting types ───────────────────────────────────────────────
export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE"

export interface Account {
  id: string
  code: string
  name: string
  type: AccountType
  parentId: string | null
  parentName?: string | null
  balance: number
  isSystem: boolean
  children?: Account[]
  createdAt: string
}

export type ExpenseType = "SALARY" | "ADMIN"
export type ExpenseCategory = "إيجار" | "مرافق" | "اشتراكات" | "تسويق" | "أخرى"

export interface ExpenseTransaction {
  id: string
  type: ExpenseType
  employeeName?: string | null
  payDate?: string | null
  title?: string | null
  category?: string | null
  date?: string | null
  amount: number
  accountId: string
  accountName?: string | null
  paymentAccountId: string
  paymentAccountName?: string | null
  note?: string | null
  createdAt: string
}

export interface PnLReport {
  revenue: number
  revenueCount: number
  cogs: number
  grossProfit: number
  salaries: number
  adminExpenses: number
  totalOperatingExpenses: number
  netProfit: number
  period: { from: string | null; to: string | null }
  expenseBreakdown: { category: string; amount: number }[]
}

// ─── CRM & Analytics types ──────────────────────────────────────────
export interface Customer {
  id: string
  name: string
  phone: string
  address: string
  type: "RETAIL" | "WHOLESALE" | "CORPORATE"
  createdAt: string
  updatedAt: string
}

// ─── Customer pricing tier ──────────────────────────────────────────
export type CustomerTier = "RETAIL" | "WHOLESALE" | "CORPORATE"

export const TIER_LABELS: Record<CustomerTier, string> = {
  RETAIL: "تجزئة",
  WHOLESALE: "جملة",
  CORPORATE: "شركات/تعاقدات",
}

/** Resolve the effective sale price for a product given the customer tier. */
export function effectivePrice(
  product: Pick<Product, "salePrice" | "wholesalePrice" | "corporatePrice">,
  tier: CustomerTier
): number {
  if (tier === "WHOLESALE" && product.wholesalePrice > 0) return product.wholesalePrice
  if (tier === "CORPORATE" && product.corporatePrice > 0) return product.corporatePrice
  return product.salePrice
}

// ─── Journal (double-entry) types ───────────────────────────────────
export interface JournalLine {
  id: string
  accountId: string
  accountCode: string
  accountName: string
  accountType: AccountType
  debit: number
  credit: number
  description?: string | null
}

export interface JournalEntry {
  id: string
  entryNo: string
  date: string
  sourceType: "SALE" | "EXPENSE" | "PURCHASE" | "MANUAL"
  sourceId?: string | null
  description: string
  totalDebit: number
  totalCredit: number
  lines: JournalLine[]
  createdAt: string
}

export interface TrialBalanceRow {
  accountId: string
  code: string
  name: string
  type: AccountType
  debit: number
  credit: number
}

export interface TrialBalance {
  rows: TrialBalanceRow[]
  totalDebit: number
  totalCredit: number
}

export interface ProductAnalytics {
  id: string
  name: string
  categoryName?: string | null
  costPrice: number
  salePrice: number
  margin: number
  marginPct: number
  quantitySold: number
  grossVolume: number
  currentStock: number
  lastSoldAt?: string | null
}

export interface AnalyticsReport {
  topSelling: ProductAnalytics[]
  stagnant: ProductAnalytics[]
  mostExpensive: ProductAnalytics[]
  cheapest: ProductAnalytics[]
  highestMargin: ProductAnalytics[]
  dateRange: { from: string | null; to: string | null }
}
