import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { serializeCategory } from "@/lib/serialize"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET() {
  const cats = await db.category.findMany({ orderBy: { name: "asc" } })
  return NextResponse.json({ items: cats.map(serializeCategory) })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["ADMIN", "WAREHOUSE" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  const body = await req.json()
  const name = String(body?.name || "").trim()
  if (!name) return NextResponse.json({ error: "name-required" }, { status: 400 })
  const created = await db.category.create({ data: { name } })
  return NextResponse.json(serializeCategory(created), { status: 201 })
}
