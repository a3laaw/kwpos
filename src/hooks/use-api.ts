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
    mutationFn: (body: { name: string }) => jsend("/api/categories", "POST", body),
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
    mutationFn: (body: { supplierId: string; note?: string; items: { productId: string; quantity: number; unitCost: number }[] }) =>
      jsend("/api/purchase-orders", "POST", body),
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
    mutationFn: (id: string) => jsend(`/api/purchase-orders/${id}/receive`, "POST"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] })
      qc.invalidateQueries({ queryKey: ["products"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
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
export function useSales(q?: string) {
  const qs = q ? `?q=${encodeURIComponent(q)}` : ""
  return useQuery<{ items: Sale[] }>({
    queryKey: ["sales", q ?? "all"],
    queryFn: () => jget(`/api/sales${qs}`),
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
    }) => jsend<Sale>("/api/sales", "POST", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] })
      qc.invalidateQueries({ queryKey: ["products"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}

/* ----------------------------- Dashboard ----------------------------- */
export function useDashboard() {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard"],
    queryFn: () => jget("/api/dashboard"),
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
