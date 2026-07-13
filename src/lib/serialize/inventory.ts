/**
 * Serializers for inventory entities.
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
    isManufactured: Boolean((p as any).isManufactured ?? false),
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
    parentId: (c.parentId as string | null) ?? null,
    createdAt: String(c.createdAt),
  }
}
