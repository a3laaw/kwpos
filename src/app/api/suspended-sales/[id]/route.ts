import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

/** GET /api/suspended-sales/[id] — fetch a parked sale's full cart snapshot. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { id } = await params
  const parked = await db.suspendedSale.findUnique({ where: { id } })
  if (!parked) return NextResponse.json({ error: "not-found" }, { status: 404 })

  return NextResponse.json({
    id: parked.id,
    holdNo: parked.holdNo,
    label: parked.label,
    cartJson: parked.cartJson,
    itemCount: parked.itemCount,
    total: Number(parked.total),
    createdAt: parked.createdAt,
    status: parked.status,
  })
}

/** DELETE /api/suspended-sales/[id] — discard a parked sale. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { id } = await params
  // Soft-delete by marking DISCARDED (keeps audit trail).
  const updated = await db.suspendedSale.updateMany({
    where: { id, status: "PARKED" },
    data: { status: "DISCARDED" },
  })
  if (updated.count === 0) {
    return NextResponse.json({ error: "not-found-or-resumed" }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}

/** PATCH /api/suspended-sales/[id] — mark as resumed (after the cart is reloaded). */
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { id } = await params
  const updated = await db.suspendedSale.updateMany({
    where: { id, status: "PARKED" },
    data: { status: "RESUMED", resumedAt: new Date() },
  })
  if (updated.count === 0) {
    return NextResponse.json({ error: "not-found-or-already-resumed" }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
