import { db } from "@/lib/db"

/**
 * Journal entry (double-entry / قيد محاسبي) helpers.
 * Every financial transaction generates a balanced journal entry:
 *   totalDebit == totalCredit
 */

let entrySeqCache: number | null = null

async function nextEntryNo(): Promise<string> {
  if (entrySeqCache === null) {
    entrySeqCache = await db.journalEntry.count()
  }
  entrySeqCache += 1
  return `JE-${String(entrySeqCache).padStart(5, "0")}`
}

function round(v: number, decimals = 3): number {
  return +Number(v).toFixed(decimals)
}

export interface JELineInput {
  accountCode: string
  debit?: number
  credit?: number
  description?: string
}

/**
 * Create a balanced journal entry. Resolves account codes to IDs,
 * validates that debits == credits, and updates account balances.
 * Returns the created JournalEntry id.
 */
export async function createJournalEntry(opts: {
  sourceType: "SALE" | "EXPENSE" | "PURCHASE" | "MANUAL"
  sourceId?: string
  description: string
  date?: Date
  lines: JELineInput[]
}): Promise<string> {
  const lines = opts.lines
  const totalDebit = round(lines.reduce((a, l) => a + (l.debit || 0), 0))
  const totalCredit = round(lines.reduce((a, l) => a + (l.credit || 0), 0))

  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new Error(
      `journal-not-balanced: debit ${totalDebit} != credit ${totalCredit}`
    )
  }

  // Resolve account codes → ids
  const codes = lines.map((l) => l.accountCode)
  const accounts = await db.account.findMany({ where: { code: { in: codes } } })
  const codeToId = new Map(accounts.map((a) => [a.code, a.id]))
  for (const l of lines) {
    if (!codeToId.has(l.accountCode)) {
      throw new Error(`account-not-found: ${l.accountCode}`)
    }
  }

  const entry = await db.journalEntry.create({
    data: {
      entryNo: await nextEntryNo(),
      date: opts.date ?? new Date(),
      sourceType: opts.sourceType,
      sourceId: opts.sourceId || null,
      description: opts.description,
      totalDebit,
      totalCredit,
      lines: {
        create: lines.map((l) => ({
          accountId: codeToId.get(l.accountCode)!,
          debit: round(l.debit || 0),
          credit: round(l.credit || 0),
          description: l.description || null,
        })),
      },
    },
  })

  // Update each account's running balance.
  // Convention: Assets/Expenses increase on debit; Liabilities/Equity/Revenue
  // increase on credit. We store a signed `balance` where debit is positive.
  for (const l of lines) {
    const acc = accounts.find((a) => a.code === l.accountCode)!
    const delta = (l.debit || 0) - (l.credit || 0)
    await db.account.update({
      where: { id: acc.id },
      data: { balance: { increment: round(delta) } },
    })
  }

  return entry.id
}
