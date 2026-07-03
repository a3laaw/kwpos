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
  const lowStock = searchParams.get("lowStock") === "true"

  const where: any = {}
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { barcode: { contains: q } },
    ]
  }
  if (categoryId) where.categoryId = categoryId
  if (supplierId) where.supplierId = supplierId
  if (lowStock) {
    // quantity <= reorderLevel
    where.AND = []
  }

  let products = await db.product.findMany({
    where,
    include: { category: true, supplier: true },
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
  // Admin & Warehouse can create products; Sales cannot
  if (!hasRole(user.role, ["ADMIN", "WAREHOUSE" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const {
    name,
    barcode,
    categoryId,
    supplierId,
    quantity,
    reorderLevel,
    costPrice,
    salePrice,
    unit,
  } = body || {}

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name-required" }, { status: 400 })
  }

  const created = await db.product.create({
    data: {
      name: name.trim(),
      barcode: barcode?.trim() || null,
      categoryId: categoryId || null,
      supplierId: supplierId || null,
      quantity: Number(quantity) || 0,
      reorderLevel: Number(reorderLevel) || 0,
      costPrice: Number(costPrice) || 0,
      salePrice: Number(salePrice) || 0,
      unit: unit?.trim() || "قطعة",
    },
    include: { category: true, supplier: true },
  })

  return NextResponse.json(serializeProduct(created), { status: 201 })
}
