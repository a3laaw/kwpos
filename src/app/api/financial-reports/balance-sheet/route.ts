import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

/**
 * GET /api/financial-reports/balance-sheet
 * Returns the balance sheet (الميزانية العمومية) from Account balances.
 * Convention: balance is signed (debit positive). Assets are positive;
 * liabilities/equity are stored as negative (credit-normal) but displayed
 * positive here.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const accounts = await db.account.findMany({
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true, type: true, balance: true },
  })

  const assets = accounts.filter((a) => a.type === "ASSET")
  const liabilities = accounts.filter((a) => a.type === "LIABILITY")
  const equity = accounts.filter((a) => a.type === "EQUITY")

  const makeRows = (list: typeof accounts) =>
    list.map((a) => ({ code: a.code, name: a.name, balance: Number(a.balance) }))

  const assetsRows = makeRows(assets)
  const liabRows = makeRows(liabilities)
  const eqRows = makeRows(equity)

  const assetsTotal = assetsRows.reduce((s, r) => s + r.balance, 0)
  const liabTotal = liabRows.reduce((s, r) => s + Math.abs(r.balance), 0)
  const eqTotal = eqRows.reduce((s, r) => s + Math.abs(r.balance), 0)

  // For liabilities/equity, display as positive (credit-normal)
  const liabDisplay = liabRows.map((r) => ({ ...r, balance: Math.abs(r.balance) }))
  const eqDisplay = eqRows.map((r) => ({ ...r, balance: Math.abs(r.balance) }))

  return NextResponse.json({
    assets: { rows: assetsRows, total: +assetsTotal.toFixed(3) },
    liabilities: { rows: liabDisplay, total: +liabTotal.toFixed(3) },
    equity: { rows: eqDisplay, total: +eqTotal.toFixed(3) },
    totals: {
      assets: +assetsTotal.toFixed(3),
      liabilities: +liabTotal.toFixed(3),
      equity: +eqTotal.toFixed(3),
    },
  })
}
