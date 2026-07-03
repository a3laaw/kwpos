import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { serializeCustomer } from "@/lib/serialize"

export const dynamic = "force-dynamic"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const exists = await db.customer.findUnique({ where: { id } })
  if (!exists) return NextResponse.json({ error: "not-found" }, { status: 404 })

  const updated = await db.customer.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
      ...(body.phone !== undefined ? { phone: String(body.phone).trim() } : {}),
      ...(body.address !== undefined ? { address: String(body.address).trim() } : {}),
    },
  })
  return NextResponse.json(serializeCustomer(updated as any))
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { id } = await params
  const exists = await db.customer.findUnique({ where: { id } })
  if (!exists) return NextResponse.json({ error: "not-found" }, { status: 404 })

  await db.customer.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
