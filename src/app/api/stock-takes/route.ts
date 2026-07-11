import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

function r(v: number): number {
  return +Number(v).toFixed(3)
}

async function nextTakeNo(): Promise<string> {
  const count = await db.stockTake.count()
  return `ST-${String(count + 1).padStart(5, "0")}`
}

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

/** GET /api/stock-takes — list all stock takes (newest first). */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const takes = await db.stockTake.findMany({
    include: {
      items: { include: { product: { include: { category: true } } } },
      warehouse: true,
      createdBy: true,
      approvedBy: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })
  return NextResponse.json({ items: takes.map(serializeTake) })
}

/**
 * POST /api/stock-takes — create a stock take as DRAFT (ADMIN/WAREHOUSE).
 * Body: { warehouseId?, note?, items: [{ productId, actualQty }] }
 * Captures systemQty + unitCost from current product state. No inventory
 * changes at creation — approval is a separate step.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN", "WAREHOUSE" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({} as any))
  const { warehouseId, note, items } = body || {}
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items-required" }, { status: 400 })
  }

  const productIds = items.map((i: any) => i.productId)
  const products = await db.product.findMany({ where: { id: { in: productIds } } })
  if (products.length !== new Set(productIds).size) {
    return NextResponse.json({ error: "invalid-product" }, { status: 400 })
  }

  const itemsData = items.map((it: any) => {
    const p = products.find((pr) => pr.id === it.productId)
    const systemQty = Number(p?.quantity ?? 0)
    const actualQty = Math.max(0, Math.round(Number(it.actualQty) || 0))
    const variance = actualQty - systemQty
    const unitCost = Number(p?.costPrice ?? 0)
    return {
      productId: String(it.productId),
      systemQty,
      actualQty,
      variance,
      unitCost,
      varianceValue: r(variance * unitCost),
    }
  })

  const takeNo = await nextTakeNo()
  const created = await db.stockTake.create({
    data: {
      takeNo,
      warehouseId: warehouseId || null,
      note: note ? String(note).trim() : null,
      createdById: user.id,
      items: { create: itemsData },
    },
    include: {
      items: { include: { product: { include: { category: true } } } },
      warehouse: true,
      createdBy: true,
      approvedBy: true,
    },
  })

  return NextResponse.json(serializeTake(created), { status: 201 })
}
