/**
 * Serializers for accounting entities.
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

export function serializeAccount(a: AnyRow): Account {
  return {
    id: String(a.id),
    code: String(a.code),
    name: String(a.name),
    type: (a.type as Account["type"]) ?? "ASSET",
    parentId: (a.parentId as string | null) ?? null,
    parentName: (a.parent as any)?.name ?? null,
    balance: Number(a.balance ?? 0),
    isSystem: Boolean(a.isSystem),
    children: (a.children as AnyRow[] | undefined)?.map(serializeAccount),
    createdAt: String(a.createdAt),
  }
}

export function serializeExpense(e: AnyRow): ExpenseTransaction {
  return {
    id: String(e.id),
    type: (e.type as ExpenseTransaction["type"]) ?? "ADMIN",
    employeeName: (e.employeeName as string | null) ?? null,
    payDate: e.payDate ? String(e.payDate) : null,
    title: (e.title as string | null) ?? null,
    category: (e.category as string | null) ?? null,
    date: e.date ? String(e.date) : null,
    amount: Number(e.amount ?? 0),
    accountId: String(e.accountId),
    accountName: (e.account as any)?.name ?? null,
    paymentAccountId: String(e.paymentAccountId),
    paymentAccountName: (e.paymentAccount as any)?.name ?? null,
    note: (e.note as string | null) ?? null,
    createdAt: String(e.createdAt),
  }
}

export function serializeCustomer(c: AnyRow): Customer {
  return {
    id: String(c.id),
    name: String(c.name),
    phone: String(c.phone ?? ""),
    address: String(c.address ?? ""),
    type: ((c.type as string) || "RETAIL") as Customer["type"],
    loyaltyPoints: Number(c.loyaltyPoints ?? 0),
    loyaltyTier: (c.loyaltyTier as string | null) ?? null,
    createdAt: String(c.createdAt),
    updatedAt: String(c.updatedAt),
  }
}
