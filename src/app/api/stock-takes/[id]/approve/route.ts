import { NextRequest, NextResponse } from "next/server"
import { db, incrementStockItem, decrementStockItem, updateProductQuantityFromStockItems } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { createJournalEntry } from "@/lib/journal"
import { logAuditEvent } from "@/lib/audit"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * POST /api/stock-takes/[id]/approve — approve a DRAFT stock take
 * (ADMIN/WAREHOUSE). Adjusts inventory by `variance` and generates
 * balanced journal entries:
 *  - Shortage (variance < 0): debit 5070 (Stock Shortage) / credit 1010
 *  - Surplus  (variance > 0): debit 1010 (Inventory) / credit 4060
 */
export async function POST(
  _req: NextRequest,
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
    include: { items: { include: { product: true } } },
  })
  if (!take) return NextResponse.json({ error: "not-found" }, { status: 404 })
  if (take.status === "APPROVED") {
    return NextResponse.json({ error: "already-approved" }, { status: 409 })
  }
  // The StockTake carries the warehouse being audited — require it.
  if (!take.warehouseId) {
    return NextResponse.json({ error: "warehouse-required" }, { status: 400 })
  }
  const warehouseId = take.warehouseId

  // Calculate totals
  let shortageValue = 0
  let surplusValue = 0
  const adjustments: Array<{ productId: string; variance: number }> = []
  for (const item of take.items) {
    if (item.variance === 0) continue
    adjustments.push({ productId: item.productId, variance: item.variance })
    if (item.variance < 0) {
      shortageValue += Math.abs(item.varianceValue)
    } else {
      surplusValue += item.varianceValue
    }
  }

  // Transaction: adjust StockItem quantities + mark take as APPROVED
  // + generate balanced journal entries (atomic — JE failure rolls back).
  const updated = await db.$transaction(async (tx) => {
    for (const adj of adjustments) {
      if (adj.variance > 0) {
        // Surplus — increment the StockItem for this warehouse (upsert if
        // missing) and resync Product.quantity as the derived aggregate.
        await incrementStockItem(tx, adj.productId, warehouseId, adj.variance)
        await updateProductQuantityFromStockItems(tx, adj.productId)
      } else if (adj.variance < 0) {
        // Shortage — decrement the StockItem (row-locked). Reject if there
        // isn't enough stock to remove.
        const ok = await decrementStockItem(tx, adj.productId, warehouseId, Math.abs(adj.variance))
        if (!ok) {
          const prod = await tx.product.findUnique({
            where: { id: adj.productId },
            select: { name: true },
          })
          throw new Error(`stock-insufficient:${prod?.name ?? adj.productId}:warehouse:${warehouseId}`)
        }
        await updateProductQuantityFromStockItems(tx, adj.productId)
      }
    }
    const result = await tx.stockTake.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedById: user.id,
        approvedAt: new Date(),
      },
      include: { items: { include: { product: true } } },
    })

    // ── Journal entries (inside tx — atomic) ──
    //  - Shortage (variance < 0): debit 5070 (Stock Shortage) / credit 1010
    //  - Surplus  (variance > 0): debit 1010 (Inventory) / credit 4060
    // If either entry fails, the entire stock-take approval rolls back.
    async function ensureAccount(code: string, name: string, type: string) {
      let a = await tx.account.findUnique({ where: { code } })
      if (!a) a = await tx.account.create({ data: { code, name, type, isSystem: true } })
      return a
    }

    try {
      if (shortageValue > 0) {
        await ensureAccount("5070", "عجز المخزون / تلفيات", "EXPENSE")
        await createJournalEntry({
          sourceType: "MANUAL",
          sourceId: take.id,
          description: `قيد عجز جرد ${take.takeNo}`,
          date: new Date(),
          lines: [
            { accountCode: "5070", debit: +shortageValue.toFixed(3), description: "عجز/تلف جرد" },
            { accountCode: "1010", credit: +shortageValue.toFixed(3), description: "تخفيض مخزون بالعجز" },
          ],
          tx,
        })
      }

      if (surplusValue > 0) {
        await ensureAccount("4060", "إيرادات تسوية مخزنية", "REVENUE")
        await createJournalEntry({
          sourceType: "MANUAL",
          sourceId: take.id,
          description: `قيد فائض جرد ${take.takeNo}`,
          date: new Date(),
          lines: [
            { accountCode: "1010", debit: +surplusValue.toFixed(3), description: "زيادة مخزون بالفائض" },
            { accountCode: "4060", credit: +surplusValue.toFixed(3), description: "إيراد فائض جرد" },
          ],
          tx,
        })
      }
    } catch (e: any) {
      throw new Error(`فشل تسجيل القيد المحاسبي / Journal entry failed: ${e?.message ?? e}`)
    }

    // ── Audit log (inside tx — atomic) ──
    await logAuditEvent({
      tx,
      userId: user.id,
      userName: user.name,
      action: "STOCK_TAKE_APPROVED",
      description: `اعتماد جرد ${take.takeNo}`,
    })

    return result
  }, {
    timeout: 30000,
    maxWait: 15000,
  }).catch((e: any) => ({ __error: e?.message || "stock-take-approve-failed" }))

  if ((updated as any).__error) {
    const msg = (updated as any).__error as string
    const isClientError =
      msg.startsWith("stock-insufficient") ||
      msg.startsWith("warehouse-")
    return NextResponse.json({ error: msg }, { status: isClientError ? 400 : 500 })
  }

  const approvedTake = updated as Awaited<ReturnType<typeof db.stockTake.update>>

  return NextResponse.json({
    ok: true,
    id: approvedTake.id,
    takeNo: approvedTake.takeNo,
    status: approvedTake.status,
    summary: {
      shortageValue: +shortageValue.toFixed(3),
      surplusValue: +surplusValue.toFixed(3),
      itemsAdjusted: adjustments.length,
    },
  })
}
