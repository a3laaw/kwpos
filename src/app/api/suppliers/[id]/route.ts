import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { serializeSupplier } from "@/lib/serialize"
import { canDelete } from "@/lib/permissions"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN", "WAREHOUSE" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()
  const exists = await db.supplier.findUnique({ where: { id } })
  if (!exists) return NextResponse.json({ error: "not-found" }, { status: 404 })

  const updated = await db.supplier.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
      ...(body.contact !== undefined ? { contact: body.contact ? String(body.contact).trim() : null } : {}),
      ...(body.phone !== undefined ? { phone: body.phone ? String(body.phone).trim() : null } : {}),
      ...(body.email !== undefined ? { email: body.email ? String(body.email).trim() : null } : {}),
      ...(body.address !== undefined ? { address: body.address ? String(body.address).trim() : null } : {}),
      ...(body.supplierType !== undefined ? { supplierType: body.supplierType === "FOREIGN" ? "FOREIGN" : "LOCAL" } : {}),
    },
  })
  return NextResponse.json(serializeSupplier(updated as any))
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!canDelete(user.role as Role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  const { id } = await params
  const exists = await db.supplier.findUnique({
    where: { id },
    include: { _count: { select: { products: true, orders: true } } },
  })
  if (!exists) return NextResponse.json({ error: "not-found" }, { status: 404 })
  if ((exists as any)._count.products > 0 || (exists as any)._count.orders > 0) {
    return NextResponse.json(
      { error: "cannot-delete-linked" },
      { status: 409 }
    )
  }
  await db.supplier.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
