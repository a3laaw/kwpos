/**
 * Serializers for compositions entities.
 * Extracted from the original monolithic serialize.ts (Split Module — Fowler).
 */

import type {
  Category,
  Product,
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  Sale,
  SaleItem,
  Account,
  ExpenseTransaction,
  Customer,
  Warehouse,
  Bundle,
  BundleItem,
  Composition,
  CompositionIngredient,
} from "@/lib/types"

import { serializeProduct } from "./inventory"

type AnyRow = Record<string, unknown>

export function serializeCompositionIngredient(i: AnyRow): CompositionIngredient {
  const productRow = i.product as AnyRow | undefined
  return {
    id: String(i.id),
    compositionId: String(i.compositionId),
    productId: String(i.productId),
    quantity: Number(i.quantity ?? 0),
    unit: String(i.unit ?? "جرام"),
    notes: (i.notes as string | null) ?? null,
    product: productRow ? (serializeProduct(productRow) as Product) : undefined,
  }
}

export function serializeComposition(c: AnyRow): Composition {
  const ingredients = ((c.ingredients as AnyRow[] | undefined) ?? []).map(
    serializeCompositionIngredient
  )

  const yieldQty = Number(c.yieldQty ?? 0)

  const costPerBatch = ingredients.reduce((sum, ing) => {
    const cost = Number(ing.product?.costPrice ?? 0)
    return sum + cost * Number(ing.quantity ?? 0)
  }, 0)

  const costPerUnit = yieldQty > 0 ? costPerBatch / yieldQty : 0

  const outputProductRow = c.outputProduct as AnyRow | undefined

  return {
    id: String(c.id),
    name: String(c.name),
    description: (c.description as string | null) ?? null,
    imageUrl: (c.imageUrl as string | null) ?? null,
    outputProductId: String(c.outputProductId),
    yieldQty,
    yieldUnit: String(c.yieldUnit ?? "قطعة"),
    isActive: Boolean(c.isActive ?? true),
    notes: (c.notes as string | null) ?? null,
    createdAt: String(c.createdAt),
    outputProduct: outputProductRow
      ? (serializeProduct(outputProductRow) as Product)
      : undefined,
    ingredients,
    costPerBatch,
    costPerUnit,
  }
}
