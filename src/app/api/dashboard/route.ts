import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { serializeProduct, serializeSale } from "@/lib/serialize"
import type { DashboardStats } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const range = searchParams.get("range") || "30" // days; used when no explicit from/to

  // Build the date filter for "period" stats (total sales, count, trend, top).
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

  const [
    totalSalesAgg,
    salesCount,
    todaySalesAgg,
    productsCount,
    lowStockProducts,
    pendingPurchases,
    inventoryAgg,
    recentSales,
    periodSales,
    topProductsRows,
    allProducts,
  ] = await Promise.all([
    db.sale.aggregate({ _sum: { total: true }, where: { createdAt: dateFilter } }),
    db.sale.count({ where: { createdAt: dateFilter } }),
    db.sale.aggregate({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
      _sum: { total: true },
    }),
    db.product.count(),
    db.product.findMany({
      where: {},
      include: { category: true, supplier: true },
    }),
    db.purchaseOrder.count({ where: { status: "PENDING" } }),
    db.product.aggregate({ _sum: { quantity: true, costPrice: true } }),
    db.sale.findMany({
      include: { user: true, items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.sale.findMany({
      where: { createdAt: dateFilter },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    db.saleItem.findMany({
      where: { sale: { createdAt: dateFilter } },
      select: { quantity: true, subtotal: true, product: { select: { name: true } } },
    }),
    db.product.findMany({ include: { category: true } }),
  ])

  // Low stock = quantity <= reorderLevel
  const lowStock = lowStockProducts.filter((p) => p.quantity <= p.reorderLevel)
  const inventoryValue = allProducts.reduce(
    (acc, p) => acc + p.quantity * p.costPrice,
    0
  )

  // Sales trend — group by day within the selected period.
  // If the period is <= 14 days, show daily; otherwise group weekly for readability.
  const periodDays =
    fromDate && toDate
      ? Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)))
      : Number(range)
  const dayMap = new Map<string, number>()
  const labels = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDay = fromDate ? new Date(fromDate) : new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000)
  startDay.setHours(0, 0, 0, 0)
  const endDay = toDate ? new Date(toDate) : new Date()
  endDay.setHours(23, 59, 59, 999)

  for (const s of periodSales) {
    const d = new Date(s.createdAt)
    if (d < startDay || d > endDay) continue
    const key = d.toISOString().slice(0, 10)
    dayMap.set(key, (dayMap.get(key) || 0) + Number(s.total))
  }
  // Fill missing days with 0 for a continuous trend
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

  // Category distribution (by inventory value)
  const catMap = new Map<string, number>()
  for (const p of allProducts) {
    const name = (p as any).category?.name || "غير مصنف"
    catMap.set(name, (catMap.get(name) || 0) + p.quantity * p.costPrice)
  }
  const categoryDistribution = Array.from(catMap.entries())
    .map(([categoryName, total]) => ({ categoryName, total: +total.toFixed(2) }))
    .sort((a, b) => b.total - a.total)

  const stats: DashboardStats = {
    totalSales: Number(totalSalesAgg._sum.total || 0),
    salesCount,
    todaySales: Number(todaySalesAgg._sum.total || 0),
    productsCount,
    lowStockCount: lowStock.length,
    pendingPurchases,
    inventoryValue: +inventoryValue.toFixed(2),
    lowStockProducts: lowStock.map(serializeProduct),
    recentSales: recentSales.map(serializeSale),
    salesTrend,
    topProducts,
    categoryDistribution,
  }

  return NextResponse.json(stats)
}
