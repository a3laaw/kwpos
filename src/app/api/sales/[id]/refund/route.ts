import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { serializeSale } from "@/lib/serialize"
import { createJournalEntry } from "@/lib/journal"

export const dynamic = "force-dynamic"

/**
 * Refund (reverse) a sale — admin only.
 * - Restores inventory (increments product quantities back).
 * - Creates a reversing journal entry.
 * - Marks the sale as refunded (sets paid = 0, adds note).
 * Does NOT delete the sale — keeps it for audit trail.
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
  const body = await req.json().catch(() => ({}))
  const reason = String(body?.reason || "").trim()

  const sale = await db.sale.findUnique({
    where: { id },
    include: { items: { include: { product: true } }, user: true },
  })
  if (!sale) return NextResponse.json({ error: "not-found" }, { status: 404 })

  // Already refunded?
  if (sale.paid === 0 && sale.total > 0) {
    return NextResponse.json({ error: "already-refunded" }, { status: 409 })
  }

  // Transaction: restore inventory + mark sale as refunded
  const updated = await db.$transaction(async (tx) => {
    // Restore inventory
    for (const it of sale.items) {
      await tx.product.update({
        where: { id: it.productId },
        data: { quantity: { increment: it.quantity } },
      })
    }
    // Mark as refunded
    return tx.sale.update({
      where: { id },
      data: {
        paid: 0,
        note: `مرتجع — ${reason || "بطلب المدير"}`,
      },
      include: { user: true, items: { include: { product: true } } },
    })
  })

  // Reversing journal entry (debit Revenue back, credit Cash/Bank back)
  try {
    const paymentAccCode = sale.paymentMethod === "CASH" ? "1010" : "1020"
    await createJournalEntry({
      sourceType: "MANUAL",
      sourceId: sale.id,
      description: `قيد مرتجع فاتورة ${sale.invoiceNo}${reason ? ` — ${reason}` : ""}`,
      date: new Date(),
      lines: [
        { accountCode: "4010", debit: +sale.total.toFixed(3), description: "عكس إيراد مبيعات (مرتجع)" },
        { accountCode: paymentAccCode, credit: +sale.total.toFixed(3), description: "رد المبلغ للعميل" },
      ],
    })
  } catch (e: any) {
    console.error("[refund] journal reversal failed:", e?.message)
  }

  return NextResponse.json(serializeSale(updated as any))
}
