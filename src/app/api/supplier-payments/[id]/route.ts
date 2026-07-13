import { requireUser, isErrorResponse } from "@/lib/auth-helpers"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/** GET /api/supplier-payments/[id] — single payment with supplier + createdBy. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const payment = await db.supplierPayment.findUnique({
    where: { id },
    include: { supplier: true, createdBy: true },
  })
  if (!payment) return NextResponse.json({ error: "not-found" }, { status: 404 })
  return NextResponse.json({
    id: String(payment.id),
    paymentNo: String(payment.paymentNo),
    supplierId: String(payment.supplierId),
    supplierName: (payment.supplier as any)?.name ?? "—",
    amount: Number(payment.amount ?? 0),
    paymentDate: String(payment.paymentDate),
    paymentMethod: String(payment.paymentMethod ?? "CASH"),
    referenceNo: (payment.referenceNo as string | null) ?? null,
    note: (payment.note as string | null) ?? null,
    journalEntryId: (payment.journalEntryId as string | null) ?? null,
    createdByName: (payment.createdBy as any)?.name ?? null,
    createdAt: String(payment.createdAt),
  })
}

/**
 * DELETE /api/supplier-payments/[id] — ADMIN only.
 * Deletes the payment AND its linked journal entry (reversing the account
 * balance changes). Idempotent.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await params
  const payment = await db.supplierPayment.findUnique({ where: { id } })
  if (!payment) return NextResponse.json({ error: "not-found" }, { status: 404 })

  // Reverse the journal entry's account balance changes, then delete the
  // entry + its lines. Finally delete the payment.
  const journalEntryId = payment.journalEntryId
  if (journalEntryId) {
    const lines = await db.journalLine.findMany({
      where: { journalEntryId },
      include: { account: true },
    })
    // Reverse: subtract the delta that was originally applied.
    // Convention: balance stored as signed (debit positive). Original delta
    // was (debit - credit); reverse means balance -= delta → balance += (credit - debit).
    for (const l of lines) {
      const delta = (l.debit || 0) - (l.credit || 0)
      await db.account.update({
        where: { id: l.accountId },
        data: { balance: { decrement: +Number(delta).toFixed(3) } },
      })
    }
    await db.journalLine.deleteMany({ where: { journalEntryId } })
    await db.journalEntry.delete({ where: { id: journalEntryId } }).catch(() => {})
  }

  await db.supplierPayment.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
