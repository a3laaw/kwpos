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
} from "@/lib/types"

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
