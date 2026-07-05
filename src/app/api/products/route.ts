import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { serializeProduct } from "@/lib/serialize"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim() || ""
  const categoryId = searchParams.get("categoryId") || undefined
  const supplierId = searchParams.get("supplierId") || undefined
  const warehouseId = searchParams.get("warehouseId") || undefined
  const lowStock = searchParams.get("lowStock") === "true"

  const where: any = {}
  if (q) {
    where.OR = [{ name: { contains: q } }, { barcode: { contains: q } }]
  }
  if (categoryId) where.categoryId = categoryId
  if (supplierId) where.supplierId = supplierId
  if (warehouseId) where.stockItems = { some: { warehouseId } }

  let products = await db.product.findMany({
    where,
    include: {
      category: true,
      supplier: true,
      defaultSupplier: true,
      stockItems: { include: { warehouse: true } },
    },
    orderBy: { name: "asc" },
  })

  if (lowStock) {
    products = products.filter((p) => p.quantity <= p.reorderLevel)
  }

  return NextResponse.json({ items: products.map(serializeProduct) })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["ADMIN", "WAREHOUSE" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const {
    name,
    barcode,
    categoryId,
    supplierId,
    defaultSupplierId,
    quantity,
    reorderLevel,
    optimalOrderQty,
    costPrice,
    salePrice,
    wholesalePrice,
    corporatePrice,
    unit,
    unitId,
    warehouseStock, // array of { warehouseId, quantity }
  } = body || {}

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name-required" }, { status: 400 })
  }

  // Total quantity = sum of warehouse stocks (if provided) else the quantity field
  const stockRows: Array<{ warehouseId: string; quantity: number }> = Array.isArray(warehouseStock)
    ? warehouseStock.filter((s: any) => s.warehouseId && Number(s.quantity) > 0)
    : []
  const totalQty = stockRows.length > 0
    ? stockRows.reduce((a, b) => a + Number(b.quantity), 0)
    : Number(quantity) || 0

  const created = await db.product.create({
    data: {
      name: name.trim(),
      barcode: barcode?.trim() || null,
      categoryId: categoryId || null,
      supplierId: supplierId || null,
      defaultSupplierId: defaultSupplierId || null,
      quantity: totalQty,
      reorderLevel: Number(reorderLevel) || 0,
      optimalOrderQty: Number(optimalOrderQty) || 0,
      costPrice: Number(costPrice) || 0,
      salePrice: Number(salePrice) || 0,
      wholesalePrice: Number(wholesalePrice) || 0,
      corporatePrice: Number(corporatePrice) || 0,
      unit: unit?.trim() || "قطعة",
      unitId: unitId || null,
      imageUrl: body.imageUrl?.trim() || null,
      stockItems: stockRows.length
        ? { create: stockRows.map((s) => ({ warehouseId: s.warehouseId, quantity: Number(s.quantity) })) }
        : undefined,
    },
    include: { category: true, supplier: true, defaultSupplier: true, stockItems: { include: { warehouse: true } } },
  })

  return NextResponse.json(serializeProduct(created), { status: 201 })
}
