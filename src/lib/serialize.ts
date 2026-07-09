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
    optimalOrderQty: Number(p.optimalOrderQty ?? 0),
    defaultSupplierId: (p.defaultSupplierId as string | null) ?? null,
    defaultSupplierName: (p.defaultSupplier as any)?.name ?? null,
    costPrice: Number(p.costPrice ?? 0),
    salePrice: Number(p.salePrice ?? 0),
    wholesalePrice: Number(p.wholesalePrice ?? 0),
    corporatePrice: Number(p.corporatePrice ?? 0),
    taxRate: Number((p as any).taxRate ?? 0),
    unit: String(p.unit ?? "قطعة"),
    unitId: (p.unitId as string | null) ?? null,
    imageUrl: (p.imageUrl as string | null) ?? null,
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
    code: (c.code as string | null) ?? null,
    barcodePrefix: (c.barcodePrefix as number | null) ?? null,
    imageUrl: (c.imageUrl as string | null) ?? null,
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
    type: ((c.type as string) || "RETAIL") as Customer["type"],
    loyaltyPoints: Number(c.loyaltyPoints ?? 0),
    loyaltyTier: (c.loyaltyTier as string | null) ?? null,
    createdAt: String(c.createdAt),
    updatedAt: String(c.updatedAt),
  }
}

/* ----------------------------- Exchanges --------------------------- */
/** Convert a Prisma ExchangeLine row into our API shape. */
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

/** Convert a Prisma ExchangeSale row (with lines + user) into our API shape. */
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

/* ------------------------------ Bundles ------------------------------ */
/** Convert a Prisma BundleItem row (with product included) into our API shape. */
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

/**
 * Convert a Prisma Bundle row (with items + product included) into our API
 * `Bundle` shape. Computes the live cost/profit/discount figures from the
 * included product cost & sale prices.
 *
 * - totalCost          = Σ (product.costPrice × item.quantity)
 * - itemsRetailTotal   = Σ (product.salePrice × item.quantity)
 * - profit             = salePrice − totalCost
 * - discountPct        = ((itemsRetailTotal − salePrice) / itemsRetailTotal × 100)
 *                        when itemsRetailTotal > 0, else 0.
 */
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

/* --------------------------- Compositions ---------------------------- */
/** Convert a Prisma CompositionIngredient row (with product included) into our API shape. */
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

/**
 * Convert a Prisma Composition row (with outputProduct + ingredients.product
 * included) into our API `Composition` shape. Computes the live cost figures:
 *
 * - costPerBatch = Σ (ingredient.product.costPrice × ingredient.quantity)
 * - costPerUnit  = costPerBatch / yieldQty   (0 when yieldQty <= 0)
 */
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
