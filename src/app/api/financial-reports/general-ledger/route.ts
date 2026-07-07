import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

/**
 * GET /api/financial-reports/general-ledger?accountId=&from=&to=
 *
 * General ledger for a single account: all JournalLine records on that
 * account within the date range, with a running balance computed from
 * the account's opening balance (sum of debits − credits BEFORE `from`).
 *
 * Convention (matches trial-balance/route.ts):
 *   - balance is stored as debit-positive.
 *   - For each line, running balance = openingBalance + Σ(debit − credit).
 *
 * Response shape:
 *   {
 *     account: { id, code, name, type },
 *     openingBalance: number,      // sum of debits − credits BEFORE `from`
 *     closingBalance: number,      // openingBalance + Σ(period debits − credits)
 *     totalDebit: number,          // Σ period debits
 *     totalCredit: number,         // Σ period credits
 *     lines: Array<{
 *       date: string,              // ISO
 *       entryNo: string,           // JE.entryNo
 *       description: string|null,  // line.description || JE.description
 *       debit: number,
 *       credit: number,
 *       balance: number            // running balance AFTER this line
 *     }>
 *   }
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get("accountId")
  const from = searchParams.get("from") || undefined
  const to = searchParams.get("to") || undefined

  if (!accountId) {
    return NextResponse.json({ error: "account-id-required" }, { status: 400 })
  }

  const account = await db.account.findUnique({
    where: { id: accountId },
    select: { id: true, code: true, name: true, type: true, balance: true },
  })
  if (!account) {
    return NextResponse.json({ error: "account-not-found" }, { status: 404 })
  }

  // Date filter for the period lines
  const periodDateFilter: { gte?: Date; lte?: Date } = {}
  if (from) periodDateFilter.gte = new Date(from)
  if (to) {
    const t = new Date(to)
    t.setHours(23, 59, 59, 999)
    periodDateFilter.lte = t
  }

  // Opening balance = Σ(debit − credit) of all journal lines on this
  // account BEFORE `from`. If `from` is not set, opening = 0.
  let openingBalance = 0
  if (from) {
    const openingLines = await db.journalLine.findMany({
      where: {
        accountId,
        journalEntry: { date: { lt: new Date(from) } },
      },
      select: { debit: true, credit: true },
    })
    openingBalance = openingLines.reduce(
      (s, l) => s + Number(l.debit || 0) - Number(l.credit || 0),
      0
    )
  }
  openingBalance = +openingBalance.toFixed(3)

  // Period lines
  const lineWhere: any = { accountId }
  if (Object.keys(periodDateFilter).length) {
    lineWhere.journalEntry = { date: periodDateFilter }
  }
  const lines = await db.journalLine.findMany({
    where: lineWhere,
    include: {
      journalEntry: {
        select: { entryNo: true, date: true, description: true },
      },
    },
    orderBy: { journalEntry: { date: "asc" } },
  })

  // Sort by date asc (then by entryNo for stable order) — Prisma's nested
  // orderBy isn't always reliable across DBs, so do a final in-memory sort.
  lines.sort((a, b) => {
    const da = a.journalEntry?.date?.getTime() ?? 0
    const db_ = b.journalEntry?.date?.getTime() ?? 0
    if (da !== db_) return da - db_
    return (a.journalEntry?.entryNo ?? "").localeCompare(b.journalEntry?.entryNo ?? "")
  })

  // Compute running balance per line
  let running = openingBalance
  let totalDebit = 0
  let totalCredit = 0
  const out = lines.map((l) => {
    const debit = Number(l.debit || 0)
    const credit = Number(l.credit || 0)
    running = +(running + debit - credit).toFixed(3)
    totalDebit = +(totalDebit + debit).toFixed(3)
    totalCredit = +(totalCredit + credit).toFixed(3)
    return {
      date: l.journalEntry?.date?.toISOString() ?? new Date(0).toISOString(),
      entryNo: l.journalEntry?.entryNo ?? "",
      description: l.description ?? l.journalEntry?.description ?? null,
      debit,
      credit,
      balance: running,
    }
  })

  return NextResponse.json({
    account: {
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
    },
    openingBalance,
    closingBalance: +running.toFixed(3),
    totalDebit,
    totalCredit,
    lines: out,
  })
}
