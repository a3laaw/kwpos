import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

/** PUT /api/units/[id] — rename a unit. ADMIN only. */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const { id } = await params
  const exists = await db.unit.findUnique({ where: { id } })
  if (!exists) return NextResponse.json({ error: "not-found" }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const name = String(body?.name || "").trim()
  if (!name) return NextResponse.json({ error: "name-required" }, { status: 400 })

  // Uniqueness check (case-sensitive — same as the create route's P2002 guard)
  const conflict = await db.unit.findFirst({
    where: { name, NOT: { id } },
    select: { id: true },
  })
  if (conflict) {
    return NextResponse.json({ error: "name-exists" }, { status: 409 })
  }

  try {
    const updated = await db.unit.update({ where: { id }, data: { name } })
    return NextResponse.json(updated)
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "name-exists" }, { status: 409 })
    }
    return NextResponse.json({ error: e?.message || "update-failed" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const { id } = await params
  const exists = await db.unit.findUnique({ where: { id } })
  if (!exists) return NextResponse.json({ error: "not-found" }, { status: 404 })

  await db.unit.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
