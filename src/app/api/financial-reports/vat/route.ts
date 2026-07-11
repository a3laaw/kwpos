import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"

export const dynamic = "force-dynamic"

/**
 * GET /api/financial-reports/vat?from=&to=
 * VAT report (تقرير ضريبة القيمة المضافة):
 *   - Output VAT (sales taxAmount)
 *   - Input VAT from Purchase Invoices (POSTED, taxAmount)
 *   - Input VAT from PO Receives (receivedTaxAmount, only for POs that
 *     do NOT have a linked POSTED PurchaseInvoice — prevents double counting)
 *   - Net VAT = outputVat - (inputVatInvoices + inputVatPOReceives)
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

  // Sales (output VAT)
  const salesWhere: any = {}
  if (Object.keys(dateFilter).length) salesWhere.createdAt = dateFilter

  // Purchase Invoices (input VAT from invoices)
  const purchaseWhere: any = { status: "POSTED" }
  if (Object.keys(dateFilter).length) purchaseWhere.invoiceDate = dateFilter

  // PO Receives (input VAT from PO receives) — only POs with status RECEIVED
  // and NOT linked to a POSTED PurchaseInvoice (to avoid double counting)
  const poReceiveWhere: any = { status: "RECEIVED", receivedTaxAmount: { gt: 0 } }
  if (Object.keys(dateFilter).length) poReceiveWhere.updatedAt = dateFilter

  const [salesAgg, purchasesAgg, poReceives, postedInvoicePOIds] = await Promise.all([
    db.sale.aggregate({
      where: salesWhere,
      _sum: { taxAmount: true, subtotal: true },
    }),
    db.purchaseInvoice.aggregate({
      where: purchaseWhere,
      _sum: { taxAmount: true, total: true },
    }),
    db.purchaseOrder.findMany({
      where: poReceiveWhere,
      select: { id: true, receivedTaxAmount: true, purchaseInvoices: { where: { status: "POSTED" }, select: { id: true } } },
    }),
    db.purchaseInvoice.findMany({
      where: purchaseWhere,
      select: { purchaseOrderId: true },
    }),
  ])

  // Build set of PO IDs that have a posted invoice (their VAT is already
  // counted in the purchaseInvoice aggregate → exclude from PO receive VAT)
  const postedInvoicePOIdSet = new Set(
    postedInvoicePOIds
      .map((pi) => pi.purchaseOrderId)
      .filter(Boolean) as string[]
  )

  // Sum PO receive VAT only for POs WITHOUT a posted invoice
  const inputVatPOReceives = poReceives
    .filter((po) => !postedInvoicePOIdSet.has(po.id))
    .reduce((sum, po) => sum + Number(po.receivedTaxAmount || 0), 0)

  const outputVat = Number(salesAgg._sum.taxAmount || 0)
  const inputVatInvoices = Number(purchasesAgg._sum.taxAmount || 0)
  const inputVat = +(inputVatInvoices + inputVatPOReceives).toFixed(3)
  const salesTotal = Number(salesAgg._sum.subtotal || 0)
  const purchasesTotal = Number(purchasesAgg._sum.total || 0)

  return NextResponse.json({
    from: from || null,
    to: to || null,
    outputVat: +outputVat.toFixed(3),
    inputVatInvoices: +inputVatInvoices.toFixed(3),
    inputVatPOReceives: +inputVatPOReceives.toFixed(3),
    inputVat,
    netVat: +(outputVat - inputVat).toFixed(3),
    salesTotal: +salesTotal.toFixed(3),
    purchasesTotal: +purchasesTotal.toFixed(3),
  })
}
