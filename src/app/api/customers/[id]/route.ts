import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { serializeCustomer } from "@/lib/serialize"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * PUT /api/customers/[id] — update a customer.
 * Allowed roles: OWNER, ADMIN, MANAGER, SALES.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN", "MANAGER", "SALES"] as Role[])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const exists = await db.customer.findUnique({ where: { id } })
  if (!exists) return NextResponse.json({ error: "not-found" }, { status: 404 })

  // Normalize customer type — default to RETAIL for invalid values.
  const rawType = body?.type
  const type =
    rawType === "WHOLESALE" || rawType === "CORPORATE" || rawType === "RETAIL"
      ? rawType
      : "RETAIL"

  const updated = await db.customer.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
      ...(body.phone !== undefined ? { phone: String(body.phone).trim() } : {}),
      ...(body.address !== undefined ? { address: String(body.address).trim() } : {}),
      ...(body.type !== undefined ? { type } : {}),
    },
  })
  return NextResponse.json(serializeCustomer(updated as any))
}

/**
 * DELETE /api/customers/[id] — delete a customer.
 * Destructive action → restricted to OWNER, ADMIN, MANAGER only.
 * SALES / ACCOUNTANT / WAREHOUSE / CASHIER cannot delete customers.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN", "MANAGER"] as Role[])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await params
  const exists = await db.customer.findUnique({ where: { id } })
  if (!exists) return NextResponse.json({ error: "not-found" }, { status: 404 })

  await db.customer.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
