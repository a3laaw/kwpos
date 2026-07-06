import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

/**
 * GET /api/financial-reports/vat?from=&to=
 * VAT report (تقرير ضريبة القيمة المضافة): output VAT (sales taxAmount),
 * input VAT (purchase taxAmount), net VAT payable/refundable.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

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

  const salesWhere: any = {}
  if (Object.keys(dateFilter).length) salesWhere.createdAt = dateFilter
  const purchaseWhere: any = { status: "POSTED" }
  if (Object.keys(dateFilter).length) purchaseWhere.invoiceDate = dateFilter

  const [salesAgg, purchasesAgg] = await Promise.all([
    db.sale.aggregate({
      where: salesWhere,
      _sum: { taxAmount: true, subtotal: true },
    }),
    db.purchaseInvoice.aggregate({
      where: purchaseWhere,
      _sum: { taxAmount: true, total: true },
    }),
  ])

  const outputVat = Number(salesAgg._sum.taxAmount || 0)
  const inputVat = Number(purchasesAgg._sum.taxAmount || 0)
  const salesTotal = Number(salesAgg._sum.subtotal || 0)
  const purchasesTotal = Number(purchasesAgg._sum.total || 0)

  return NextResponse.json({
    from: from || null,
    to: to || null,
    outputVat: +outputVat.toFixed(3),
    inputVat: +inputVat.toFixed(3),
    netVat: +(outputVat - inputVat).toFixed(3),
    salesTotal: +salesTotal.toFixed(3),
    purchasesTotal: +purchasesTotal.toFixed(3),
  })
}
