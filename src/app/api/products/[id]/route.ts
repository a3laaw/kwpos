import { NextRequest, NextResponse } from "next/server"
import { db, updateProductQuantityFromStockItems } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { serializeProduct } from "@/lib/serialize"
import { logAuditEvent } from "@/lib/audit"
import { canDelete, canManageProducts, stripProductCost } from "@/lib/permissions"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { id } = await params
  const p = await db.product.findUnique({
    where: { id },
    include: { category: true, supplier: true, defaultSupplier: true, stockItems: { include: { warehouse: true } } },
  })
  if (!p) return NextResponse.json({ error: "not-found" }, { status: 404 })
  return NextResponse.json(stripProductCost(serializeProduct(p as any), user.role as Role))
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!canManageProducts(user.role as Role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()
  const {
    name,
    barcode,
    categoryId,
    supplierId,
    defaultSupplierId,
    reorderLevel,
    optimalOrderQty,
    costPrice,
    salePrice,
    wholesalePrice,
    corporatePrice,
    taxRate,
    unit,
    warehouseStock, // [{ warehouseId, quantity }]
  } = body || {}

  const exists = await db.product.findUnique({ where: { id } })
  if (!exists) return NextResponse.json({ error: "not-found" }, { status: 404 })

  // If warehouseStock is provided, update StockItem rows inside a transaction
  // and recalculate Product.quantity as the aggregate sum.
  if (Array.isArray(warehouseStock) && warehouseStock.length > 0) {
    // Validate warehouseIds
    const whIds = warehouseStock.map((w: any) => w.warehouseId).filter(Boolean)
    if (whIds.length > 0) {
      const whCount = await db.warehouse.count({ where: { id: { in: whIds } } })
      if (whCount !== whIds.length) {
        return NextResponse.json({ error: "invalid-warehouse" }, { status: 400 })
      }
    }

    const updated = await db.$transaction(async (tx) => {
      // Update product fields
      const product = await tx.product.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name: String(name).trim() } : {}),
          ...(barcode !== undefined ? { barcode: barcode ? String(barcode).trim() : null } : {}),
          ...(categoryId !== undefined ? { categoryId: categoryId || null } : {}),
          ...(supplierId !== undefined ? { supplierId: supplierId || null } : {}),
          ...(defaultSupplierId !== undefined ? { defaultSupplierId: defaultSupplierId || null } : {}),
          ...(reorderLevel !== undefined ? { reorderLevel: Number(reorderLevel) || 0 } : {}),
          ...(optimalOrderQty !== undefined ? { optimalOrderQty: Number(optimalOrderQty) || 0 } : {}),
          ...(costPrice !== undefined ? { costPrice: Number(costPrice) || 0 } : {}),
          ...(salePrice !== undefined ? { salePrice: Number(salePrice) || 0 } : {}),
          ...(wholesalePrice !== undefined ? { wholesalePrice: Number(wholesalePrice) || 0 } : {}),
          ...(corporatePrice !== undefined ? { corporatePrice: Number(corporatePrice) || 0 } : {}),
          ...(taxRate !== undefined ? { taxRate: Math.max(0, Number(taxRate) || 0) } : {}),
          ...(unit !== undefined ? { unit: String(unit).trim() || "قطعة" } : {}),
          ...(body.unitId !== undefined ? { unitId: body.unitId || null } : {}),
          ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl ? String(body.imageUrl).trim() : null } : {}),
        },
        include: { category: true, supplier: true, defaultSupplier: true, stockItems: { include: { warehouse: true } } },
      })

      // Upsert each StockItem
      for (const ws of warehouseStock) {
        const whId = String(ws.warehouseId)
        const qty = Math.max(0, Math.round(Number(ws.quantity) || 0))
        await tx.stockItem.upsert({
          where: { productId_warehouseId: { productId: id, warehouseId: whId } },
          update: { quantity: qty },
          create: { productId: id, warehouseId: whId, quantity: qty },
        })
      }

      // Recalculate Product.quantity from StockItem sum
      await updateProductQuantityFromStockItems(tx, id)

      return tx.product.findUnique({
        where: { id },
        include: { category: true, supplier: true, defaultSupplier: true, stockItems: { include: { warehouse: true } } },
      })
    })

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: "PRODUCT_UPDATED",
      description: `تحديث منتج ${updated?.name ?? ""} + مخزون المستودعات`,
      productId: id,
    })

    return NextResponse.json(serializeProduct(updated as any))
  }

  // No warehouseStock — simple update (original path)
  const updated = await db.product.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: String(name).trim() } : {}),
      ...(barcode !== undefined ? { barcode: barcode ? String(barcode).trim() : null } : {}),
      ...(categoryId !== undefined ? { categoryId: categoryId || null } : {}),
      ...(supplierId !== undefined ? { supplierId: supplierId || null } : {}),
      ...(defaultSupplierId !== undefined ? { defaultSupplierId: defaultSupplierId || null } : {}),
      ...(reorderLevel !== undefined ? { reorderLevel: Number(reorderLevel) || 0 } : {}),
      ...(optimalOrderQty !== undefined ? { optimalOrderQty: Number(optimalOrderQty) || 0 } : {}),
      ...(costPrice !== undefined ? { costPrice: Number(costPrice) || 0 } : {}),
      ...(salePrice !== undefined ? { salePrice: Number(salePrice) || 0 } : {}),
      ...(wholesalePrice !== undefined ? { wholesalePrice: Number(wholesalePrice) || 0 } : {}),
      ...(corporatePrice !== undefined ? { corporatePrice: Number(corporatePrice) || 0 } : {}),
      ...(unit !== undefined ? { unit: String(unit).trim() || "قطعة" } : {}),
      ...(body.unitId !== undefined ? { unitId: body.unitId || null } : {}),
      ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl ? String(body.imageUrl).trim() : null } : {}),
    },
    include: { category: true, supplier: true, defaultSupplier: true, stockItems: { include: { warehouse: true } } },
  })

  await logAuditEvent({
    userId: user.id,
    userName: user.name,
    action: "PRODUCT_UPDATED",
    description: `تحديث منتج ${updated.name ?? ""}`,
    productId: id,
  })

  return NextResponse.json(serializeProduct(updated as any))
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  // Delete is a destructive operation → OWNER / ADMIN / MANAGER only.
  // WAREHOUSE can create/edit products but NOT delete them.
  if (!canDelete(user.role as Role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  const { id } = await params
  const exists = await db.product.findUnique({ where: { id } })
  if (!exists) return NextResponse.json({ error: "not-found" }, { status: 404 })

  await db.product.delete({ where: { id } })

  await logAuditEvent({
    userId: user.id,
    userName: user.name,
    action: "PRODUCT_DELETED",
    description: `حذف منتج ${exists.name ?? ""}`,
    productId: id,
  })

  return NextResponse.json({ ok: true })
}
