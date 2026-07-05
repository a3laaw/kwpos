import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

const MAX_EXCHANGE_DAYS = 14

/**
 * GET /api/sales/by-invoice/[invoiceNo]/for-exchange
 *
 * Look up a Sale by its invoiceNo (e.g. "INV-00021") and return it in a
 * shape optimized for the Exchange screen:
 *
 *   {
 *     id, invoiceNo, createdAt, customerName, customerPhone,
 *     isEligible: boolean,    // false when sale.createdAt > 14 days ago
 *     daysOld: number,
 *     items: [{
 *       saleItemId, productId, productName, barcode,
 *       quantity, returnedQty, remainingQty, unitPrice
 *     }]
 *   }
 *
 * Status codes:
 *   401 — not authenticated
 *   404 — invoice not found
 *   200 — body always returned (eligible or not); UI shows the 14-day warning
 *         using `isEligible` + `daysOld`.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ invoiceNo: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { invoiceNo } = await params
  // Decode the URL path segment (invoiceNo may have been encoded).
  const decoded = decodeURIComponent(invoiceNo).trim()

  const sale = await db.sale.findFirst({
    where: { invoiceNo: decoded },
    include: { items: { include: { product: true } } },
  })
  if (!sale) {
    return NextResponse.json({ error: "not-found" }, { status: 404 })
  }

  const createdAtMs = new Date(sale.createdAt).getTime()
  const daysOld = Math.floor((Date.now() - createdAtMs) / (1000 * 60 * 60 * 24))
  const isEligible = daysOld <= MAX_EXCHANGE_DAYS

  return NextResponse.json({
    id: sale.id,
    invoiceNo: sale.invoiceNo,
    createdAt: sale.createdAt.toISOString(),
    customerName: sale.customerName ?? null,
    customerPhone: sale.customerPhone ?? null,
    isEligible,
    daysOld,
    items: sale.items.map((si) => {
      const returnedQty = Number(si.returnedQty ?? 0)
      const quantity = Number(si.quantity ?? 0)
      return {
        saleItemId: si.id,
        productId: si.productId,
        productName: si.product?.name ?? "—",
        barcode: si.product?.barcode ?? null,
        quantity,
        returnedQty,
        remainingQty: Math.max(0, quantity - returnedQty),
        unitPrice: Number(si.unitPrice ?? 0),
      }
    }),
  })
}
