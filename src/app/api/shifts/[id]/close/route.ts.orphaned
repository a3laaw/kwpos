import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

/**
 * Blind close: cashier enters actual cash/card counts WITHOUT seeing the
 * system-calculated expected amounts (anti-fraud). System then computes
 * expected values from sales since shift open, calculates variance.
 *
 * Body: { actualCash, actualCard }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { id } = await params
  const shift = await db.shift.findUnique({ where: { id } })
  if (!shift) return NextResponse.json({ error: "not-found" }, { status: 404 })
  if (shift.status !== "OPEN") {
    return NextResponse.json({ error: "not-open" }, { status: 400 })
  }
  // Only the cashier who opened the shift (or admin) can close it
  if (shift.userId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const actualCash = Number(body?.actualCash) || 0
  const actualCard = Number(body?.actualCard) || 0

  // ── Calculate expected amounts from sales since shift opened ──
  const sales = await db.sale.findMany({
    where: {
      userId: shift.userId,
      createdAt: { gte: shift.openedAt },
    },
    select: { total: true, paymentMethod: true, refundStatus: true, refundTotal: true },
  })

  let expectedCashSales = 0
  let expectedCardSales = 0
  let expectedTransferSales = 0
  let totalSales = 0
  let totalRefunds = 0

  for (const s of sales) {
    if (s.refundStatus === "FULL") continue // fully refunded — skip
    const amt = s.refundStatus === "PARTIAL" ? s.total - (s as any).refundTotal : s.total
    totalSales += amt
    if (s.paymentMethod === "CASH") expectedCashSales += amt
    else if (s.paymentMethod === "CARD") expectedCardSales += amt
    else if (s.paymentMethod === "TRANSFER") expectedTransferSales += amt
  }

  // Expected cash = opening float + cash sales (refunds already netted)
  const expectedCash = shift.openingFloat + expectedCashSales
  const expectedCard = expectedCardSales
  const expectedTransfer = expectedTransferSales
  const cashVariance = actualCash - expectedCash

  const updated = await db.shift.update({
    where: { id },
    data: {
      status: "BLIND_CLOSED",
      expectedCash: +expectedCash.toFixed(3),
      expectedCard: +expectedCard.toFixed(3),
      expectedTransfer: +expectedTransfer.toFixed(3),
      totalSales: +totalSales.toFixed(3),
      totalRefunds: +totalRefunds.toFixed(3),
      actualCash: +actualCash.toFixed(3),
      actualCard: +actualCard.toFixed(3),
      cashVariance: +cashVariance.toFixed(3),
      blindClosedAt: new Date(),
    },
    include: { user: { select: { name: true, email: true } } },
  })

  return NextResponse.json(updated)
}
