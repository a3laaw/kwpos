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
  // Short code (max 4 chars) used for auto-barcode generation. Optional + unique.
  const rawCode = String(body?.code || "").trim().slice(0, 4)
  const code = rawCode || null

  // Enforce uniqueness of code (DB has @unique) before attempting create so we
  // can return a friendly error instead of a raw Prisma P2002.
  if (code) {
    const dup = await db.category.findUnique({ where: { code }, select: { id: true } })
    if (dup) return NextResponse.json({ error: "code-exists" }, { status: 409 })
  }

  const created = await db.category.create({
    data: { name, code, imageUrl: body.imageUrl?.trim() || null },
  })
  return NextResponse.json(serializeCategory(created as any), { status: 201 })
}
