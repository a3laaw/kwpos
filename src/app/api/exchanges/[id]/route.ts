import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { serializeExchange } from "@/lib/serialize"

export const dynamic = "force-dynamic"

/** GET /api/exchanges/[id] — fetch a single exchange with all its lines. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { id } = await params
  const exchange = await db.exchangeSale.findUnique({
    where: { id },
    include: { user: true, lines: { include: { product: true } } },
  })
  if (!exchange) return NextResponse.json({ error: "not-found" }, { status: 404 })
  return NextResponse.json(serializeExchange(exchange as any))
}
