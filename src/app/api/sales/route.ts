import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { serializeSale } from "@/lib/serialize"
import { makeInvoiceNo } from "@/lib/format"
import { createJournalEntry } from "@/lib/journal"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim() || ""

  const where: any = {}
  if (q) {
    where.OR = [
      { invoiceNo: { contains: q } },
      { customerName: { contains: q } },
    ]
  }

  const sales = await db.sale.findMany({
    where,
    include: { user: true, items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  return NextResponse.json({ items: sales.map(serializeSale) })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  // Admin & Sales can create sales; Warehouse cannot
  if (!hasRole(user.role, ["ADMIN", "SALES" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  // Verify the session user still exists in the DB (the session JWT may hold
  // a stale user id after a re-seed). If not, tell the client to re-login.
  const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { id: true } })
  if (!dbUser) {
    return NextResponse.json({ error: "session-expired" }, { status: 401 })
  }

  const body = await req.json()
  const { customerName, customerPhone, items, taxRate, discount, paymentMethod } = body || {}

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items-required" }, { status: 400 })
  }

  const TAX = Number(taxRate) || 0
  const DISCOUNT = Math.max(0, Number(discount) || 0)

  // ── Link/register customer by phone (POS cash customer) ──
  // If a phone number is provided, look up an existing customer by phone;
  // otherwise create a new customer record so the sale is linked to the CRM.
  let customerId: string | undefined
  let resolvedName: string | null = customerName?.trim() || null
  const phone = customerPhone?.trim() || ""
  if (phone) {
    const existing = await db.customer.findFirst({ where: { phone } })
    if (existing) {
      customerId = existing.id
      if (!resolvedName) resolvedName = existing.name
    } else {
      const created = await db.customer.create({
        data: {
          name: resolvedName || "عميل نقدي",
          phone,
          address: "",
        },
      })
      customerId = created.id
    }
  }

  // Resolve the payment asset account (Cash for CASH, Bank for CARD/TRANSFER)
  const paymentAccCode = paymentMethod === "CASH" ? "1010" : "1020"

  // Validate product availability atomically & decrement stock
  const result = await db.$transaction(async (tx) => {
    // Determine the next invoice sequence
    const count = await tx.sale.count()
    const invoiceNo = makeInvoiceNo(count + 1)

    // Lock & validate each product
    const itemsData: Array<{
      productId: string
      quantity: number
      unitPrice: number
      subtotal: number
    }> = []
    let subtotal = 0

    for (const it of items) {
      const productId = String(it.productId)
      const qty = Number(it.quantity)
      const unitPrice = Number(it.unitPrice)
      if (!productId || qty <= 0 || unitPrice < 0) {
        throw new Error("invalid-item")
      }
      const product = await tx.product.findUnique({ where: { id: productId } })
      if (!product) throw new Error("product-not-found:" + productId)
      if (product.quantity < qty) {
        throw new Error(`stock-insufficient:${product.name}:${product.quantity}`)
      }
      const lineSubtotal = +(qty * unitPrice).toFixed(3)
      subtotal += lineSubtotal
      itemsData.push({ productId, quantity: qty, unitPrice, subtotal: lineSubtotal })
    }

    const afterDiscount = Math.max(0, subtotal - DISCOUNT)
    const taxAmount = +(afterDiscount * (TAX / 100)).toFixed(3)
    const total = +(afterDiscount + taxAmount).toFixed(3)

    // Decrement inventory for each item
    for (const it of itemsData) {
      await tx.product.update({
        where: { id: it.productId },
        data: { quantity: { decrement: it.quantity } },
      })
    }

    const sale = await tx.sale.create({
      data: {
        invoiceNo,
        customerName: resolvedName,
        customerPhone: phone || null,
        customerId: customerId || null,
        subtotal: +subtotal.toFixed(3),
        taxRate: TAX,
        taxAmount,
        discount: DISCOUNT,
        total,
        paid: total,
        paymentMethod: (["CASH", "CARD", "TRANSFER"].includes(paymentMethod)
          ? paymentMethod
          : "CASH") as "CASH" | "CARD" | "TRANSFER",
        userId: user.id,
        items: { create: itemsData },
      },
      include: { user: true, items: { include: { product: true } } },
    })

    return { sale, total, afterDiscount, taxAmount }
  }).catch((e: any) => {
    return { __error: e?.message || "sale-failed" }
  })

  if (result && (result as any).__error) {
    const msg = (result as any).__error as string
    const status = msg.startsWith("stock-insufficient") || msg.startsWith("product-not-found") || msg.startsWith("invalid-item")
      ? 400
      : 500
    return NextResponse.json({ error: msg }, { status })
  }

  const { sale, total, taxAmount } = result as any

  // ── Generate the double-entry journal for this sale ──
  // Debit: Cash/Bank (total)
  // Credit: Sales Revenue (afterDiscount)
  // Credit: Tax Payable (taxAmount) — only if tax > 0
  // (Discount is netted against revenue; COGS is recognized separately.)
  try {
    const revenueLines: any[] = [
      { accountCode: paymentAccCode, debit: total, description: `تحصيل فاتورة ${sale.invoiceNo}` },
      { accountCode: "4010", credit: (total - taxAmount), description: "إيراد مبيعات" },
    ]
    if (taxAmount > 0) {
      // Use accounts payable (2010) as a simple tax-collected account
      revenueLines.push({ accountCode: "2010", credit: taxAmount, description: "ضريبة مستحقة" })
    }
    await createJournalEntry({
      sourceType: "SALE",
      sourceId: sale.id,
      description: `قيد فاتورة مبيعات ${sale.invoiceNo}${resolvedName ? ` — ${resolvedName}` : ""}`,
      date: new Date(),
      lines: revenueLines,
    })
  } catch (e: any) {
    // Journal failure shouldn't fail the sale, but log it
    console.error("[sales] journal entry failed:", e?.message)
  }

  return NextResponse.json(serializeSale(sale as any), { status: 201 })
}
