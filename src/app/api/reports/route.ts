import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

/**
 * Unified, filterable reports endpoint.
 * Filters: from, to, productId, categoryId, paymentMethod, source (POS|SHOPIFY)
 * Returns: summary KPIs + grouped breakdown (by day, by product, by category)
 *
 * Performance: uses DB-side aggregates/groupBy instead of fetching all sales
 * and reducing in JS. Removed dead saleItems query and `include: { user: true }`
 * (which leaked passwordHash).
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const productId = searchParams.get("productId") || undefined
  const categoryId = searchParams.get("categoryId") || undefined
  const paymentMethod = searchParams.get("paymentMethod") || undefined
  const source = searchParams.get("source") || undefined

  const dateFilter: any = {}
  if (from) dateFilter.gte = new Date(from)
  if (to) {
    const t = new Date(to)
    t.setHours(23, 59, 59, 999)
    dateFilter.lte = t
  }

  const saleWhere: any = {}
  if (Object.keys(dateFilter).length) saleWhere.createdAt = dateFilter
  if (paymentMethod) saleWhere.paymentMethod = paymentMethod
  if (source === "POS") saleWhere.invoiceNo = { not: { startsWith: "SHP-" } }
  if (source === "SHOPIFY") saleWhere.invoiceNo = { startsWith: "SHP-" }

  // Sale item filter
  const itemWhere: any = {}
  if (productId) itemWhere.productId = productId
  if (categoryId) itemWhere.product = { categoryId }

  // ── DB-side aggregates (parallel) ──
  const [
    summaryAgg,
    itemsSoldAgg,
    byProductRows,
    byCategoryRows,
    byDayRows,
    byPaymentRows,
    products,
    categories,
  ] = await Promise.all([
    // KPI summary: revenue, discount, tax, count, avg
    db.sale.aggregate({
      where: saleWhere,
      _sum: { total: true, discount: true, taxAmount: true },
      _count: true,
      _avg: { total: true },
    }),
    // Items sold (sum of quantity across matched items)
    db.saleItem.aggregate({
      where: { sale: saleWhere, ...itemWhere },
      _sum: { quantity: true },
    }),
    // By product (DB groupBy)
    db.saleItem.groupBy({
      by: ["productId"],
      where: { sale: saleWhere, ...itemWhere },
      _sum: { quantity: true, subtotal: true },
    }),
    // By category (DB groupBy via product relation)
    db.saleItem.groupBy({
      by: ["productId"],
      where: { sale: saleWhere, ...itemWhere },
      _sum: { quantity: true, subtotal: true },
    }),
    // By day — fetch lightweight sale rows for day grouping (fewer cols)
    db.sale.findMany({
      where: saleWhere,
      select: { total: true, createdAt: true },
    }),
    // By payment method (DB groupBy)
    db.sale.groupBy({
      by: ["paymentMethod"],
      where: saleWhere,
      _count: true,
      _sum: { total: true },
    }),
    // Catalog for filter dropdowns
    db.product.findMany({ select: { id: true, name: true, categoryId: true }, orderBy: { name: "asc" } }),
    db.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ])

  // Resolve product names + categories + cost prices for the byProduct groupBy
  const productIds = byProductRows.map((r) => r.productId)
  const productMeta = productIds.length
    ? await db.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, costPrice: true, categoryId: true, category: { select: { name: true } } },
      })
    : []
  const metaMap = new Map(productMeta.map((p) => [p.id, p]))

  // Build byProduct + byCategory in one pass
  const productMap = new Map<string, { name: string; category: string; qty: number; revenue: number; cost: number }>()
  const categoryMap = new Map<string, { qty: number; revenue: number; cost: number }>()
  for (const row of byProductRows) {
    const meta = metaMap.get(row.productId)
    const name = meta?.name || "—"
    const cat = meta?.category?.name || "غير مصنف"
    const qty = Number(row._sum.quantity || 0)
    const revenue = Number(row._sum.subtotal || 0)
    const cost = qty * Number(meta?.costPrice ?? 0)
    productMap.set(name, { name, category: cat, qty, revenue, cost })
    const cm = categoryMap.get(cat) || { qty: 0, revenue: 0, cost: 0 }
    cm.qty += qty
    cm.revenue += revenue
    cm.cost += cost
    categoryMap.set(cat, cm)
  }

  // Build byDay
  const dayMap = new Map<string, { revenue: number; count: number }>()
  for (const s of byDayRows) {
    const dayKey = new Date(s.createdAt).toISOString().slice(0, 10)
    const dc = dayMap.get(dayKey) || { revenue: 0, count: 0 }
    dc.revenue += Number(s.total)
    dc.count++
    dayMap.set(dayKey, dc)
  }

  // Summary KPIs
  const totalRevenue = Number(summaryAgg._sum.total || 0)
  const totalDiscount = Number(summaryAgg._sum.discount || 0)
  const totalTax = Number(summaryAgg._sum.taxAmount || 0)
  const salesCount = summaryAgg._count || 0
  const itemsSold = Number(itemsSoldAgg._sum.quantity || 0)
  const avgSale = summaryAgg._avg.total ? Number(summaryAgg._avg.total) : 0

  // Items cost = sum(qty * costPrice) — computed above in productMap loop
  const totalCost = Array.from(productMap.values()).reduce((a, p) => a + p.cost, 0)
  const grossProfit = totalRevenue - totalCost
  const marginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

  return NextResponse.json({
    summary: {
      totalRevenue: +totalRevenue.toFixed(3),
      totalCost: +totalCost.toFixed(3),
      grossProfit: +grossProfit.toFixed(3),
      marginPct: +marginPct.toFixed(1),
      totalDiscount: +totalDiscount.toFixed(3),
      totalTax: +totalTax.toFixed(3),
      salesCount,
      itemsSold,
      avgSale: +avgSale.toFixed(3),
    },
    byProduct: Array.from(productMap.values())
      .map((p) => ({
        name: p.name,
        category: p.category,
        qty: p.qty,
        revenue: +p.revenue.toFixed(3),
        cost: +p.cost.toFixed(3),
        profit: +(p.revenue - p.cost).toFixed(3),
      }))
      .sort((a, b) => b.revenue - a.revenue),
    byCategory: Array.from(categoryMap.entries())
      .map(([category, v]) => ({
        category,
        qty: v.qty,
        revenue: +v.revenue.toFixed(3),
        cost: +v.cost.toFixed(3),
        profit: +(v.revenue - v.cost).toFixed(3),
      }))
      .sort((a, b) => b.revenue - a.revenue),
    byDay: Array.from(dayMap.entries())
      .map(([date, v]) => ({ date, revenue: +v.revenue.toFixed(3), count: v.count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    byPayment: byPaymentRows.map((r) => ({
      method: r.paymentMethod,
      count: r._count,
      revenue: +Number(r._sum.total || 0).toFixed(3),
    })),
    filters: {
      from,
      to,
      productId: productId || null,
      categoryId: categoryId || null,
      paymentMethod: paymentMethod || null,
      source: source || null,
    },
    products,
    categories,
  })
}
