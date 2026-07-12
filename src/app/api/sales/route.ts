import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { serializeSale } from "@/lib/serialize"
import { makeInvoiceNo } from "@/lib/format"
import { createJournalEntry } from "@/lib/journal"
import { logAuditEvent } from "@/lib/audit"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim() || ""
  const page = Math.max(1, Number(searchParams.get("page")) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 10))

  const where: any = {}
  if (q) {
    where.OR = [
      { invoiceNo: { contains: q, mode: 'insensitive' as const } },
      { customerName: { contains: q, mode: 'insensitive' as const } },
    ]
  }

  const [total, sales] = await Promise.all([
    db.sale.count({ where }),
    db.sale.findMany({
      where,
      include: { user: true, items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return NextResponse.json({
    items: sales.map(serializeSale),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  // Sales can be created by anyone who has the "sales" view:
  // OWNER, ADMIN, MANAGER, SALES, CASHIER. (WAREHOUSE and ACCOUNTANT
  // don't have the POS view.)
  if (!hasRole(user.role, ["OWNER", "ADMIN", "MANAGER", "SALES", "CASHIER"] as Role[])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  // Verify the session user still exists in the DB (the session JWT may hold
  // a stale user id after a re-seed). If not, tell the client to re-login.
  const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { id: true } })
  if (!dbUser) {
    return NextResponse.json({ error: "session-expired" }, { status: 401 })
  }

  const body = await req.json()
  const { customerName, customerPhone, customerAddress, items, taxRate, discount, paymentMethod, deliveryFee, driverName } = body || {}

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items-required" }, { status: 400 })
  }

  // Cart-level taxRate is now optional — per-product taxRate takes priority.
  // If cart-level taxRate is provided AND products don't have their own rate,
  // fall back to the cart-level rate for backward compatibility.
  const CART_TAX = Number(taxRate) || 0
  const DISCOUNT = Math.max(0, Number(discount) || 0)
  // Delivery fee (>= 0). A fee > 0 marks the sale as a delivery order.
  const DELIVERY_FEE = Math.max(0, Number(deliveryFee) || 0)
  const DRIVER_NAME = driverName?.trim() || null

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
      // Update address if provided and customer doesn't have one
      if (customerAddress?.trim() && !existing.address) {
        await db.customer.update({ where: { id: existing.id }, data: { address: customerAddress.trim() } })
      }
    } else {
      const created = await db.customer.create({
        data: {
          name: resolvedName || "عميل نقدي",
          phone,
          address: customerAddress?.trim() || "",
        },
      })
      customerId = created.id
    }
  }

  // Resolve the payment asset account (Cash for CASH, Bank for CARD/TRANSFER)
  const paymentAccCode = paymentMethod === "CASH" ? "1010" : "1020"

  // ── PRE-VALIDATION (outside transaction — fast, no locks) ──
  // Pre-fetch all products, frozen items, stock items, and warehouse in
  // parallel BEFORE starting the transaction. This keeps the transaction
  // minimal (only stock decrement + sale create = N+2 queries).
  const productIds = items
    .map((it: any) => String(it.productId))
    .filter(Boolean)

  if (productIds.length === 0) {
    return NextResponse.json({ error: "items-required" }, { status: 400 })
  }

  const [products, frozenItems, stockItems, defaultWh] = await Promise.all([
    db.product.findMany({ where: { id: { in: productIds } } }),
    db.stockTakeItem.findMany({
      where: { productId: { in: productIds }, stockTake: { status: "DRAFT" } },
      select: { productId: true },
    }),
    db.stockItem.findMany({ where: { productId: { in: productIds } } }),
    (body as any).warehouseId
      ? db.warehouse.findUnique({ where: { id: (body as any).warehouseId }, select: { id: true } })
      : db.warehouse.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" }, select: { id: true } }),
  ])

  const warehouseId = defaultWh?.id
  if (!warehouseId) {
    return NextResponse.json({ error: "no-warehouse-available" }, { status: 400 })
  }

  const productMap = new Map(products.map((p) => [p.id, p]))
  const frozenProductIds = new Set(frozenItems.map((f) => f.productId))
  // Stock items for THIS warehouse only
  const stockItemMap = new Map(
    stockItems.filter((s) => s.warehouseId === warehouseId).map((s) => [s.productId, s])
  )

  // Aggregate quantities per unique product (in case the same product
  // appears multiple times in the cart)
  const qtyByProduct = new Map<string, number>()
  for (const it of items) {
    const pid = String(it.productId)
    const qty = Number(it.quantity)
    if (!pid || qty <= 0) continue
    qtyByProduct.set(pid, (qtyByProduct.get(pid) || 0) + qty)
  }

  // Validate stock availability (outside transaction — fast)
  for (const [pid, totalQty] of qtyByProduct) {
    const product = productMap.get(pid)
    if (!product) {
      return NextResponse.json({ error: "product-not-found:" + pid }, { status: 400 })
    }
    if (frozenProductIds.has(pid)) {
      return NextResponse.json({ error: `stock-frozen:${product.name}` }, { status: 400 })
    }
    const si = stockItemMap.get(pid)
    if (!si || si.quantity < totalQty) {
      return NextResponse.json(
        { error: `stock-insufficient:${product.name}:warehouse:${warehouseId}` },
        { status: 400 }
      )
    }
  }

  // Compute totals (outside transaction — pure math, no DB)
  const itemsData: Array<{
    productId: string
    quantity: number
    unitPrice: number
    subtotal: number
    lineTaxRate: number
  }> = []
  let subtotal = 0
  let totalTaxFromProducts = 0
  for (const it of items) {
    const productId = String(it.productId)
    const qty = Number(it.quantity)
    const unitPrice = Number(it.unitPrice)
    if (!productId || qty <= 0 || unitPrice < 0) {
      return NextResponse.json({ error: "invalid-item" }, { status: 400 })
    }
    const product = productMap.get(productId)!
    const lineSubtotal = +(qty * unitPrice).toFixed(3)
    const lineTaxRate = Number((product as any).taxRate ?? CART_TAX)
    const lineTax = +(lineSubtotal * (lineTaxRate / 100)).toFixed(3)
    subtotal += lineSubtotal
    totalTaxFromProducts += lineTax
    itemsData.push({ productId, quantity: qty, unitPrice, subtotal: lineSubtotal, lineTaxRate })
  }
  const afterDiscount = Math.max(0, subtotal - DISCOUNT)
  const taxAmount = totalTaxFromProducts > 0
    ? totalTaxFromProducts
    : +(afterDiscount * (CART_TAX / 100)).toFixed(3)
  const total = +(afterDiscount + taxAmount + DELIVERY_FEE).toFixed(3)

  // ── CORE TRANSACTION (minimal: stock decrement + sale create only) ──
  // This is the ONLY code inside the transaction. It does:
  //   1. Generate invoice number (1 query: sale.count)
  //   2. Decrement StockItem for each unique product (N queries)
  //   3. Create the Sale + SaleItems (1 query, nested)
  // Total: N+2 queries (e.g. 5 products = 7 queries) — well within 10s.
  // NO aggregate, NO product.quantity sync, NO journal, NO audit — those
  // run AFTER the transaction commits.
  const result = await db.$transaction(async (tx) => {
    const count = await tx.sale.count()
    const invoiceNo = makeInvoiceNo(count + 1)

    // Decrement StockItem for each unique product
    for (const [pid, totalQty] of qtyByProduct) {
      await tx.stockItem.update({
        where: { productId_warehouseId: { productId: pid, warehouseId } },
        data: { quantity: { decrement: totalQty } },
      })
    }

    // Create the sale + items in ONE query (nested create)
    const sale = await tx.sale.create({
      data: {
        invoiceNo,
        customerName: resolvedName,
        customerPhone: phone || null,
        customerId: customerId || null,
        subtotal: +subtotal.toFixed(3),
        taxRate: totalTaxFromProducts > 0 ? 0 : CART_TAX,
        taxAmount,
        discount: DISCOUNT,
        deliveryFee: DELIVERY_FEE,
        driverName: DRIVER_NAME,
        total,
        paid: total,
        paymentMethod: (["CASH", "CARD", "TRANSFER"].includes(paymentMethod)
          ? paymentMethod
          : "CASH") as "CASH" | "CARD" | "TRANSFER",
        userId: user.id,
        items: { create: itemsData.map(({ lineTaxRate, ...rest }) => rest) },
      },
      include: { user: true, items: { include: { product: true } } },
    })

    return { sale }
  }, {
    timeout: 10000,
    maxWait: 5000,
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

  const { sale } = result as any

  // ── POST-TRANSACTION: Product.quantity sync (non-fatal) ──
  // Recompute Product.quantity as SUM(StockItem.quantity) for each affected
  // product. Runs OUTSIDE the transaction to keep it fast.
  try {
    for (const pid of qtyByProduct.keys()) {
      const agg = await db.stockItem.aggregate({
        where: { productId: pid },
        _sum: { quantity: true },
      })
      await db.product.update({
        where: { id: pid },
        data: { quantity: agg._sum.quantity ?? 0 },
      })
    }
  } catch (e: any) {
    console.warn(`[sales] Product.quantity sync failed for ${sale.invoiceNo}: ${e?.message ?? e}`)
  }

  // ── POST-TRANSACTION: Journal entry (non-fatal) ──
  try {
    const revenueLines: any[] = [
      { accountCode: paymentAccCode, debit: total, description: `تحصيل فاتورة ${sale.invoiceNo}` },
      { accountCode: "4010", credit: (total - taxAmount), description: "إيراد مبيعات" },
    ]
    if (taxAmount > 0) {
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
    console.warn(`[sales] Journal entry failed for ${sale.invoiceNo}: ${e?.message ?? e}`)
  }

  // ── POST-TRANSACTION: Audit log (non-fatal) ──
  try {
    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: "SALE_CREATED",
      description: `فاتورة مبيعات ${sale.invoiceNo}`,
      saleId: sale.id,
    })
  } catch (e: any) {
    console.warn(`[sales] Audit log failed for ${sale.invoiceNo}: ${e?.message ?? e}`)
  }

  // ── POST-TRANSACTION: Loyalty points (non-fatal) ──
  if (customerId) {
    try {
      const pointsEarned = Math.floor(afterDiscount)
      if (pointsEarned > 0) {
        const cust = await db.customer.findUnique({
          where: { id: customerId },
          select: { loyaltyPoints: true, loyaltyTier: true },
        })
        if (cust) {
          const newPoints = cust.loyaltyPoints + pointsEarned
          let newTier: string | null = cust.loyaltyTier
          if (newPoints >= 10000) newTier = "GOLD"
          else if (newPoints >= 5000) newTier = "SILVER"
          else if (newPoints >= 1000) newTier = "BRONZE"
          await db.customer.update({
            where: { id: customerId },
            data: {
              loyaltyPoints: { increment: pointsEarned },
              loyaltyTier: newTier,
            },
          })
        }
      }
    } catch (e: any) {
      console.warn(`[sales] Loyalty points failed for ${sale.invoiceNo}: ${e?.message ?? e}`)
    }
  }

  return NextResponse.json(serializeSale(sale as any), { status: 201 })
}
