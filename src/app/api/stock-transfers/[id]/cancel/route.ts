import { NextRequest, NextResponse } from "next/server"
import { db, incrementStockItem, updateProductQuantityFromStockItems } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { logAuditEvent } from "@/lib/audit"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * POST /api/stock-transfers/[id]/cancel — cancel a transfer.
 *
 * Only allowed when the transfer has NOT yet been received (status === "OUT").
 * Re-credits each item's StockItem in the SOURCE warehouse, then marks the
 * transfer as CANCELLED. OWNER / ADMIN / MANAGER / WAREHOUSE only.
 *
 * NO $transaction is used (PgBouncer compatibility — see worklog). Each
 * StockItem increment is atomic by itself. Product.quantity sync runs
 * post-commit using the shared `db` client (not a tx).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN", "MANAGER", "WAREHOUSE" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await params
  const transfer = await db.stockTransfer.findUnique({
    where: { id },
    include: { items: true, fromWarehouse: true, toWarehouse: true },
  })
  if (!transfer) return NextResponse.json({ error: "not-found" }, { status: 404 })

  // Guard: only OUT (not yet received) transfers can be cancelled.
  if (transfer.status === "RECEIVED") {
    return NextResponse.json({ error: "already-received" }, { status: 409 })
  }
  if (transfer.status === "CANCELLED") {
    return NextResponse.json({ error: "already-cancelled" }, { status: 409 })
  }

  // ── 1) RE-CREDIT STOCK to the SOURCE warehouse (batch, no transaction) ──
  // Each incrementStockItem is a single upsert — atomic by itself.
  // We do NOT use $transaction (PgBouncer compatibility).
  const productIds: string[] = []
  for (const it of transfer.items) {
    try {
      await incrementStockItem(db, it.productId, transfer.fromWarehouseId, it.quantity)
      productIds.push(it.productId)
    } catch (e: any) {
      console.error(
        `[stock-transfer-cancel] Stock re-credit FAILED for product ${it.productId}: ${e?.message ?? e}`
      )
      // Continue — we still want to mark the transfer cancelled + audit
    }
  }

  // ── 2) MARK TRANSFER AS CANCELLED ──────────────────────────────────
  let updated: any
  try {
    updated = await db.stockTransfer.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: {
        items: { include: { product: true } },
        fromWarehouse: true,
        toWarehouse: true,
        createdBy: true,
        receivedBy: true,
      },
    })
  } catch (e: any) {
    console.error(
      `[stock-transfer-cancel] Failed to mark transfer ${transfer.transferNo} as cancelled: ${e?.message ?? e}`
    )
    return NextResponse.json({ error: "cancel-mark-failed" }, { status: 500 })
  }

  // ── 3) SYNC Product.quantity (post-commit, using db — not tx) ──────
  // Non-fatal: the transfer is already cancelled, StockItem is correct.
  try {
    const pids = Array.from(new Set(productIds))
    for (const pid of pids) {
      await updateProductQuantityFromStockItems(db, pid)
    }
  } catch (e: any) {
    console.warn(
      `[stock-transfer-cancel] Product.quantity sync failed for ${transfer.transferNo}: ${e?.message ?? e}`
    )
  }

  // ── 4) AUDIT LOG (non-fatal) ──────────────────────────────────────
  try {
    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: "STOCK_TRANSFER_CANCELLED",
      description: `إلغاء تحويل ${updated.transferNo}`,
    })
  } catch (e: any) {
    console.warn(
      `[stock-transfer-cancel] AuditLog failed for ${updated.transferNo}: ${e?.message ?? e}`
    )
  }

  return NextResponse.json({
    ok: true,
    id: updated.id,
    transferNo: updated.transferNo,
    status: "CANCELLED",
  })
}
