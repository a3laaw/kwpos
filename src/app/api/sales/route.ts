import { NextRequest, NextResponse } from "next/server"
import { db, decrementStockItem, updateProductQuantityFromStockItems, getDefaultWarehouseId } from "@/lib/db"
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

  // Validate product availability atomically & decrement stock
  const result = await db.$transaction(async (tx) => {
    // Determine the next invoice sequence
    const count = await tx.sale.count()
    const invoiceNo = makeInvoiceNo(count + 1)

    // Resolve warehouseId (fallback to default)
    let warehouseId = (body as any).warehouseId as string | undefined
    if (!warehouseId) {
      warehouseId = (await getDefaultWarehouseId(tx)) || undefined
    }
    if (!warehouseId) {
      throw new Error("no-warehouse-available")
    }

    // ── Pre-fetch ALL products in ONE query (instead of N queries in the loop) ──
    const productIds = items
      .map((it: any) => String(it.productId))
      .filter(Boolean)
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
    })
    const productMap = new Map(products.map((p) => [p.id, p]))

    // ── Pre-fetch ALL frozen products in ONE query (instead of N queries) ──
    const frozenItems = await tx.stockTakeItem.findMany({
      where: {
        productId: { in: productIds },
        stockTake: { status: "DRAFT" },
      },
      select: { productId: true },
    })
    const frozenProductIds = new Set(frozenItems.map((f) => f.productId))

    // ── Pre-fetch ALL StockItems for the cart products in ONE query ──
    // Instead of N findUnique queries inside the loop.
    const stockItems = await tx.stockItem.findMany({
      where: {
        productId: { in: productIds },
        warehouseId,
      },
    })
    const stockItemMap = new Map(stockItems.map((s) => [s.productId, s]))

    // Aggregate quantities per product (in case the same product appears
    // multiple times in the cart, e.g. two lines of the same perfume).
    const qtyByProduct = new Map<string, number>()
    for (const it of items) {
      const pid = String(it.productId)
      const qty = Number(it.quantity)
      if (!pid || qty <= 0) continue
      qtyByProduct.set(pid, (qtyByProduct.get(pid) || 0) + qty)
    }

    // Validate stock availability for all products BEFORE decrementing.
    // This avoids partial decrements if one product is insufficient.
    for (const [pid, totalQty] of qtyByProduct) {
      const product = productMap.get(pid)
      if (!product) throw new Error("product-not-found:" + pid)
      if (frozenProductIds.has(pid)) {
        throw new Error(`stock-frozen:${product.name}`)
      }
      const si = stockItemMap.get(pid)
      if (!si || si.quantity < totalQty) {
        throw new Error(`stock-insufficient:${product.name}:warehouse:${warehouseId}`)
      }
    }

    // ── Decrement ALL StockItems in ONE batch query ──
    // Prisma doesn't support bulk updateMany with different values per row,
    // but we can use a single updateMany with a computed WHERE clause.
    // For simplicity + correctness, we do one update per unique product
    // (same as before but only for UNIQUE product IDs, not per cart line).
    for (const [pid, totalQty] of qtyByProduct) {
      await tx.stockItem.update({
        where: { productId_warehouseId: { productId: pid, warehouseId } },
        data: { quantity: { decrement: totalQty } },
      })
    }

    // ── Recompute Product.quantity for ALL affected products ──
    // One aggregate per product (no way to batch this in Prisma), but only
    // for UNIQUE product IDs.
    for (const pid of qtyByProduct.keys()) {
      const agg = await tx.stockItem.aggregate({
        where: { productId: pid },
        _sum: { quantity: true },
      })
      await tx.product.update({
        where: { id: pid },
        data: { quantity: agg._sum.quantity ?? 0 },
      })
    }

    // Build itemsData for the sale record (one line per cart item, even if
    // the same product appears multiple times).
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
        throw new Error("invalid-item")
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
    // Use per-product tax if any product has a non-zero rate; otherwise
    // fall back to cart-level rate for backward compatibility.
    const taxAmount = totalTaxFromProducts > 0
      ? totalTaxFromProducts
      : +(afterDiscount * (CART_TAX / 100)).toFixed(3)
    // Delivery fee is added AFTER tax (it's a service charge, not taxable).
    const total = +(afterDiscount + taxAmount + DELIVERY_FEE).toFixed(3)

    // Product.quantity was already synced above (batch aggregate per product).

    const sale = await tx.sale.create({
      data: {
        invoiceNo,
        customerName: resolvedName,
        customerPhone: phone || null,
        customerId: customerId || null,
        subtotal: +subtotal.toFixed(3),
        taxRate: totalTaxFromProducts > 0 ? 0 : CART_TAX, // 0 when per-product
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

    // ── Generate the double-entry journal for this sale ──
    // Debit: Cash/Bank (total)
    // Credit: Sales Revenue (afterDiscount)
    // Credit: Tax Payable (taxAmount) — only if tax > 0
    // (Discount is netted against revenue; COGS is recognized separately.)
    //
    // NOTE: Journal entry, audit log, and loyalty points are run AFTER the
    // transaction commits (not inside tx) to keep the transaction fast.
    // They are non-fatal — if they fail, the sale still succeeds.
    return { sale, total, afterDiscount, taxAmount }
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

  const { sale, total, afterDiscount, taxAmount } = result as any

  // ── Post-transaction operations (non-fatal) ──
  // These run AFTER the sale is committed. If they fail, the sale still
  // succeeds — we just log a warning. This keeps the transaction fast.

  // 1. Journal entry (double-entry accounting)
  const revenueLines: any[] = [
    { accountCode: paymentAccCode, debit: total, description: `تحصيل فاتورة ${sale.invoiceNo}` },
    { accountCode: "4010", credit: (total - taxAmount), description: "إيراد مبيعات" },
  ]
  if (taxAmount > 0) {
    revenueLines.push({ accountCode: "2010", credit: taxAmount, description: "ضريبة مستحقة" })
  }
  try {
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

  // 2. Audit log
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

  // 3. Loyalty points (1 point per currency unit, only if customer linked)
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
