import { requireUser, isErrorResponse } from "@/lib/auth-helpers"
import { NextRequest, NextResponse } from "next/server"
import { db, updateProductQuantityFromStockItems } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { logAuditEvent } from "@/lib/audit"
import { ensurePurchaseAccounts, createPurchaseInvoiceJournalEntry } from "@/lib/purchase"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/** Round to 3 decimals (matches the accounting convention). */
function r(v: number): number {
  return +Number(v).toFixed(3)
}

/** Auto-generate the next purchase-invoice number: PINV-0001, PINV-0002, ... */
async function nextInvoiceNo(): Promise<string> {
  const count = await db.purchaseInvoice.count()
  return `PINV-${String(count + 1).padStart(4, "0")}`
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

/**
 * GET /api/purchase-invoices
 * List all purchase invoices (newest first), with supplier + warehouse + items.product.
 */
export async function GET() {
  const user = await requireUser()
  if (isErrorResponse(user)) return user
  const invoices = await db.purchaseInvoice.findMany({
    include: {
      supplier: true,
      warehouse: true,
      items: { include: { product: true } },
      createdBy: true,
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ items: invoices.map(serializeInvoice) })
}

/**
 * POST /api/purchase-invoices
 * Create a purchase invoice (ADMIN/WAREHOUSE only).
 *
 * Body:
 *   {
 *     invoiceNo?, supplierId, warehouseId?, purchaseOrderId?, invoiceDate?,
 *     taxRate?, discount?, shipping?, customs?, otherCharges?, note?,
 *     items: [{ productId, quantity, unitCost, purchaseOrderItemId? }],
 *     post?: boolean   // default false → DRAFT
 *   }
 *
 * - Auto-generates invoiceNo (PINV-NNNN) when not provided.
 * - Calculates subtotal/taxAmount/total.
 * - When post: true → status POSTED + bump stock + (if linked PO) mark PO RECEIVED
 *   + create journal entry (debit Inventory 1010 / credit Accounts Payable 2010).
 * - When post: false → status DRAFT (no stock/journal changes).
 *
 * The whole operation runs in a db.$transaction for atomicity.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN", "WAREHOUSE" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({} as any))
  const {
    invoiceNo,
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
    post,
    paymentMethod,
  } = body || {}

  // Normalize payment method — default CASH per the owner's decision
  const normalizedPaymentMethod =
    paymentMethod === "BANK" ? "BANK"
    : paymentMethod === "CREDIT" ? "CREDIT"
    : "CASH"

  if (!supplierId) {
    return NextResponse.json({ error: "supplier-required" }, { status: 400 })
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items-required" }, { status: 400 })
  }

  // Validate supplier
  const supplier = await db.supplier.findUnique({ where: { id: supplierId } })
  if (!supplier) {
    return NextResponse.json({ error: "invalid-supplier" }, { status: 400 })
  }

  // Validate warehouse (if provided)
  if (warehouseId) {
    const wh = await db.warehouse.findUnique({ where: { id: warehouseId } })
    if (!wh) return NextResponse.json({ error: "invalid-warehouse" }, { status: 400 })
  }

  // Validate linked PO (if provided)
  let po: any = null
  if (purchaseOrderId) {
    po = await db.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { items: true },
    })
    if (!po) return NextResponse.json({ error: "invalid-po" }, { status: 400 })
  }

  // Validate products + build items data
  const productIds = items.map((i: any) => i.productId)
  const products = await db.product.findMany({ where: { id: { in: productIds } } })
  if (products.length !== new Set(productIds).size) {
    return NextResponse.json({ error: "invalid-product" }, { status: 400 })
  }

  const itemsData = items.map((i: any) => {
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

  const subtotal = r(itemsData.reduce((a, b) => a + b.subtotal, 0))
  const taxRateNum = Math.max(0, Number(taxRate) || 0)
  const taxAmount = r(subtotal * taxRateNum / 100)
  const discountNum = Math.max(0, Number(discount) || 0)
  const shippingNum = Math.max(0, Number(shipping) || 0)
  const customsNum = Math.max(0, Number(customs) || 0)
  const otherNum = Math.max(0, Number(otherCharges) || 0)
  const total = r(
    subtotal + taxAmount + shippingNum + customsNum + otherNum - discountNum
  )

  const wantPost = Boolean(post)
  const finalInvoiceNo = invoiceNo ? String(invoiceNo).trim() : await nextInvoiceNo()
  const finalStatus = wantPost ? "POSTED" : "DRAFT"
  const invoiceDateVal = invoiceDate ? new Date(invoiceDate) : new Date()
  if (Number.isNaN(invoiceDateVal.getTime())) {
    return NextResponse.json({ error: "invalid-date" }, { status: 400 })
  }

  const created = await db.$transaction(async (tx) => {
    const inv = await tx.purchaseInvoice.create({
      data: {
        invoiceNo: finalInvoiceNo,
        purchaseOrderId: purchaseOrderId || null,
        supplierId,
        warehouseId: warehouseId || null,
        invoiceDate: invoiceDateVal,
        status: finalStatus,
        subtotal,
        taxRate: taxRateNum,
        taxAmount,
        discount: discountNum,
        shipping: shippingNum,
        customs: customsNum,
        otherCharges: otherNum,
        total,
        paymentMethod: normalizedPaymentMethod,
        note: note ? String(note).trim() : null,
        createdById: user.id,
        items: { create: itemsData },
      },
      include: {
        supplier: true,
        warehouse: true,
        items: { include: { product: true } },
        createdBy: true,
      },
    })

    let journalEntryId: string | null = null
    if (wantPost) {
      // Bump stock per item: StockItem.quantity (create if missing) +
      // recompute Product.quantity from StockItems (derived aggregate).
      for (const it of itemsData) {
        if (warehouseId) {
          // Upsert the StockItem for (product, warehouse)
          await tx.stockItem.upsert({
            where: {
              productId_warehouseId: {
                productId: it.productId,
                warehouseId,
              },
            },
            update: { quantity: { increment: it.quantity } },
            create: {
              productId: it.productId,
              warehouseId,
              quantity: it.quantity,
            },
          })
        }
        // Sync the product's cost price from the invoice line.
        if (typeof it.unitCost === "number" && it.unitCost >= 0) {
          await tx.product.update({
            where: { id: it.productId },
            data: { costPrice: it.unitCost },
          })
        }
        // Product.quantity sync is deferred to post-commit (see below).
      }

      // If linked PO: mark RECEIVED
      if (po) {
        await tx.purchaseOrder.update({
          where: { id: po.id },
          data: { status: "RECEIVED" },
        })
      }

      // NOTE: Journal entry + AuditLog are now post-commit (see below).
      // This keeps the transaction short (stock + invoice only) to avoid
      // PgBouncer "Transaction not found" errors on Supabase.

      // ── Audit log (inside tx — atomic) ──
      await logAuditEvent({
        tx,
        userId: user.id,
        userName: user.name,
        action: "PURCHASE_INVOICE_POSTED",
        description: `فاتورة مشتريات ${inv.invoiceNo}`,
      })
    }

    return inv
  }, {
    timeout: 15000,
    maxWait: 5000,
  }).catch((e: any) => ({ __error: e?.message || "purchase-invoice-failed" }))

  // ── Post-commit side effects (non-fatal) ────────────────────────────
  if (wantPost && created && !(created as any).__error) {
    const inv = created as any

    // Sync Product.quantity (derived aggregate)
    try {
      const pids = Array.from(new Set(itemsData.map((it: any) => it.productId)))
      for (const pid of pids) {
        await updateProductQuantityFromStockItems(db, pid)
      }
    } catch {
      // Non-fatal: invoice is committed, StockItem is correct.
    }

    // Create journal entry (capital-based: fees → inventory value, tax → 2110)
    try {
      await ensurePurchaseAccounts()
      await createPurchaseInvoiceJournalEntry({
        invoiceNo: inv.invoiceNo,
        invoiceId: inv.id,
        supplierName: supplier.name,
        subtotal,
        taxAmount,
        discount: discountNum,
        shipping: shippingNum,
        customs: customsNum,
        otherCharges: otherNum,
        total,
        paymentMethod: normalizedPaymentMethod,
        date: invoiceDateVal,
      })
    } catch (e: any) {
      console.error(
        `[purchase-invoice] JournalEntry FAILED for ${inv.invoiceNo}. ` +
        `Invoice is committed but accounting has a gap. Error: ${e?.message ?? e}`
      )
    }
  }

  if (created && (created as any).__error) {
    const msg = (created as any).__error as string
    const isClientError =
      msg.startsWith("invalid-") ||
      msg.startsWith("items-required") ||
      msg.startsWith("supplier-required")
    return NextResponse.json({ error: msg }, { status: isClientError ? 400 : 500 })
  }

  // Re-fetch with the journal entry id attached.
  const finalInv = await db.purchaseInvoice.findUnique({
    where: { id: (created as any).id },
    include: {
      supplier: true,
      warehouse: true,
      items: { include: { product: true } },
      createdBy: true,
    },
  })

  return NextResponse.json(serializeInvoice(finalInv), { status: 201 })
}
