import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * GET /api/notifications
 *
 * Computes alerts on-demand (no DB storage — avoids stale data).
 * Returns a list of notifications relevant to the current user's role:
 *
 *   - LOW_STOCK: products with quantity <= reorderLevel
 *     (ADMIN, MANAGER, WAREHOUSE)
 *   - OVERDUE_PAYABLE: POSTED purchase invoices without journalEntryId
 *     (ADMIN, MANAGER, ACCOUNTANT)
 *   - OPEN_SHIFT: shifts still OPEN after 12 hours
 *     (ADMIN, MANAGER)
 *   - HIGH_VOID_RATE: void/refund rate above 10% in the last 7 days
 *     (ADMIN, MANAGER)
 *   - PENDING_PO: purchase orders in PENDING/PENDING_APPROVAL/APPROVED
 *     (ADMIN, MANAGER, WAREHOUSE)
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const isManager = hasRole(user.role, ["OWNER", "ADMIN" as Role, "MANAGER" as Role])
  const isWarehouse = hasRole(user.role, ["WAREHOUSE" as Role])
  const isAccountant = hasRole(user.role, ["ACCOUNTANT" as Role])
  const canSeeInventory = isManager || isWarehouse
  const canSeePayables = isManager || isAccountant

  const notifications: any[] = []

  // ── LOW_STOCK ──
  if (canSeeInventory) {
    const lowStock = await db.product.findMany({
      where: { quantity: { lte: db.product.fields.reorderLevel } },
      select: { id: true, name: true, quantity: true, reorderLevel: true, costPrice: true, defaultSupplierId: true },
      orderBy: { quantity: "asc" },
      take: 10,
    })
    for (const p of lowStock) {
      notifications.push({
        id: `low-stock-${p.id}`,
        type: "LOW_STOCK",
        severity: p.quantity === 0 ? "critical" : "warning",
        title: p.quantity === 0 ? "نفد من المخزون" : "مخزون منخفض",
        message: `${p.name} — الكمية: ${p.quantity} (حد إعادة الطلب: ${p.reorderLevel})`,
        actionLabel: "إنشاء أمر شراء",
        actionType: "CREATE_PO",
        actionData: { productId: p.id, productName: p.name, supplierId: p.defaultSupplierId },
        createdAt: new Date().toISOString(),
      })
    }
  }

  // ── OVERDUE_PAYABLE ──
  if (canSeePayables) {
    const unpaid = await db.purchaseInvoice.findMany({
      where: { status: "POSTED", journalEntryId: null },
      include: { supplier: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
      take: 10,
    })
    for (const inv of unpaid) {
      const daysOld = Math.floor((Date.now() - new Date(inv.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      if (daysOld >= 30) { // overdue after 30 days
        notifications.push({
          id: `overdue-payable-${inv.id}`,
          type: "OVERDUE_PAYABLE",
          severity: "warning",
          title: "دفعة مستحقة متأخرة",
          message: `فاتورة ${inv.invoiceNo} — ${inv.supplier?.name ?? "—"}: ${Number(inv.total)} د.ك (${daysOld} يوم)`,
          actionLabel: "سداد",
          actionType: "NAVIGATE",
          actionData: { view: "purchases" },
          createdAt: inv.createdAt.toISOString(),
        })
      }
    }
  }

  // ── OPEN_SHIFT (after 12 hours) ──
  if (isManager) {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000)
    const longShifts = await db.shift.findMany({
      where: { status: "OPEN", openedAt: { lte: twelveHoursAgo } },
      include: { user: { select: { name: true } } },
    })
    for (const s of longShifts) {
      const hoursOpen = Math.floor((Date.now() - new Date(s.openedAt).getTime()) / (1000 * 60 * 60))
      notifications.push({
        id: `open-shift-${s.id}`,
        type: "OPEN_SHIFT",
        severity: "info",
        title: "وردية مفتوحة منذ فترة طويلة",
        message: `${s.user?.name ?? "—"} — مفتوحة منذ ${hoursOpen} ساعة`,
        actionLabel: "عرض الورديات",
        actionType: "NAVIGATE",
        actionData: { view: "shifts" },
        createdAt: s.openedAt.toISOString(),
      })
    }
  }

  // ── HIGH_VOID_RATE ──
  if (isManager) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const [voidCount, refundCount, totalSales] = await Promise.all([
      db.auditLog.count({ where: { action: "VOID_ITEM", createdAt: { gte: sevenDaysAgo } } }),
      db.auditLog.count({ where: { action: "SALE_REFUNDED", createdAt: { gte: sevenDaysAgo } } }),
      db.sale.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    ])
    const rate = totalSales > 0 ? ((voidCount + refundCount) / totalSales) * 100 : 0
    if (rate > 10) {
      notifications.push({
        id: "high-void-rate",
        type: "HIGH_VOID_RATE",
        severity: "critical",
        title: "نسبة حذف/مرتجعات مرتفعة",
        message: `${rate.toFixed(1)}% خلال آخر 7 أيام (${voidCount + refundCount} من ${totalSales} مبيعة)`,
        actionLabel: "عرض سجل التدقيق",
        actionType: "NAVIGATE",
        actionData: { view: "audit" },
        createdAt: new Date().toISOString(),
      })
    }
  }

  // ── PENDING_PO ──
  if (canSeeInventory) {
    const pendingPOs = await db.purchaseOrder.findMany({
      where: { status: { in: ["PENDING", "PENDING_APPROVAL", "APPROVED"] } },
      include: { supplier: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    })
    for (const po of pendingPOs) {
      notifications.push({
        id: `pending-po-${po.id}`,
        type: "PENDING_PO",
        severity: "info",
        title: "أمر شراء معلّق",
        message: `${po.supplier?.name ?? "—"} — ${Number(po.total)} د.ك (${po.status})`,
        actionLabel: "عرض المشتريات",
        actionType: "NAVIGATE",
        actionData: { view: "purchases" },
        createdAt: po.createdAt.toISOString(),
      })
    }
  }

  // Sort by severity (critical > warning > info) then by createdAt
  const severityOrder = { critical: 0, warning: 1, info: 2 }
  notifications.sort((a, b) => {
    const s = severityOrder[a.severity as keyof typeof severityOrder] - severityOrder[b.severity as keyof typeof severityOrder]
    if (s !== 0) return s
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return NextResponse.json({
    items: notifications,
    count: notifications.length,
    unreadCount: notifications.length, // all are "unread" until clicked
  })
}
