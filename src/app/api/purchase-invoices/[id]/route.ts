import { requireUser, isErrorResponse } from "@/lib/auth-helpers"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/** Round to 3 decimals (matches the accounting convention). */
function r(v: number): number {
  return +Number(v).toFixed(3)
}

/** Serialize a PurchaseInvoice (with includes) into the API shape. */
function serializeInvoice(inv: any) {
  return {
    id: String(inv.id),
    invoiceNo: String(inv.invoiceNo),
    purchaseOrderId: (inv.purchaseOrderId as string | null) ?? null,
    supplierId: String(inv.supplierId),
    supplierName: (inv.supplier as any)?.name ?? "—",
    warehouseId: (inv.warehouseId as string | null) ?? null,
    warehouseName: (inv.warehouse as any)?.name ?? null,
    invoiceDate: String(inv.invoiceDate),
    status: (inv.status as string) ?? "DRAFT",
    subtotal: Number(inv.subtotal ?? 0),
    taxRate: Number(inv.taxRate ?? 0),
    taxAmount: Number(inv.taxAmount ?? 0),
    discount: Number(inv.discount ?? 0),
    shipping: Number(inv.shipping ?? 0),
    customs: Number(inv.customs ?? 0),
    otherCharges: Number(inv.otherCharges ?? 0),
    total: Number(inv.total ?? 0),
    note: (inv.note as string | null) ?? null,
    createdByName: (inv.createdBy as any)?.name ?? null,
    createdAt: String(inv.createdAt),
    items: ((inv.items as any[]) ?? []).map((it) => ({
      id: String(it.id),
      purchaseInvoiceId: String(it.purchaseInvoiceId),
      productId: String(it.productId),
      productName: (it.product as any)?.name ?? "—",
      purchaseOrderItemId: (it.purchaseOrderItemId as string | null) ?? null,
      quantity: Number(it.quantity ?? 0),
      receivedQty: Number(it.receivedQty ?? 0),
      unitCost: Number(it.unitCost ?? 0),
      subtotal: Number(it.subtotal ?? 0),
      landedCost: Number(it.landedCost ?? 0),
      note: (it.note as string | null) ?? null,
    })),
  }
}

const INCLUDE = {
  supplier: true,
  warehouse: true,
  items: { include: { product: true } },
  createdBy: true,
}

/** GET /api/purchase-invoices/[id] — single invoice with all includes. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser()
  if (isErrorResponse(user)) return user
  const { id } = await params
  const inv = await db.purchaseInvoice.findUnique({
    where: { id },
    include: INCLUDE,
  })
  if (!inv) return NextResponse.json({ error: "not-found" }, { status: 404 })
  return NextResponse.json(serializeInvoice(inv))
}

/**
 * PUT /api/purchase-invoices/[id] — update a DRAFT invoice (ADMIN only).
 * Cannot edit POSTED invoices. Returns 409 if the invoice is not a draft.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({} as any))
  const existing = await db.purchaseInvoice.findUnique({
    where: { id },
    include: { items: true },
  })
  if (!existing) return NextResponse.json({ error: "not-found" }, { status: 404 })
  if (existing.status !== "DRAFT") {
    return NextResponse.json({ error: "cannot-edit-posted" }, { status: 409 })
  }

  const {
    supplierId,
    warehouseId,
    purchaseOrderId,
    invoiceDate,
    taxRate,
    discount,
    shipping,
    customs,
    otherCharges,
    note,
    items,
  } = body || {}

  // Validate supplier if changing
  if (supplierId && supplierId !== existing.supplierId) {
    const sup = await db.supplier.findUnique({ where: { id: supplierId } })
    if (!sup) return NextResponse.json({ error: "invalid-supplier" }, { status: 400 })
  }

  // Validate warehouse if changing
  if (warehouseId) {
    const wh = await db.warehouse.findUnique({ where: { id: warehouseId } })
    if (!wh) return NextResponse.json({ error: "invalid-warehouse" }, { status: 400 })
  }

  // Validate linked PO if changing
  if (purchaseOrderId) {
    const po = await db.purchaseOrder.findUnique({ where: { id: purchaseOrderId } })
    if (!po) return NextResponse.json({ error: "invalid-po" }, { status: 400 })
  }

  // Recompute totals when items are replaced
  let itemsData: any[] | null = null
  let subtotal = existing.subtotal
  let taxAmount = existing.taxAmount
  let total = existing.total
  const taxRateNum =
    taxRate !== undefined ? Math.max(0, Number(taxRate) || 0) : existing.taxRate
  const discountNum =
    discount !== undefined ? Math.max(0, Number(discount) || 0) : existing.discount
  const shippingNum =
    shipping !== undefined ? Math.max(0, Number(shipping) || 0) : existing.shipping
  const customsNum =
    customs !== undefined ? Math.max(0, Number(customs) || 0) : existing.customs
  const otherNum =
    otherCharges !== undefined ? Math.max(0, Number(otherCharges) || 0) : existing.otherCharges

  if (Array.isArray(items)) {
    if (items.length === 0) {
      return NextResponse.json({ error: "items-required" }, { status: 400 })
    }
    const productIds = items.map((i: any) => i.productId)
    const products = await db.product.findMany({ where: { id: { in: productIds } } })
    if (products.length !== new Set(productIds).size) {
      return NextResponse.json({ error: "invalid-product" }, { status: 400 })
    }
    itemsData = items.map((i: any) => {
      const qty = Math.max(0, Math.round(Number(i.quantity) || 0))
      const unitCost = Math.max(0, Number(i.unitCost) || 0)
      return {
        productId: String(i.productId),
        purchaseOrderItemId: i.purchaseOrderItemId ? String(i.purchaseOrderItemId) : null,
        quantity: qty,
        unitCost,
        subtotal: r(qty * unitCost),
        note: i.note ? String(i.note) : null,
      }
    })
    subtotal = r(itemsData.reduce((a, b) => a + b.subtotal, 0))
    taxAmount = r(subtotal * taxRateNum / 100)
    total = r(subtotal + taxAmount + shippingNum + customsNum + otherNum - discountNum)
  } else {
    // No items change — recompute totals from existing items + new charges/tax
    subtotal = r(existing.items.reduce((a, b) => a + Number(b.subtotal ?? 0), 0))
    taxAmount = r(subtotal * taxRateNum / 100)
    total = r(subtotal + taxAmount + shippingNum + customsNum + otherNum - discountNum)
  }

  const invoiceDateVal = invoiceDate ? new Date(invoiceDate) : existing.invoiceDate

  const updated = await db.$transaction(async (tx) => {
    // Replace items when a new list is provided
    if (itemsData) {
      await tx.purchaseInvoiceItem.deleteMany({
        where: { purchaseInvoiceId: id },
      })
      await tx.purchaseInvoiceItem.createMany({
        data: itemsData.map((it) => ({
          purchaseInvoiceId: id,
          ...it,
        })),
      })
    }

    return tx.purchaseInvoice.update({
      where: { id },
      data: {
        ...(supplierId ? { supplierId } : {}),
        ...(warehouseId !== undefined ? { warehouseId: warehouseId || null } : {}),
        ...(purchaseOrderId !== undefined
          ? { purchaseOrderId: purchaseOrderId || null }
          : {}),
        invoiceDate: invoiceDateVal,
        taxRate: taxRateNum,
        discount: discountNum,
        shipping: shippingNum,
        customs: customsNum,
        otherCharges: otherNum,
        subtotal,
        taxAmount,
        total,
        ...(note !== undefined ? { note: note ? String(note).trim() : null } : {}),
      },
      include: INCLUDE,
    })
  })

  return NextResponse.json(serializeInvoice(updated))
}

/**
 * DELETE /api/purchase-invoices/[id] — delete a DRAFT invoice (ADMIN only).
 * Cannot delete POSTED invoices (returns 409).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await params
  const existing = await db.purchaseInvoice.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "not-found" }, { status: 404 })
  if (existing.status !== "DRAFT") {
    return NextResponse.json({ error: "cannot-delete-posted" }, { status: 409 })
  }

  await db.purchaseInvoice.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
