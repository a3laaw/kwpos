import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { createJournalEntry } from "@/lib/journal"
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
  if (!hasRole(user.role, ["ADMIN", "WAREHOUSE" as Role])) {
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

  // Transaction: adjust product quantities + mark take as APPROVED
  const updated = await db.$transaction(async (tx) => {
    for (const adj of adjustments) {
      await tx.product.update({
        where: { id: adj.productId },
        data: { quantity: { increment: adj.variance } }, // negative variance decrements
      })
    }
    return tx.stockTake.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedById: user.id,
        approvedAt: new Date(),
      },
      include: { items: { include: { product: true } } },
    })
  })

  // Journal entries — ensure accounts exist, then create balanced entries
  try {
    async function ensureAccount(code: string, name: string, type: string) {
      let a = await db.account.findUnique({ where: { code } })
      if (!a) a = await db.account.create({ data: { code, name, type, isSystem: true } })
      return a
    }

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
      })
    }
  } catch (e: any) {
    console.error("[stock-take approve] journal failed:", e?.message)
  }

  return NextResponse.json({
    ok: true,
    id: updated.id,
    takeNo: updated.takeNo,
    status: updated.status,
    summary: {
      shortageValue: +shortageValue.toFixed(3),
      surplusValue: +surplusValue.toFixed(3),
      itemsAdjusted: adjustments.length,
    },
  })
}
