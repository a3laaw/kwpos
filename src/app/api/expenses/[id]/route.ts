import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"

export const dynamic = "force-dynamic"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN", "ACCOUNTANT" as any])) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const { id } = await params
  const exp = await db.expenseTransaction.findUnique({ where: { id } })
  if (!exp) return NextResponse.json({ error: "not-found" }, { status: 404 })

  // Reverse the related journal entry (if any) + delete the expense.
  // We delete the journal entry; its lines cascade, and we reverse the
  // balance effect by posting a mirror entry... but simplest: delete the
  // expense and its journal entry, then recompute affected account balances.
  await db.$transaction(async (tx) => {
    // Find the journal entry tied to this expense
    const je = await tx.journalEntry.findFirst({
      where: { sourceType: "EXPENSE", sourceId: id },
      include: { lines: true },
    })
    if (je) {
      // Reverse balances: for each line, apply opposite sign
      for (const line of je.lines) {
        await tx.account.update({
          where: { id: line.accountId },
          data: { balance: { decrement: line.debit - line.credit } },
        })
      }
      await tx.journalEntry.delete({ where: { id: je.id } })
    }
    await tx.expenseTransaction.delete({ where: { id } })
  })

  return NextResponse.json({ ok: true })
}
