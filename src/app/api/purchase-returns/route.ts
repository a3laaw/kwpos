import { NextRequest, NextResponse } from "next/server"
import { db, decrementStockItem, updateProductQuantityFromStockItems, getDefaultWarehouseId } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { createJournalEntry } from "@/lib/journal"
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

  const created = await db.$transaction(async (tx) => {
    // Resolve warehouseId — PurchaseReturn has no warehouseId; fall back to
    // the PO's warehouseId, then to the default active warehouse.
    let warehouseId =
      (po as any).warehouseId as string | undefined
    if (!warehouseId) {
      warehouseId = (await getDefaultWarehouseId(tx)) || undefined
    }
    if (!warehouseId) {
      throw new Error("no-warehouse-available")
    }

    // Decrement inventory + bump POItem.returnedQty
    for (const ri of returnItems) {
      // Decrement the matching StockItem (with row locking). Return 400 if
      // insufficient stock for this warehouse.
      const ok = await decrementStockItem(tx, ri.productId, warehouseId, ri.returnQty)
      if (!ok) {
        const prod = await tx.product.findUnique({
          where: { id: ri.productId },
          select: { name: true },
        })
        throw new Error(`stock-insufficient:${prod?.name ?? ri.productId}:warehouse:${warehouseId}`)
      }
      await updateProductQuantityFromStockItems(tx, ri.productId)
      await tx.purchaseOrderItem.update({
        where: { id: ri.poItemId },
        data: { returnedQty: { increment: ri.returnQty } },
      })
    }
    const purchaseReturn = await tx.purchaseReturn.create({
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

    // ── Reversing journal entry (inside tx — atomic) ──
    // debit 2010 (AP — reduces what we owe supplier) /
    // credit 1010 (Inventory — reduces asset). If this fails, the entire
    // purchase return rolls back.
    let journalEntryId: string | null = null
    try {
      journalEntryId = await createJournalEntry({
        sourceType: "MANUAL",
        sourceId: purchaseReturn.id,
        description: `قيد مرتجع مشتريات ${returnNo} — ${po.supplier?.name ?? ""}`,
        date: new Date(),
        lines: [
          { accountCode: "2010", debit: returnTotal, description: `مرتجع لمورد ${po.supplier?.name ?? ""}` },
          { accountCode: "1010", credit: returnTotal, description: "خصم من المخزون (مرتجع مشتريات)" },
        ],
        tx,
      })
    } catch (e: any) {
      throw new Error(`فشل تسجيل القيد المحاسبي / Journal entry failed: ${e?.message ?? e}`)
    }

    // ── Audit log (inside tx — atomic) ──
    await logAuditEvent({
      tx,
      userId: user.id,
      userName: user.name,
      action: "PURCHASE_RETURN_CREATED",
      description: `مرتجع مشتريات ${returnNo}`,
    })

    return { purchaseReturn, journalEntryId }
  }).catch((e: any) => ({ __error: e?.message || "purchase-return-failed" }))

  if ((created as any).__error) {
    const msg = (created as any).__error as string
    const isClientError =
      msg.startsWith("stock-insufficient") ||
      msg.startsWith("product-not-found") ||
      msg.startsWith("invalid") ||
      msg.startsWith("exceeds-returnable") ||
      msg.startsWith("po-")
    return NextResponse.json({ error: msg }, { status: isClientError ? 400 : 500 })
  }

  const { purchaseReturn, journalEntryId } = created as {
    purchaseReturn: Awaited<ReturnType<typeof db.purchaseReturn.create>>
    journalEntryId: string | null
  }

  return NextResponse.json(
    {
      ...serializeReturn(purchaseReturn),
      journalEntryId,
      returnTotal,
    },
    { status: 201 }
  )
}
