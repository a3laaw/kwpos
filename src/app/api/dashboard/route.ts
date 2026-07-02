import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { serializeProduct, serializeSale } from "@/lib/serialize"
import type { DashboardStats } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET() {
  const [
    totalSalesAgg,
    salesCount,
    todaySalesAgg,
    productsCount,
    lowStockProducts,
    pendingPurchases,
    inventoryAgg,
    recentSales,
    last7Sales,
    topProductsRows,
    allProducts,
  ] = await Promise.all([
    db.sale.aggregate({ _sum: { total: true } }),
    db.sale.count(),
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
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    db.saleItem.findMany({
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

  // Sales trend (last 7 days grouped)
  const dayMap = new Map<string, number>()
  const labels = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    dayMap.set(key, 0)
  }
  for (const s of last7Sales) {
    const key = new Date(s.createdAt).toISOString().slice(0, 10)
    if (dayMap.has(key)) {
      dayMap.set(key, (dayMap.get(key) || 0) + Number(s.total))
    }
  }
  const salesTrend = Array.from(dayMap.entries()).map(([date, total]) => {
    const d = new Date(date)
    return { date, total: +total.toFixed(2), label: labels[d.getDay()] }
  })

  // Top products by revenue
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
