import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { createJournalEntry } from "@/lib/journal"

export const dynamic = "force-dynamic"

/**
 * Pay a supplier (سداد مورد) with optional earned discount.
 * Body: { amount, discountEarned, paymentAccount: "1010"|"1020", note? }
 *
 * Journal entry (three-way):
 *   Debit Accounts Payable (2010) — full amount being settled
 *   Credit Cash/Bank (1010/1020) — net amount actually paid
 *   Credit Earned Discount (4040) — discount received from supplier
 *
 * Also updates PO.paidAmount and PO.discountEarned.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { amount, discountEarned, paymentAccount, note } = body || {}

  const settleAmount = Number(amount) || 0
  const discount = Number(discountEarned) || 0
  const netPaid = settleAmount - discount

  if (settleAmount <= 0) {
    return NextResponse.json({ error: "invalid-amount" }, { status: 400 })
  }
  if (discount < 0 || discount > settleAmount) {
    return NextResponse.json({ error: "invalid-discount" }, { status: 400 })
  }
  const payAccCode = paymentAccount === "1020" ? "1020" : "1010"

  const po = await db.purchaseOrder.findUnique({
    where: { id },
    include: { supplier: true },
  })
  if (!po) return NextResponse.json({ error: "not-found" }, { status: 404 })

  // Update PO paid amount + discount
  const updated = await db.purchaseOrder.update({
    where: { id },
    data: {
      paidAmount: { increment: netPaid },
      discountEarned: { increment: discount },
    },
    include: { supplier: true, items: { include: { product: true } } },
  })

  // Journal entry: three-way split
  try {
    // Ensure discount earned account exists
    let discAcc = await db.account.findUnique({ where: { code: "4040" } })
    if (!discAcc) {
      discAcc = await db.account.create({ data: { code: "4040", name: "الخصم المكتسب", type: "REVENUE", isSystem: true } })
    }

    const lines: any[] = [
      { accountCode: "2010", debit: +settleAmount.toFixed(3), description: `سداد لمورد ${po.supplier?.name ?? ""}` },
      { accountCode: payAccCode, credit: +netPaid.toFixed(3), description: `مبلغ مدفوع ${note ? "— " + note : ""}` },
    ]
    if (discount > 0) {
      lines.push({ accountCode: "4040", credit: +discount.toFixed(3), description: "خصم مكتسب من المورد" })
    }

    await createJournalEntry({
      sourceType: "MANUAL",
      sourceId: po.id,
      description: `قيد سداد مورد ${po.supplier?.name ?? ""} — أمر شراء ${po.id.slice(-6)}`,
      date: new Date(),
      lines,
    })
  } catch (e: any) {
    console.error("[supplier-pay] journal failed:", e?.message)
  }

  return NextResponse.json({
    ok: true,
    paidAmount: netPaid,
    discountEarned: discount,
    totalPaid: updated.paidAmount,
    totalDiscount: updated.discountEarned,
  })
}
