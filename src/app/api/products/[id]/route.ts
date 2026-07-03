import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { serializeProduct } from "@/lib/serialize"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const p = await db.product.findUnique({
    where: { id },
    include: { category: true, supplier: true },
  })
  if (!p) return NextResponse.json({ error: "not-found" }, { status: 404 })
  return NextResponse.json(serializeProduct(p as any))
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["ADMIN", "WAREHOUSE" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  const { id } = await params
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

  const exists = await db.product.findUnique({ where: { id } })
  if (!exists) return NextResponse.json({ error: "not-found" }, { status: 404 })

  const updated = await db.product.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: String(name).trim() } : {}),
      ...(barcode !== undefined ? { barcode: barcode ? String(barcode).trim() : null } : {}),
      ...(categoryId !== undefined ? { categoryId: categoryId || null } : {}),
      ...(supplierId !== undefined ? { supplierId: supplierId || null } : {}),
      ...(quantity !== undefined ? { quantity: Number(quantity) || 0 } : {}),
      ...(reorderLevel !== undefined ? { reorderLevel: Number(reorderLevel) || 0 } : {}),
      ...(costPrice !== undefined ? { costPrice: Number(costPrice) || 0 } : {}),
      ...(salePrice !== undefined ? { salePrice: Number(salePrice) || 0 } : {}),
      ...(unit !== undefined ? { unit: String(unit).trim() || "قطعة" } : {}),
    },
    include: { category: true, supplier: true },
  })

  return NextResponse.json(serializeProduct(updated as any))
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["ADMIN", "WAREHOUSE" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  const { id } = await params
  const exists = await db.product.findUnique({ where: { id } })
  if (!exists) return NextResponse.json({ error: "not-found" }, { status: 404 })

  await db.product.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
