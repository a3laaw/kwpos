import { requireUser, isErrorResponse, requireSeeFinancials } from "@/lib/auth-helpers"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { logAuditEvent } from "@/lib/audit"
import { createJournalEntry } from "@/lib/journal"
import {
  ensurePurchaseAccounts,
  paymentCreditAccountCode,
} from "@/lib/purchase"

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
 * POST /api/customs-annexes/[id]/post
 * Post a DRAFT customs annex — capitalizes annex costs into the linked
 * purchase invoice (customs/shipping/otherCharges/taxAmount fields) and
 * creates a balanced journal entry (Debit 1100 Inventory / Credit 1010|1020|2010).
 *
 * Auth: canSeeFinancials.
 *
 * IMPORTANT (PgBouncer compatibility): NO db.$transaction is used. Each step
 * runs as a separate sequential query. Compensation logic reverts the annex
 * status to DRAFT if the invoice update fails. The journal entry + audit log
 * are fire-and-forget (non-fatal) — a failure there leaves the annex posted
 * but logs the gap for manual reconciliation.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSeeFinancials()
  if (isErrorResponse(user)) return user

  const { id } = await params

  // ── 0. Load annex with the linked invoice + supplier ──
  const annex = await db.customsAnnex.findUnique({
    where: { id },
    include: {
      purchaseInvoice: { include: { supplier: true } },
      createdBy: true,
    },
  })
  if (!annex) return NextResponse.json({ error: "not-found" }, { status: 404 })

  // Guard: 409 if already POSTED.
  if (annex.status === "POSTED") {
    return NextResponse.json({ error: "already-posted" }, { status: 409 })
  }

  const invoice = annex.purchaseInvoice
  if (!invoice) {
    return NextResponse.json({ error: "invoice-missing" }, { status: 500 })
  }

  // ── 1. Flip the annex status to POSTED ──
  // (We do this first so concurrent posters see the status change ASAP.)
  const posted = await db.customsAnnex.update({
    where: { id: annex.id },
    data: { status: "POSTED" },
    include: {
      purchaseInvoice: { include: { supplier: true } },
      createdBy: true,
    },
  })

  // ── 2. Update the linked PurchaseInvoice's customs/shipping/otherCharges/taxAmount ──
  //    ADD the annex amounts to the invoice (multiple annexes can stack).
  //    Then recalculate the invoice total = subtotal + taxAmount + shipping + customs + otherCharges − discount.
  //    On failure: compensate by reverting the annex to DRAFT.
  let updatedInvoice: any = null
  try {
    const newCustoms = r(Number(invoice.customs) + annex.customsAmount)
    const newShipping = r(Number(invoice.shipping) + annex.shippingAmount)
    const newOtherCharges = r(Number(invoice.otherCharges) + annex.otherCharges)
    const newTaxAmount = r(Number(invoice.taxAmount) + annex.taxAmount)
    const newTotal = r(
      Number(invoice.subtotal) +
        newTaxAmount +
        newShipping +
        newCustoms +
        newOtherCharges -
        Number(invoice.discount)
    )
    updatedInvoice = await db.purchaseInvoice.update({
      where: { id: invoice.id },
      data: {
        customs: newCustoms,
        shipping: newShipping,
        otherCharges: newOtherCharges,
        taxAmount: newTaxAmount,
        total: newTotal,
      },
    })
  } catch (e: any) {
    // Compensate: revert the annex to DRAFT so the system stays consistent.
    try {
      await db.customsAnnex.update({
        where: { id: annex.id },
        data: { status: "DRAFT" },
      })
    } catch {}
    return NextResponse.json(
      { error: e?.message ?? "invoice-update-failed" },
      { status: 500 }
    )
  }

  // ── 3. Create the journal entry (fire-and-forget, non-fatal) ──
  //    Debit  1100  Inventory                    totalAnnexCost
  //    Credit 1010|1020|2010  Cash/Bank/AP       totalAnnexCost
  //    The annex cost is CAPITALIZED into inventory (per the schema doc).
  try {
    await ensurePurchaseAccounts()
    const creditAccCode = paymentCreditAccountCode(invoice.paymentMethod)
    const creditLabel =
      invoice.paymentMethod === "CASH"
        ? "نقدية"
        : invoice.paymentMethod === "BANK"
        ? "بنك"
        : "ذمم دائنة (آجل)"
    await createJournalEntry({
      sourceType: "PURCHASE",
      sourceId: annex.id,
      description: `قيد ملحق تخليص جمركي ${annex.annexNo} — فاتورة ${invoice.invoiceNo}`,
      date: annex.arrivalDate ?? annex.annexDate,
      lines: [
        {
          accountCode: "1100",
          debit: r(annex.totalAnnexCost),
          description: `تخليص جمركي — ${annex.annexNo}`,
        },
        {
          accountCode: creditAccCode,
          credit: r(annex.totalAnnexCost),
          description: `${creditLabel} — ${annex.annexNo}`,
        },
      ],
    })
  } catch (e: any) {
    // Non-fatal: the annex is posted + invoice totals are updated, but the
    // accounting has a gap. Log for manual reconciliation.
    console.error(
      `[customs-annex] JournalEntry FAILED for ${annex.annexNo}. ` +
        `Annex is posted but accounting has a gap. Error: ${e?.message ?? e}`
    )
  }

  // ── 4. Audit log (non-fatal) ──
  try {
    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: "CUSTOMS_ANNEX_POSTED",
      description: `ترحيل ملحق تخليص ${annex.annexNo} — فاتورة ${invoice.invoiceNo} — ${annex.totalAnnexCost}`,
    })
  } catch (e: any) {
    console.error(
      `[customs-annex] AuditLog FAILED for ${annex.annexNo}: ${e?.message ?? e}`
    )
  }

  return NextResponse.json({ ok: true, annex: serializeAnnex(posted) })
}
