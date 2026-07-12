import { NextRequest, NextResponse } from "next/server"
import { db, updateProductQuantityFromStockItems } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { logAuditEvent } from "@/lib/audit"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

function r(v: number): number {
  return +Number(v).toFixed(3)
}

async function nextTransferNo(): Promise<string> {
  const count = await db.stockTransfer.count()
  return `TR-${String(count + 1).padStart(5, "0")}`
}

function serializeTransfer(t: any) {
  return {
    id: String(t.id),
    transferNo: String(t.transferNo),
    fromWarehouseId: String(t.fromWarehouseId),
    fromWarehouseName: (t.fromWarehouse as any)?.name ?? "—",
    toWarehouseId: String(t.toWarehouseId),
    toWarehouseName: (t.toWarehouse as any)?.name ?? "—",
    status: (t.status as string) ?? "OUT",
    total: Number(t.total ?? 0),
    note: (t.note as string | null) ?? null,
    createdByName: (t.createdBy as any)?.name ?? null,
    receivedByName: (t.receivedBy as any)?.name ?? null,
    receivedAt: t.receivedAt ? String(t.receivedAt) : null,
    createdAt: String(t.createdAt),
    items: ((t.items as any[]) ?? []).map((it) => ({
      id: String(it.id),
      productId: String(it.productId),
      productName: (it.product as any)?.name ?? "—",
      quantity: Number(it.quantity ?? 0),
      unitCost: Number(it.unitCost ?? 0),
      subtotal: Number(it.subtotal ?? 0),
    })),
  }
}

/** GET /api/stock-transfers — list all transfers (newest first). */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const transfers = await db.stockTransfer.findMany({
    include: {
      items: { include: { product: true } },
      fromWarehouse: true,
      toWarehouse: true,
      createdBy: true,
      receivedBy: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })
  return NextResponse.json({ items: transfers.map(serializeTransfer) })
}

/**
 * POST /api/stock-transfers — create a transfer (Transfer Out).
 * Validates from≠to, checks source StockItem availability, deducts from
 * source warehouse, marks as OUT (in transit).
 *
 * Body: { fromWarehouseId, toWarehouseId, items: [{ productId, quantity }], note? }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN", "WAREHOUSE" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({} as any))
  const { fromWarehouseId, toWarehouseId, items, note } = body || {}

  if (!fromWarehouseId || !toWarehouseId) {
    return NextResponse.json({ error: "warehouses-required" }, { status: 400 })
  }
  if (fromWarehouseId === toWarehouseId) {
    return NextResponse.json({ error: "same-warehouse" }, { status: 400 })
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items-required" }, { status: 400 })
  }

  // Validate warehouses exist
  const [fromWh, toWh] = await Promise.all([
    db.warehouse.findUnique({ where: { id: fromWarehouseId } }),
    db.warehouse.findUnique({ where: { id: toWarehouseId } }),
  ])
  if (!fromWh) return NextResponse.json({ error: "invalid-from-warehouse" }, { status: 400 })
  if (!toWh) return NextResponse.json({ error: "invalid-to-warehouse" }, { status: 400 })

  // Build items + validate quantity available in source warehouse
  const productIds = items.map((i: any) => i.productId)
  const products = await db.product.findMany({ where: { id: { in: productIds } } })
  if (products.length !== new Set(productIds).size) {
    return NextResponse.json({ error: "invalid-product" }, { status: 400 })
  }

  // Get current stock per product in the source warehouse
  const stockItems = await db.stockItem.findMany({
    where: { productId: { in: productIds }, warehouseId: fromWarehouseId },
  })
  const stockMap = new Map(stockItems.map((s) => [s.productId, s.quantity]))

  const itemsData = items.map((it: any) => {
    const p = products.find((pr) => pr.id === it.productId)
    const qty = Math.max(0, Math.round(Number(it.quantity) || 0))
    const unitCost = Number(p?.costPrice ?? 0)
    const available = stockMap.get(it.productId) ?? 0
    if (qty > available) {
      throw new Error(`exceeds-available:${p?.name ?? ""}:${available}`)
    }
    return {
      productId: String(it.productId),
      quantity: qty,
      unitCost,
      subtotal: r(qty * unitCost),
    }
  })

  // Re-check thrown errors
  const errItem = itemsData.find((d: any) => d === null)
  if (errItem === null) {
    // unreachable (throw above)
  }

  const total = r(itemsData.reduce((s, i) => s + i.subtotal, 0))
  const transferNo = await nextTransferNo()

  let created
  try {
    created = await db.$transaction(async (tx) => {
      // Deduct from source warehouse (StockItem only — Product.quantity is
      // recomputed from StockItems as the derived aggregate).
      // Note: no SELECT FOR UPDATE — incompatible with pgbouncer on Supabase.
      for (const it of itemsData) {
        await tx.stockItem.upsert({
          where: { productId_warehouseId: { productId: it.productId, warehouseId: fromWarehouseId } },
          update: { quantity: { decrement: it.quantity } },
          create: { productId: it.productId, warehouseId: fromWarehouseId, quantity: 0 },
        })
        // Recompute Product.quantity as SUM(StockItem.quantity) — no direct decrement.
        await updateProductQuantityFromStockItems(tx, it.productId)
      }
      return tx.stockTransfer.create({
        data: {
          transferNo,
          fromWarehouseId,
          toWarehouseId,
          status: "OUT",
          total,
          note: note ? String(note).trim() : null,
          createdById: user.id,
          items: { create: itemsData },
        },
        include: {
          items: { include: { product: true } },
          fromWarehouse: true,
          toWarehouse: true,
          createdBy: true,
          receivedBy: true,
        },
      }).then(async (created) => {
        // ── Audit log (inside tx — atomic) ──
        await logAuditEvent({
          tx,
          userId: user.id,
          userName: user.name,
          action: "STOCK_TRANSFER_CREATED",
          description: `تحويل مخزني ${transferNo}`,
        })
        return created
      })
    })
  } catch (e: any) {
    const msg = String(e?.message || e)
    if (msg.startsWith("exceeds-available:")) {
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    throw e
  }

  return NextResponse.json(serializeTransfer(created), { status: 201 })
}
