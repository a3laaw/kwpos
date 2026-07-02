import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { serializePurchaseOrder } from "@/lib/serialize"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * Mark a purchase order as RECEIVED and add its item quantities to inventory.
 * This runs inside a transaction so inventory updates are atomic.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["ADMIN", "WAREHOUSE" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await params
  const po = await db.purchaseOrder.findUnique({
    where: { id },
    include: { items: true },
  })
  if (!po) return NextResponse.json({ error: "not-found" }, { status: 404 })
  if (po.status === "RECEIVED") {
    return NextResponse.json({ error: "already-received" }, { status: 409 })
  }

  // Atomic: update PO status + bump inventory quantities + refresh cost price
  const updated = await db.$transaction(async (tx) => {
    for (const it of po.items) {
      await tx.product.update({
        where: { id: it.productId },
        data: {
          quantity: { increment: it.quantity },
          costPrice: it.unitCost,
        },
      })
    }
    return tx.purchaseOrder.update({
      where: { id },
      data: { status: "RECEIVED" },
      include: { supplier: true, items: { include: { product: true } } },
    })
  })

  return NextResponse.json(serializePurchaseOrder(updated as any))
}
