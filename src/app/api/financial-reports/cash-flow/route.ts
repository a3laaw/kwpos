import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"

export const dynamic = "force-dynamic"

/**
 * GET /api/financial-reports/cash-flow?from=&to=
 * Cash flow statement (قائمة التدفقات النقدية) from JournalLines on
 * cash/bank accounts (1010, 1020). Debit = inflow, credit = outflow,
 * grouped by sourceType.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const dateFilter: any = {}
  if (from) dateFilter.gte = new Date(from)
  if (to) {
    const t = new Date(to)
    t.setHours(23, 59, 59, 999)
    dateFilter.lte = t
  }

  // Cash/bank account codes
  const cashAccounts = await db.account.findMany({
    where: { code: { in: ["1010", "1020"] } },
    select: { id: true },
  })
  const cashAccountIds = cashAccounts.map((a) => a.id)

  // Opening cash balance = sum of all JournalLine debit/credit on cash
  // accounts BEFORE `from`.
  const openingFilter: any = {}
  if (from) openingFilter.lt = new Date(from)

  const openingLines = from
    ? await db.journalLine.findMany({
        where: { accountId: { in: cashAccountIds }, journalEntry: { date: openingFilter } },
        select: { debit: true, credit: true },
      })
    : []
  const openingCash = openingLines.reduce(
    (s, l) => s + Number(l.debit || 0) - Number(l.credit || 0),
    0
  )

  // Period lines
  const periodWhere: any = { accountId: { in: cashAccountIds } }
  if (Object.keys(dateFilter).length) {
    periodWhere.journalEntry = { date: dateFilter }
  }
  const lines = await db.journalLine.findMany({
    where: periodWhere,
    include: { journalEntry: { select: { sourceType: true } } },
  })

  const inflowMap = new Map<string, number>()
  const outflowMap = new Map<string, number>()
  for (const l of lines) {
    const source = l.journalEntry?.sourceType || "OTHER"
    const debit = Number(l.debit || 0)
    const credit = Number(l.credit || 0)
    if (debit > 0) inflowMap.set(source, (inflowMap.get(source) || 0) + debit)
    if (credit > 0) outflowMap.set(source, (outflowMap.get(source) || 0) + credit)
  }

  const inflows = Array.from(inflowMap.entries()).map(([source, amount]) => ({
    source,
    amount: +amount.toFixed(3),
  }))
  const outflows = Array.from(outflowMap.entries()).map(([source, amount]) => ({
    source,
    amount: +amount.toFixed(3),
  }))
  const totalIn = inflows.reduce((s, i) => s + i.amount, 0)
  const totalOut = outflows.reduce((s, o) => s + o.amount, 0)
  const netCashFlow = +(totalIn - totalOut).toFixed(3)
  const closingCash = +(openingCash + netCashFlow).toFixed(3)

  return NextResponse.json({
    from: from || null,
    to: to || null,
    inflows,
    outflows,
    netCashFlow,
    openingCash: +openingCash.toFixed(3),
    closingCash,
  })
}
