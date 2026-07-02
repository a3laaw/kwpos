import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const { id } = await params
  const exp = await db.expenseTransaction.findUnique({ where: { id } })
  if (!exp) return NextResponse.json({ error: "not-found" }, { status: 404 })

  // Reverse the balance effect then delete (transactional)
  await db.$transaction(async (tx) => {
    await tx.account.update({
      where: { id: exp.accountId },
      data: { balance: { decrement: exp.amount } },
    })
    await tx.account.update({
      where: { id: exp.paymentAccountId },
      data: { balance: { increment: exp.amount } },
    })
    await tx.expenseTransaction.delete({ where: { id } })
  })

  return NextResponse.json({ ok: true })
}
