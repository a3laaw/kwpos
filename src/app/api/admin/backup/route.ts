import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { hasRole } from "@/lib/session"
import { logAuditEvent } from "@/lib/audit"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/admin/backup
 *
 * Triggers a FULL database backup. Exports every business table as JSON
 * (users without passwordHash, products, categories, units, warehouses,
 * customers, suppliers, accounts, settings, sales+items, purchaseOrders+
 * items, journalEntries+lines, shifts, promotions, bundles, compositions,
 * plus the related child rows: stockItems, suspendedSales, exchangeSales
 * +lines, purchaseInvoices+items, customsAnnexes, supplierPayments,
 * purchaseReturns+items, stockTakes+items, stockTransfers+items,
 * spotChecks, priceChanges, expenseTransactions, auditLogs, bundleItems,
 * compositionIngredients).
 *
 * Returns the JSON as a downloadable file (Content-Disposition: attachment)
 * named `kwpos-backup-YYYY-MM-DDTHH-mm-ss.json`.
 *
 * Auth: OWNER/ADMIN only + production gate (ENABLE_ADMIN_DDL).
 */
export async function GET() {
  // ── Production gate ────────────────────────────────────────────────
  // Backup exports the entire DB. Treat it the same as other admin DDL/
  // destructive routes — disabled in production unless ENABLE_ADMIN_DDL
  // is set. (Backup is non-destructive, but it leaks all business data,
  // so we keep the same gate to prevent accidental mass export from a
  // live store.)
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_ADMIN_DDL !== "true"
  ) {
    return NextResponse.json(
      { error: "admin-ddl-disabled-in-production" },
      { status: 403 }
    )
  }

  // ── Auth + role gate ───────────────────────────────────────────────
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  if (!hasRole(user.role, ["OWNER", "ADMIN"] as Role[])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  try {
    // ── Master data ────────────────────────────────────────────────
    // Users: explicitly exclude passwordHash — never export credentials.
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        posExpressMode: true,
        warehouseId: true,
        passwordStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    const categories = await db.category.findMany()
    const units = await db.unit.findMany()
    const suppliers = await db.supplier.findMany()
    const warehouses = await db.warehouse.findMany()
    const products = await db.product.findMany()
    const accounts = await db.account.findMany()
    const settings = await db.setting.findMany()
    const customers = await db.customer.findMany()

    // ── Per-warehouse stock levels ─────────────────────────────────
    const stockItems = await db.stockItem.findMany()

    // ── Sales + items ──────────────────────────────────────────────
    const sales = await db.sale.findMany()
    const saleItems = await db.saleItem.findMany()
    const suspendedSales = await db.suspendedSale.findMany()
    const exchangeSales = await db.exchangeSale.findMany()
    const exchangeLines = await db.exchangeLine.findMany()

    // ── Purchases ──────────────────────────────────────────────────
    const purchaseOrders = await db.purchaseOrder.findMany()
    const purchaseOrderItems = await db.purchaseOrderItem.findMany()
    const purchaseInvoices = await db.purchaseInvoice.findMany()
    const purchaseInvoiceItems = await db.purchaseInvoiceItem.findMany()
    const customsAnnexes = await db.customsAnnex.findMany()
    const supplierPayments = await db.supplierPayment.findMany()
    const purchaseReturns = await db.purchaseReturn.findMany()
    const purchaseReturnItems = await db.purchaseReturnItem.findMany()

    // ── Accounting ────────────────────────────────────────────────
    const journalEntries = await db.journalEntry.findMany()
    const journalLines = await db.journalLine.findMany()
    const expenseTransactions = await db.expenseTransaction.findMany()

    // ── Shifts ─────────────────────────────────────────────────────
    const shifts = await db.shift.findMany()

    // ── Pricing / promotions ───────────────────────────────────────
    const promotions = await db.promotion.findMany()
    const priceChanges = await db.priceChange.findMany()

    // ── Bundles + compositions ────────────────────────────────────
    const bundles = await db.bundle.findMany()
    const bundleItems = await db.bundleItem.findMany()
    const compositions = await db.composition.findMany()
    const compositionIngredients = await db.compositionIngredient.findMany()

    // ── Inventory ops ─────────────────────────────────────────────
    const stockTakes = await db.stockTake.findMany()
    const stockTakeItems = await db.stockTakeItem.findMany()
    const stockTransfers = await db.stockTransfer.findMany()
    const stockTransferItems = await db.stockTransferItem.findMany()
    const spotChecks = await db.spotCheck.findMany()

    // ── Audit log (last, since it can grow large) ──────────────────
    const auditLogs = await db.auditLog.findMany()

    const payload = {
      // Backup format version. Bump when the shape of this file changes
      // so the restore route can branch on incompatible versions.
      format: "kwpos-backup",
      version: 1,
      // ISO timestamp of when the export was generated (server clock).
      generatedAt: new Date().toISOString(),
      // Source DB identifier — useful when comparing backups from
      // different environments (e.g. staging vs production).
      source: process.env.DIRECT_DATABASE_URL
        ? "supabase-direct"
        : process.env.DATABASE_URL
          ? "supabase-pooler"
          : "unknown",
      counts: {
        users: users.length,
        categories: categories.length,
        units: units.length,
        suppliers: suppliers.length,
        warehouses: warehouses.length,
        products: products.length,
        accounts: accounts.length,
        settings: settings.length,
        customers: customers.length,
        stockItems: stockItems.length,
        sales: sales.length,
        saleItems: saleItems.length,
        suspendedSales: suspendedSales.length,
        exchangeSales: exchangeSales.length,
        exchangeLines: exchangeLines.length,
        purchaseOrders: purchaseOrders.length,
        purchaseOrderItems: purchaseOrderItems.length,
        purchaseInvoices: purchaseInvoices.length,
        purchaseInvoiceItems: purchaseInvoiceItems.length,
        customsAnnexes: customsAnnexes.length,
        supplierPayments: supplierPayments.length,
        purchaseReturns: purchaseReturns.length,
        purchaseReturnItems: purchaseReturnItems.length,
        journalEntries: journalEntries.length,
        journalLines: journalLines.length,
        expenseTransactions: expenseTransactions.length,
        shifts: shifts.length,
        promotions: promotions.length,
        priceChanges: priceChanges.length,
        bundles: bundles.length,
        bundleItems: bundleItems.length,
        compositions: compositions.length,
        compositionIngredients: compositionIngredients.length,
        stockTakes: stockTakes.length,
        stockTakeItems: stockTakeItems.length,
        stockTransfers: stockTransfers.length,
        stockTransferItems: stockTransferItems.length,
        spotChecks: spotChecks.length,
        auditLogs: auditLogs.length,
      },
      data: {
        users,
        categories,
        units,
        suppliers,
        warehouses,
        products,
        accounts,
        settings,
        customers,
        stockItems,
        sales,
        saleItems,
        suspendedSales,
        exchangeSales,
        exchangeLines,
        purchaseOrders,
        purchaseOrderItems,
        purchaseInvoices,
        purchaseInvoiceItems,
        customsAnnexes,
        supplierPayments,
        purchaseReturns,
        purchaseReturnItems,
        journalEntries,
        journalLines,
        expenseTransactions,
        shifts,
        promotions,
        priceChanges,
        bundles,
        bundleItems,
        compositions,
        compositionIngredients,
        stockTakes,
        stockTakeItems,
        stockTransfers,
        stockTransferItems,
        spotChecks,
        auditLogs,
      },
    }

    // ── Audit-log the backup ────────────────────────────────────────
    try {
      await logAuditEvent({
        userId: user.id,
        userName: user.name,
        action: "BACKUP_EXPORT",
        description: `تصدير نسخة احتياطية كاملة (${payload.counts.sales} فاتورة، ${payload.counts.products} منتج) بواسطة ${user.name || user.id}`,
        metadata: JSON.stringify(payload.counts),
      })
    } catch (e: any) {
      // Non-fatal — the export already succeeded.
      console.error(
        "[backup] AuditLog write FAILED (export succeeded but no audit record):",
        e?.message
      )
    }

    // ── Return as a downloadable file ───────────────────────────────
    const json = JSON.stringify(payload, null, 2)
    const ts = new Date().toISOString().replace(/[:.]/g, "-")
    const filename = `kwpos-backup-${ts}.json`

    return new NextResponse(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    })
  } catch (e: any) {
    console.error("[backup] export failed:", e?.message)
    return NextResponse.json(
      {
        error: "backup-failed",
        detail: String(e?.message || e).slice(0, 200),
      },
      { status: 500 }
    )
  }
}
