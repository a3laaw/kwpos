import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { createJournalEntry } from "@/lib/journal"
import { logAuditEvent } from "@/lib/audit"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

function r(v: number): number {
  return +Number(v).toFixed(3)
}

/** Auto-generate the next supplier-payment number: SPAY-0001, SPAY-0002, ... */
async function nextPaymentNo(): Promise<string> {
  const count = await db.supplierPayment.count()
  return `SPAY-${String(count + 1).padStart(4, "0")}`
}

function serializePayment(p: any) {
  return {
    id: String(p.id),
    paymentNo: String(p.paymentNo),
    supplierId: String(p.supplierId),
    supplierName: (p.supplier as any)?.name ?? "—",
    amount: Number(p.amount ?? 0),
    paymentDate: String(p.paymentDate),
    paymentMethod: (p.paymentMethod as string) ?? "CASH",
    referenceNo: (p.referenceNo as string | null) ?? null,
    note: (p.note as string | null) ?? null,
    journalEntryId: (p.journalEntryId as string | null) ?? null,
    createdByName: (p.createdBy as any)?.name ?? null,
    createdAt: String(p.createdAt),
  }
}

/**
 * GET /api/supplier-payments
 * List all supplier payments (newest first), with supplier + createdBy.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const supplierId = searchParams.get("supplierId") || undefined

  const where: any = {}
  if (supplierId) where.supplierId = supplierId

  const payments = await db.supplierPayment.findMany({
    where,
    include: { supplier: true, createdBy: true },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ items: payments.map(serializePayment) })
}

/**
 * POST /api/supplier-payments
 * Create a supplier payment (ADMIN/WAREHOUSE only). Generates a balanced
 * journal entry: debit 2010 (Accounts Payable) / credit 1010 (Cash) or
 * 1020 (Bank) depending on payment method.
 *
 * Body: { supplierId, amount, paymentDate?, paymentMethod, referenceNo?, note? }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["ADMIN", "WAREHOUSE" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({} as any))
  const { supplierId, amount, paymentDate, paymentMethod, referenceNo, note } = body || {}

  if (!supplierId) {
    return NextResponse.json({ error: "supplier-required" }, { status: 400 })
  }
  const amt = Number(amount)
  if (!Number.isFinite(amt) || amt <= 0) {
    return NextResponse.json({ error: "invalid-amount" }, { status: 400 })
  }
  const method = String(paymentMethod || "CASH").toUpperCase()
  if (!["CASH", "BANK", "CHECK"].includes(method)) {
    return NextResponse.json({ error: "invalid-payment-method" }, { status: 400 })
  }

  const supplier = await db.supplier.findUnique({ where: { id: supplierId } })
  if (!supplier) {
    return NextResponse.json({ error: "invalid-supplier" }, { status: 400 })
  }

  const paymentDateVal = paymentDate ? new Date(paymentDate) : new Date()
  if (Number.isNaN(paymentDateVal.getTime())) {
    return NextResponse.json({ error: "invalid-date" }, { status: 400 })
  }

  const finalPaymentNo = await nextPaymentNo()
  const amountRounded = r(amt)

  // Create the journal entry: debit 2010 (AP) / credit 1010 (Cash) or 1020 (Bank)
  // CHECK is treated as BANK for the credit account (bank-issued cheque).
  const creditAccount = method === "CASH" ? "1010" : "1020"
  const methodLabelAr = method === "CASH" ? "نقدية" : method === "BANK" ? "تحويل بنكي" : "شيك"

  // Wrap payment create + journal entry + journalEntryId update in a single
  // transaction so a JE failure rolls back the payment too.
  const result = await db.$transaction(async (tx) => {
    const created = await tx.supplierPayment.create({
      data: {
        paymentNo: finalPaymentNo,
        supplierId,
        amount: amountRounded,
        paymentDate: paymentDateVal,
        paymentMethod: method,
        referenceNo: referenceNo ? String(referenceNo).trim() : null,
        note: note ? String(note).trim() : null,
        createdById: user.id,
      },
      include: { supplier: true, createdBy: true },
    })

    let journalEntryId: string | null = null
    try {
      journalEntryId = await createJournalEntry({
        sourceType: "PURCHASE",
        sourceId: created.id,
        description: `سداد للمورد ${supplier.name} — ${finalPaymentNo} (${methodLabelAr})`,
        date: paymentDateVal,
        lines: [
          // Debit Accounts Payable (liability decreases)
          { accountCode: "2010", debit: amountRounded, description: `سداد ${finalPaymentNo} — ${supplier.name}` },
          // Credit Cash or Bank (asset decreases)
          { accountCode: creditAccount, credit: amountRounded, description: `${methodLabelAr} — ${finalPaymentNo}` },
        ],
        tx,
      })
    } catch (e: any) {
      throw new Error(`فشل تسجيل القيد المحاسبي / Journal entry failed: ${e?.message ?? e}`)
    }

    if (journalEntryId) {
      await tx.supplierPayment.update({
        where: { id: created.id },
        data: { journalEntryId },
      })
    }

    // ── Audit log (inside tx — atomic) ──
    await logAuditEvent({
      tx,
      userId: user.id,
      userName: user.name,
      action: "SUPPLIER_PAYMENT_CREATED",
      description: `سداد مورد ${finalPaymentNo}`,
    })

    return created.id
  }).catch((e: any) => ({ __error: e?.message || "supplier-payment-failed" }))

  if (result && (result as any).__error) {
    return NextResponse.json(
      { error: (result as any).__error as string },
      { status: 500 }
    )
  }

  const paymentId = result as string
  const finalPayment = await db.supplierPayment.findUnique({
    where: { id: paymentId },
    include: { supplier: true, createdBy: true },
  })

  return NextResponse.json(serializePayment(finalPayment), { status: 201 })
}
