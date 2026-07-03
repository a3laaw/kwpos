import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

/**
 * Unified, filterable reports endpoint.
 * Filters: from, to, productId, categoryId, paymentMethod, source (POS|SHOPIFY)
 * Returns: summary KPIs + grouped breakdown (by day, by product, by category)
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
  const source = searchParams.get("source") || undefined // POS | SHOPIFY

  // Build date filter
  const dateFilter: any = {}
  if (from) dateFilter.gte = new Date(from)
  if (to) {
    const t = new Date(to)
    t.setHours(23, 59, 59, 999)
    dateFilter.lte = t
  }

  // Build sale where clause
  const saleWhere: any = {}
  if (Object.keys(dateFilter).length) saleWhere.createdAt = dateFilter
  if (paymentMethod) saleWhere.paymentMethod = paymentMethod
  if (source === "POS") saleWhere.invoiceNo = { not: { startsWith: "SHP-" } }
  if (source === "SHOPIFY") saleWhere.invoiceNo = { startsWith: "SHP-" }

  // Sale item filter (for productId / categoryId)
  const itemFilter: any = {}
  if (productId) itemFilter.productId = productId
  if (categoryId) itemFilter.product = { categoryId }

  const [sales, saleItems, products, categories] = await Promise.all([
    db.sale.findMany({
      where: saleWhere,
      include: {
        items: itemFilter.productId || itemFilter.product
          ? { where: itemFilter, include: { product: { include: { category: true } } } }
          : { include: { product: { include: { category: true } } } },
        user: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.saleItem.findMany({
      where: {
        sale: saleWhere,
        ...(itemFilter.productId ? { productId: itemFilter.productId } : {}),
        ...(itemFilter.product ? { product: { categoryId } } : {}),
      },
      include: { product: { include: { category: true } } },
    }),
    db.product.findMany({ include: { category: true }, orderBy: { name: "asc" } }),
    db.category.findMany({ orderBy: { name: "asc" } }),
  ])

  // Summary KPIs
  let totalRevenue = 0
  let totalCost = 0
  let totalDiscount = 0
  let totalTax = 0
  let salesCount = sales.length
  let itemsSold = 0

  // Group by product
  const productMap = new Map<
    string,
    { name: string; category: string; qty: number; revenue: number; cost: number }
  >()
  // Group by category
  const categoryMap = new Map<string, { qty: number; revenue: number; cost: number }>()
  // Group by day
  const dayMap = new Map<string, { revenue: number; count: number }>()
  // Group by payment method
  const paymentMap = new Map<string, { count: number; revenue: number }>()

  for (const s of sales) {
    totalRevenue += Number(s.total)
    totalDiscount += Number(s.discount)
    totalTax += Number(s.taxAmount)
    const pm = s.paymentMethod
    const pc = paymentMap.get(pm) || { count: 0, revenue: 0 }
    pc.count++
    pc.revenue += Number(s.total)
    paymentMap.set(pm, pc)

    const dayKey = new Date(s.createdAt).toISOString().slice(0, 10)
    const dc = dayMap.get(dayKey) || { revenue: 0, count: 0 }
    dc.revenue += Number(s.total)
    dc.count++
    dayMap.set(dayKey, dc)

    for (const it of s.items) {
      const cost = Number(it.quantity) * Number(it.product?.costPrice ?? 0)
      totalCost += cost
      itemsSold += Number(it.quantity)
      const pname = it.product?.name || "—"
      const pcat = it.product?.category?.name || "غير مصنف"
      const pm2 = productMap.get(pname) || { name: pname, category: pcat, qty: 0, revenue: 0, cost: 0 }
      pm2.qty += Number(it.quantity)
      pm2.revenue += Number(it.subtotal)
      pm2.cost += cost
      productMap.set(pname, pm2)

      const cm = categoryMap.get(pcat) || { qty: 0, revenue: 0, cost: 0 }
      cm.qty += Number(it.quantity)
      cm.revenue += Number(it.subtotal)
      cm.cost += cost
      categoryMap.set(pcat, cm)
    }
  }

  const grossProfit = totalRevenue - totalCost
  const marginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
  const avgSale = salesCount > 0 ? totalRevenue / salesCount : 0

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
    byPayment: Array.from(paymentMap.entries()).map(([method, v]) => ({
      method,
      count: v.count,
      revenue: +v.revenue.toFixed(3),
    })),
    filters: {
      from,
      to,
      productId: productId || null,
      categoryId: categoryId || null,
      paymentMethod: paymentMethod || null,
      source: source || null,
    },
    // Catalog for filter dropdowns
    products: products.map((p) => ({ id: p.id, name: p.name, categoryId: p.categoryId })),
    categories: categories.map((c) => ({ id: c.id, name: c.name })),
  })
}
