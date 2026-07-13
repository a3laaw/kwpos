import { requireUser, isErrorResponse } from "@/lib/auth-helpers"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { serializeSupplier } from "@/lib/serialize"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET() {
  const user = await requireUser()
  if (isErrorResponse(user)) return user
  const suppliers = await db.supplier.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true, orders: true } } },
  })
  return NextResponse.json({
    items: suppliers.map((s) => ({
      ...serializeSupplier(s as any),
      productsCount: (s as any)._count?.products ?? 0,
      ordersCount: (s as any)._count?.orders ?? 0,
    })),
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN", "WAREHOUSE" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  const body = await req.json()
  const name = String(body?.name || "").trim()
  if (!name) return NextResponse.json({ error: "name-required" }, { status: 400 })
  const created = await db.supplier.create({
    data: {
      name,
      contact: body.contact?.trim() || null,
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
      address: body.address?.trim() || null,
    },
  })
  return NextResponse.json(serializeSupplier(created as any), { status: 201 })
}
