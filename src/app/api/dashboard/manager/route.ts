import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * GET /api/dashboard/manager
 *
 * Returns operational overview widgets for ADMIN/MANAGER:
 *   - todaySales, yesterdaySales (totals + count)
 *   - openShifts (list of active shifts with cashier name)
 *   - lowStockProducts (products with quantity <= reorderLevel)
 *   - pendingPurchaseOrders (POs in PENDING/PENDING_APPROVAL/APPROVED)
 *   - outstandingSupplierPayables (suppliers with non-zero balance)
 *   - voidRefundRate (from audit logs: VOID_ITEM + REFUND / total sales)
 *   - topProductsToday (top 5 by qty sold)
 *
 * Auth: ADMIN or MANAGER only.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["ADMIN" as Role, "MANAGER" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  // Date ranges: today (00:00 to now) and yesterday
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)
  const todayEnd = now

  // ── Today's sales vs yesterday ──
  const [todayAgg, yesterdayAgg] = await Promise.all([
    db.sale.aggregate({
      where: { createdAt: { gte: todayStart, lte: todayEnd } },
      _sum: { total: true },
      _count: true,
    }),
    db.sale.aggregate({
      where: { createdAt: { gte: yesterdayStart, lt: todayStart } },
      _sum: { total: true },
      _count: true,
    }),
  ])

  const todaySales = Number(todayAgg._sum.total ?? 0)
  const yesterdaySales = Number(yesterdayAgg._sum.total ?? 0)
  const salesChangePct = yesterdaySales > 0
    ? ((todaySales - yesterdaySales) / yesterdaySales) * 100
    : todaySales > 0 ? 100 : 0

  // ── Open shifts ──
  const openShifts = await db.shift.findMany({
    where: { status: "OPEN" },
    include: { user: { select: { name: true } } },
    orderBy: { openedAt: "desc" },
    take: 20,
  })

  // ── Low stock products ──
  const lowStockProducts = await db.product.findMany({
    where: { quantity: { lte: db.product.fields.reorderLevel } },
    select: { id: true, name: true, quantity: true, reorderLevel: true, barcode: true },
    orderBy: { quantity: "asc" },
    take: 20,
  })

  // ── Pending purchase orders ──
  const pendingPurchaseOrders = await db.purchaseOrder.findMany({
    where: { status: { in: ["PENDING", "PENDING_APPROVAL", "APPROVED"] } },
    include: { supplier: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  })

  // ── Outstanding supplier payables ──
  // Sum of all POSTED purchase invoices that have no journal entry linked
  // (unpaid). This is a simplification — a full AP aging would need a
  // dedicated accounts payable account reconciliation.
  const unpaidInvoices = await db.purchaseInvoice.findMany({
    where: { status: "POSTED", journalEntryId: null },
    include: { supplier: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  })
  const supplierMap = new Map<string, { name: string; balance: number }>()
  for (const inv of unpaidInvoices) {
    const key = inv.supplierId
    const existing = supplierMap.get(key)
    if (existing) {
      existing.balance += Number(inv.total)
    } else {
      supplierMap.set(key, { name: inv.supplier?.name ?? "—", balance: Number(inv.total) })
    }
  }
  const outstandingPayables = Array.from(supplierMap.entries()).map(([id, v]) => ({ id, ...v }))
  const totalPayables = outstandingPayables.reduce((sum, s) => sum + s.balance, 0)

  // ── Void/refund rate ──
  // From audit logs: count VOID_ITEM + SALE_REFUNDED actions in the last 7 days
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const [voidCount, refundCount, totalSalesCount7d] = await Promise.all([
    db.auditLog.count({
      where: { action: "VOID_ITEM", createdAt: { gte: sevenDaysAgo } },
    }),
    db.auditLog.count({
      where: { action: "SALE_REFUNDED", createdAt: { gte: sevenDaysAgo } },
    }),
    db.sale.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    }),
  ])
  const voidRefundCount = voidCount + refundCount
  const voidRefundRate = totalSalesCount7d > 0
    ? (voidRefundCount / totalSalesCount7d) * 100
    : 0

  // ── Top selling products today ──
  const todaySaleItems = await db.saleItem.findMany({
    where: { sale: { createdAt: { gte: todayStart, lte: todayEnd } } },
    include: { product: { select: { name: true, imageUrl: true } } },
  })
  const productMap = new Map<string, { name: string; imageUrl?: string | null; qty: number; revenue: number }>()
  for (const it of todaySaleItems) {
    const key = it.productId
    const existing = productMap.get(key)
    const qty = it.quantity - (it.returnedQty ?? 0)
    const revenue = Number(it.subtotal)
    if (existing) {
      existing.qty += qty
      existing.revenue += revenue
    } else {
      productMap.set(key, {
        name: it.product?.name ?? "—",
        imageUrl: it.product?.imageUrl ?? null,
        qty,
        revenue,
      })
    }
  }
  const topProductsToday = Array.from(productMap.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5)

  return NextResponse.json({
    todaySales,
    yesterdaySales,
    salesChangePct: +salesChangePct.toFixed(1),
    todaySalesCount: todayAgg._count,
    yesterdaySalesCount: yesterdayAgg._count,
    openShifts: openShifts.map((s) => ({
      id: s.id,
      cashierName: s.user?.name ?? "—",
      openedAt: String(s.openedAt),
      openingBalance: Number(s.openingBalance ?? 0),
    })),
    lowStockProducts: lowStockProducts.map((p) => ({
      ...p,
      quantity: Number(p.quantity),
      reorderLevel: Number(p.reorderLevel),
    })),
    pendingPurchaseOrders: pendingPurchaseOrders.map((po) => ({
      id: po.id,
      status: po.status,
      total: Number(po.total),
      supplierName: po.supplier?.name ?? "—",
      createdAt: String(po.createdAt),
    })),
    outstandingPayables: outstandingPayables.map((s) => ({
      id: s.id,
      name: s.name,
      balance: s.balance,
    })),
    totalPayables: +totalPayables.toFixed(3),
    voidRefundRate: +voidRefundRate.toFixed(1),
    voidRefundCount,
    totalSalesCount7d,
    topProductsToday,
    generatedAt: now.toISOString(),
  })
}
