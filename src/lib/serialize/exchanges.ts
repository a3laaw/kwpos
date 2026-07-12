/**
 * Serializers for exchanges entities.
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

export function serializeExchangeLine(l: AnyRow): {
  id: string
  exchangeId: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
  isReturn: boolean
} {
  return {
    id: String(l.id),
    exchangeId: String(l.exchangeId),
    productId: String(l.productId),
    productName: String(l.productName ?? (l.product as any)?.name ?? "—"),
    quantity: Number(l.quantity ?? 0),
    unitPrice: Number(l.unitPrice ?? 0),
    lineTotal: Number(l.lineTotal ?? 0),
    isReturn: Boolean(l.isReturn ?? false),
  }
}

export function serializeExchange(e: AnyRow) {
  return {
    id: String(e.id),
    exchangeNo: String(e.exchangeNo),
    originalSaleId: (e.originalSaleId as string | null) ?? null,
    customerName: (e.customerName as string | null) ?? null,
    customerPhone: (e.customerPhone as string | null) ?? null,
    netAmount: Number(e.netAmount ?? 0),
    paymentMethod: (e.paymentMethod as string) ?? "CASH",
    itemCount: Number(e.itemCount ?? 0),
    note: (e.note as string | null) ?? null,
    userId: (e.userId as string | null) ?? null,
    userName: (e.user as any)?.name ?? null,
    lines: ((e.lines as AnyRow[] | undefined) ?? []).map(serializeExchangeLine),
    createdAt: String(e.createdAt),
  }
}
