import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * GET /api/customers/[id]/points
 * Returns the customer's loyalty points balance + tier.
 *
 * POST /api/customers/[id]/points
 * Body: { action: "add" | "redeem", points: number, note?: string }
 * - add: increases loyaltyPoints (used after a sale)
 * - redeem: decreases loyaltyPoints (used when redeeming as discount)
 *
 * Auth: ADMIN or SALES only.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { id } = await params
  const customer = await db.customer.findUnique({
    where: { id },
    select: { id: true, name: true, loyaltyPoints: true, loyaltyTier: true },
  })
  if (!customer) return NextResponse.json({ error: "not-found" }, { status: 404 })

  return NextResponse.json({
    id: customer.id,
    name: customer.name,
    loyaltyPoints: customer.loyaltyPoints,
    loyaltyTier: customer.loyaltyTier,
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["ADMIN" as Role, "SALES" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({} as any))
  const { action, points, note } = body || {}

  if (!action || !["add", "redeem"].includes(action)) {
    return NextResponse.json({ error: "invalid-action" }, { status: 400 })
  }
  const pts = Math.floor(Number(points) || 0)
  if (pts <= 0) {
    return NextResponse.json({ error: "invalid-points" }, { status: 400 })
  }

  const customer = await db.customer.findUnique({ where: { id } })
  if (!customer) return NextResponse.json({ error: "not-found" }, { status: 404 })

  if (action === "redeem" && customer.loyaltyPoints < pts) {
    return NextResponse.json(
      { error: "insufficient-points", available: customer.loyaltyPoints, requested: pts },
      { status: 400 }
    )
  }

  const updated = await db.customer.update({
    where: { id },
    data: {
      loyaltyPoints: action === "add"
        ? { increment: pts }
        : { decrement: pts },
    },
    select: { id: true, loyaltyPoints: true, loyaltyTier: true },
  })

  // Auto-update tier based on total points
  let newTier: string | null = null
  if (updated.loyaltyPoints >= 10000) newTier = "GOLD"
  else if (updated.loyaltyPoints >= 5000) newTier = "SILVER"
  else if (updated.loyaltyPoints >= 1000) newTier = "BRONZE"

  if (newTier !== updated.loyaltyTier) {
    await db.customer.update({ where: { id }, data: { loyaltyTier: newTier } })
  }

  return NextResponse.json({
    ok: true,
    action,
    points: pts,
    balance: updated.loyaltyPoints - (action === "add" ? pts : -pts) + (action === "add" ? pts : -pts),
    newBalance: updated.loyaltyPoints,
    tier: newTier,
    note: note || null,
  })
}
