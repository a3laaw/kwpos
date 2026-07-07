"use client"

import * as React from "react"
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import type { Bundle } from "@/lib/types"

/* ----------------------------- fetch helpers ----------------------------- */
// Local copies of the jget / jsend helpers used elsewhere in the app, kept
// here so this file stays self-contained (no edits to use-api.ts needed).

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

/* ------------------------------- payload type ----------------------------- */
export interface BundleItemInput {
  productId: string
  quantity: number
}

export interface BundleInput {
  name: string
  description?: string | null
  imageUrl?: string | null
  salePrice: number
  isActive?: boolean
  startDate?: string | null
  endDate?: string | null
  category?: string | null
  items: BundleItemInput[]
}

/* -------------------------------- queries -------------------------------- */

/**
 * List bundles. Pass `q` for name search and `activeOnly=true` to filter only
 * active bundles. Returns `{ items: Bundle[] }`.
 */
export function useBundles(q?: string, activeOnly?: boolean) {
  const qs = new URLSearchParams()
  if (q) qs.set("q", q)
  if (activeOnly) qs.set("active", "true")
  const query = qs.toString()
  return useQuery<{ items: Bundle[] }>({
    queryKey: ["bundles", q ?? "", activeOnly ?? false],
    queryFn: () => jget(`/api/bundles${query ? `?${query}` : ""}`),
  })
}

/** Fetch a single bundle by id. Pass `null` to skip the query. */
export function useBundle(id: string | null) {
  return useQuery<Bundle>({
    queryKey: ["bundles", id ?? ""],
    queryFn: () => jget(`/api/bundles/${id}`),
    enabled: !!id,
  })
}

/* ------------------------------- mutations -------------------------------- */

export function useCreateBundle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: BundleInput) => jsend<Bundle>("/api/bundles", "POST", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bundles"] }),
  })
}

export function useUpdateBundle(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<BundleInput>) =>
      jsend<Bundle>(`/api/bundles/${id}`, "PUT", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bundles"] }),
  })
}

export function useDeleteBundle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => jsend(`/api/bundles/${id}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bundles"] }),
  })
}
