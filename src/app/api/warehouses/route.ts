import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { serializeWarehouse } from "@/lib/serialize"

export const dynamic = "force-dynamic"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const warehouses = await db.warehouse.findMany({
    include: { stockItems: true },
    orderBy: { name: "asc" },
  })
  return NextResponse.json({ items: warehouses.map((w) => serializeWarehouse(w as any)) })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN" && user.role !== "WAREHOUSE") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const name = String(body?.name || "").trim()
  if (!name) return NextResponse.json({ error: "name-required" }, { status: 400 })

  const created = await db.warehouse.create({
    data: {
      name,
      code: body.code?.trim() || null,
      location: body.location?.trim() || null,
      isActive: body.isActive !== false,
    },
    include: { stockItems: true },
  })
  return NextResponse.json(serializeWarehouse(created as any), { status: 201 })
}
