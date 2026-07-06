import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

/**
 * GET /api/suppliers/balances
 * Compute the outstanding balance for each supplier:
 *   balance = SUM(POSTED purchase invoices total) − SUM(supplier payments)
 *
 * Returns: { items: [{ supplierId, supplierName, totalInvoiced, totalPaid, balance }] }
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const [invoices, payments, suppliers] = await Promise.all([
    db.purchaseInvoice.groupBy({
      by: ["supplierId"],
      where: { status: "POSTED" },
      _sum: { total: true },
    }),
    db.supplierPayment.groupBy({
      by: ["supplierId"],
      _sum: { amount: true },
    }),
    db.supplier.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ])

  const invoicedMap = new Map(invoices.map((i) => [i.supplierId, Number(i._sum.total || 0)]))
  const paidMap = new Map(payments.map((p) => [p.supplierId, Number(p._sum.amount || 0)]))

  const items = suppliers.map((s) => {
    const totalInvoiced = invoicedMap.get(s.id) || 0
    const totalPaid = paidMap.get(s.id) || 0
    return {
      supplierId: s.id,
      supplierName: s.name,
      totalInvoiced: +totalInvoiced.toFixed(3),
      totalPaid: +totalPaid.toFixed(3),
      balance: +(totalInvoiced - totalPaid).toFixed(3),
    }
  })

  return NextResponse.json({ items })
}
