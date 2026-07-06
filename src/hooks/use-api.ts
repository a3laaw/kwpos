"use client"

import * as React from "react"
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import type {
  Product,
  Category,
  Supplier,
  PurchaseOrder,
  Sale,
  DashboardStats,
  Account,
  ExpenseTransaction,
  Customer,
  PnLReport,
  AnalyticsReport,
  JournalEntry,
  TrialBalance,
  Warehouse,
  SupplierPayment,
  SupplierBalance,
} from "@/lib/types"
import type { CountryConfig } from "@/lib/countries"

async function jget<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error((e as any)?.error || `request-failed:${res.status}`)
  }
  return res.json() as Promise<T>
}

async function jsend<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as any)?.error || `request-failed:${res.status}`)
  }
  return data as T
}

/* ----------------------------- Products ----------------------------- */
export function useProducts(params?: { q?: string; categoryId?: string; supplierId?: string; lowStock?: boolean }) {
  const qs = new URLSearchParams()
  if (params?.q) qs.set("q", params.q)
  if (params?.categoryId) qs.set("categoryId", params.categoryId)
  if (params?.supplierId) qs.set("supplierId", params.supplierId)
  if (params?.lowStock) qs.set("lowStock", "true")
  const key = ["products", qs.toString()]
  return useQuery<{ items: Product[] }>({
    queryKey: key,
    queryFn: () => jget(`/api/products?${qs.toString()}`),
  })
}

export function useCategories() {
  return useQuery<{ items: Category[] }>({
    queryKey: ["categories"],
    queryFn: () => jget("/api/categories"),
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; code?: string | null }) =>
      jsend<Category>("/api/categories", "POST", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  })
}

export function useUpdateCategory(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<Pick<Category, "name" | "code" | "imageUrl">>) =>
      jsend<Category>(`/api/categories/${id}`, "PUT", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => jsend(`/api/categories/${id}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<Product>) => jsend<Product>("/api/products", "POST", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}

export function useUpdateProduct(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<Product>) => jsend<Product>(`/api/products/${id}`, "PUT", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => jsend(`/api/products/${id}`, "DELETE"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}

/* ----------------------------- Suppliers ----------------------------- */
export function useSuppliers() {
  return useQuery<{ items: (Supplier & { productsCount?: number; ordersCount?: number })[] }>({
    queryKey: ["suppliers"],
    queryFn: () => jget("/api/suppliers"),
  })
}

export function useCreateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<Supplier>) => jsend("/api/suppliers", "POST", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  })
}

export function useUpdateSupplier(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<Supplier>) => jsend(`/api/suppliers/${id}`, "PUT", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  })
}

export function useDeleteSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => jsend(`/api/suppliers/${id}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  })
}

/* ----------------------------- Purchase Orders ----------------------------- */
export function usePurchaseOrders(status?: string) {
  const qs = status ? `?status=${status}` : ""
  return useQuery<{ items: PurchaseOrder[] }>({
    queryKey: ["purchase-orders", status ?? "all"],
    queryFn: () => jget(`/api/purchase-orders${qs}`),
  })
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      supplierId: string
      note?: string
      items: { productId: string; quantity: number; unitCost: number; suggestedSalePrice?: number }[]
      customsAmount?: number
      shippingAmount?: number
      otherCharges?: number
    }) => jsend("/api/purchase-orders", "POST", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] })
      qc.invalidateQueries({ queryKey: ["products"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}

export function useReceivePurchaseOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (
      args:
        | string
        | {
            id: string
            customsAmount?: number
            shippingAmount?: number
            otherCharges?: number
          }
    ) => {
      const isObj = typeof args !== "string"
      const id = isObj ? args.id : args
      const body = isObj
        ? {
            ...(args.customsAmount !== undefined ? { customsAmount: args.customsAmount } : {}),
            ...(args.shippingAmount !== undefined ? { shippingAmount: args.shippingAmount } : {}),
            ...(args.otherCharges !== undefined ? { otherCharges: args.otherCharges } : {}),
          }
        : undefined
      return jsend(`/api/purchase-orders/${id}/receive`, "POST", body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] })
      qc.invalidateQueries({ queryKey: ["products"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
      // A PO receive may have written PriceChange audit rows (when a
      // suggested sale price was applied via the pricing engine) + updated
      // product salePrices — invalidate the pricing caches so the UI
      // reflects the new state immediately.
      qc.invalidateQueries({ queryKey: ["pricing"] })
      qc.invalidateQueries({ queryKey: ["pricing-audit"] })
      qc.invalidateQueries({ queryKey: ["promotions"] })
    },
  })
}

export function useCancelPurchaseOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => jsend(`/api/purchase-orders/${id}`, "PUT", { status: "CANCELLED" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchase-orders"] }),
  })
}

export function useDeletePurchaseOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => jsend(`/api/purchase-orders/${id}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchase-orders"] }),
  })
}

/* ----------------------------- Sales ----------------------------- */
export function useSales(q?: string, page?: number, pageSize?: number) {
  const qs = new URLSearchParams()
  if (q) qs.set("q", q)
  if (page) qs.set("page", String(page))
  if (pageSize) qs.set("pageSize", String(pageSize))
  const s = qs.toString()
  return useQuery<{ items: Sale[]; pagination?: { page: number; pageSize: number; total: number; totalPages: number } }>({
    queryKey: ["sales", q ?? "all", page ?? 1, pageSize ?? 10],
    queryFn: () => jget(`/api/sales${s ? `?${s}` : ""}`),
  })
}

export function useCreateSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      customerName?: string
      customerPhone?: string
      items: { productId: string; quantity: number; unitPrice: number }[]
      taxRate: number
      discount: number
      paymentMethod: "CASH" | "CARD" | "TRANSFER"
      deliveryFee?: number
      driverName?: string
    }) => jsend<Sale>("/api/sales", "POST", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] })
      qc.invalidateQueries({ queryKey: ["products"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}

export function useRefundSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason, items, override14Days }: { id: string; reason?: string; items?: { saleItemId: string; returnedQty: number }[]; override14Days?: boolean }) =>
      jsend<Sale & {
        refundSummary: {
          refundSubtotal: number
          refundTax: number
          refundTotal: number
          refundCost: number
          creditNoteNo: string
        }
      }>(`/api/sales/${id}/refund`, "POST", { reason, items, override14Days }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] })
      qc.invalidateQueries({ queryKey: ["products"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}

/* ----------------------------- Dashboard ----------------------------- */
export function useDashboard(from?: string, to?: string, range?: string) {
  const qs = new URLSearchParams()
  if (from) qs.set("from", from)
  if (to) qs.set("to", to)
  if (range && !from) qs.set("range", range)
  const s = qs.toString()
  return useQuery<DashboardStats>({
    queryKey: ["dashboard", from ?? "", to ?? "", range ?? ""],
    queryFn: () => jget(`/api/dashboard${s ? `?${s}` : ""}`),
  })
}

/* ----------------------------- Accounts (Chart of Accounts) -------- */
export function useAccounts() {
  return useQuery<{ items: Account[]; flat: Account[] }>({
    queryKey: ["accounts"],
    queryFn: () => jget("/api/accounts"),
  })
}

export function useCreateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { code: string; name: string; type: Account["type"]; parentId?: string }) =>
      jsend<Account>("/api/accounts", "POST", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  })
}

export function useUpdateAccount(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<Account>) => jsend<Account>(`/api/accounts/${id}`, "PUT", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  })
}

export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => jsend(`/api/accounts/${id}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  })
}

/* ----------------------------- Expenses ---------------------------- */
export function useExpenses(type?: "SALARY" | "ADMIN") {
  const qs = type ? `?type=${type}` : ""
  return useQuery<{ items: ExpenseTransaction[] }>({
    queryKey: ["expenses", type ?? "all"],
    queryFn: () => jget(`/api/expenses${qs}`),
  })
}

export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: any) => jsend<ExpenseTransaction>("/api/expenses", "POST", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] })
      qc.invalidateQueries({ queryKey: ["accounts"] })
      qc.invalidateQueries({ queryKey: ["pnl"] })
    },
  })
}

export function useDeleteExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => jsend(`/api/expenses/${id}`, "DELETE"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] })
      qc.invalidateQueries({ queryKey: ["accounts"] })
      qc.invalidateQueries({ queryKey: ["pnl"] })
    },
  })
}

/* ----------------------------- Customers --------------------------- */
export function useCustomers(q?: string) {
  const qs = q ? `?q=${encodeURIComponent(q)}` : ""
  return useQuery<{ items: Customer[] }>({
    queryKey: ["customers", q ?? "all"],
    queryFn: () => jget(`/api/customers${qs}`),
  })
}

/* ----------------------------- Units ------------------------------- */
export function useUnits() {
  return useQuery<{ items: { id: string; name: string }[] }>({
    queryKey: ["units"],
    queryFn: () => jget("/api/units"),
  })
}

export function useCreateUnit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string }) => jsend("/api/units", "POST", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["units"] }),
  })
}

export function useDeleteUnit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => jsend(`/api/units/${id}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["units"] }),
  })
}

/* ----------------------------- Warehouses -------------------------- */
export function useWarehouses() {
  return useQuery<{ items: Warehouse[] }>({
    queryKey: ["warehouses"],
    queryFn: () => jget("/api/warehouses"),
  })
}
export function useCreateWarehouse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; code?: string; location?: string }) =>
      jsend<Warehouse>("/api/warehouses", "POST", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["warehouses"] }),
  })
}
export function useUpdateWarehouse(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<Warehouse>) => jsend<Warehouse>(`/api/warehouses/${id}`, "PUT", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["warehouses"] }),
  })
}
export function useDeleteWarehouse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => jsend(`/api/warehouses/${id}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["warehouses"] }),
  })
}

export function useCreateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; phone?: string; address?: string }) =>
      jsend<Customer>("/api/customers", "POST", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  })
}

export function useUpdateCustomer(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<Customer>) => jsend<Customer>(`/api/customers/${id}`, "PUT", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  })
}

export function useDeleteCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => jsend(`/api/customers/${id}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  })
}

/* ----------------------------- Financial Reports (P&L) ------------- */
export function usePnLReport(from?: string, to?: string) {
  const qs = new URLSearchParams()
  if (from) qs.set("from", from)
  if (to) qs.set("to", to)
  const s = qs.toString()
  return useQuery<PnLReport>({
    queryKey: ["pnl", from ?? "", to ?? ""],
    queryFn: () => jget(`/api/financial-reports${s ? `?${s}` : ""}`),
  })
}

/* ----------------------------- Analytics --------------------------- */
export function useAnalytics(from?: string, to?: string) {
  const qs = new URLSearchParams()
  if (from) qs.set("from", from)
  if (to) qs.set("to", to)
  const s = qs.toString()
  return useQuery<AnalyticsReport>({
    queryKey: ["analytics", from ?? "", to ?? ""],
    queryFn: () => jget(`/api/analytics${s ? `?${s}` : ""}`),
  })
}

/* ----------------------------- Unified Reports --------------------- */
export interface ReportFilters {
  from?: string
  to?: string
  productId?: string
  categoryId?: string
  paymentMethod?: string
  source?: string
}

export function useReport(filters: ReportFilters) {
  const qs = new URLSearchParams()
  if (filters.from) qs.set("from", filters.from)
  if (filters.to) qs.set("to", filters.to)
  if (filters.productId) qs.set("productId", filters.productId)
  if (filters.categoryId) qs.set("categoryId", filters.categoryId)
  if (filters.paymentMethod) qs.set("paymentMethod", filters.paymentMethod)
  if (filters.source) qs.set("source", filters.source)
  const s = qs.toString()
  return useQuery<any>({
    queryKey: ["report", s],
    queryFn: () => jget(`/api/reports${s ? `?${s}` : ""}`),
  })
}

/* ----------------------- Performance Matrix Report ------------------ */
export interface MatrixFilters {
  from?: string
  to?: string
  warehouseId?: string
  supplierId?: string
}

export function useReportMatrix(filters: MatrixFilters) {
  const qs = new URLSearchParams()
  if (filters.from) qs.set("from", filters.from)
  if (filters.to) qs.set("to", filters.to)
  if (filters.warehouseId) qs.set("warehouseId", filters.warehouseId)
  if (filters.supplierId) qs.set("supplierId", filters.supplierId)
  const s = qs.toString()
  return useQuery<any>({
    queryKey: ["report-matrix", s],
    queryFn: () => jget(`/api/reports/matrix${s ? `?${s}` : ""}`),
  })
}

/* ----------------------------- Journal Entries --------------------- */
export function useJournalEntries(sourceType?: string) {
  const qs = sourceType ? `?sourceType=${sourceType}` : ""
  return useQuery<{ items: JournalEntry[] }>({
    queryKey: ["journal-entries", sourceType ?? "all"],
    queryFn: () => jget(`/api/journal-entries${qs}`),
  })
}

/* ----------------------------- Trial Balance ------------------------ */
export function useTrialBalance() {
  return useQuery<TrialBalance>({
    queryKey: ["trial-balance"],
    queryFn: () => jget("/api/trial-balance"),
  })
}

/* ----------------------------- Manual Journal Entry ---------------- */
export function useCreateManualJournal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { description: string; date?: string; lines: { accountCode: string; debit?: number; credit?: number; description?: string }[] }) =>
      jsend("/api/journal-entries/manual", "POST", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal-entries"] })
      qc.invalidateQueries({ queryKey: ["accounts"] })
      qc.invalidateQueries({ queryKey: ["trial-balance"] })
    },
  })
}

/* ----------------------------- Excel ------------------------------- */
export function useExportExcel() {
  return useMutation({
    mutationFn: async ({ type, from, to }: { type: string; from?: string; to?: string }) => {
      const qs = new URLSearchParams({ type })
      if (from) qs.set("from", from)
      if (to) qs.set("to", to)
      const res = await fetch(`/api/excel/export?${qs.toString()}`)
      if (!res.ok) throw new Error("export-failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${type}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    },
  })
}

export function useImportProducts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/excel/import-products", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "import-failed")
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  })
}

export function useImportCustomers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/excel/import-customers", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "import-failed")
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  })
}

/* ----------------------------- Image Upload ------------------------ */
export function useUploadImage() {
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "upload-failed")
      return data as { url: string }
    },
  })
}

/* ----------------------------- Settings (country) ------------------ */
export function useSettings() {
  return useQuery<CountryConfig>({
    queryKey: ["settings"],
    queryFn: () => jget("/api/settings"),
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { code: string }) => jsend<CountryConfig>("/api/settings", "PUT", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  })
}

/* ----------------------- Suspended / Parked Sales ------------------ */
export interface SuspendedSaleItem {
  id: string
  holdNo: string
  label: string | null
  itemCount: number
  total: number
  userName: string | null
  createdAt: string
}

export function useSuspendedSales() {
  return useQuery<{ items: SuspendedSaleItem[] }>({
    queryKey: ["suspended-sales"],
    queryFn: () => jget("/api/suspended-sales"),
  })
}

export function useParkSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { label?: string; cartJson: string; itemCount: number; total: number }) =>
      jsend<{ id: string; holdNo: string }>("/api/suspended-sales", "POST", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suspended-sales"] }),
  })
}

export function useResumeSuspendedSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => jsend(`/api/suspended-sales/${id}`, "PATCH"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suspended-sales"] }),
  })
}

export function useDiscardSuspendedSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => jsend(`/api/suspended-sales/${id}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suspended-sales"] }),
  })
}

export function useFetchSuspendedSale(id: string | null) {
  return useQuery<any>({
    queryKey: ["suspended-sale", id],
    queryFn: () => jget(`/api/suspended-sales/${id}`),
    enabled: !!id,
  })
}

/* ----------------------------- Shifts ------------------------------ */
export interface ShiftItem {
  id: string
  shiftNo: string
  userId: string | null
  userName: string | null
  openedAt: string
  closedAt: string | null
  status: "OPEN" | "CLOSED"
  expectedCash: number
  expectedKnet: number
  expectedVisa: number
  countedCash: number
  countedKnet: number
  countedVisa: number
  cashVariance: number
  knetVariance: number
  visaVariance: number
  note: string | null
}

export function useShifts(status?: "OPEN" | "CLOSED") {
  const qs = status ? `?status=${status}` : ""
  return useQuery<{ items: ShiftItem[] }>({
    queryKey: ["shifts", status ?? "all"],
    queryFn: () => jget(`/api/shifts${qs}`),
  })
}

export function useOpenShift() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => jsend("/api/shifts", "POST"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shifts"] }),
  })
}

export function useCloseShift() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { id: string; countedCash: number; countedKnet: number; countedVisa: number; note?: string }) =>
      jsend("/api/shifts", "PATCH", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shifts"] }),
  })
}

/* ----------------------------- Spot-Checks ------------------------- */
export interface SpotCheckItem {
  id: string
  productId: string
  productName: string
  barcode: string | null
  bookQty: number
  countedQty: number
  variance: number
  note: string | null
  userName: string | null
  createdAt: string
}

export function useSpotChecks() {
  return useQuery<{ items: SpotCheckItem[] }>({
    queryKey: ["spot-checks"],
    queryFn: () => jget("/api/spot-checks"),
  })
}

export function useCreateSpotCheck() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { productId: string; countedQty: number; note?: string }) =>
      jsend<any>("/api/spot-checks", "POST", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["spot-checks"] }),
  })
}

/* ----------------------------- Exchanges --------------------------- */
/** A single line in an exchange — signed quantity (negative=returned, positive=new). */
export interface ExchangeLine {
  id: string
  exchangeId: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
  isReturn: boolean
}

/** A complete exchange transaction (returned items + new items in one invoice). */
export interface ExchangeSale {
  id: string
  exchangeNo: string
  originalSaleId: string | null
  customerName: string | null
  customerPhone: string | null
  netAmount: number
  paymentMethod: "CASH" | "CARD" | "TRANSFER"
  itemCount: number
  note: string | null
  userId: string | null
  userName: string | null
  lines: ExchangeLine[]
  createdAt: string
}

/** A single sale-item row in the for-exchange payload. */
export interface SaleForExchangeItem {
  saleItemId: string
  productId: string
  productName: string
  barcode: string | null
  quantity: number
  returnedQty: number
  remainingQty: number
  unitPrice: number
}

/** A sale rendered in the for-exchange shape (used by the Exchange screen). */
export interface SaleForExchange {
  id: string
  invoiceNo: string
  createdAt: string
  customerName: string | null
  customerPhone: string | null
  isEligible: boolean
  daysOld: number
  items: SaleForExchangeItem[]
}

export function useExchanges() {
  return useQuery<{ items: ExchangeSale[] }>({
    queryKey: ["exchanges"],
    queryFn: () => jget("/api/exchanges"),
  })
}

/** Lookup a sale by invoiceNo in the for-exchange shape (anti-fraud view). */
export function useSaleForExchange(invoiceNo: string | null) {
  return useQuery<SaleForExchange>({
    queryKey: ["sale-for-exchange", invoiceNo],
    queryFn: () =>
      jget(
        `/api/sales/by-invoice/${encodeURIComponent(invoiceNo as string)}/for-exchange`
      ),
    enabled: !!invoiceNo,
    retry: false,
  })
}

export function useCreateExchange() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      originalSaleId: string
      customerName?: string
      customerPhone?: string
      paymentMethod: "CASH" | "CARD" | "TRANSFER"
      note?: string
      lines: { productId: string; quantity: number; unitPrice: number; isReturn: boolean }[]
    }) => jsend<ExchangeSale>("/api/exchanges", "POST", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exchanges"] })
      qc.invalidateQueries({ queryKey: ["products"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
      qc.invalidateQueries({ queryKey: ["sale-for-exchange"] })
      qc.invalidateQueries({ queryKey: ["invoices"] })
    },
  })
}

export function useFetchExchange(id: string | null) {
  return useQuery<ExchangeSale>({
    queryKey: ["exchange", id],
    queryFn: () => jget(`/api/exchanges/${id}`),
    enabled: !!id,
  })
}

/* ------------------- Auto PO draft + manager approval -------------- */

/**
 * Generate an auto-draft `PENDING_APPROVAL` purchase order for a supplier
 * by scanning every low-stock product whose `defaultSupplierId` matches.
 *
 * Returns either the created `PurchaseOrder` (when items were needed) or
 * `{ message: "no-items-needed", count: 0 }` when nothing was low-stock.
 */
export function useAutoDraftPO() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { supplierId: string }) =>
      jsend<PurchaseOrder | { message: string; count: number }>(
        "/api/purchase-orders/auto-draft",
        "POST",
        body
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] })
      qc.invalidateQueries({ queryKey: ["products"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}

/**
 * Approve a `PENDING_APPROVAL` PO. When `items` is supplied, the items are
 * updated (quantity/unitCost) and the PO total is recomputed before the
 * status is flipped to APPROVED — the "edit-then-approve" flow.
 */
export function useApprovePO() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: {
      id: string
      items?: { id: string; quantity: number; unitCost: number }[]
    }) =>
      jsend<PurchaseOrder>(`/api/purchase-orders/${args.id}`, "PATCH", {
        status: "APPROVED",
        ...(args.items ? { items: args.items } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}

/**
 * Reject a `PENDING_APPROVAL` PO with a manager-provided reason.
 */
export function useRejectPO() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; rejectionReason: string }) =>
      jsend<PurchaseOrder>(`/api/purchase-orders/${args.id}`, "PATCH", {
        status: "REJECTED",
        rejectionReason: args.rejectionReason,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}

/* ----------------------- Pricing & Promotions Engine ---------------------- */
//
// The pricing engine exposes 4 endpoints:
//   GET    /api/pricing                — list products + active promo
//   POST   /api/pricing                — bulk price update w/ cost guard
//   GET    /api/pricing/audit          — immutable PriceChange log
//   GET    /api/pricing/effective      — single-product effective price
//   GET    /api/promotions             — list all promotions
//   POST   /api/promotions             — create a promotion (ADMIN)
//   DELETE /api/promotions?id=         — soft-deactivate (ADMIN)
//
// `PriceTier` mirrors the type in src/lib/pricing.ts; we re-declare it here
// so consumers of the hooks don't have to import from a non-types module.

export type PriceTier = "RETAIL" | "WHOLESALE" | "CORPORATE"

export interface PricingItem {
  id: string
  name: string
  barcode: string | null
  categoryName: string | null
  costPrice: number
  salePrice: number
  wholesalePrice: number
  corporatePrice: number
  activePromotion: {
    id: string
    productId: string
    discountType: "PERCENT" | "AMOUNT"
    discountValue: number
    note: string | null
  } | null
}

export interface PriceChangeEntry {
  id: string
  productId: string
  productName: string
  barcode: string | null
  priceType: "RETAIL" | "WHOLESALE" | "CORPORATE"
  oldPrice: number
  newPrice: number
  changedByName: string | null
  changedAt: string
  note: string | null
}

export type PromotionScope = "PRODUCT" | "CATEGORY" | "ALL" | "ALL_EXCEPT_CATEGORIES"

export interface PromotionItem {
  id: string
  scope: PromotionScope
  productId: string | null
  productName: string | null
  barcode: string | null
  categoryIds: string[]
  categoryNames: string[]
  discountType: "PERCENT" | "AMOUNT"
  discountValue: number
  startAt: string
  endAt: string
  isActive: boolean
  note: string | null
  createdByName: string | null
  createdAt: string
}

export interface EffectivePrice {
  effectivePrice: number
  basePrice: number
  promoPrice: number | null
  promotion: {
    id: string
    discountType: string
    discountValue: number
    note?: string | null
  } | null
}

/** Below-cost warning returned (status 409) by POST /api/pricing when confirm=false. */
export interface BelowCostWarning {
  productId: string
  name: string
  costPrice: number
  newPrice: number
}

/** List all products with their price tiers + any active promotion. */
export function usePricingItems() {
  return useQuery<{ items: PricingItem[] }>({
    queryKey: ["pricing"],
    queryFn: () => jget("/api/pricing"),
  })
}

/**
 * Bulk-update sale prices with an audit trail. When `confirm` is false, the
 * server returns 409 { error: "below-cost", warnings: [...] } if any staged
 * price is below the product's cost — the client must re-send with
 * `confirm: true` after the manager reviews the warning modal.
 *
 * On success returns `{ applied: number, auditEntries: number }`.
 */
export function useUpdatePrices() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      changes: Array<{
        productId: string
        priceType: PriceTier
        newPrice: number
        note?: string | null
      }>
      confirm: boolean
    }): Promise<{ applied: number; auditEntries: number }> => {
      const res = await fetch("/api/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // Attach the below-cost warnings to the error so the UI can surface
        // the modal listing the offending items.
        const err: any = new Error((data as any)?.error || `request-failed:${res.status}`)
        err.error = (data as any)?.error
        err.warnings = (data as any)?.warnings
        err.status = res.status
        throw err
      }
      return data as { applied: number; auditEntries: number }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing"] })
      qc.invalidateQueries({ queryKey: ["pricing-audit"] })
      qc.invalidateQueries({ queryKey: ["products"] })
      qc.invalidateQueries({ queryKey: ["promotions"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}

/** Read-only audit log of every price change (newest first). */
export function usePriceChangeAudit() {
  return useQuery<{ items: PriceChangeEntry[] }>({
    queryKey: ["pricing-audit"],
    queryFn: () => jget("/api/pricing/audit"),
  })
}

/** List all promotions (newest first). */
export function usePromotions() {
  return useQuery<{ items: PromotionItem[] }>({
    queryKey: ["promotions"],
    queryFn: () => jget("/api/promotions"),
  })
}

/**
 * A lightweight variant of `usePromotions` that returns ONLY the active
 * promotions for the current moment — used by the POS to compute the
 * effective price per cart line without per-product network calls.
 *
 * The returned array is filtered client-side from the full promotions list,
 * so it stays in sync with the same TanStack Query cache.
 */
export function useActivePromotions() {
  const { data, isLoading, isError } = usePromotions()
  const now = Date.now()
  const items = (data?.items ?? []).filter((p) => {
    if (!p.isActive) return false
    const s = new Date(p.startAt).getTime()
    const e = new Date(p.endAt).getTime()
    return now >= s && now <= e
  })
  return { data: { items }, isLoading, isError }
}

/** Create a new promotion (ADMIN only). */
export function useCreatePromotion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      scope: PromotionScope
      productId?: string | null
      categoryIds?: string[]
      discountType: "PERCENT" | "AMOUNT"
      discountValue: number
      startAt: string
      endAt: string
      note?: string | null
    }) => jsend<{ id: string; ok: boolean }>("/api/promotions", "POST", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promotions"] })
      qc.invalidateQueries({ queryKey: ["pricing"] })
    },
  })
}

/** Soft-deactivate a promotion by id (ADMIN only). */
export function useDeactivatePromotion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => jsend<{ ok: boolean }>(`/api/promotions?id=${encodeURIComponent(id)}`, "DELETE"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promotions"] })
      qc.invalidateQueries({ queryKey: ["pricing"] })
    },
  })
}

/**
 * Fetch the effective price (base + active promo) for a single product under
 * a given tier. Pass `productId=null` to disable the query (e.g. when no
 * product is selected).
 */
export function useEffectivePrice(productId: string | null, tier: PriceTier) {
  return useQuery<EffectivePrice>({
    queryKey: ["effective-price", productId, tier],
    queryFn: () =>
      jget(
        `/api/pricing/effective?productId=${encodeURIComponent(
          productId || ""
        )}&tier=${tier}`
      ),
    enabled: !!productId,
  })
}

/* ----------------------- Purchase Invoices (GRN) ---------------------- */
//
//  GET    /api/purchase-invoices                — list (newest first)
//  POST   /api/purchase-invoices                — create (DRAFT or POSTED)
//  GET    /api/purchase-invoices/[id]           — single invoice
//  PUT    /api/purchase-invoices/[id]           — update DRAFT (ADMIN only)
//  DELETE /api/purchase-invoices/[id]           — delete DRAFT (ADMIN only)
//  POST   /api/purchase-invoices/[id]/post      — post a DRAFT invoice
//

export interface PurchaseInvoiceItem {
  id: string
  purchaseInvoiceId: string
  productId: string
  productName: string
  purchaseOrderItemId?: string | null
  quantity: number
  receivedQty: number
  unitCost: number
  subtotal: number
  landedCost: number
  note?: string | null
}

export interface PurchaseInvoice {
  id: string
  invoiceNo: string
  purchaseOrderId?: string | null
  supplierId: string
  supplierName: string
  warehouseId?: string | null
  warehouseName?: string | null
  invoiceDate: string
  status: "DRAFT" | "POSTED" | "CANCELLED"
  subtotal: number
  taxRate: number
  taxAmount: number
  discount: number
  shipping: number
  customs: number
  otherCharges: number
  total: number
  note?: string | null
  createdByName?: string | null
  createdAt: string
  items: PurchaseInvoiceItem[]
}

export interface CreatePurchaseInvoiceBody {
  invoiceNo?: string
  supplierId: string
  warehouseId?: string | null
  purchaseOrderId?: string | null
  invoiceDate?: string
  taxRate?: number
  discount?: number
  shipping?: number
  customs?: number
  otherCharges?: number
  note?: string | null
  items: Array<{
    productId: string
    quantity: number
    unitCost: number
    purchaseOrderItemId?: string | null
    note?: string | null
  }>
  post?: boolean
}

/** List all purchase invoices (newest first). */
export function usePurchaseInvoices() {
  return useQuery<{ items: PurchaseInvoice[] }>({
    queryKey: ["purchase-invoices"],
    queryFn: () => jget("/api/purchase-invoices"),
  })
}

/** Create a purchase invoice (DRAFT or POSTED depending on `post` flag). */
export function useCreatePurchaseInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreatePurchaseInvoiceBody) =>
      jsend<PurchaseInvoice>("/api/purchase-invoices", "POST", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-invoices"] })
      qc.invalidateQueries({ queryKey: ["purchase-orders"] })
      qc.invalidateQueries({ queryKey: ["products"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}

/** Post a DRAFT purchase invoice (bumps stock + creates journal entry). */
export function usePostPurchaseInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      jsend<{ id: string; status: string; journalEntryId?: string | null }>(
        `/api/purchase-invoices/${id}/post`,
        "POST"
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-invoices"] })
      qc.invalidateQueries({ queryKey: ["purchase-orders"] })
      qc.invalidateQueries({ queryKey: ["products"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}

/** Delete a DRAFT purchase invoice (ADMIN only). */
export function useDeletePurchaseInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => jsend(`/api/purchase-invoices/${id}`, "DELETE"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-invoices"] })
    },
  })
}

/* ----------------------------- Supplier Payments --------------------- */
export interface CreateSupplierPaymentBody {
  supplierId: string
  amount: number
  paymentDate?: string
  paymentMethod: "CASH" | "BANK" | "CHECK"
  referenceNo?: string | null
  note?: string | null
}

/** List all supplier payments (newest first). Pass supplierId to filter. */
export function useSupplierPayments(supplierId?: string) {
  const qs = supplierId ? `?supplierId=${supplierId}` : ""
  return useQuery<{ items: SupplierPayment[] }>({
    queryKey: ["supplier-payments", supplierId ?? "all"],
    queryFn: () => jget(`/api/supplier-payments${qs}`),
  })
}

/** Create a supplier payment (+ balanced journal entry server-side). */
export function useCreateSupplierPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateSupplierPaymentBody) =>
      jsend<SupplierPayment>("/api/supplier-payments", "POST", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-payments"] })
      qc.invalidateQueries({ queryKey: ["supplier-balances"] })
      qc.invalidateQueries({ queryKey: ["suppliers"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}

/** Delete a supplier payment (ADMIN only; also reverses its journal entry). */
export function useDeleteSupplierPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => jsend(`/api/supplier-payments/${id}`, "DELETE"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-payments"] })
      qc.invalidateQueries({ queryKey: ["supplier-balances"] })
      qc.invalidateQueries({ queryKey: ["suppliers"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}

/** Outstanding balance per supplier (POSTED invoices − payments). */
export function useSupplierBalances() {
  return useQuery<{ items: SupplierBalance[] }>({
    queryKey: ["supplier-balances"],
    queryFn: () => jget("/api/suppliers/balances"),
  })
}

/* ----------------------------- User Management --------------------- */
export interface UserItem {
  id: string
  email: string
  name: string
  role: "ADMIN" | "SALES" | "WAREHOUSE"
  createdAt: string
  updatedAt: string
}

export function useUsers() {
  return useQuery<{ items: UserItem[] }>({
    queryKey: ["users"],
    queryFn: () => jget("/api/users"),
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { email: string; name: string; password: string; role: string }) =>
      jsend<UserItem>("/api/users", "POST", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  })
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { email?: string; name?: string; password?: string; role?: string }) =>
      jsend<UserItem>(`/api/users/${id}`, "PUT", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => jsend(`/api/users/${id}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  })
}
