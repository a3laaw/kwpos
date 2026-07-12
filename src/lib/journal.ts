import { db } from "@/lib/db"

/**
 * Journal entry (double-entry / قيد محاسبي) helpers.
 * Every financial transaction generates a balanced journal entry:
 *   totalDebit == totalCredit
 *
 * All functions accept an optional `tx` (Prisma transaction client).
 * When `tx` is provided, operations run inside the caller's transaction
 * (atomic: if journal fails, the whole transaction rolls back).
 * When `tx` is not provided, falls back to the global `db` client.
 */

/**
 * Generate a unique journal entry number.
 *
 * Uses a timestamp + random suffix to guarantee uniqueness across:
 * - Concurrent requests (Vercel serverless runs multiple instances)
 * - Server restarts (no in-memory cache that resets)
 * - Deleted entries (count() would undercount)
 *
 * Format: JE-YYYYMMDDHHmmss-XXXX (e.g. JE-20260712143025-a1b2)
 */
async function nextEntryNo(tx?: any): Promise<string> {
  const now = new Date()
  const ts = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0")
  // Random 4-char suffix to avoid collision when two entries are created
  // in the same second.
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `JE-${ts}-${suffix}`
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
 *
 * @param opts.sourceType - SALE | EXPENSE | PURCHASE | MANUAL
 * @param opts.sourceId - Optional source document ID
 * @param opts.description - Entry description
 * @param opts.date - Entry date (defaults to now)
 * @param opts.lines - Array of { accountCode, debit?, credit?, description? }
 * @param opts.tx - Optional Prisma transaction client. When provided,
 *   the journal entry is created inside the caller's transaction. If
 *   it fails, the entire transaction rolls back.
 */
export async function createJournalEntry(opts: {
  sourceType: "SALE" | "EXPENSE" | "PURCHASE" | "MANUAL"
  sourceId?: string
  description: string
  date?: Date
  lines: JELineInput[]
  tx?: any
}): Promise<string> {
  const { tx } = opts
  const client = (tx || db) as typeof db
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
  const accounts = await client.account.findMany({ where: { code: { in: codes } } })
  const codeToId = new Map(accounts.map((a) => [a.code, a.id]))
  for (const l of lines) {
    if (!codeToId.has(l.accountCode)) {
      throw new Error(`account-not-found: ${l.accountCode}`)
    }
  }

  const entry = await client.journalEntry.create({
    data: {
      entryNo: await nextEntryNo(client),
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
    await client.account.update({
      where: { id: acc.id },
      data: { balance: { increment: round(delta) } },
    })
  }

  return entry.id
}

/**
 * Non-fatal wrapper around createJournalEntry for use INSIDE a transaction.
 *
 * If the journal entry fails (e.g. account not set up), the error is
 * logged as a warning and null is returned — the caller's transaction
 * continues. This is the in-transaction equivalent of runInBackground().
 *
 * Use this when the journal entry is a side effect (not critical to the
 * primary operation). For critical entries that MUST succeed or roll
 * back, call createJournalEntry() directly.
 */
export async function safeCreateJournalEntry(
  tx: any,
  params: {
    sourceType: "SALE" | "EXPENSE" | "PURCHASE" | "MANUAL"
    sourceId?: string
    description: string
    date?: Date
    lines: JELineInput[]
  },
  label: string
): Promise<string | null> {
  try {
    return await createJournalEntry({ ...params, tx })
  } catch (e: any) {
    console.warn(`[journal] ${label} failed: ${e?.message ?? e}`)
    return null
  }
}
