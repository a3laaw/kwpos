import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { serializeAccount } from "@/lib/serialize"

export const dynamic = "force-dynamic"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const acc = await db.account.findUnique({ where: { id } })
  if (!acc) return NextResponse.json({ error: "not-found" }, { status: 404 })

  const updated = await db.account.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
      ...(body.code !== undefined ? { code: String(body.code).trim() } : {}),
      ...(body.balance !== undefined ? { balance: Number(body.balance) || 0 } : {}),
    },
  })
  return NextResponse.json(serializeAccount(updated as any))
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const { id } = await params
  const acc = await db.account.findUnique({
    where: { id },
    include: { children: true, expenses: true },
  })
  if (!acc) return NextResponse.json({ error: "not-found" }, { status: 404 })
  if (acc.isSystem) {
    return NextResponse.json({ error: "cannot-delete-system" }, { status: 409 })
  }
  if (acc.children.length > 0) {
    return NextResponse.json({ error: "has-children" }, { status: 409 })
  }
  if (acc.expenses.length > 0) {
    return NextResponse.json({ error: "has-transactions" }, { status: 409 })
  }
  await db.account.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
