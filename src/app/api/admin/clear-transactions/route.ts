import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { logAuditEvent } from "@/lib/audit"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * POST /api/admin/clear-transactions
 *
 * TEMPORARY — DESTROYATIVE ENDPOINT.
 *
 * Wipes ALL transactional data so the system can be reset to a clean
 * state (keeping products, customers, suppliers, accounts, users,
 * settings, warehouses, categories, units). Intended for pre-go-live
 * testing only. Remove this route after the system is in production.
 *
 * What gets deleted (in dependency-safe order):
 *   1. SaleItem  → Sale
 *   2. SuspendedSale
 *   3. ExchangeLine → ExchangeSale
 *   4. StockTakeItem → StockTake
 *   5. SpotCheck
 *   6. JournalLine → JournalEntry
 *   7. StockItem
 *   8. Product.quantity → 0  (bulk update)
 *   9. Customer.loyaltyPoints → 0  (bulk update)
 *
 * What is KEPT:
 *   - User, Category, Unit, Supplier, SupplierPayment, Product, Warehouse
 *   - Customer (only loyaltyPoints reset), Account, ExpenseTransaction
 *   - Setting, AuditLog, Bundle, BundleItem, Composition, CompositionIngredient
 *   - Promotion, PriceChange, PurchaseOrder + Items (not "transactions" in
 *     the sales/stock-take sense; kept to preserve purchase history)
 *   - PurchaseInvoice + Items + CustomsAnnex (same reason)
 *   - PurchaseReturn + Items (same)
 *   - StockTransfer + Items (same)
 *   - Shift (operational record; not a "transaction" in the sales sense)
 *
 * Permissions: OWNER + ADMIN only.
 * Confirmation: body must include { confirm: "DELETE" }.
 *
 * Audit: a single AuditLog record (action = "CLEAR_TRANSACTIONS") is
 * written AFTER the wipe completes, so the audit trail shows who did
 * it and when. This is the only record that survives the wipe.
 */
export async function POST(req: NextRequest) {
  // ── Auth + role gate ───────────────────────────────────────────────
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const role = user.role as Role
  if (role !== "OWNER" && role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  // ── Confirmation gate ──────────────────────────────────────────────
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 })
  }
  const confirm = String(body?.confirm || "").trim()
  if (confirm !== "DELETE") {
    return NextResponse.json(
      {
        error: "confirmation-required",
        hint: 'Send { "confirm": "DELETE" } in the request body to confirm.',
      },
      { status: 400 }
    )
  }

  const counts: Record<string, number> = {}

  // ── 1) SaleItem → Sale ─────────────────────────────────────────────
  // Order matters: child first, then parent. Prisma deleteMany on parent
  // would fail on FK constraint if children still reference it.
  try {
    counts.saleItems = (await db.saleItem.deleteMany({})).count
  } catch (e: any) {
    console.error("[clear-transactions] SaleItem delete failed:", e?.message)
    return NextResponse.json(
      { error: "delete-failed", stage: "saleItem", detail: String(e?.message || e).slice(0, 200) },
      { status: 500 }
    )
  }
  try {
    counts.sales = (await db.sale.deleteMany({})).count
  } catch (e: any) {
    console.error("[clear-transactions] Sale delete failed:", e?.message)
    return NextResponse.json(
      { error: "delete-failed", stage: "sale", detail: String(e?.message || e).slice(0, 200) },
      { status: 500 }
    )
  }

  // ── 2) SuspendedSale (no children) ─────────────────────────────────
  try {
    counts.suspendedSales = (await db.suspendedSale.deleteMany({})).count
  } catch (e: any) {
    console.error("[clear-transactions] SuspendedSale delete failed:", e?.message)
    return NextResponse.json(
      { error: "delete-failed", stage: "suspendedSale", detail: String(e?.message || e).slice(0, 200) },
      { status: 500 }
    )
  }

  // ── 3) ExchangeLine → ExchangeSale ─────────────────────────────────
  try {
    counts.exchangeLines = (await db.exchangeLine.deleteMany({})).count
  } catch (e: any) {
    console.error("[clear-transactions] ExchangeLine delete failed:", e?.message)
    return NextResponse.json(
      { error: "delete-failed", stage: "exchangeLine", detail: String(e?.message || e).slice(0, 200) },
      { status: 500 }
    )
  }
  try {
    counts.exchangeSales = (await db.exchangeSale.deleteMany({})).count
  } catch (e: any) {
    console.error("[clear-transactions] ExchangeSale delete failed:", e?.message)
    return NextResponse.json(
      { error: "delete-failed", stage: "exchangeSale", detail: String(e?.message || e).slice(0, 200) },
      { status: 500 }
    )
  }

  // ── 4) StockTakeItem → StockTake ───────────────────────────────────
  try {
    counts.stockTakeItems = (await db.stockTakeItem.deleteMany({})).count
  } catch (e: any) {
    console.error("[clear-transactions] StockTakeItem delete failed:", e?.message)
    return NextResponse.json(
      { error: "delete-failed", stage: "stockTakeItem", detail: String(e?.message || e).slice(0, 200) },
      { status: 500 }
    )
  }
  try {
    counts.stockTakes = (await db.stockTake.deleteMany({})).count
  } catch (e: any) {
    console.error("[clear-transactions] StockTake delete failed:", e?.message)
    return NextResponse.json(
      { error: "delete-failed", stage: "stockTake", detail: String(e?.message || e).slice(0, 200) },
      { status: 500 }
    )
  }

  // ── 5) SpotCheck (no children) ─────────────────────────────────────
  try {
    counts.spotChecks = (await db.spotCheck.deleteMany({})).count
  } catch (e: any) {
    console.error("[clear-transactions] SpotCheck delete failed:", e?.message)
    return NextResponse.json(
      { error: "delete-failed", stage: "spotCheck", detail: String(e?.message || e).slice(0, 200) },
      { status: 500 }
    )
  }

  // ── 6) JournalLine → JournalEntry ──────────────────────────────────
  try {
    counts.journalLines = (await db.journalLine.deleteMany({})).count
  } catch (e: any) {
    console.error("[clear-transactions] JournalLine delete failed:", e?.message)
    return NextResponse.json(
      { error: "delete-failed", stage: "journalLine", detail: String(e?.message || e).slice(0, 200) },
      { status: 500 }
    )
  }
  try {
    counts.journalEntries = (await db.journalEntry.deleteMany({})).count
  } catch (e: any) {
    console.error("[clear-transactions] JournalEntry delete failed:", e?.message)
    return NextResponse.json(
      { error: "delete-failed", stage: "journalEntry", detail: String(e?.message || e).slice(0, 200) },
      { status: 500 }
    )
  }

  // ── 7) StockItem (all warehouse quantities) ────────────────────────
  try {
    counts.stockItems = (await db.stockItem.deleteMany({})).count
  } catch (e: any) {
    console.error("[clear-transactions] StockItem delete failed:", e?.message)
    return NextResponse.json(
      { error: "delete-failed", stage: "stockItem", detail: String(e?.message || e).slice(0, 200) },
      { status: 500 }
    )
  }

  // ── 8) Reset Product.quantity → 0 (all products) ───────────────────
  try {
    const productResult = await db.product.updateMany({
      data: { quantity: 0 },
    })
    counts.productsReset = productResult.count
  } catch (e: any) {
    console.error("[clear-transactions] Product.quantity reset failed:", e?.message)
    return NextResponse.json(
      { error: "reset-failed", stage: "product-quantity", detail: String(e?.message || e).slice(0, 200) },
      { status: 500 }
    )
  }

  // ── 9) Reset Customer.loyaltyPoints → 0 (all customers) ────────────
  try {
    const customerResult = await db.customer.updateMany({
      data: { loyaltyPoints: 0 },
    })
    counts.customersReset = customerResult.count
  } catch (e: any) {
    console.error("[clear-transactions] Customer.loyaltyPoints reset failed:", e?.message)
    return NextResponse.json(
      { error: "reset-failed", stage: "customer-loyalty", detail: String(e?.message || e).slice(0, 200) },
      { status: 500 }
    )
  }

  // ── 10) Audit log (the ONLY surviving record of this action) ───────
  try {
    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: "CLEAR_TRANSACTIONS",
      description: `مسح كامل للفواتير والجرد والقيود المحاسبية بواسطة ${user.name || user.id}`,
      metadata: JSON.stringify(counts),
    })
  } catch (e: any) {
    // Non-fatal — the wipe already succeeded. Log loudly.
    console.error(
      "[clear-transactions] AuditLog write FAILED (wipe succeeded but no audit record):",
      e?.message
    )
  }

  return NextResponse.json({
    ok: true,
    message: "All transactional data cleared. System is now in a clean state.",
    counts,
  })
}
