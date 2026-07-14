import { requireUser, isErrorResponse, requireSeeFinancials } from "@/lib/auth-helpers"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

/** Round to 3 decimals (matches the accounting convention). */
function r(v: number): number {
  return +Number(v).toFixed(3)
}

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
  }
}

/**
 * GET /api/customs-annexes
 * List all customs annexes (newest first), with purchaseInvoice + supplier + createdBy.
 * Optional query: ?purchaseInvoiceId=xxx to filter by invoice.
 *
 * Auth: canSeeFinancials (OWNER/ADMIN/MANAGER/ACCOUNTANT).
 */
export async function GET(req: NextRequest) {
  const user = await requireSeeFinancials()
  if (isErrorResponse(user)) return user

  const { searchParams } = new URL(req.url)
  const purchaseInvoiceId = searchParams.get("purchaseInvoiceId") || undefined

  const where: any = {}
  if (purchaseInvoiceId) where.purchaseInvoiceId = purchaseInvoiceId

  const annexes = await db.customsAnnex.findMany({
    where,
    include: {
      purchaseInvoice: { include: { supplier: true } },
      createdBy: true,
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ items: annexes.map(serializeAnnex) })
}

/**
 * POST /api/customs-annexes
 * Create a customs annex (DRAFT) against a POSTED purchase invoice.
 *
 * Auth: canSeeFinancials.
 *
 * Body:
 *   {
 *     purchaseInvoiceId, customsRate, taxRate, shippingRate, otherCharges,
 *     billOfLading?, arrivalDate?, note?
 *   }
 *
 * Validation:
 *   - purchaseInvoiceId must exist AND be POSTED.
 *
 * Auto-calculation (amounts from the invoice subtotal):
 *   customsAmount    = subtotal × customsRate / 100
 *   taxAmount        = subtotal × taxRate / 100
 *   shippingAmount   = subtotal × shippingRate / 100
 *   totalAnnexCost   = customsAmount + taxAmount + shippingAmount + otherCharges
 *
 * annexNo is auto-generated as `ANX-XXXXXXXX` (last 8 digits of Date.now()).
 * The annex is created with status "DRAFT" — posting is a separate call.
 */
export async function POST(req: NextRequest) {
  const user = await requireSeeFinancials()
  if (isErrorResponse(user)) return user

  const body = await req.json().catch(() => ({} as any))
  const {
    purchaseInvoiceId,
    customsRate,
    taxRate,
    shippingRate,
    otherCharges,
    billOfLading,
    arrivalDate,
    note,
  } = body || {}

  if (!purchaseInvoiceId) {
    return NextResponse.json({ error: "purchase-invoice-required" }, { status: 400 })
  }

  // Validate the linked invoice exists AND is POSTED.
  const invoice = await db.purchaseInvoice.findUnique({
    where: { id: String(purchaseInvoiceId) },
    include: { supplier: true },
  })
  if (!invoice) {
    return NextResponse.json({ error: "invalid-invoice" }, { status: 400 })
  }
  if (invoice.status !== "POSTED") {
    return NextResponse.json({ error: "invoice-not-posted" }, { status: 400 })
  }

  const subtotal = Number(invoice.subtotal ?? 0)
  const customsRateNum = Math.max(0, Number(customsRate) || 0)
  const taxRateNum = Math.max(0, Number(taxRate) || 0)
  const shippingRateNum = Math.max(0, Number(shippingRate) || 0)
  const otherChargesNum = Math.max(0, Number(otherCharges) || 0)

  // Require at least one rate or other charges > 0 to avoid empty annexes.
  if (
    customsRateNum === 0 &&
    taxRateNum === 0 &&
    shippingRateNum === 0 &&
    otherChargesNum === 0
  ) {
    return NextResponse.json({ error: "empty-annex" }, { status: 400 })
  }

  const customsAmount = r((subtotal * customsRateNum) / 100)
  const taxAmount = r((subtotal * taxRateNum) / 100)
  const shippingAmount = r((subtotal * shippingRateNum) / 100)
  const totalAnnexCost = r(
    customsAmount + taxAmount + shippingAmount + otherChargesNum
  )

  // Validate arrivalDate if provided.
  const arrivalDateVal = arrivalDate ? new Date(arrivalDate) : null
  if (arrivalDate && Number.isNaN(arrivalDateVal!.getTime())) {
    return NextResponse.json({ error: "invalid-arrival-date" }, { status: 400 })
  }

  const annexNo = `ANX-${Date.now().toString().slice(-8)}`

  const created = await db.customsAnnex.create({
    data: {
      annexNo,
      purchaseInvoiceId: invoice.id,
      customsRate: customsRateNum,
      customsAmount,
      taxRate: taxRateNum,
      taxAmount,
      shippingRate: shippingRateNum,
      shippingAmount,
      otherCharges: otherChargesNum,
      totalAnnexCost,
      billOfLading: billOfLading ? String(billOfLading).trim() : null,
      arrivalDate: arrivalDateVal,
      note: note ? String(note).trim() : null,
      createdById: user.id,
    },
    include: {
      purchaseInvoice: { include: { supplier: true } },
      createdBy: true,
    },
  })

  return NextResponse.json(serializeAnnex(created), { status: 201 })
}
