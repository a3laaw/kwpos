import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { serializePurchaseOrder } from "@/lib/serialize"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const po = await db.purchaseOrder.findUnique({
    where: { id },
    include: { supplier: true, items: { include: { product: true } } },
  })
  if (!po) return NextResponse.json({ error: "not-found" }, { status: 404 })
  return NextResponse.json(serializePurchaseOrder(po as any))
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
  const po = await db.purchaseOrder.findUnique({ where: { id } })
  if (!po) return NextResponse.json({ error: "not-found" }, { status: 404 })

  const updated = await db.purchaseOrder.update({
    where: { id },
    data: {
      ...(body.note !== undefined ? { note: body.note ? String(body.note).trim() : null } : {}),
      ...(body.status !== undefined && po.status === "PENDING"
        ? { status: body.status === "RECEIVED" ? "RECEIVED" : body.status === "CANCELLED" ? "CANCELLED" : "PENDING" }
        : {}),
    },
    include: { supplier: true, items: { include: { product: true } } },
  })
  return NextResponse.json(serializePurchaseOrder(updated as any))
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
  const po = await db.purchaseOrder.findUnique({ where: { id } })
  if (!po) return NextResponse.json({ error: "not-found" }, { status: 404 })
  if (po.status === "RECEIVED") {
    return NextResponse.json({ error: "cannot-delete-received" }, { status: 409 })
  }
  await db.purchaseOrder.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
