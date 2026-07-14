import { requireUser, isErrorResponse, requireSeeFinancials } from "@/lib/auth-helpers"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

/** Serialize a CustomsAnnex (with includes) into the API shape. */
function serializeAnnex(a: any) {
  return {
    id: String(a.id),
    annexNo: String(a.annexNo),
    purchaseInvoiceId: String(a.purchaseInvoiceId),
    invoiceNo: (a.purchaseInvoice as any)?.invoiceNo ?? "—",
    supplierName: (a.purchaseInvoice as any)?.supplier?.name ?? "—",
    invoiceSubtotal: Number((a.purchaseInvoice as any)?.subtotal ?? 0),
    annexDate: String(a.annexDate),
    status: (a.status as string) ?? "DRAFT",
    customsRate: Number(a.customsRate ?? 0),
    customsAmount: Number(a.customsAmount ?? 0),
    taxRate: Number(a.taxRate ?? 0),
    taxAmount: Number(a.taxAmount ?? 0),
    shippingRate: Number(a.shippingRate ?? 0),
    shippingAmount: Number(a.shippingAmount ?? 0),
    otherCharges: Number(a.otherCharges ?? 0),
    totalAnnexCost: Number(a.totalAnnexCost ?? 0),
    billOfLading: (a.billOfLading as string | null) ?? null,
    arrivalDate: a.arrivalDate ? String(a.arrivalDate) : null,
    note: (a.note as string | null) ?? null,
    createdByName: (a.createdBy as any)?.name ?? null,
    createdAt: String(a.createdAt),
    invoice: a.purchaseInvoice
      ? {
          id: String(a.purchaseInvoice.id),
          invoiceNo: String(a.purchaseInvoice.invoiceNo),
          supplierId: String(a.purchaseInvoice.supplierId),
          supplierName: (a.purchaseInvoice.supplier as any)?.name ?? "—",
          subtotal: Number(a.purchaseInvoice.subtotal ?? 0),
          taxRate: Number(a.purchaseInvoice.taxRate ?? 0),
          taxAmount: Number(a.purchaseInvoice.taxAmount ?? 0),
          discount: Number(a.purchaseInvoice.discount ?? 0),
          shipping: Number(a.purchaseInvoice.shipping ?? 0),
          customs: Number(a.purchaseInvoice.customs ?? 0),
          otherCharges: Number(a.purchaseInvoice.otherCharges ?? 0),
          total: Number(a.purchaseInvoice.total ?? 0),
          paymentMethod: (a.purchaseInvoice.paymentMethod as string) ?? "CASH",
          items: ((a.purchaseInvoice.items as any[]) ?? []).map((it) => ({
            id: String(it.id),
            productId: String(it.productId),
            productName: (it.product as any)?.name ?? "—",
            quantity: Number(it.quantity ?? 0),
            unitCost: Number(it.unitCost ?? 0),
            subtotal: Number(it.subtotal ?? 0),
          })),
        }
      : null,
  }
}

/**
 * GET /api/customs-annexes/[id]
 * Single annex with purchaseInvoice + supplier + items.product.
 *
 * Auth: canSeeFinancials.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSeeFinancials()
  if (isErrorResponse(user)) return user

  const { id } = await params
  const annex = await db.customsAnnex.findUnique({
    where: { id },
    include: {
      purchaseInvoice: {
        include: { supplier: true, items: { include: { product: true } } },
      },
      createdBy: true,
    },
  })
  if (!annex) return NextResponse.json({ error: "not-found" }, { status: 404 })
  return NextResponse.json(serializeAnnex(annex))
}
