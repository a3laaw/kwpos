import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { createJournalEntry } from "@/lib/journal"

export const dynamic = "force-dynamic"

/**
 * Approve (اعتماد) a blind-closed shift — admin only.
 * Generates journal entries:
 *   1. Shift sales: Debit Cash (1010) + Debit K-Net/card (1020) → Credit POS Sales (4010).
 *   2. If shortage: Debit Employee Receivable (2020) → Credit Cash (1010).
 *   3. If overage: Debit Cash (1010) → Credit Other Income (4050).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await params
  const shift = await db.shift.findUnique({
    where: { id },
    include: { user: { select: { name: true } } },
  })
  if (!shift) return NextResponse.json({ error: "not-found" }, { status: 404 })
  if (shift.status !== "BLIND_CLOSED") {
    return NextResponse.json({ error: "not-blind-closed" }, { status: 400 })
  }

  // Ensure accounts exist
  async function ensureAccount(code: string, name: string, type: string) {
    let a = await db.account.findUnique({ where: { code } })
    if (!a) a = await db.account.create({ data: { code, name, type, isSystem: true } })
    return a
  }

  const updated = await db.shift.update({
    where: { id },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      approvedBy: user.id,
    },
    include: { user: { select: { name: true, email: true } } },
  })

  // ── Journal entries ──
  try {
    // 1. Shift sales remittance
    const netCash = shift.actualCash - shift.openingFloat // cash sales (exclude float)
    const salesLines: any[] = []

    if (netCash > 0) {
      salesLines.push({ accountCode: "1010", debit: +netCash.toFixed(3), description: "نقدية وردية" })
    }
    if (shift.actualCard > 0) {
      salesLines.push({ accountCode: "1020", debit: +shift.actualCard.toFixed(3), description: "K-Net وردية" })
    }
    if (shift.expectedTransfer > 0) {
      salesLines.push({ accountCode: "1020", debit: +shift.expectedTransfer.toFixed(3), description: "تحويلات وردية" })
    }
    const totalRemitted = netCash + shift.actualCard + shift.expectedTransfer
    if (totalRemitted > 0) {
      salesLines.push({ accountCode: "4010", credit: +totalRemitted.toFixed(3), description: "إيراد مبيعات POS — وردية" })
      await createJournalEntry({
        sourceType: "MANUAL",
        sourceId: shift.id,
        description: `قيد ترحيل مبيعات وردية ${shift.shiftNo} — ${shift.user?.name ?? ""}`,
        date: new Date(),
        lines: salesLines,
      })
    }

    // 2. Shortage / Overage
    if (shift.cashVariance < -0.001) {
      // Shortage: debit employee receivable, credit cash
      await ensureAccount("2020", "ذمم الموظفين", "ASSET")
      await createJournalEntry({
        sourceType: "MANUAL",
        sourceId: shift.id,
        description: `قيد عجز وردية ${shift.shiftNo} — ${shift.user?.name ?? ""}`,
        date: new Date(),
        lines: [
          { accountCode: "2020", debit: +Math.abs(shift.cashVariance).toFixed(3), description: `عجز كاشير ${shift.user?.name ?? ""}` },
          { accountCode: "1010", credit: +Math.abs(shift.cashVariance).toFixed(3), description: "تسوية عجز" },
        ],
      })
    } else if (shift.cashVariance > 0.001) {
      // Overage: debit cash, credit other income
      await ensureAccount("4050", "إيرادات أخرى / أرباح تسوية", "REVENUE")
      await createJournalEntry({
        sourceType: "MANUAL",
        sourceId: shift.id,
        description: `قيد فائض وردية ${shift.shiftNo}`,
        date: new Date(),
        lines: [
          { accountCode: "1010", debit: +shift.cashVariance.toFixed(3), description: "فائض درج" },
          { accountCode: "4050", credit: +shift.cashVariance.toFixed(3), description: "إيراد فائض تسوية" },
        ],
      })
    }
  } catch (e: any) {
    console.error("[shift approve] journal failed:", e?.message)
  }

  return NextResponse.json(updated)
}
