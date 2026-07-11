import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { serializeCustomer } from "@/lib/serialize"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim() || ""

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' as const } },
          { phone: { contains: q, mode: 'insensitive' as const } },
          { address: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : undefined

  const rows = await db.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ items: rows.map(serializeCustomer) })
}

/**
 * POST /api/customers — create a customer.
 * Allowed roles: OWNER, ADMIN, MANAGER, SALES (sales registers walk-in customers).
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN", "MANAGER", "SALES"] as Role[])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { name, phone, address, type } = body || {}
  if (!name?.trim()) {
    return NextResponse.json({ error: "name-required" }, { status: 400 })
  }

  const created = await db.customer.create({
    data: {
      name: String(name).trim(),
      phone: String(phone || "").trim(),
      address: String(address || "").trim(),
      type: (["RETAIL", "WHOLESALE", "CORPORATE"].includes(type) ? type : "RETAIL") as "RETAIL" | "WHOLESALE" | "CORPORATE",
    },
  })

  return NextResponse.json(serializeCustomer(created as any), { status: 201 })
}
