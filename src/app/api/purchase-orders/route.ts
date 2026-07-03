import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { serializePurchaseOrder } from "@/lib/serialize"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") || undefined

  const orders = await db.purchaseOrder.findMany({
    where: status ? { status } : undefined,
    include: {
      supplier: true,
      items: { include: { product: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ items: orders.map(serializePurchaseOrder) })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["ADMIN", "WAREHOUSE" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { supplierId, note, items } = body || {}
  if (!supplierId) return NextResponse.json({ error: "supplier-required" }, { status: 400 })
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items-required" }, { status: 400 })
  }

  // Validate products exist & build items
  const productIds = items.map((i: any) => i.productId)
  const products = await db.product.findMany({ where: { id: { in: productIds } } })
  if (products.length !== productIds.length) {
    return NextResponse.json({ error: "invalid-product" }, { status: 400 })
  }

  const itemsData = items.map((i: any) => {
    const qty = Number(i.quantity) || 0
    const unitCost = Number(i.unitCost) || 0
    return {
      productId: i.productId,
      quantity: qty,
      unitCost,
      subtotal: +(qty * unitCost).toFixed(2),
    }
  })
  const total = itemsData.reduce((a: number, b: any) => a + b.subtotal, 0)

  const created = await db.purchaseOrder.create({
    data: {
      supplierId,
      status: "PENDING",
      total: +total.toFixed(2),
      note: note?.trim() || null,
      items: { create: itemsData },
    },
    include: { supplier: true, items: { include: { product: true } } },
  })

  return NextResponse.json(serializePurchaseOrder(created as any), { status: 201 })
}
