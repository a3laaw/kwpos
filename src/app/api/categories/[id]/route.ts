import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { serializeCategory } from "@/lib/serialize"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cat = await db.category.findUnique({ where: { id } })
  if (!cat) return NextResponse.json({ error: "not-found" }, { status: 404 })
  return NextResponse.json(serializeCategory(cat as any))
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

  const exists = await db.category.findUnique({ where: { id } })
  if (!exists) return NextResponse.json({ error: "not-found" }, { status: 404 })

  // Build the update payload — only fields actually present in the body.
  const data: { name?: string; code?: string | null; imageUrl?: string | null } = {}
  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (!name) return NextResponse.json({ error: "name-required" }, { status: 400 })
    data.name = name
  }
  if (body.code !== undefined) {
    const rawCode = String(body.code || "").trim().slice(0, 4)
    const code = rawCode || null
    // Enforce uniqueness manually (excludes the current category).
    if (code) {
      const dup = await db.category.findUnique({ where: { code }, select: { id: true } })
      if (dup && dup.id !== id) {
        return NextResponse.json({ error: "code-exists" }, { status: 409 })
      }
    }
    data.code = code
  }
  if (body.imageUrl !== undefined) {
    data.imageUrl = body.imageUrl ? String(body.imageUrl).trim() : null
  }

  const updated = await db.category.update({ where: { id }, data })
  return NextResponse.json(serializeCategory(updated as any))
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
  const exists = await db.category.findUnique({ where: { id } })
  if (!exists) return NextResponse.json({ error: "not-found" }, { status: 404 })

  // Guard: refuse to delete a category that still has products attached.
  const productsCount = await db.product.count({ where: { categoryId: id } })
  if (productsCount > 0) {
    return NextResponse.json({ error: "has-products", count: productsCount }, { status: 409 })
  }

  await db.category.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
