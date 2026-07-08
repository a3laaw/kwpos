import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { serializeSale } from "@/lib/serialize"
import { getCurrentUser, hasRole } from "@/lib/session"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["ADMIN" as Role, "SALES" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await params
  const sale = await db.sale.findUnique({
    where: { id },
    include: { user: true, items: { include: { product: true } } },
  })
  if (!sale) return NextResponse.json({ error: "not-found" }, { status: 404 })
  return NextResponse.json(serializeSale(sale as any))
}
