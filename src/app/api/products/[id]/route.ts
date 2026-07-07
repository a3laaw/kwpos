import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { serializeProduct } from "@/lib/serialize"
import { logAuditEvent } from "@/lib/audit"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const p = await db.product.findUnique({
    where: { id },
    include: { category: true, supplier: true, defaultSupplier: true, stockItems: { include: { warehouse: true } } },
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
    defaultSupplierId,
    quantity,
    reorderLevel,
    optimalOrderQty,
    costPrice,
    salePrice,
    wholesalePrice,
    corporatePrice,
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
      ...(defaultSupplierId !== undefined ? { defaultSupplierId: defaultSupplierId || null } : {}),
      ...(quantity !== undefined ? { quantity: Number(quantity) || 0 } : {}),
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

  // ── Audit log ──
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
  if (!hasRole(user.role, ["ADMIN", "WAREHOUSE" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  const { id } = await params
  const exists = await db.product.findUnique({ where: { id } })
  if (!exists) return NextResponse.json({ error: "not-found" }, { status: 404 })

  await db.product.delete({ where: { id } })

  // ── Audit log ──
  await logAuditEvent({
    userId: user.id,
    userName: user.name,
    action: "PRODUCT_DELETED",
    description: `حذف منتج ${exists.name ?? ""}`,
    productId: id,
  })

  return NextResponse.json({ ok: true })
}
