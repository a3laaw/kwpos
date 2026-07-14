import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

function r(v: number): number {
  return +Number(v).toFixed(3)
}

/** Same serializer shape as the list endpoint in route.ts. */
function serializeTake(t: any) {
  return {
    id: String(t.id),
    takeNo: String(t.takeNo),
    warehouseId: (t.warehouseId as string | null) ?? null,
    warehouseName: (t.warehouse as any)?.name ?? null,
    note: (t.note as string | null) ?? null,
    status: (t.status as string) ?? "DRAFT",
    createdByName: (t.createdBy as any)?.name ?? null,
    approvedByName: (t.approvedBy as any)?.name ?? null,
    approvedAt: t.approvedAt ? String(t.approvedAt) : null,
    createdAt: String(t.createdAt),
    items: ((t.items as any[]) ?? []).map((it) => ({
      id: String(it.id),
      productId: String(it.productId),
      productName: (it.product as any)?.name ?? "—",
      systemQty: Number(it.systemQty ?? 0),
      actualQty: Number(it.actualQty ?? 0),
      variance: Number(it.variance ?? 0),
      unitCost: Number(it.unitCost ?? 0),
      varianceValue: Number(it.varianceValue ?? 0),
    })),
  }
}

/**
 * GET /api/stock-takes/[id] — fetch a single stock take with all relations.
 * Any logged-in user may read (the list endpoint has the same policy).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { id } = await params
  const take = await db.stockTake.findUnique({
    where: { id },
    include: {
      items: { include: { product: { include: { category: true } } } },
      warehouse: true,
      createdBy: true,
      approvedBy: true,
    },
  })
  if (!take) {
    return NextResponse.json({ error: "not-found" }, { status: 404 })
  }
  return NextResponse.json(serializeTake(take))
}

/**
 * PUT /api/stock-takes/[id] — save progress on an existing DRAFT stock take
 * (OWNER/ADMIN/WAREHOUSE). Recomputes variance + varianceValue per item.
 *
 * Body: { items: [{ productId, actualQty }], note? }
 *
 * Guards:
 *  - 404 if the take doesn't exist
 *  - 409 if the take is not in DRAFT status (cannot edit APPROVED takes)
 *
 * Implementation note: NO $transaction is used (PgBouncer compatibility).
 * Updates are performed sequentially. Each item is matched by
 * (stockTakeId + productId) — items that don't already exist are skipped
 * silently (the take must be created with its full item set via POST).
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN", "WAREHOUSE" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await params
  const take = await db.stockTake.findUnique({
    where: { id },
    include: { items: true },
  })
  if (!take) {
    return NextResponse.json({ error: "not-found" }, { status: 404 })
  }
  if (take.status !== "DRAFT") {
    return NextResponse.json({ error: "not-draft" }, { status: 409 })
  }

  const body = await req.json().catch(() => ({} as any))
  const { items, note } = body || {}

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items-required" }, { status: 400 })
  }

  // Index existing items by productId for O(1) lookup.
  const existingByProduct = new Map(
    take.items.map((it) => [it.productId, it])
  )

  // Sequential updates — NO $transaction (PgBouncer).
  for (const it of items as Array<{ productId: string; actualQty: number }>) {
    const productId = String(it.productId)
    const existing = existingByProduct.get(productId)
    if (!existing) continue // item not part of this take — skip

    const actualQty = Math.max(0, Math.round(Number(it.actualQty) || 0))
    const systemQty = Number(existing.systemQty ?? 0)
    const variance = actualQty - systemQty
    const unitCost = Number(existing.unitCost ?? 0)
    const varianceValue = r(variance * unitCost)

    await db.stockTakeItem.update({
      where: { id: existing.id },
      data: { actualQty, variance, varianceValue },
    })
  }

  // Update the take's note if provided (undefined => leave as-is).
  const data: any = {}
  if (typeof note !== "undefined") {
    data.note = note ? String(note).trim() : null
  }
  if (Object.keys(data).length > 0) {
    await db.stockTake.update({ where: { id }, data })
  }

  // Re-fetch the full take with relations for the response.
  const updated = await db.stockTake.findUnique({
    where: { id },
    include: {
      items: { include: { product: { include: { category: true } } } },
      warehouse: true,
      createdBy: true,
      approvedBy: true,
    },
  })

  return NextResponse.json(serializeTake(updated))
}
