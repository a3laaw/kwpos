import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, hasRole } from "@/lib/session"
import { serializeSale } from "@/lib/serialize"
import { resolveWarehouseId } from "@/lib/warehouse-resolver"
import type { Role } from "@/lib/types"

import { parseSaleInput } from "@/lib/sale/input"
import { resolveOrCreateCustomer } from "@/lib/sale/customer-resolver"
import { prefetchStockData, validateStockAvailability } from "@/lib/sale/stock-validator"
import { buildDecrementPlan } from "@/lib/sale/decrement-planner"
import { computeSaleTotals } from "@/lib/sale/totals"
import { executeSaleTransaction } from "@/lib/sale/transaction"
import { runPostSaleSideEffects } from "@/lib/sale/side-effects"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

/** GET /api/sales — list sales with pagination + search. */
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

/**
 * POST /api/sales — create a new sale.
 *
 * Orchestrator only — all business logic lives in @/lib/sale/*.
 * Flow:
 *   1. Authenticate + authorize
 *   2. Parse + validate input
 *   3. Resolve or create the customer
 *   4. Resolve the warehouse (user's → body → default)
 *   5. Prefetch stock data (parallel)
 *   6. Validate stock availability
 *   7. Build the multi-warehouse decrement plan
 *   8. Compute totals (pure function)
 *   9. Execute the transaction (stock decrement + sale create)
 *  10. Run post-transaction side effects (non-fatal)
 */
export async function POST(req: NextRequest) {
  // 1) Authenticate + authorize
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN", "MANAGER", "SALES", "CASHIER"] as Role[])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  // Defensive session check — the JWT may hold a stale user id after a re-seed
  const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { id: true } })
  if (!dbUser) return NextResponse.json({ error: "session-expired" }, { status: 401 })

  // 2) Parse + validate input
  const body = await req.json()
  const parsed = parseSaleInput(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status })
  }
  const input = parsed.input

  // 3) Resolve or create the customer
  const { customerId, resolvedName } = await resolveOrCreateCustomer({
    name: input.customerName,
    phone: input.customerPhone,
    address: input.customerAddress,
  })

  // 4) Resolve the warehouse
  const warehouseId = await resolveWarehouseId(user, input.warehouseId)
  if (!warehouseId) {
    return NextResponse.json({ error: "no-warehouse-available" }, { status: 400 })
  }

  // 5) Prefetch stock data (parallel — 3 queries)
  const stockData = await prefetchStockData(input.productIds)

  // 6) Validate stock availability
  const validation = validateStockAvailability(stockData, input.qtyByProduct)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: validation.status })
  }

  // 7) Build the multi-warehouse decrement plan
  const decrementPlan = buildDecrementPlan(input.qtyByProduct, stockData, warehouseId)

  // 8) Compute totals (pure function, no DB)
  const totals = computeSaleTotals(input.items, stockData.products, input)

  // 9) Execute the transaction
  const result = await executeSaleTransaction({
    decrementPlan,
    itemsData: totals.itemsData,
    totals,
    userId: user.id,
    warehouseId,
    customerId,
    customerPhone: input.customerPhone,
    resolvedName,
    cartTax: input.cartTax,
    paymentMethod: input.paymentMethod,
    discount: input.discount,
    deliveryFee: input.deliveryFee,
    driverName: input.driverName,
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  // 10) Run post-transaction side effects (non-fatal, fire-and-forget).
  // We do NOT await these — the response is returned immediately so the
  // user sees "sale completed" fast. Vercel serverless keeps the function
  // alive briefly after the response to finish background work.
  runPostSaleSideEffects({
    sale: result.sale,
    qtyByProduct: input.qtyByProduct,
    totals,
    userId: user.id,
    userName: user.name,
    customerId,
    resolvedName,
    paymentMethod: input.paymentMethod,
  }).catch(() => {/* errors are already logged inside */})

  return NextResponse.json(serializeSale(result.sale), { status: 201 })
}
