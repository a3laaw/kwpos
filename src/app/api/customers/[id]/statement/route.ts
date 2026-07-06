import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

/**
 * GET /api/customers/[id]/statement?from=&to=
 * Customer statement (كشف حساب العميل): sales (debit) + refunds (credit)
 * with running balance.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { id } = await params
  const customer = await db.customer.findUnique({
    where: { id },
    select: { id: true, name: true, phone: true, address: true },
  })
  if (!customer) return NextResponse.json({ error: "not-found" }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const dateFilter: any = {}
  if (from) dateFilter.gte = new Date(from)
  if (to) {
    const t = new Date(to)
    t.setHours(23, 59, 59, 999)
    dateFilter.lte = t
  }

  // Opening balance = sum of sales + refunds BEFORE `from`
  const openingDateFilter: any = {}
  if (from) openingDateFilter.lt = new Date(from)
  const openingSales = from
    ? await db.sale.aggregate({
        where: { customerId: id, createdAt: openingDateFilter },
        _sum: { total: true, refundTotal: true },
      })
    : null
  const openingBalance = openingSales
    ? Number(openingSales._sum.total || 0) - Number(openingSales._sum.refundTotal || 0)
    : 0

  // Period sales
  const salesWhere: any = { customerId: id }
  if (Object.keys(dateFilter).length) salesWhere.createdAt = dateFilter
  const sales = await db.sale.findMany({
    where: salesWhere,
    select: {
      id: true,
      invoiceNo: true,
      createdAt: true,
      total: true,
      refundTotal: true,
      refundStatus: true,
    },
    orderBy: { createdAt: "asc" },
  })

  type Tx = {
    date: string
    type: "SALE" | "REFUND"
    referenceNo: string
    debit: number
    credit: number
    balance: number
  }
  const txs: Tx[] = []
  for (const s of sales) {
    txs.push({
      date: s.createdAt.toISOString(),
      type: "SALE",
      referenceNo: s.invoiceNo,
      debit: +Number(s.total).toFixed(3),
      credit: 0,
      balance: 0,
    })
    if (Number(s.refundTotal || 0) > 0 && s.refundStatus !== "NONE") {
      txs.push({
        date: s.createdAt.toISOString(),
        type: "REFUND",
        referenceNo: `${s.invoiceNo}-R`,
        debit: 0,
        credit: +Number(s.refundTotal).toFixed(3),
        balance: 0,
      })
    }
  }

  txs.sort((a, b) => a.date.localeCompare(b.date))

  let running = openingBalance
  for (const tx of txs) {
    running = +(running + tx.debit - tx.credit).toFixed(3)
    tx.balance = running
  }

  return NextResponse.json({
    customer,
    openingBalance: +openingBalance.toFixed(3),
    closingBalance: +running.toFixed(3),
    transactions: txs,
  })
}
