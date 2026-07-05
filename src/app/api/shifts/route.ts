import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

/**
 * Shift closing & cash/terminal reconciliation.
 *
 * GET  /api/shifts          — list shifts (optionally ?status=OPEN|CLOSED)
 * POST /api/shifts          — open a new shift (auto-generates shiftNo)
 * PATCH /api/shifts         — close the active shift with counted amounts
 *
 * On close, the system computes expected totals (cash/knet/visa) from all
 * sales in the shift window, then computes variances = counted − expected.
 */
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

/** Open a new shift. Only one OPEN shift is allowed at a time. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  // Reject if an OPEN shift already exists.
  const existing = await db.shift.findFirst({ where: { status: "OPEN" } })
  if (existing) {
    return NextResponse.json({ error: "shift-already-open", shiftId: existing.id, shiftNo: existing.shiftNo }, { status: 409 })
  }

  const count = await db.shift.count()
  const shiftNo = `SHF-${String(count + 1).padStart(4, "0")}`

  const created = await db.shift.create({
    data: { shiftNo, userId: user.id, status: "OPEN" },
  })
  return NextResponse.json({ id: created.id, shiftNo: created.shiftNo, status: "OPEN" }, { status: 201 })
}

/** Close the active shift with counted amounts + compute variances. */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const body = await req.json()
  const { id, countedCash, countedKnet, countedVisa, note } = body || {}

  const shift = await db.shift.findUnique({ where: { id } })
  if (!shift) return NextResponse.json({ error: "not-found" }, { status: 404 })
  if (shift.status === "CLOSED") return NextResponse.json({ error: "already-closed" }, { status: 409 })

  // Compute expected totals from all sales in [openedAt, now].
  const sales = await db.sale.findMany({
    where: { createdAt: { gte: shift.openedAt, lte: new Date() } },
    select: { paymentMethod: true, total: true, refundTotal: true },
  })
  let expectedCash = 0
  let expectedKnet = 0
  let expectedVisa = 0
  for (const s of sales) {
    const net = Number(s.total) - Number(s.refundTotal)
    if (s.paymentMethod === "CASH") expectedCash += net
    else if (s.paymentMethod === "CARD") expectedKnet += net // K-Net treated as the primary card network
    else if (s.paymentMethod === "TRANSFER") expectedVisa += net // Visa/bank transfer bucket
  }

  const cCash = Number(countedCash) || 0
  const cKnet = Number(countedKnet) || 0
  const cVisa = Number(countedVisa) || 0
  const cashVariance = +(cCash - expectedCash).toFixed(3)
  const knetVariance = +(cKnet - expectedKnet).toFixed(3)
  const visaVariance = +(cVisa - expectedVisa).toFixed(3)

  const updated = await db.shift.update({
    where: { id },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      expectedCash: +expectedCash.toFixed(3),
      expectedKnet: +expectedKnet.toFixed(3),
      expectedVisa: +expectedVisa.toFixed(3),
      countedCash: cCash,
      countedKnet: cKnet,
      countedVisa: cVisa,
      cashVariance,
      knetVariance,
      visaVariance,
      note: note?.trim() || null,
    },
  })

  return NextResponse.json({
    id: updated.id,
    shiftNo: updated.shiftNo,
    status: "CLOSED",
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
