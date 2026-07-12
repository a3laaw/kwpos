/**
 * Serializers for bundles entities.
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

export function serializeBundleItem(i: AnyRow): BundleItem {
  const productRow = i.product as AnyRow | undefined
  return {
    id: String(i.id),
    bundleId: String(i.bundleId),
    productId: String(i.productId),
    quantity: Number(i.quantity ?? 0),
    product: productRow ? (serializeProduct(productRow) as Product) : undefined,
  }
}

export function serializeBundle(b: AnyRow): Bundle {
  const items = ((b.items as AnyRow[] | undefined) ?? []).map(serializeBundleItem)
  const salePrice = Number(b.salePrice ?? 0)

  const totalCost = items.reduce((sum, it) => {
    const cost = Number(it.product?.costPrice ?? 0)
    return sum + cost * Number(it.quantity ?? 0)
  }, 0)

  const itemsRetailTotal = items.reduce((sum, it) => {
    const sale = Number(it.product?.salePrice ?? 0)
    return sum + sale * Number(it.quantity ?? 0)
  }, 0)

  const profit = salePrice - totalCost
  const discountPct = itemsRetailTotal > 0
    ? ((itemsRetailTotal - salePrice) / itemsRetailTotal) * 100
    : 0

  return {
    id: String(b.id),
    name: String(b.name),
    description: (b.description as string | null) ?? null,
    imageUrl: (b.imageUrl as string | null) ?? null,
    salePrice,
    isActive: Boolean(b.isActive ?? true),
    startDate: b.startDate ? String(b.startDate) : null,
    endDate: b.endDate ? String(b.endDate) : null,
    category: (b.category as string | null) ?? null,
    createdAt: String(b.createdAt),
    items,
    totalCost,
    itemsRetailTotal,
    profit,
    discountPct,
  }
}
