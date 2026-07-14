import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { canSeeFinancials } from "@/lib/permissions"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * GET /api/suppliers/[id]/statement?from=&to=
 * Returns the supplier statement (كشف حساب المورد):
 *   - POSTED purchase invoices (debit = total)
 *   - Supplier payments (credit = amount)
 *   - Purchase returns (credit = total) — reduces payable
 *   - Opening + closing balance + running balance per row
 *
 * Balance = invoices − payments − returns
 * Positive = business owes supplier (normal payable)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!canSeeFinancials(user.role as Role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const supplier = await db.supplier.findUnique({
    where: { id },
    select: { id: true, name: true, phone: true, email: true, address: true },
  })
  if (!supplier) return NextResponse.json({ error: "not-found" }, { status: 404 })

  // Date filters
  const dateFilter: any = {}
  if (from) dateFilter.gte = new Date(from)
  if (to) {
    const t = new Date(to)
    t.setHours(23, 59, 59, 999)
    dateFilter.lte = t
  }

  // For opening balance: sum of all invoices/payments/returns BEFORE `from`
  const openingDateFilter: any = {}
  if (from) openingDateFilter.lt = new Date(from)

  const [openingInvoices, openingPayments, openingReturns] = await Promise.all([
    db.purchaseInvoice.aggregate({
      where: { supplierId: id, status: "POSTED", invoiceDate: openingDateFilter },
      _sum: { total: true },
    }),
    db.supplierPayment.aggregate({
      where: { supplierId: id, paymentDate: openingDateFilter },
      _sum: { amount: true },
    }),
    db.purchaseReturn.aggregate({
      where: { supplierId: id, createdAt: openingDateFilter },
      _sum: { total: true },
    }),
  ])
  const openingBalance =
    Number(openingInvoices._sum.total || 0)
    - Number(openingPayments._sum.amount || 0)
    - Number(openingReturns._sum.total || 0)

  // Fetch period transactions (invoices + payments + returns) in parallel
  const invoiceWhere: any = { supplierId: id, status: "POSTED" }
  if (Object.keys(dateFilter).length) invoiceWhere.invoiceDate = dateFilter
  const paymentWhere: any = { supplierId: id }
  if (Object.keys(dateFilter).length) paymentWhere.paymentDate = dateFilter
  const returnWhere: any = { supplierId: id }
  if (Object.keys(dateFilter).length) returnWhere.createdAt = dateFilter

  const [invoices, payments, returns] = await Promise.all([
    db.purchaseInvoice.findMany({
      where: invoiceWhere,
      select: { id: true, invoiceNo: true, invoiceDate: true, total: true, note: true },
      orderBy: { invoiceDate: "asc" },
    }),
    db.supplierPayment.findMany({
      where: paymentWhere,
      select: {
        id: true, paymentNo: true, paymentDate: true, amount: true,
        paymentMethod: true, referenceNo: true, note: true,
      },
      orderBy: { paymentDate: "asc" },
    }),
    db.purchaseReturn.findMany({
      where: returnWhere,
      select: {
        id: true, returnNo: true, createdAt: true, total: true, note: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ])

  // Build unified transaction list
  type Tx = {
    date: string
    type: "INVOICE" | "PAYMENT" | "RETURN"
    referenceNo: string
    description: string
    debit: number
    credit: number
    balance: number
  }
  const txs: Tx[] = []

  for (const inv of invoices) {
    txs.push({
      date: inv.invoiceDate.toISOString(),
      type: "INVOICE",
      referenceNo: inv.invoiceNo,
      description: inv.note || "فاتورة مشتريات",
      debit: +Number(inv.total).toFixed(3),
      credit: 0,
      balance: 0,
    })
  }
  for (const p of payments) {
    txs.push({
      date: p.paymentDate.toISOString(),
      type: "PAYMENT",
      referenceNo: p.paymentNo,
      description: p.note || `سداد (${p.paymentMethod})`,
      debit: 0,
      credit: +Number(p.amount).toFixed(3),
      balance: 0,
    })
  }
  for (const ret of returns) {
    txs.push({
      date: ret.createdAt.toISOString(),
      type: "RETURN",
      referenceNo: ret.returnNo,
      description: ret.note || "مرتجع مشتريات",
      debit: 0,
      credit: +Number(ret.total).toFixed(3),
      balance: 0,
    })
  }

  // Sort by date ascending (stable)
  txs.sort((a, b) => a.date.localeCompare(b.date))

  // Compute running balance: opening + cumulative(debit − credit)
  let running = openingBalance
  for (const tx of txs) {
    running = +(running + tx.debit - tx.credit).toFixed(3)
    tx.balance = running
  }
  const closingBalance = running

  // Summary totals
  const invoicesTotal = txs
    .filter((t) => t.type === "INVOICE")
    .reduce((a, t) => a + t.debit, 0)
  const paymentsTotal = txs
    .filter((t) => t.type === "PAYMENT")
    .reduce((a, t) => a + t.credit, 0)
  const returnsTotal = txs
    .filter((t) => t.type === "RETURN")
    .reduce((a, t) => a + t.credit, 0)

  return NextResponse.json({
    supplier,
    openingBalance: +openingBalance.toFixed(3),
    closingBalance: +closingBalance.toFixed(3),
    invoicesTotal: +invoicesTotal.toFixed(3),
    paymentsTotal: +paymentsTotal.toFixed(3),
    returnsTotal: +returnsTotal.toFixed(3),
    transactions: txs,
  })
}
