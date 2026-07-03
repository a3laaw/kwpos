import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { serializeWarehouse } from "@/lib/serialize"

export const dynamic = "force-dynamic"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN" && user.role !== "WAREHOUSE") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()
  const exists = await db.warehouse.findUnique({ where: { id } })
  if (!exists) return NextResponse.json({ error: "not-found" }, { status: 404 })

  const updated = await db.warehouse.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
      ...(body.code !== undefined ? { code: body.code ? String(body.code).trim() : null } : {}),
      ...(body.location !== undefined ? { location: body.location ? String(body.location).trim() : null } : {}),
      ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
    },
    include: { stockItems: true },
  })
  return NextResponse.json(serializeWarehouse(updated as any))
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 })
  const { id } = await params
  const exists = await db.warehouse.findUnique({ where: { id }, include: { stockItems: true, purchaseOrders: true } })
  if (!exists) return NextResponse.json({ error: "not-found" }, { status: 404 })
  if (exists.stockItems.some((s) => s.quantity > 0)) {
    return NextResponse.json({ error: "has-stock" }, { status: 409 })
  }
  await db.warehouse.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
