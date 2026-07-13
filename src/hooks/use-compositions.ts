"use client"

import * as React from "react"
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import type { Composition } from "@/lib/types"

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
    // Preserve the full error payload (e.g. produce returns an `ingredients`
    // array alongside the `error` code) so callers can read it.
    const err = new Error((data as any)?.error || `request-failed:${res.status}`)
    ;(err as any).payload = data
    throw err
  }
  return data as T
}

/* ------------------------------- payload types ---------------------------- */
export interface CompositionIngredientInput {
  productId: string
  quantity: number
  unit?: string
  notes?: string | null
}

export interface CompositionInput {
  name: string
  description?: string | null
  imageUrl?: string | null
  outputProductId?: string
  /** When true, the API creates a new Product as the composition output. */
  createNewProduct?: boolean
  /** Fixed profit amount in currency added on top of costPrice. */
  profitAmount?: number
  yieldQty: number
  yieldUnit?: string
  isActive?: boolean
  notes?: string | null
  ingredients: CompositionIngredientInput[]
}

/** Shape returned by the produce route when stock is short. */
export interface InsufficientIngredient {
  productId: string
  name: string
  required: number
  available: number
  unit: string
}

export interface ProduceResult {
  ok: boolean
  produced: number
  unit: string
}

/* -------------------------------- queries -------------------------------- */

/**
 * List compositions. Pass `q` for name search and `activeOnly=true` to
 * filter only active compositions. Returns `{ items: Composition[] }`.
 */
export function useCompositions(q?: string, activeOnly?: boolean) {
  const qs = new URLSearchParams()
  if (q) qs.set("q", q)
  if (activeOnly) qs.set("active", "true")
  const query = qs.toString()
  return useQuery<{ items: Composition[] }>({
    queryKey: ["compositions", q ?? "", activeOnly ?? false],
    queryFn: () => jget(`/api/compositions${query ? `?${query}` : ""}`),
  })
}

/** Fetch a single composition by id. Pass `null` to skip the query. */
export function useComposition(id: string | null) {
  return useQuery<Composition>({
    queryKey: ["compositions", id ?? ""],
    queryFn: () => jget(`/api/compositions/${id}`),
    enabled: !!id,
  })
}

/* ------------------------------- mutations -------------------------------- */

export function useCreateComposition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CompositionInput) =>
      jsend<Composition>("/api/compositions", "POST", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compositions"] }),
  })
}

export function useUpdateComposition(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<CompositionInput>) =>
      jsend<Composition>(`/api/compositions/${id}`, "PUT", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compositions"] }),
  })
}

export function useDeleteComposition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => jsend(`/api/compositions/${id}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compositions"] }),
  })
}

/**
 * Produce batches of a composition. Invalidates BOTH the compositions list
 * and the products list (since producing changes raw + output stock levels).
 */
export function useProduceComposition(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { batches: number }) =>
      jsend<ProduceResult>(`/api/compositions/${id}/produce`, "POST", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compositions"] })
      qc.invalidateQueries({ queryKey: ["products"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}
