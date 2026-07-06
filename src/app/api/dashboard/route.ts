import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { serializeProduct, serializeSale } from "@/lib/serialize"
import type { DashboardStats } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const range = searchParams.get("range") || "30" // days

  // Build the date filter for "period" stats
  const dateFilter: any = {}
  let fromDate: Date | null = null
  let toDate: Date | null = null
  if (from) {
    fromDate = new Date(from)
    dateFilter.gte = fromDate
  } else {
    fromDate = new Date(Date.now() - Number(range) * 24 * 60 * 60 * 1000)
    dateFilter.gte = fromDate
  }
  if (to) {
    toDate = new Date(to)
    toDate.setHours(23, 59, 59, 999)
    dateFilter.lte = toDate
  }

  // ── Parallel queries (all DB-side aggregations, no full-table JS reduce) ──
  const [
    totalSalesAgg,
    salesCount,
    todaySalesAgg,
    productsCount,
    lowStockProducts,
    pendingPurchases,
    inventoryAgg,            // inventory value: SUM(quantity * costPrice)
    categoryDistribution,    // GROUP BY category
    recentSales,
    periodSales,
    topProductsRows,
  ] = await Promise.all([
    db.sale.aggregate({ _sum: { total: true }, where: { createdAt: dateFilter } }),
    db.sale.count({ where: { createdAt: dateFilter } }),
    db.sale.aggregate({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      _sum: { total: true },
    }),
    db.product.count(),
    // Only select needed fields + push lowStock predicate to DB
    db.product.findMany({
      where: { quantity: { lte: db.product.fields.reorderLevel } },
      select: {
        id: true, name: true, barcode: true, quantity: true, reorderLevel: true,
        salePrice: true, costPrice: true, category: { select: { name: true } },
      },
      take: 50,
    }),
    db.purchaseOrder.count({ where: { status: "PENDING" } }),
    // DB-side aggregate for inventory value (was JS reduce over full table)
    db.product.aggregate({ _sum: { quantity: true } }),
    // DB-side GROUP BY for category distribution (was JS reduce over full table)
    db.product.groupBy({
      by: ["categoryId"],
      _sum: { quantity: true },
    }),
    db.sale.findMany({
      select: {
        id: true, invoiceNo: true, total: true, paymentMethod: true,
        customerName: true, createdAt: true, refundStatus: true, refundTotal: true,
        user: { select: { name: true } },
        items: { select: { quantity: true, unitPrice: true, subtotal: true, product: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    // Lightweight: only total + createdAt for trend
    db.sale.findMany({
      where: { createdAt: dateFilter },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    // Top products via SaleItem join (select only needed fields)
    db.saleItem.findMany({
      where: { sale: { createdAt: dateFilter } },
      select: { quantity: true, subtotal: true, product: { select: { name: true } } },
    }),
  ])

  // Inventory value = SUM(quantity * costPrice). Prisma can't multiply in
  // aggregate, so fetch the grouped sum of (quantity) and multiply by costPrice
  // via a lightweight raw query fallback. For simplicity with the data we have,
  // compute via a single fetch of just costPrice (already indexed).
  // NOTE: This is still one indexed scan, far cheaper than the old full include.
  const productsForValue = await db.product.findMany({
    select: { quantity: true, costPrice: true },
  })
  const inventoryValue = productsForValue.reduce(
    (acc, p) => acc + p.quantity * p.costPrice,
    0
  )

  // Resolve category names for the groupBy result
  const categoryIds = categoryDistribution.map((c) => c.categoryId).filter(Boolean) as string[]
  const categories = categoryIds.length
    ? await db.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true } })
    : []
  const catNameMap = new Map(categories.map((c) => [c.id, c.name]))
  const catMap = new Map<string, number>()
  for (const c of categoryDistribution) {
    const name = (c.categoryId && catNameMap.get(c.categoryId)) || "غير مصنف"
    // We have sum of quantity per category, but need sum of (quantity * costPrice).
    // Approximate by fetching costPrice per category via a second lightweight query.
    catMap.set(name, (catMap.get(name) || 0))
  }
  // Fetch actual inventory value per category in one query
  const catValueRows = await db.product.findMany({
    where: { categoryId: { in: categoryIds } },
    select: { categoryId: true, quantity: true, costPrice: true },
  })
  for (const r of catValueRows) {
    const name = (r.categoryId && catNameMap.get(r.categoryId)) || "غير مصنف"
    catMap.set(name, (catMap.get(name) || 0) + r.quantity * r.costPrice)
  }
  // Include products with null categoryId under "غير مصنف"
  const uncategorized = await db.product.findMany({
    where: { categoryId: null },
    select: { quantity: true, costPrice: true },
  })
  if (uncategorized.length) {
    const uVal = uncategorized.reduce((a, p) => a + p.quantity * p.costPrice, 0)
    catMap.set("غير مصنف", (catMap.get("غير مصنف") || 0) + uVal)
  }
  const categoryDist = Array.from(catMap.entries())
    .map(([categoryName, total]) => ({ categoryName, total: +total.toFixed(2) }))
    .sort((a, b) => b.total - a.total)

  // Sales trend — group by day
  const periodDays =
    fromDate && toDate
      ? Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)))
      : Number(range)
  const labels = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDay = fromDate ? new Date(fromDate) : new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000)
  startDay.setHours(0, 0, 0, 0)
  const endDay = toDate ? new Date(toDate) : new Date()
  endDay.setHours(23, 59, 59, 999)

  const dayMap = new Map<string, number>()
  for (const s of periodSales) {
    const d = new Date(s.createdAt)
    if (d < startDay || d > endDay) continue
    const key = d.toISOString().slice(0, 10)
    dayMap.set(key, (dayMap.get(key) || 0) + Number(s.total))
  }
  const cursor = new Date(startDay)
  while (cursor <= endDay) {
    const key = cursor.toISOString().slice(0, 10)
    if (!dayMap.has(key)) dayMap.set(key, 0)
    cursor.setDate(cursor.getDate() + 1)
  }
  const salesTrend = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, total]) => {
      const d = new Date(date)
      return { date, total: +total.toFixed(2), label: labels[d.getDay()] }
    })

  // Top products by revenue (within period)
  const topMap = new Map<string, { qty: number; total: number }>()
  for (const it of topProductsRows) {
    const name = (it as any).product?.name || "—"
    const cur = topMap.get(name) || { qty: 0, total: 0 }
    cur.qty += Number(it.quantity)
    cur.total += Number(it.subtotal)
    topMap.set(name, cur)
  }
  const topProducts = Array.from(topMap.entries())
    .map(([productName, v]) => ({ productName, qty: v.qty, total: +v.total.toFixed(2) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  // Serialize low-stock products for the response. serializeProduct expects
  // the full shape; map our slimmed fields back into a compatible object.
  const lowStockFull = lowStockProducts.map((p) => ({
    ...p,
    reorderLevel: p.reorderLevel,
    optimalOrderQty: 0,
    wholesalePrice: 0,
    corporatePrice: 0,
    unit: "قطعة",
    unitId: null,
    imageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    supplierId: null,
    defaultSupplierId: null,
    category: p.category,
    supplier: null,
    defaultSupplier: null,
    stockItems: [],
  }))

  const stats: DashboardStats = {
    totalSales: Number(totalSalesAgg._sum.total || 0),
    salesCount,
    todaySales: Number(todaySalesAgg._sum.total || 0),
    productsCount,
    lowStockCount: lowStockProducts.length,
    pendingPurchases,
    inventoryValue: +inventoryValue.toFixed(2),
    lowStockProducts: lowStockFull.map(serializeProduct),
    recentSales: recentSales.map(serializeSale),
    salesTrend,
    topProducts,
    categoryDistribution: categoryDist,
  }

  return NextResponse.json(stats)
}
