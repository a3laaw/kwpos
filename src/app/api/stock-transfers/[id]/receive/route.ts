import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * POST /api/stock-transfers/[id]/receive — receive a transfer (Transfer In).
 * Adds quantities to destination warehouse (StockItem + Product aggregate),
 * marks as RECEIVED. ADMIN/WAREHOUSE only.
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
  const transfer = await db.stockTransfer.findUnique({
    where: { id },
    include: { items: true, fromWarehouse: true, toWarehouse: true },
  })
  if (!transfer) return NextResponse.json({ error: "not-found" }, { status: 404 })
  if (transfer.status === "RECEIVED") {
    return NextResponse.json({ error: "already-received" }, { status: 409 })
  }

  const updated = await db.$transaction(async (tx) => {
    // Add to destination warehouse (StockItem + Product aggregate)
    for (const it of transfer.items) {
      await tx.stockItem.upsert({
        where: {
          productId_warehouseId: {
            productId: it.productId,
            warehouseId: transfer.toWarehouseId,
          },
        },
        update: { quantity: { increment: it.quantity } },
        create: {
          productId: it.productId,
          warehouseId: transfer.toWarehouseId,
          quantity: it.quantity,
        },
      })
      await tx.product.update({
        where: { id: it.productId },
        data: { quantity: { increment: it.quantity } },
      })
    }
    return tx.stockTransfer.update({
      where: { id },
      data: {
        status: "RECEIVED",
        receivedById: user.id,
        receivedAt: new Date(),
      },
      include: {
        items: { include: { product: true } },
        fromWarehouse: true,
        toWarehouse: true,
        createdBy: true,
        receivedBy: true,
      },
    })
  })

  return NextResponse.json({
    id: updated.id,
    transferNo: updated.transferNo,
    status: updated.status,
    receivedAt: String(updated.receivedAt),
  })
}
