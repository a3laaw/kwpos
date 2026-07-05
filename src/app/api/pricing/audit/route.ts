import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

/**
 * GET /api/pricing/audit  (any logged-in user)
 *   List PriceChange rows (newest first), including product + changedBy user.
 *
 *   Response: { items: [{ id, productId, productName, barcode, priceType,
 *                          oldPrice, newPrice, changedByName, changedAt,
 *                          note }] }
 *
 * The audit log is IMMUTABLE — there is no POST/PATCH/DELETE on this route.
 * Every price change is written by POST /api/pricing inside a transaction
 * that also updates the product; the audit row can never be edited or
 * removed.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const rows = await db.priceChange.findMany({
    include: {
      product: { select: { id: true, name: true, barcode: true } },
      changedBy: { select: { id: true, name: true } },
    },
    orderBy: { changedAt: "desc" },
    take: 500, // bound the result set; the UI paginates client-side
  })

  const items = rows.map((r) => ({
    id: r.id,
    productId: r.productId,
    productName: r.product?.name ?? "—",
    barcode: r.product?.barcode ?? null,
    priceType: r.priceType,
    oldPrice: Number(r.oldPrice),
    newPrice: Number(r.newPrice),
    changedByName: r.changedBy?.name ?? null,
    changedAt: r.changedAt,
    note: r.note ?? null,
  }))

  return NextResponse.json({ items })
}
