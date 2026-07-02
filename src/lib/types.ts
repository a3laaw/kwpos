// Shared application types

export type Role = "ADMIN" | "SALES" | "WAREHOUSE"

export interface Category {
  id: string
  name: string
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
  costPrice: number
  salePrice: number
  unit: string
  createdAt: string
  updatedAt: string
}

export interface PurchaseOrderItem {
  id: string
  productId: string
  productName: string
  quantity: number
  unitCost: number
  subtotal: number
}

export interface PurchaseOrder {
  id: string
  supplierId: string
  supplierName: string
  status: "PENDING" | "RECEIVED" | "CANCELLED"
  total: number
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
  unitPrice: number
  subtotal: number
}

export interface Sale {
  id: string
  invoiceNo: string
  customerName?: string | null
  subtotal: number
  taxRate: number
  taxAmount: number
  discount: number
  total: number
  paid: number
  paymentMethod: "CASH" | "CARD" | "TRANSFER"
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
