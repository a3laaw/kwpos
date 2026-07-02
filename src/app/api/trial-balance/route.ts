import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import type { TrialBalance, TrialBalanceRow, AccountType } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 })

  // Trial balance using account-type-aware debit/credit classification.
  // Convention: balance is stored as debit-positive.
  //   - Assets/Expenses: positive balance = debit (normal)
  //   - Liabilities/Equity/Revenue: the journal helper increments balance
  //     on debit and decrements on credit, so a credit-normal account ends
  //     up with a NEGATIVE balance when it has credits. We therefore take
  //     the absolute value and place it on the credit side for these types.
  //
  // However, the SEED set initial balances for credit-normal accounts as
  // positive numbers (e.g. Capital 5000, Accounts Payable 320). To keep
  // both seed data and journal-posted data consistent, we interpret a
  // positive balance on a credit-normal account as a CREDIT.
  const all = await db.account.findMany({
    orderBy: [{ type: "asc" }, { code: "asc" }],
  })

  const TYPE_ORDER: Record<AccountType, number> = {
    ASSET: 1,
    LIABILITY: 2,
    EQUITY: 3,
    REVENUE: 4,
    EXPENSE: 5,
  }

  const rows: TrialBalanceRow[] = all
    .filter((a) => a.balance !== 0)
    .map((a) => {
      const bal = Number(a.balance)
      const abs = +Math.abs(bal).toFixed(3)
      // Debit-positive convention: balance > 0 means net debit, < 0 means net credit.
      // For credit-normal accounts (Liab/Equity/Revenue), a typical credit balance
      // is stored as a NEGATIVE number → |bal| goes on the credit side.
      // For debit-normal accounts (Assets/Expenses), a typical debit balance is
      // stored as POSITIVE → |bal| goes on the debit side.
      let debit = 0
      let credit = 0
      if (bal >= 0) {
        debit = abs
      } else {
        credit = abs
      }
      return {
        accountId: String(a.id),
        code: String(a.code),
        name: String(a.name),
        type: a.type as AccountType,
        debit,
        credit,
      }
    })
    .sort((a, b) => (TYPE_ORDER[a.type] - TYPE_ORDER[b.type]) || a.code.localeCompare(b.code))

  const totalDebit = +rows.reduce((s, r) => s + r.debit, 0).toFixed(3)
  const totalCredit = +rows.reduce((s, r) => s + r.credit, 0).toFixed(3)

  const report: TrialBalance = { rows, totalDebit, totalCredit }
  return NextResponse.json(report)
}
