// Shared application types

export type Role = "ADMIN" | "MANAGER" | "ACCOUNTANT" | "WAREHOUSE" | "SALES" | "CASHIER"

export interface Category {
  id: string
  name: string
  /** Short display code (e.g. "03"). Optional. */
  code?: string | null
  /** Explicit barcode prefix digit (1-9). If null, uses order index. */
  barcodePrefix?: number | null
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
  /** Cumulative quantity returned to supplier via PurchaseReturn records. */
  returnedQty: number
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
  // VAT rate (%) — default 0. Set by the buyer; used at receive time
  // to compute receivedTaxAmount.
  taxRate: number
  // VAT amount computed at receive time (subtotal × taxRate / 100).
  // Stored so the VAT report can include PO receives even without a
  // posted PurchaseInvoice.
  receivedTaxAmount: number
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
  | "managerDashboard"
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
  | "users"
  | "audit"
  | "bundles"
  | "compositions"

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

// ─── Supplier Payments (سداد الموردين) ──────────────────────────────
export interface SupplierPayment {
  id: string
  paymentNo: string
  supplierId: string
  supplierName: string
  amount: number
  paymentDate: string
  paymentMethod: "CASH" | "BANK" | "CHECK"
  referenceNo: string | null
  note: string | null
  journalEntryId: string | null
  createdByName: string | null
  createdAt: string
}

export interface SupplierBalance {
  supplierId: string
  supplierName: string
  totalInvoiced: number
  totalPaid: number
  balance: number
}

// ─── Supplier Statement (كشف حساب المورد) ───────────────────────────
export interface SupplierStatementTransaction {
  date: string
  type: "INVOICE" | "PAYMENT" | "RETURN"
  referenceNo: string
  description: string
  debit: number
  credit: number
  balance: number
}

export interface SupplierStatement {
  supplier: {
    id: string
    name: string
    phone?: string | null
    email?: string | null
    address?: string | null
  }
  openingBalance: number
  closingBalance: number
  invoicesTotal: number
  paymentsTotal: number
  returnsTotal: number
  transactions: SupplierStatementTransaction[]
}

// ─── Purchase Returns (مرتجعات المشتريات) ──────────────────────────
export interface PurchaseReturnItem {
  id: string
  productId: string
  productName: string
  quantity: number
  unitCost: number
  subtotal: number
}

export interface PurchaseReturn {
  id: string
  returnNo: string
  purchaseOrderId: string
  supplierId: string
  supplierName: string
  total: number
  note: string | null
  status: "APPROVED" | "CANCELLED"
  items: PurchaseReturnItem[]
  createdByName?: string | null
  createdAt: string
}

export interface CreatePurchaseReturnBody {
  purchaseOrderId: string
  items: { poItemId: string; returnQty: number }[]
  note?: string | null
}

// ─── Stock Take (جرد المخزون) ──────────────────────────────────────
export interface StockTakeItem {
  id: string
  productId: string
  productName: string
  systemQty: number
  actualQty: number
  variance: number
  unitCost: number
  varianceValue: number
}

export interface StockTake {
  id: string
  takeNo: string
  warehouseId: string | null
  warehouseName: string | null
  note: string | null
  status: "DRAFT" | "APPROVED"
  createdByName: string | null
  approvedByName: string | null
  approvedAt: string | null
  createdAt: string
  items: StockTakeItem[]
}

export interface CreateStockTakeBody {
  warehouseId?: string | null
  note?: string | null
  items: { productId: string; actualQty: number }[]
}

// ─── Stock Transfers (التحويلات بين المخازن) ───────────────────────
export interface StockTransferItem {
  id: string
  productId: string
  productName: string
  quantity: number
  unitCost: number
  subtotal: number
}

export interface StockTransfer {
  id: string
  transferNo: string
  fromWarehouseId: string
  fromWarehouseName: string
  toWarehouseId: string
  toWarehouseName: string
  status: "OUT" | "RECEIVED" | "CANCELLED"
  total: number
  note: string | null
  createdByName: string | null
  receivedByName: string | null
  receivedAt: string | null
  createdAt: string
  items: StockTransferItem[]
}

export interface CreateStockTransferBody {
  fromWarehouseId: string
  toWarehouseId: string
  note?: string | null
  items: { productId: string; quantity: number }[]
}

// ─── Audit Log (سجل التدقيق) ───────────────────────────────────────
export type AuditAction =
  | "VOID_ITEM"
  | "CANCEL_TXN"
  | "REFUND"
  | "EXCHANGE"
  | "MANUAL_DISCOUNT"
  | "DRAWER_OPEN"
  | "HOLD_BILL"
  | "MANAGER_APPROVAL"

export interface AuditLog {
  id: string
  userId: string | null
  userName: string | null
  action: AuditAction
  description: string | null
  saleId: string | null
  productId: string | null
  supervisorId: string | null
  supervisorName: string | null
  deviceInfo: string | null
  metadata: string | null
  createdAt: string
}

// ─── Advanced Financial Reports ────────────────────────────────────
export interface BalanceSheetSection {
  rows: { code: string; name: string; balance: number }[]
  total: number
}

export interface BalanceSheet {
  assets: BalanceSheetSection
  liabilities: BalanceSheetSection
  equity: BalanceSheetSection
  totals: { assets: number; liabilities: number; equity: number }
}

export interface CashFlow {
  from: string | null
  to: string | null
  inflows: { source: string; amount: number }[]
  outflows: { source: string; amount: number }[]
  netCashFlow: number
  openingCash: number
  closingCash: number
}

export interface CustomerStatementTx {
  date: string
  type: "SALE" | "REFUND"
  referenceNo: string
  debit: number
  credit: number
  balance: number
}

export interface CustomerStatement {
  customer: { id: string; name: string; phone?: string | null; address?: string | null }
  openingBalance: number
  closingBalance: number
  transactions: CustomerStatementTx[]
}

export interface VatReport {
  from: string | null
  to: string | null
  outputVat: number
  inputVat: number
  netVat: number
  salesTotal: number
  purchasesTotal: number
}

// ─── Bundle types (الباقات) ─────────────────────────────────────────
export interface BundleItem {
  id: string
  bundleId: string
  productId: string
  quantity: number
  product?: Product
}

export interface Bundle {
  id: string
  name: string
  description?: string | null
  imageUrl?: string | null
  salePrice: number
  isActive: boolean
  startDate?: string | null
  endDate?: string | null
  category?: string | null
  createdAt: string
  items: BundleItem[]
  /** Computed: total cost of all items (sum of product.costPrice * quantity) */
  totalCost?: number
  /** Computed: sum of product.salePrice * quantity (buying separately) */
  itemsRetailTotal?: number
  /** Computed: profit = salePrice - totalCost */
  profit?: number
  /** Computed: discount % vs buying items separately */
  discountPct?: number
}

// ─── Composition types (التركيبات) ──────────────────────────────────
export interface CompositionIngredient {
  id: string
  compositionId: string
  productId: string
  quantity: number
  unit: string
  notes?: string | null
  product?: Product
}

export interface Composition {
  id: string
  name: string
  description?: string | null
  imageUrl?: string | null
  outputProductId: string
  yieldQty: number
  yieldUnit: string
  isActive: boolean
  notes?: string | null
  createdAt: string
  outputProduct?: Product
  ingredients: CompositionIngredient[]
  /** Computed: total cost of all ingredients per batch */
  costPerBatch?: number
  /** Computed: cost per unit of output = costPerBatch / yieldQty */
  costPerUnit?: number
}
