/**
 * Serializers for purchases entities.
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

type AnyRow = Record<string, unknown>

export function serializeSupplier(s: AnyRow): Supplier {
  return {
    id: String(s.id),
    name: String(s.name),
    contact: (s.contact as string | null) ?? null,
    phone: (s.phone as string | null) ?? null,
    email: (s.email as string | null) ?? null,
    address: (s.address as string | null) ?? null,
    createdAt: String(s.createdAt),
  }
}

export function serializePoItem(i: AnyRow): PurchaseOrderItem {
  return {
    id: String(i.id),
    productId: String(i.productId),
    productName: (i.product as any)?.name ?? "—",
    quantity: Number(i.quantity ?? 0),
    returnedQty: Number(i.returnedQty ?? 0),
    unitCost: Number(i.unitCost ?? 0),
    subtotal: Number(i.subtotal ?? 0),
    suggestedSalePrice: Number(i.suggestedSalePrice ?? 0),
  }
}

export function serializePurchaseOrder(po: AnyRow): PurchaseOrder {
  return {
    id: String(po.id),
    supplierId: String(po.supplierId),
    supplierName: (po.supplier as any)?.name ?? "—",
    status: (po.status as PurchaseOrder["status"]) ?? "PENDING",
    total: Number(po.total ?? 0),
    taxRate: Number(po.taxRate ?? 0),
    receivedTaxAmount: Number(po.receivedTaxAmount ?? 0),
    customsAmount: Number(po.customsAmount ?? 0),
    shippingAmount: Number(po.shippingAmount ?? 0),
    otherCharges: Number(po.otherCharges ?? 0),
    landedCostApplied: Boolean(po.landedCostApplied ?? false),
    rejectionReason: (po.rejectionReason as string | null) ?? null,
    note: (po.note as string | null) ?? null,
    items: (po.items as AnyRow[] | undefined)?.map(serializePoItem) ?? [],
    createdAt: String(po.createdAt),
    updatedAt: String(po.updatedAt),
  }
}
