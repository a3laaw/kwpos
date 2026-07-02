import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { serializeSale } from "@/lib/serialize"
import { makeInvoiceNo } from "@/lib/format"
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

  const body = await req.json()
  const { customerName, items, taxRate, discount, paymentMethod } = body || {}

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items-required" }, { status: 400 })
  }

  const TAX = Number(taxRate) || 0
  const DISCOUNT = Math.max(0, Number(discount) || 0)

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
      const lineSubtotal = +(qty * unitPrice).toFixed(2)
      subtotal += lineSubtotal
      itemsData.push({ productId, quantity: qty, unitPrice, subtotal: lineSubtotal })
    }

    const afterDiscount = Math.max(0, subtotal - DISCOUNT)
    const taxAmount = +(afterDiscount * (TAX / 100)).toFixed(2)
    const total = +(afterDiscount + taxAmount).toFixed(2)

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
        customerName: customerName?.trim() || null,
        subtotal: +subtotal.toFixed(2),
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

    return sale
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

  return NextResponse.json(serializeSale(result as any), { status: 201 })
}
