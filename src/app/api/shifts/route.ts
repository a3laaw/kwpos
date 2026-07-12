import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { createJournalEntry } from "@/lib/journal"
import { logAuditEvent } from "@/lib/audit"

export const dynamic = "force-dynamic"

/**
 * Shift closing & cash/terminal reconciliation.
 *
 * GET  /api/shifts          — list shifts (optionally ?status=OPEN|CLOSED)
 * POST /api/shifts          — open a new shift (per-user: multiple cashiers OK)
 * PATCH /api/shifts         — close a shift with counted amounts
 *
 * Multi-cashier support: each cashier can have ONE open shift at a time.
 * Expected totals are filtered by the shift's userId (not all sales).
 * Cash variance = countedCash - (openingBalance + expectedCash).
 */

/** Round to 3 decimals. */
function r(v: number): number {
  return +Number(v).toFixed(3)
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const status = req.nextUrl.searchParams.get("status") || undefined
  const items = await db.shift.findMany({
    where: status ? { status } : undefined,
    orderBy: { openedAt: "desc" },
    include: { user: true },
    take: 50,
  })

  return NextResponse.json({
    items: items.map((s) => ({
      id: s.id,
      shiftNo: s.shiftNo,
      userId: s.userId,
      userName: s.user?.name ?? null,
      openedAt: s.openedAt,
      closedAt: s.closedAt,
      status: s.status,
      openingBalance: Number(s.openingBalance || 0),
      expectedCash: Number(s.expectedCash),
      expectedKnet: Number(s.expectedKnet),
      expectedVisa: Number(s.expectedVisa),
      countedCash: Number(s.countedCash),
      countedKnet: Number(s.countedKnet),
      countedVisa: Number(s.countedVisa),
      cashVariance: Number(s.cashVariance),
      knetVariance: Number(s.knetVariance),
      visaVariance: Number(s.visaVariance),
      note: s.note,
    })),
  })
}

/**
 * Open a new shift. Allows multiple concurrent cashiers — each user
 * can have ONE open shift at a time. Stores openingBalance from body.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  // Check if THIS USER already has an open shift (not global)
  const existing = await db.shift.findFirst({
    where: { status: "OPEN", userId: user.id },
  })
  if (existing) {
    return NextResponse.json(
      { error: "user-shift-already-open", shiftId: existing.id, shiftNo: existing.shiftNo },
      { status: 409 }
    )
  }

  const body = await req.json().catch(() => ({} as any))
  const openingBalance = Math.max(0, Number(body?.openingBalance) || 0)

  const count = await db.shift.count()
  const shiftNo = `SHF-${String(count + 1).padStart(4, "0")}`

  const created = await db.shift.create({
    data: {
      shiftNo,
      userId: user.id,
      status: "OPEN",
      openingBalance,
    },
  })

  await logAuditEvent({
    userId: user.id,
    userName: user.name,
    action: "SHIFT_OPENED",
    description: `فتح وردية ${shiftNo} — رصيد افتتاحي: ${openingBalance}`,
  })

  return NextResponse.json(
    { id: created.id, shiftNo: created.shiftNo, status: "OPEN", openingBalance },
    { status: 201 }
  )
}

/**
 * Close a shift. Computes expected totals ONLY for sales created by the
 * shift's user during [openedAt, now]. Cash variance includes openingBalance.
 * Creates a journal entry for the variance inside the same transaction.
 */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const body = await req.json()
  const { id, countedCash, countedKnet, countedVisa, note } = body || {}

  const shift = await db.shift.findUnique({ where: { id } })
  if (!shift) return NextResponse.json({ error: "not-found" }, { status: 404 })
  if (shift.status === "CLOSED") return NextResponse.json({ error: "already-closed" }, { status: 409 })

  // Compute expected totals from sales by THIS USER in [openedAt, now]
  const salesWhere: any = {
    createdAt: { gte: shift.openedAt, lte: new Date() },
  }
  if (shift.userId) {
    salesWhere.userId = shift.userId
  }

  const sales = await db.sale.findMany({
    where: salesWhere,
    select: { paymentMethod: true, total: true, refundTotal: true },
  })

  let expectedCash = 0
  let expectedKnet = 0
  let expectedVisa = 0
  for (const s of sales) {
    const net = Number(s.total) - Number(s.refundTotal)
    if (s.paymentMethod === "CASH") expectedCash += net
    else if (s.paymentMethod === "CARD") expectedKnet += net
    else if (s.paymentMethod === "TRANSFER") expectedVisa += net
  }

  const cCash = Number(countedCash) || 0
  const cKnet = Number(countedKnet) || 0
  const cVisa = Number(countedVisa) || 0

  // Cash variance = counted - (openingBalance + expected)
  const openingBal = Number(shift.openingBalance || 0)
  const cashVariance = r(cCash - (openingBal + expectedCash))
  const knetVariance = r(cKnet - expectedKnet)
  const visaVariance = r(cVisa - expectedVisa)

  // Update shift + create variance journal inside a transaction
  const updated = await db.$transaction(async (tx) => {
    const shiftUpdated = await tx.shift.update({
      where: { id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        expectedCash: r(expectedCash),
        expectedKnet: r(expectedKnet),
        expectedVisa: r(expectedVisa),
        countedCash: cCash,
        countedKnet: cKnet,
        countedVisa: cVisa,
        cashVariance,
        knetVariance,
        visaVariance,
        note: note?.trim() || null,
      },
    })

    // Journal entry for cash variance (shortage = expense, overage = income)
    if (Math.abs(cashVariance) > 0.001) {
      try {
        if (cashVariance < 0) {
          // Shortage: debit expense (5070), credit cash (1010)
          await createJournalEntry({
            tx,
            sourceType: "MANUAL",
            sourceId: shiftUpdated.id,
            description: `عجز نقدية وردية ${shift.shiftNo}`,
            date: new Date(),
            lines: [
              { accountCode: "5070", debit: r(Math.abs(cashVariance)), description: `عجز وردية ${shift.shiftNo}` },
              { accountCode: "1010", credit: r(Math.abs(cashVariance)), description: `عجز نقدية` },
            ],
          })
        } else {
          // Overage: debit cash (1010), credit income (4060)
          await createJournalEntry({
            tx,
            sourceType: "MANUAL",
            sourceId: shiftUpdated.id,
            description: `فائض نقدية وردية ${shift.shiftNo}`,
            date: new Date(),
            lines: [
              { accountCode: "1010", debit: r(cashVariance), description: `فائض وردية ${shift.shiftNo}` },
              { accountCode: "4060", credit: r(cashVariance), description: `فائض نقدية` },
            ],
          })
        }
      } catch (e: any) {
        // Journal entry is non-fatal — the shift close still succeeds.
        console.warn(`[shifts] Journal entry failed for ${shift.shiftNo}: ${e?.message ?? e}`)
      }
    }

    // Audit log inside transaction
    await logAuditEvent({
      tx,
      userId: user.id,
      userName: user.name,
      action: "SHIFT_CLOSED",
      description: `إغلاق وردية ${shift.shiftNo} — عجز/فائض نقدية: ${cashVariance}`,
    })

    return shiftUpdated
  })

  return NextResponse.json({
    id: updated.id,
    shiftNo: updated.shiftNo,
    status: "CLOSED",
    openingBalance: Number(updated.openingBalance || 0),
    expectedCash: Number(updated.expectedCash),
    expectedKnet: Number(updated.expectedKnet),
    expectedVisa: Number(updated.expectedVisa),
    countedCash: Number(updated.countedCash),
    countedKnet: Number(updated.countedKnet),
    countedVisa: Number(updated.countedVisa),
    cashVariance,
    knetVariance,
    visaVariance,
  })
}
