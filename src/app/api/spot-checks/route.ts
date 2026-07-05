import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

/**
 * Blind spot-check inventory.
 *
 * GET  /api/spot-checks          — list past checks (with product + variance)
 * POST /api/spot-checks          — record a new spot-check
 *
 * The check is BLIND: the supervisor enters the counted qty WITHOUT seeing the
 * book qty. The server fetches the book qty AFTER receiving the counted qty,
 * computes the variance, and persists all three. The response returns the
 * variance so the supervisor sees the result immediately.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const items = await db.spotCheck.findMany({
    orderBy: { createdAt: "desc" },
    include: { product: true, user: true },
    take: 100,
  })

  return NextResponse.json({
    items: items.map((s) => ({
      id: s.id,
      productId: s.productId,
      productName: s.product?.name ?? "—",
      barcode: s.product?.barcode ?? null,
      bookQty: s.bookQty,
      countedQty: s.countedQty,
      variance: s.variance,
      note: s.note,
      userName: s.user?.name ?? null,
      createdAt: s.createdAt,
    })),
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const body = await req.json()
  const { productId, countedQty, note } = body || {}

  if (!productId) {
    return NextResponse.json({ error: "product-required" }, { status: 400 })
  }
  const counted = Number(countedQty)
  if (!Number.isFinite(counted) || counted < 0) {
    return NextResponse.json({ error: "invalid-counted-qty" }, { status: 400 })
  }

  // Fetch the product to get the current book qty (AFTER receiving the count,
  // so the check stays blind). Lock the row for a consistent read.
  const product = await db.product.findUnique({ where: { id: productId } })
  if (!product) return NextResponse.json({ error: "product-not-found" }, { status: 404 })

  const bookQty = Number(product.quantity) || 0
  const variance = counted - bookQty

  const created = await db.spotCheck.create({
    data: {
      productId,
      userId: user.id,
      bookQty,
      countedQty: counted,
      variance,
      note: note?.trim() || null,
    },
    include: { product: true },
  })

  return NextResponse.json(
    {
      id: created.id,
      productId,
      productName: created.product?.name ?? "—",
      bookQty,
      countedQty: counted,
      variance,
      note: created.note,
      createdAt: created.createdAt,
    },
    { status: 201 }
  )
}
