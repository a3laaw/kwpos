import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

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
