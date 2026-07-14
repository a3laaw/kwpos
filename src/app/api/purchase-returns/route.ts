import { NextRequest, NextResponse } from "next/server"
import { db, decrementStockItem, updateProductQuantityFromStockItems, getDefaultWarehouseId } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { safeCreateJournalEntry } from "@/lib/journal"
import { logAuditEvent } from "@/lib/audit"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

function r(v: number): number {
  return +Number(v).toFixed(3)
}

/** Auto-generate the next return number: PR-00001, PR-00002, ... */
async function nextReturnNo(): Promise<string> {
  const count = await db.purchaseReturn.count()
  return `PR-${String(count + 1).padStart(5, "0")}`
}

function serializeReturn(ret: any) {
  return {
    id: String(ret.id),
    returnNo: String(ret.returnNo),
    purchaseOrderId: String(ret.purchaseOrderId),
    supplierId: String(ret.supplierId),
    supplierName: (ret.supplier as any)?.name ?? "—",
    total: Number(ret.total ?? 0),
    note: (ret.note as string | null) ?? null,
    status: (ret.status as string) ?? "APPROVED",
    items: ((ret.items as any[]) ?? []).map((it) => ({
      id: String(it.id),
      productId: String(it.productId),
      productName: (it.product as any)?.name ?? "—",
      quantity: Number(it.quantity ?? 0),
      unitCost: Number(it.unitCost ?? 0),
      subtotal: Number(it.subtotal ?? 0),
    })),
    createdByName: (ret.createdBy as any)?.name ?? null,
    createdAt: String(ret.createdAt),
  }
}

/**
 * GET /api/purchase-returns
 * List all purchase returns (newest first), with supplier + items.product.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const returns = await db.purchaseReturn.findMany({
    include: {
      supplier: true,
      purchaseOrder: true,
      items: { include: { product: true } },
      createdBy: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })
  return NextResponse.json({ items: returns.map(serializeReturn) })
}

/**
 * POST /api/purchase-returns
 * Create a purchase return (ADMIN/WAREHOUSE only). The PO must be RECEIVED.
 *
 * Body: { purchaseOrderId, items: [{ poItemId, returnQty }], note? }
 *
 * Workflow:
 *  1. Validate PO exists and status === RECEIVED.
 *  2. Validate returnQty ≤ (poItem.quantity − poItem.returnedQty) per item.
 *  3. Transaction: decrement Product.quantity, increment POItem.returnedQty,
 *     create PurchaseReturn + items.
 *  4. Reversing journal entry: debit 2010 (AP) / credit 1010 (Inventory).
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN", "WAREHOUSE" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({} as any))
  const { purchaseOrderId, items, note } = body || {}

  if (!purchaseOrderId || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "invalid-input" }, { status: 400 })
  }

  const po = await db.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    include: { items: { include: { product: true } }, supplier: true },
  })
  if (!po) return NextResponse.json({ error: "po-not-found" }, { status: 404 })
  if (po.status !== "RECEIVED") {
    return NextResponse.json({ error: "po-not-received" }, { status: 400 })
  }

  // Validate return quantities
  const returnItems: Array<{
    poItemId: string
    productId: string
    productName: string
    returnQty: number
    unitCost: number
    subtotal: number
  }> = []
  for (const ri of items) {
    const poItem = po.items.find((p) => p.id === ri.poItemId)
    if (!poItem) {
      return NextResponse.json({ error: `po-item-not-found:${ri.poItemId}` }, { status: 400 })
    }
    const alreadyReturned = Number(poItem.returnedQty || 0)
    const returnable = poItem.quantity - alreadyReturned
    const qty = Math.max(0, Math.round(Number(ri.returnQty) || 0))
    if (qty <= 0) continue
    if (qty > returnable) {
      return NextResponse.json(
        { error: `exceeds-returnable:${poItem.product?.name || ""}:${returnable}` },
        { status: 400 }
      )
    }
    returnItems.push({
      poItemId: poItem.id,
      productId: poItem.productId,
      productName: poItem.product?.name ?? "—",
      returnQty: qty,
      unitCost: poItem.unitCost,
      subtotal: r(qty * poItem.unitCost),
    })
  }

  if (returnItems.length === 0) {
    return NextResponse.json({ error: "no-valid-returns" }, { status: 400 })
  }

  const returnTotal = r(returnItems.reduce((s, x) => s + x.subtotal, 0))
  const returnNo = await nextReturnNo()

  // ── NO $transaction (PgBouncer compatibility) ──
  // Sequential queries with compensation on failure (saga pattern).

  // Resolve warehouseId (use db, not tx)
  let warehouseId = (po as any).warehouseId as string | undefined
  if (!warehouseId) {
    warehouseId = (await getDefaultWarehouseId(db)) || undefined
  }
  if (!warehouseId) {
    return NextResponse.json({ error: "no-warehouse-available" }, { status: 400 })
  }

  // Track decremented items for compensation on failure
  const decremented: Array<{ productId: string; qty: number; poItemId: string }> = []

  try {
    // 1) Decrement inventory (multi-warehouse) + update POItem.returnedQty
    for (const ri of returnItems) {
      const ok = await decrementStockItem(db, ri.productId, warehouseId, ri.returnQty)
      if (!ok) {
        // Compensate: re-increment what we already decremented
        for (const d of decremented) {
          try {
            await db.stockItem.update({
              where: { productId_warehouseId: { productId: d.productId, warehouseId } },
              data: { quantity: { increment: d.qty } },
            })
          } catch {}
        }
        const prod = await db.product.findUnique({
          where: { id: ri.productId },
          select: { name: true, quantity: true },
        })
        return NextResponse.json(
          { error: `stock-insufficient:${prod?.name ?? ri.productId}:available:${prod?.quantity ?? 0}:requested:${ri.returnQty}` },
          { status: 400 }
        )
      }
      decremented.push({ productId: ri.productId, qty: ri.returnQty, poItemId: ri.poItemId })

      // Update Product.quantity (derived aggregate) — non-fatal
      try {
        await updateProductQuantityFromStockItems(db, ri.productId)
      } catch {}

      // Bump POItem.returnedQty
      await db.purchaseOrderItem.update({
        where: { id: ri.poItemId },
        data: { returnedQty: { increment: ri.returnQty } },
      })
    }

    // 2) Create the purchase return record
    const purchaseReturn = await db.purchaseReturn.create({
      data: {
        returnNo,
        purchaseOrderId: po.id,
        supplierId: po.supplierId,
        total: returnTotal,
        note: note ? String(note).trim() : null,
        createdById: user.id,
        items: {
          create: returnItems.map((ri) => ({
            productId: ri.productId,
            quantity: ri.returnQty,
            unitCost: ri.unitCost,
            subtotal: ri.subtotal,
          })),
        },
      },
      include: {
        items: { include: { product: true } },
        supplier: true,
        purchaseOrder: true,
        createdBy: true,
      },
    })

    // 3) Journal entry (fire-and-forget, non-fatal)
    let journalEntryId: string | null = null
    try {
      journalEntryId = await safeCreateJournalEntry(db, {
        sourceType: "MANUAL",
        sourceId: purchaseReturn.id,
        description: `قيد مرتجع مشتريات ${returnNo} — ${po.supplier?.name ?? ""}`,
        date: new Date(),
        lines: [
          { accountCode: "2010", debit: returnTotal, description: `مرتجع لمورد ${po.supplier?.name ?? ""}` },
          { accountCode: "1010", credit: returnTotal, description: "خصم من المخزون (مرتجع مشتريات)" },
        ],
      }, `Purchase return ${returnNo} journal`)
    } catch (e: any) {
      console.error(`[purchase-return] Journal failed for ${returnNo}: ${e?.message}`)
    }

    // 4) Audit log (fire-and-forget, non-fatal)
    try {
      await logAuditEvent({
        userId: user.id,
        userName: user.name,
        action: "PURCHASE_RETURN_CREATED",
        description: `مرتجع مشتريات ${returnNo}`,
      })
    } catch {}

    return NextResponse.json(
      { ...serializeReturn(purchaseReturn), journalEntryId, returnTotal },
      { status: 201 }
    )
  } catch (e: any) {
    // Compensate: re-increment what we decremented
    for (const d of decremented) {
      try {
        await db.stockItem.update({
          where: { productId_warehouseId: { productId: d.productId, warehouseId } },
          data: { quantity: { increment: d.qty } },
        })
      } catch {}
    }
    return NextResponse.json(
      { error: e?.message || "purchase-return-failed" },
      { status: 500 }
    )
  }
}
