import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { serializePurchaseOrder } from "@/lib/serialize"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * POST /api/purchase-orders/auto-draft
 *
 * Generates a `PENDING_APPROVAL` purchase-order draft by scanning every
 * product whose `defaultSupplierId === supplierId` AND whose on-hand
 * `quantity <= reorderLevel`. For each low-stock product, the draft line
 * quantity is:
 *   - `optimalOrderQty`            (if > 0)
 *   - else `reorderLevel × 2 − quantity` (simple fallback; ≥ 1)
 *
 * The unit cost is the product's current `costPrice`.
 *
 * The created PO has `status: "PENDING_APPROVAL"` and is NOT receivable
 * until a manager approves it (PATCH /api/purchase-orders/[id] with
 * `status: "APPROVED"`).
 *
 * If no products need reordering for that supplier, returns
 * `{ message: "no-items-needed", count: 0 }` with status 200.
 *
 * Auth: ADMIN or WAREHOUSE only.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN", "WAREHOUSE" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  let body: any = {}
  try {
    const text = await req.text()
    if (text && text.trim().length > 0) {
      body = JSON.parse(text)
    }
  } catch {
    body = {}
  }

  const supplierId = typeof body?.supplierId === "string" ? body.supplierId : ""
  if (!supplierId) {
    return NextResponse.json({ error: "supplier-required" }, { status: 400 })
  }

  // Make sure the supplier actually exists.
  const supplier = await db.supplier.findUnique({ where: { id: supplierId } })
  if (!supplier) {
    return NextResponse.json({ error: "supplier-not-found" }, { status: 404 })
  }

  // Find every product whose default supplier matches, then filter
  // client-side for `quantity <= reorderLevel`. (Prisma does not support
  // comparing two columns of the same row in a `where` clause.)
  const candidates = await db.product.findMany({
    where: { defaultSupplierId: supplierId },
    orderBy: { name: "asc" },
  })
  const lowStockProducts = candidates.filter(
    (p) => Number(p.quantity ?? 0) <= Number(p.reorderLevel ?? 0)
  )

  if (lowStockProducts.length === 0) {
    return NextResponse.json({ message: "no-items-needed", count: 0 }, { status: 200 })
  }

  // Build the draft items.
  const itemsData = lowStockProducts.map((p) => {
    const optimal = Number(p.optimalOrderQty ?? 0)
    const reorderLevel = Number(p.reorderLevel ?? 0)
    const qty = optimal > 0
      ? Math.max(1, Math.round(optimal))
      : Math.max(1, Math.round(reorderLevel * 2 - Number(p.quantity ?? 0)))
    const unitCost = Number(p.costPrice ?? 0)
    return {
      productId: p.id,
      quantity: qty,
      unitCost,
      subtotal: +(qty * unitCost).toFixed(2),
    }
  })
  const total = +itemsData.reduce((s, it) => s + it.subtotal, 0).toFixed(2)

  const created = await db.purchaseOrder.create({
    data: {
      supplierId,
      status: "PENDING_APPROVAL",
      total,
      note: "مسودة تلقائية بانتظار موافقة الإدارة",
      customsAmount: 0,
      shippingAmount: 0,
      otherCharges: 0,
      items: { create: itemsData },
    },
    include: { supplier: true, items: { include: { product: true } } },
  })

  return NextResponse.json(serializePurchaseOrder(created as any), { status: 201 })
}
