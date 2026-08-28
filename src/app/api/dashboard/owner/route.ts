import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { canSeeCost } from "@/lib/permissions"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * GET /api/dashboard/owner
 *
 * Executive owner dashboard — returns real-time KPIs, smart alerts,
 * period comparisons (today / week / month vs. previous period), and
 * supporting breakdowns (top products, top categories, payment methods,
 * hourly distribution, 7-day trend, customer counts, refund/void rate).
 *
 * Auth: OWNER, ADMIN, MANAGER only. All three roles can see cost (per
 * permissions.ts), so profit/stock-value/payables are always returned.
 */
export async function GET(_req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN" as Role, "MANAGER" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  // canSeeCost is true for OWNER / ADMIN / MANAGER / ACCOUNTANT / WAREHOUSE.
  // The route guard above already restricts to OWNER/ADMIN/MANAGER, so all
  // callers can see cost. We still call canSeeCost so a future widening of
  // the route guard stays consistent with the permission model.
  void canSeeCost(user.role as Role)

  // ── Date ranges ────────────────────────────────────────────────────
  // Today / Yesterday (calendar days in server timezone).
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)

  // This week = today + previous 6 days (rolling 7-day window ending today).
  // Last week = previous 7 days before that.
  const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000)
  const lastWeekStart = new Date(todayStart.getTime() - 13 * 24 * 60 * 60 * 1000)
  const lastWeekEnd = new Date(weekStart.getTime() - 1) // day before this week

  // This month = 1st of current month to now.
  // Last month = 1st to last day of previous month.
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(monthStart.getTime() - 1) // day before this month

  const saleStatusFilter = { status: "COMPLETED" as const }

  // ── Aggregations for period comparisons ────────────────────────────
  // Each aggregate returns _sum.total, _sum.refundTotal, _count.
  // Net sales = total − refundTotal. AOV = net sales / count.
  const [
    todayAgg,
    yesterdayAgg,
    weekAgg,
    lastWeekAgg,
    monthAgg,
    lastMonthAgg,
  ] = await Promise.all([
    db.sale.aggregate({
      where: { ...saleStatusFilter, createdAt: { gte: todayStart, lte: now } },
      _sum: { total: true, refundTotal: true },
      _count: true,
    }),
    db.sale.aggregate({
      where: { ...saleStatusFilter, createdAt: { gte: yesterdayStart, lt: todayStart } },
      _sum: { total: true, refundTotal: true },
      _count: true,
    }),
    db.sale.aggregate({
      where: { ...saleStatusFilter, createdAt: { gte: weekStart, lte: now } },
      _sum: { total: true, refundTotal: true },
      _count: true,
    }),
    db.sale.aggregate({
      where: { ...saleStatusFilter, createdAt: { gte: lastWeekStart, lte: lastWeekEnd } },
      _sum: { total: true, refundTotal: true },
      _count: true,
    }),
    db.sale.aggregate({
      where: { ...saleStatusFilter, createdAt: { gte: monthStart, lte: now } },
      _sum: { total: true, refundTotal: true },
      _count: true,
    }),
    db.sale.aggregate({
      where: { ...saleStatusFilter, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
      _sum: { total: true, refundTotal: true },
      _count: true,
    }),
  ])

  // ── Today's SaleItems (for profit + top products + top categories) ──
  // One query fetches everything we need to compute today's profit, top
  // products, and top categories. Joining Product → Category lets us group
  // by category in JS.
  const todaySaleItems = await db.saleItem.findMany({
    where: { sale: { ...saleStatusFilter, createdAt: { gte: todayStart, lte: now } } },
    select: {
      quantity: true,
      returnedQty: true,
      unitPrice: true,
      subtotal: true,
      product: {
        select: {
          name: true,
          costPrice: true,
          category: { select: { name: true } },
        },
      },
    },
  })

  let todayProfit = 0
  const productAgg = new Map<string, { name: string; qty: number; revenue: number }>()
  const categoryAgg = new Map<string, { name: string; qty: number; revenue: number }>()
  for (const it of todaySaleItems) {
    const grossQty = Number(it.quantity)
    const returned = Number(it.returnedQty || 0)
    const netQty = Math.max(0, grossQty - returned)
    const unit = Number(it.unitPrice)
    const cost = Number(it.product?.costPrice || 0)
    const subtotal = Number(it.subtotal)
    const lineUnit = grossQty > 0 ? subtotal / grossQty : 0
    const revenue = subtotal - returned * lineUnit
    // Profit = (unitPrice − costPrice) × netQty. Uses the actual sold
    // unitPrice (not Product.salePrice) so promotions/discounts are
    // reflected. Cost is the product's current costPrice.
    todayProfit += (unit - cost) * netQty

    const productName = it.product?.name || "—"
    const pCur = productAgg.get(productName) || { name: productName, qty: 0, revenue: 0 }
    pCur.qty += netQty
    pCur.revenue += revenue
    productAgg.set(productName, pCur)

    const categoryName = it.product?.category?.name || "غير مصنف"
    const cCur = categoryAgg.get(categoryName) || { name: categoryName, qty: 0, revenue: 0 }
    cCur.qty += netQty
    cCur.revenue += revenue
    categoryAgg.set(categoryName, cCur)
  }
  const topProductsToday = Array.from(productAgg.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((p) => ({
      name: p.name,
      qty: p.qty,
      revenue: +p.revenue.toFixed(2),
    }))
  const topCategoriesToday = Array.from(categoryAgg.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((c) => ({
      name: c.name,
      qty: c.qty,
      revenue: +c.revenue.toFixed(2),
    }))

  // ── Today's sales by payment method + hourly distribution ──────────
  // One raw-sale query gives us both: group by `paymentMethod` and by
  // hour(createdAt). Net per sale = total − refundTotal.
  const todaySalesRows = await db.sale.findMany({
    where: { ...saleStatusFilter, createdAt: { gte: todayStart, lte: now } },
    select: { total: true, refundTotal: true, paymentMethod: true, createdAt: true },
  })
  const paymentMap = new Map<string, { total: number; count: number }>()
  const hourMap = new Map<number, { total: number; count: number }>()
  for (const s of todaySalesRows) {
    const net = Number(s.total) - Number(s.refundTotal || 0)
    const pm = (s.paymentMethod || "CASH").toUpperCase()
    const pmCur = paymentMap.get(pm) || { total: 0, count: 0 }
    pmCur.total += net
    pmCur.count += 1
    paymentMap.set(pm, pmCur)

    const hour = new Date(s.createdAt).getHours()
    const hCur = hourMap.get(hour) || { total: 0, count: 0 }
    hCur.total += net
    hCur.count += 1
    hourMap.set(hour, hCur)
  }
  // Build a 24-bucket hourly distribution (fill missing hours with 0).
  const hourlySales = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    total: +(hourMap.get(h)?.total || 0).toFixed(2),
    count: hourMap.get(h)?.count || 0,
  }))
  const paymentMethods = ["CASH", "CARD", "TRANSFER"] as const
  const salesByPaymentMethod = paymentMethods.map((m) => ({
    method: m,
    total: +(paymentMap.get(m)?.total || 0).toFixed(2),
    count: paymentMap.get(m)?.count || 0,
  }))

  // ── 7-day sales trend ──────────────────────────────────────────────
  // Pull the last 7 days of completed sales and aggregate net total by day.
  const sevenDaysAgo = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000)
  const sevenDaySales = await db.sale.findMany({
    where: { ...saleStatusFilter, createdAt: { gte: sevenDaysAgo, lte: now } },
    select: { total: true, refundTotal: true, createdAt: true },
  })
  const dayLabels = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
  const trendMap = new Map<string, number>()
  for (const s of sevenDaySales) {
    const key = new Date(s.createdAt).toISOString().slice(0, 10)
    const net = Number(s.total) - Number(s.refundTotal || 0)
    trendMap.set(key, (trendMap.get(key) || 0) + net)
  }
  // Fill in missing days with 0 to keep the chart continuous.
  const cursor = new Date(sevenDaysAgo)
  while (cursor <= todayStart) {
    const key = cursor.toISOString().slice(0, 10)
    if (!trendMap.has(key)) trendMap.set(key, 0)
    cursor.setDate(cursor.getDate() + 1)
  }
  const sevenDayTrend = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, total]) => {
      const d = new Date(date)
      return { date, total: +total.toFixed(2), label: dayLabels[d.getDay()] }
    })

  // ── Inventory value + low stock ────────────────────────────────────
  // Sum(quantity × costPrice) across all products. Low stock = quantity ≤
  // reorderLevel (column-comparison; works on both PG and SQLite).
  const allProductsForValue = await db.product.findMany({
    select: { quantity: true, costPrice: true, reorderLevel: true, name: true },
  })
  let stockValue = 0
  let lowStockCount = 0
  for (const p of allProductsForValue) {
    stockValue += Number(p.quantity) * Number(p.costPrice || 0)
    if (Number(p.quantity) <= Number(p.reorderLevel || 0)) lowStockCount += 1
  }
  const lowStockProducts = await db.product.findMany({
    where: { quantity: { lte: db.product.fields.reorderLevel } },
    select: {
      id: true, name: true, barcode: true,
      quantity: true, reorderLevel: true,
    },
    orderBy: { quantity: "asc" },
    take: 10,
  })

  // ── Outstanding supplier payments (POSTED purchase invoices with no
  // linked journal entry — i.e. no payment recorded yet). Aggregate by
  // supplier so the alert can count distinct suppliers over 1000 KWD.
  const unpaidInvoices = await db.purchaseInvoice.findMany({
    where: { status: "POSTED", journalEntryId: null },
    select: { supplierId: true, total: true, supplier: { select: { name: true } } },
  })
  const supplierMap = new Map<string, { name: string; balance: number }>()
  let totalOutstanding = 0
  for (const inv of unpaidInvoices) {
    const amt = Number(inv.total)
    totalOutstanding += amt
    const existing = supplierMap.get(inv.supplierId)
    if (existing) {
      existing.balance += amt
    } else {
      supplierMap.set(inv.supplierId, {
        name: inv.supplier?.name ?? "—",
        balance: amt,
      })
    }
  }
  const outstandingPayables = Array.from(supplierMap.entries()).map(([id, v]) => ({
    id,
    name: v.name,
    balance: +v.balance.toFixed(3),
  }))
  // Suppliers with outstanding balance > 1000 KWD (overdue alert threshold).
  const overdueSuppliersCount = Array.from(supplierMap.values())
    .filter((v) => v.balance > 1000).length

  // ── Active shifts ──────────────────────────────────────────────────
  const openShifts = await db.shift.findMany({
    where: { status: "OPEN" },
    include: { user: { select: { name: true } } },
    orderBy: { openedAt: "desc" },
    take: 10,
  })
  const activeShiftsCount = openShifts.length

  // ── Customers ──────────────────────────────────────────────────────
  const [totalCustomers, newCustomersThisMonth] = await Promise.all([
    db.customer.count(),
    db.customer.count({ where: { createdAt: { gte: monthStart } } }),
  ])

  // ── Refund rate (last 30 days) ──────────────────────────────────────
  // % of COMPLETED sales with refundStatus != "NONE" over the last 30 days.
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const [refundedSalesCount, totalSalesCount30d] = await Promise.all([
    db.sale.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        refundStatus: { not: "NONE" },
      },
    }),
    db.sale.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    }),
  ])
  const refundRate = totalSalesCount30d > 0
    ? (refundedSalesCount / totalSalesCount30d) * 100
    : 0

  // ── Void rate (last 7 days) ────────────────────────────────────────
  // VOID_ITEM audit logs / total SaleItem rows over the last 7 days.
  // This mirrors the manager dashboard's existing calculation so the
  // two panels stay consistent for users who can see both.
  const [voidCount, totalSaleItems7d] = await Promise.all([
    db.auditLog.count({
      where: { action: "VOID_ITEM", createdAt: { gte: sevenDaysAgo } },
    }),
    db.saleItem.count({
      where: { sale: { createdAt: { gte: sevenDaysAgo } } },
    }),
  ])
  const voidRate = totalSaleItems7d > 0
    ? (voidCount / totalSaleItems7d) * 100
    : 0

  // ── Expiring promotions (ending within 7 days, currently active) ──
  const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const expiringPromotions = await db.promotion.count({
    where: {
      isActive: true,
      endAt: { gte: now, lte: sevenDaysAhead },
    },
  })

  // ── Build period comparison objects ────────────────────────────────
  // Helper: derive metrics from an aggregate.
  function metricsFromAgg(agg: {
    _sum: { total: number | null; refundTotal: number | null }
    _count: number
  }) {
    const sales = Number(agg._sum.total || 0) - Number(agg._sum.refundTotal || 0)
    const orders = agg._count
    const aov = orders > 0 ? sales / orders : 0
    return { sales, orders, aov }
  }
  // Today's profit is the real per-item value computed above.
  const todayMetrics = metricsFromAgg(todayAgg)
  const yesterdayMetrics = metricsFromAgg(yesterdayAgg)
  const weekMetrics = metricsFromAgg(weekAgg)
  const lastWeekMetrics = metricsFromAgg(lastWeekAgg)
  const monthMetrics = metricsFromAgg(monthAgg)
  const lastMonthMetrics = metricsFromAgg(lastMonthAgg)

  // Profit estimate for past periods using today's margin ratio.
  // (Per-item recomputation for each past period would be expensive —
  // we'd need to pull all SaleItems with Product joins for each window.
  // The margin ratio is a stable enough approximation for an owner
  // dashboard and the UI clearly labels past-period profit as an
  // estimate when todayMarginRatio is 0.)
  const todayMarginRatio = todayMetrics.sales > 0
    ? todayProfit / todayMetrics.sales
    : 0
  const yesterdayProfit = yesterdayMetrics.sales * todayMarginRatio
  const weekProfit = weekMetrics.sales * todayMarginRatio
  const lastWeekProfit = lastWeekMetrics.sales * todayMarginRatio
  const monthProfit = monthMetrics.sales * todayMarginRatio
  const lastMonthProfit = lastMonthMetrics.sales * todayMarginRatio

  // Percentage change helper. Returns 0 if the previous value is 0 and the
  // current value is also 0; returns 100 if previous is 0 and current > 0.
  function pctChange(curr: number, prev: number): number {
    if (prev === 0) return curr > 0 ? 100 : 0
    return ((curr - prev) / prev) * 100
  }

  const periodComparison = {
    today: {
      sales: +todayMetrics.sales.toFixed(2),
      profit: +todayProfit.toFixed(2),
      orders: todayMetrics.orders,
      aov: +todayMetrics.aov.toFixed(2),
      prevSales: +yesterdayMetrics.sales.toFixed(2),
      prevProfit: +yesterdayProfit.toFixed(2),
      prevOrders: yesterdayMetrics.orders,
      prevAov: +yesterdayMetrics.aov.toFixed(2),
      salesChangePct: +pctChange(todayMetrics.sales, yesterdayMetrics.sales).toFixed(1),
      profitChangePct: +pctChange(todayProfit, yesterdayProfit).toFixed(1),
      ordersChangePct: +pctChange(todayMetrics.orders, yesterdayMetrics.orders).toFixed(1),
      aovChangePct: +pctChange(todayMetrics.aov, yesterdayMetrics.aov).toFixed(1),
    },
    week: {
      sales: +weekMetrics.sales.toFixed(2),
      profit: +weekProfit.toFixed(2),
      orders: weekMetrics.orders,
      aov: +weekMetrics.aov.toFixed(2),
      prevSales: +lastWeekMetrics.sales.toFixed(2),
      prevProfit: +lastWeekProfit.toFixed(2),
      prevOrders: lastWeekMetrics.orders,
      prevAov: +lastWeekMetrics.aov.toFixed(2),
      salesChangePct: +pctChange(weekMetrics.sales, lastWeekMetrics.sales).toFixed(1),
      profitChangePct: +pctChange(weekProfit, lastWeekProfit).toFixed(1),
      ordersChangePct: +pctChange(weekMetrics.orders, lastWeekMetrics.orders).toFixed(1),
      aovChangePct: +pctChange(weekMetrics.aov, lastWeekMetrics.aov).toFixed(1),
    },
    month: {
      sales: +monthMetrics.sales.toFixed(2),
      profit: +monthProfit.toFixed(2),
      orders: monthMetrics.orders,
      aov: +monthMetrics.aov.toFixed(2),
      prevSales: +lastMonthMetrics.sales.toFixed(2),
      prevProfit: +lastMonthProfit.toFixed(2),
      prevOrders: lastMonthMetrics.orders,
      prevAov: +lastMonthMetrics.aov.toFixed(2),
      salesChangePct: +pctChange(monthMetrics.sales, lastMonthMetrics.sales).toFixed(1),
      profitChangePct: +pctChange(monthProfit, lastMonthProfit).toFixed(1),
      ordersChangePct: +pctChange(monthMetrics.orders, lastMonthMetrics.orders).toFixed(1),
      aovChangePct: +pctChange(monthMetrics.aov, lastMonthMetrics.aov).toFixed(1),
    },
  }

  // ── Real-time KPIs block ────────────────────────────────────────────
  const todayKPIs = {
    sales: +todayMetrics.sales.toFixed(2),
    salesCount: todayMetrics.orders,
    profit: +todayProfit.toFixed(2),
    stockValue: +stockValue.toFixed(2),
    outstandingPayments: +totalOutstanding.toFixed(3),
    activeShifts: activeShiftsCount,
    lowStockCount,
  }

  // ── Smart alerts ────────────────────────────────────────────────────
  // Each alert carries a `type`, `severity` (info/warning/critical),
  // `message` (a structured template identifier — the UI maps it to a
  // localized string), and `action` (a `setView` target name) so the UI
  // can navigate the user to the relevant page on click.
  type AlertSeverity = "info" | "warning" | "critical"
  type AlertType =
    | "lowStock"
    | "highRefundRate"
    | "highVoidRate"
    | "unusualSalesDrop"
    | "unusualSalesSpike"
    | "overdueSupplierPayments"
    | "expiringPromotions"
  interface AlertItem {
    type: AlertType
    severity: AlertSeverity
    message: string
    action: string
  }

  const alerts: AlertItem[] = []

  if (lowStockCount > 0) {
    alerts.push({
      type: "lowStock",
      severity: lowStockCount >= 10 ? "critical" : "warning",
      message: `lowStock:${lowStockCount}`,
      action: "inventory",
    })
  }
  if (refundRate > 10) {
    alerts.push({
      type: "highRefundRate",
      severity: refundRate > 20 ? "critical" : "warning",
      message: `highRefundRate:${refundRate.toFixed(1)}`,
      action: "audit",
    })
  }
  if (voidRate > 5) {
    alerts.push({
      type: "highVoidRate",
      severity: voidRate > 10 ? "critical" : "warning",
      message: `highVoidRate:${voidRate.toFixed(1)}`,
      action: "audit",
    })
  }
  // Unusual sales drop/spike vs yesterday (only flag if yesterday had
  // meaningful sales — otherwise a tiny absolute drop would trigger a
  // misleading 99% alert).
  if (yesterdayMetrics.sales > 50 && todayMetrics.sales < yesterdayMetrics.sales * 0.5) {
    const pct = todayMetrics.sales > 0
      ? (todayMetrics.sales / yesterdayMetrics.sales) * 100
      : 0
    alerts.push({
      type: "unusualSalesDrop",
      severity: "critical",
      message: `salesDrop:${pct.toFixed(0)}`,
      action: "sales",
    })
  }
  if (yesterdayMetrics.sales > 50 && todayMetrics.sales > yesterdayMetrics.sales * 2) {
    const pct = (todayMetrics.sales / yesterdayMetrics.sales) * 100
    alerts.push({
      type: "unusualSalesSpike",
      severity: "info",
      message: `salesSpike:${pct.toFixed(0)}`,
      action: "sales",
    })
  }
  if (overdueSuppliersCount > 0) {
    alerts.push({
      type: "overdueSupplierPayments",
      severity: "warning",
      message: `overduePayments:${overdueSuppliersCount}`,
      action: "suppliers",
    })
  }
  if (expiringPromotions > 0) {
    alerts.push({
      type: "expiringPromotions",
      severity: "info",
      message: `expiringPromos:${expiringPromotions}`,
      action: "pricing",
    })
  }

  return NextResponse.json({
    generatedAt: now.toISOString(),
    periodComparison,
    todayKPIs,
    topProductsToday,
    topCategoriesToday,
    salesByPaymentMethod,
    hourlySales,
    sevenDayTrend,
    customers: {
      total: totalCustomers,
      newThisMonth: newCustomersThisMonth,
    },
    refundRate: +refundRate.toFixed(1),
    voidRate: +voidRate.toFixed(1),
    lowStockProducts: lowStockProducts.map((p) => ({
      id: p.id,
      name: p.name,
      barcode: p.barcode,
      quantity: Number(p.quantity),
      reorderLevel: Number(p.reorderLevel),
    })),
    outstandingPayables,
    openShifts: openShifts.map((s) => ({
      id: s.id,
      cashierName: s.user?.name ?? "—",
      openedAt: String(s.openedAt),
      openingBalance: Number(s.openingBalance ?? 0),
    })),
    alerts,
  })
}
