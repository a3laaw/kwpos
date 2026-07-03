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
} from "@/lib/types"

type AnyRow = Record<string, unknown>

/** Convert a Prisma row into our API `Product` shape. */
export function serializeProduct(p: AnyRow): Product {
  const stockByWarehouse = (p.stockItems as AnyRow[] | undefined)?.map((si) => ({
    warehouseId: String(si.warehouseId),
    warehouseName: (si.warehouse as any)?.name ?? "",
    warehouseCode: (si.warehouse as any)?.code ?? null,
    quantity: Number(si.quantity ?? 0),
  }))
  return {
    id: String(p.id),
    name: String(p.name),
    barcode: (p.barcode as string | null) ?? null,
    categoryId: (p.categoryId as string | null) ?? null,
    categoryName: (p.category as any)?.name ?? null,
    supplierId: (p.supplierId as string | null) ?? null,
    supplierName: (p.supplier as any)?.name ?? null,
    quantity: Number(p.quantity ?? 0),
    reorderLevel: Number(p.reorderLevel ?? 0),
    costPrice: Number(p.costPrice ?? 0),
    salePrice: Number(p.salePrice ?? 0),
    unit: String(p.unit ?? "قطعة"),
    unitId: (p.unitId as string | null) ?? null,
    stockByWarehouse,
    createdAt: String(p.createdAt),
    updatedAt: String(p.updatedAt),
  }
}

export function serializeWarehouse(w: AnyRow): Warehouse {
  const stockItems = (w.stockItems as AnyRow[] | undefined) ?? []
  return {
    id: String(w.id),
    name: String(w.name),
    code: (w.code as string | null) ?? null,
    location: (w.location as string | null) ?? null,
    isActive: Boolean(w.isActive ?? true),
    productsCount: stockItems.filter((si) => Number(si.quantity) > 0).length,
    totalStock: stockItems.reduce((s, si) => s + Number(si.quantity ?? 0), 0),
    createdAt: String(w.createdAt),
  }
}

export function serializeCategory(c: AnyRow): Category {
  return {
    id: String(c.id),
    name: String(c.name),
    createdAt: String(c.createdAt),
  }
}

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
    unitCost: Number(i.unitCost ?? 0),
    subtotal: Number(i.subtotal ?? 0),
  }
}

export function serializePurchaseOrder(po: AnyRow): PurchaseOrder {
  return {
    id: String(po.id),
    supplierId: String(po.supplierId),
    supplierName: (po.supplier as any)?.name ?? "—",
    status: (po.status as PurchaseOrder["status"]) ?? "PENDING",
    total: Number(po.total ?? 0),
    note: (po.note as string | null) ?? null,
    items: (po.items as AnyRow[] | undefined)?.map(serializePoItem) ?? [],
    createdAt: String(po.createdAt),
    updatedAt: String(po.updatedAt),
  }
}

export function serializeSaleItem(i: AnyRow): SaleItem {
  return {
    id: String(i.id),
    productId: String(i.productId),
    productName: (i.product as any)?.name ?? "—",
    quantity: Number(i.quantity ?? 0),
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
    paymentMethod: (s.paymentMethod as Sale["paymentMethod"]) ?? "CASH",
    userId: (s.userId as string | null) ?? null,
    userName: (s.user as any)?.name ?? null,
    items: (s.items as AnyRow[] | undefined)?.map(serializeSaleItem) ?? [],
    createdAt: String(s.createdAt),
  }
}

/* ----------------------------- Accounts ----------------------------- */
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
    createdAt: String(c.createdAt),
    updatedAt: String(c.updatedAt),
  }
}
