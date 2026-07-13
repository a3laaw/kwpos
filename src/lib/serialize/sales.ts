/**
 * Serializers for sales entities.
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

export function serializeSaleItem(i: AnyRow): SaleItem {
  return {
    id: String(i.id),
    productId: String(i.productId),
    productName: (i.product as any)?.name ?? "—",
    quantity: Number(i.quantity ?? 0),
    returnedQty: Number(i.returnedQty ?? 0),
    unitPrice: Number(i.unitPrice ?? 0),
    subtotal: Number(i.subtotal ?? 0),
  }
}

export function serializeSale(s: AnyRow): Sale {
  return {
    id: String(s.id),
    invoiceNo: String(s.invoiceNo),
    customerName: (s.customerName as string | null) ?? null,
    customerPhone: (s.customerPhone as string | null) ?? null,
    customerId: (s.customerId as string | null) ?? null,
    subtotal: Number(s.subtotal ?? 0),
    taxRate: Number(s.taxRate ?? 0),
    taxAmount: Number(s.taxAmount ?? 0),
    discount: Number(s.discount ?? 0),
    total: Number(s.total ?? 0),
    paid: Number(s.paid ?? 0),
    refundTotal: Number(s.refundTotal ?? 0),
    refundStatus: (s.refundStatus as Sale["refundStatus"]) ?? "NONE",
    paymentMethod: (s.paymentMethod as Sale["paymentMethod"]) ?? "CASH",
    deliveryFee: Number(s.deliveryFee ?? 0),
    driverName: (s.driverName as string | null) ?? null,
    userId: (s.userId as string | null) ?? null,
    userName: (s.user as any)?.name ?? null,
    items: (s.items as AnyRow[] | undefined)?.map(serializeSaleItem) ?? [],
    createdAt: String(s.createdAt),
    // Cancellation lifecycle
    status: (s.status as Sale["status"]) ?? "COMPLETED",
    cancelledAt: s.cancelledAt ? String(s.cancelledAt) : null,
    cancelledById: (s.cancelledById as string | null) ?? null,
    cancelledByName: (s.cancelledBy as any)?.name ?? null,
    cancellationReason: (s.cancellationReason as string | null) ?? null,
  }
}
