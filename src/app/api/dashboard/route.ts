import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { serializeProduct, serializeSale } from "@/lib/serialize"
import { getCurrentUser, hasRole } from "@/lib/session"
import type { Role } from "@/lib/types"
import type { DashboardStats } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN" as Role, "SALES" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const range = searchParams.get("range") || "30"

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

  // ── Use raw SQL for heavy aggregations (1 round-trip each instead of
  //    multiple Prisma queries). This is critical because connection_limit=1
  //    makes Promise.all queries sequential. ──

  const dateFromISO = fromDate.toISOString()
  const dateToISO = (toDate || new Date()).toISOString()

  // Single raw SQL: inventory value + category distribution + low stock count
  // in ONE round-trip.
  const inventoryRows = await db.$queryRaw<Array<{
    categoryname: string | null
    inventoryvalue: bigint
    lowstockcount: bigint
  }>>`
    SELECT
      c."name" AS categoryname,
      COALESCE(SUM(p."quantity" * p."costPrice"), 0) AS inventoryvalue,
      COUNT(*) FILTER (WHERE p."quantity" <= p."reorderLevel") AS lowstockcount
    FROM "Product" p
    LEFT JOIN "Category" c ON p."categoryId" = c."id"
    GROUP BY c."name"
  ` as any

  let inventoryValue = 0
  let lowStockCount = 0
  const catMap = new Map<string, number>()
  for (const r of inventoryRows) {
    const val = Number(r.inventoryvalue)
    const name = r.categoryname || "غير مصنف"
    inventoryValue += val
    catMap.set(name, (catMap.get(name) || 0) + val)
    lowStockCount += Number(r.lowstockcount)
  }
  const categoryDistribution = Array.from(catMap.entries())
    .map(([categoryName, total]) => ({ categoryName, total: +total.toFixed(2) }))
    .sort((a, b) => b.total - a.total)

  // ── Prisma queries (parallel, but sequential with connection_limit=1) ──
  const [
    totalSalesAgg,
    salesCount,
    todaySalesAgg,
    productsCount,
    pendingPurchases,
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
    db.purchaseOrder.count({ where: { status: "PENDING" } }),
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
    db.sale.findMany({
      where: { createdAt: dateFilter },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    db.saleItem.findMany({
      where: { sale: { createdAt: dateFilter } },
      select: { quantity: true, subtotal: true, product: { select: { name: true } } },
    }),
  ])

  // Low stock products (separate query, only needed for the list display)
  const lowStockProducts = lowStockCount > 0
    ? await db.product.findMany({
        where: { quantity: { lte: db.product.fields.reorderLevel } },
        select: {
          id: true, name: true, barcode: true, quantity: true, reorderLevel: true,
          salePrice: true, costPrice: true, category: { select: { name: true } },
        },
        take: 50,
      })
    : []

  // Sales trend — group by day
  const periodDays =
    fromDate && toDate
      ? Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)))
      : Number(range)
  const labels = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
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

  // Map low-stock products to full shape for serializeProduct
  const lowStockFull = lowStockProducts.map((p) => ({
    ...p,
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
    lowStockCount,
    pendingPurchases,
    inventoryValue: +inventoryValue.toFixed(2),
    lowStockProducts: lowStockFull.map(serializeProduct),
    recentSales: recentSales.map(serializeSale),
    salesTrend,
    topProducts,
    categoryDistribution,
  }

  return NextResponse.json(stats)
}
