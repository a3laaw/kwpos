import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { serializeSale } from "@/lib/serialize"

export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sale = await db.sale.findUnique({
    where: { id },
    include: { user: true, items: { include: { product: true } } },
  })
  if (!sale) return NextResponse.json({ error: "not-found" }, { status: 404 })
  return NextResponse.json(serializeSale(sale as any))
}
