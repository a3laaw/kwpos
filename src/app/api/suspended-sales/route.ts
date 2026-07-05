import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

/** GET /api/suspended-sales — list all PARKED sales for the current user. */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const items = await db.suspendedSale.findMany({
    where: { status: "PARKED" },
    orderBy: { createdAt: "desc" },
    include: { user: true },
  })

  return NextResponse.json({
    items: items.map((s) => ({
      id: s.id,
      holdNo: s.holdNo,
      label: s.label,
      itemCount: s.itemCount,
      total: Number(s.total),
      userName: s.user?.name ?? null,
      createdAt: s.createdAt,
    })),
  })
}

/** POST /api/suspended-sales — park the current cart snapshot. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const body = await req.json()
  const { label, cartJson, itemCount, total } = body || {}

  if (!cartJson || typeof cartJson !== "string") {
    return NextResponse.json({ error: "cart-required" }, { status: 400 })
  }

  // Generate next hold number: HOLD-001, HOLD-002, ...
  const count = await db.suspendedSale.count()
  const holdNo = `HOLD-${String(count + 1).padStart(3, "0")}`

  const created = await db.suspendedSale.create({
    data: {
      holdNo,
      label: label?.trim() || null,
      cartJson,
      itemCount: Number(itemCount) || 0,
      total: Number(total) || 0,
      userId: user.id,
    },
  })

  return NextResponse.json(
    { id: created.id, holdNo: created.holdNo, label: created.label },
    { status: 201 }
  )
}
