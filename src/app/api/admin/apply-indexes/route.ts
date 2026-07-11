import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, hasRole } from "@/lib/session"
import { db } from "@/lib/db"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * One-time admin endpoint to apply DB indexes declared in prisma/schema.prisma.
 *
 * Why this exists: `prisma db push` can't run from the local sandbox (no
 * valid DB password after rotation). Instead, this endpoint runs CREATE INDEX
 * IF NOT EXISTS statements server-side using the Vercel DATABASE_URL env var
 * (which has the rotated password).
 *
 * Idempotent — safe to call multiple times. Requires ADMIN role.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const indexes: Array<{ name: string; table: string; cols: string }> = [
    { name: "Product_categoryId_idx", table: '"Product"', cols: '"categoryId"' },
    { name: "Product_supplierId_idx", table: '"Product"', cols: '"supplierId"' },
    { name: "Product_barcode_idx", table: '"Product"', cols: '"barcode"' },
    { name: "Product_name_idx", table: '"Product"', cols: '"name"' },
    { name: "StockItem_warehouseId_idx", table: '"StockItem"', cols: '"warehouseId"' },
    { name: "PurchaseOrder_supplierId_idx", table: '"PurchaseOrder"', cols: '"supplierId"' },
    { name: "PurchaseOrder_status_idx", table: '"PurchaseOrder"', cols: '"status"' },
    { name: "PurchaseOrder_createdAt_idx", table: '"PurchaseOrder"', cols: '"createdAt"' },
    { name: "PurchaseOrderItem_purchaseOrderId_idx", table: '"PurchaseOrderItem"', cols: '"purchaseOrderId"' },
    { name: "PurchaseOrderItem_productId_idx", table: '"PurchaseOrderItem"', cols: '"productId"' },
    { name: "Sale_createdAt_idx", table: '"Sale"', cols: '"createdAt"' },
    { name: "Sale_userId_idx", table: '"Sale"', cols: '"userId"' },
    { name: "Sale_customerId_idx", table: '"Sale"', cols: '"customerId"' },
    { name: "Sale_paymentMethod_idx", table: '"Sale"', cols: '"paymentMethod"' },
    { name: "SaleItem_saleId_idx", table: '"SaleItem"', cols: '"saleId"' },
    { name: "SaleItem_productId_idx", table: '"SaleItem"', cols: '"productId"' },
    { name: "Account_parentId_idx", table: '"Account"', cols: '"parentId"' },
    { name: "Account_type_idx", table: '"Account"', cols: '"type"' },
    { name: "ExpenseTransaction_accountId_idx", table: '"ExpenseTransaction"', cols: '"accountId"' },
    { name: "ExpenseTransaction_type_idx", table: '"ExpenseTransaction"', cols: '"type"' },
    { name: "ExpenseTransaction_date_idx", table: '"ExpenseTransaction"', cols: '"date"' },
    { name: "Customer_phone_idx", table: '"Customer"', cols: '"phone"' },
    { name: "JournalEntry_sourceType_idx", table: '"JournalEntry"', cols: '"sourceType"' },
    { name: "JournalEntry_date_idx", table: '"JournalEntry"', cols: '"date"' },
    { name: "JournalLine_journalEntryId_idx", table: '"JournalLine"', cols: '"journalEntryId"' },
    { name: "JournalLine_accountId_idx", table: '"JournalLine"', cols: '"accountId"' },
    { name: "Shift_userId_idx", table: '"Shift"', cols: '"userId"' },
    { name: "Shift_status_idx", table: '"Shift"', cols: '"status"' },
    { name: "Shift_openedAt_idx", table: '"Shift"', cols: '"openedAt"' },
    { name: "SpotCheck_productId_idx", table: '"SpotCheck"', cols: '"productId"' },
    { name: "SpotCheck_userId_idx", table: '"SpotCheck"', cols: '"userId"' },
    { name: "SpotCheck_createdAt_idx", table: '"SpotCheck"', cols: '"createdAt"' },
    { name: "SuspendedSale_userId_idx", table: '"SuspendedSale"', cols: '"userId"' },
    { name: "SuspendedSale_status_idx", table: '"SuspendedSale"', cols: '"status"' },
    { name: "SuspendedSale_createdAt_idx", table: '"SuspendedSale"', cols: '"createdAt"' },
    { name: "ExchangeLine_exchangeId_idx", table: '"ExchangeLine"', cols: '"exchangeId"' },
    { name: "ExchangeLine_productId_idx", table: '"ExchangeLine"', cols: '"productId"' },
    { name: "Promotion_productId_idx", table: '"Promotion"', cols: '"productId"' },
    { name: "Promotion_isActive_idx", table: '"Promotion"', cols: '"isActive"' },
    { name: "Promotion_startAt_endAt_idx", table: '"Promotion"', cols: '"startAt", "endAt"' },
    { name: "PriceChange_productId_idx", table: '"PriceChange"', cols: '"productId"' },
    { name: "PriceChange_changedAt_idx", table: '"PriceChange"', cols: '"changedAt"' },
    { name: "PurchaseInvoiceItem_productId_idx", table: '"PurchaseInvoiceItem"', cols: '"productId"' },
  ]

  const applied: string[] = []
  const skipped: string[] = []
  const errors: Array<{ index: string; error: string }> = []

  for (const idx of indexes) {
    const sql = `CREATE INDEX IF NOT EXISTS "${idx.name}" ON ${idx.table} (${idx.cols})`
    try {
      await db.$executeRawUnsafe(sql)
      applied.push(idx.name)
    } catch (e: any) {
      const msg = String(e?.message || e)
      if (msg.includes("already exists")) {
        skipped.push(idx.name)
      } else {
        errors.push({ index: idx.name, error: msg.slice(0, 200) })
      }
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    appliedCount: applied.length,
    skippedCount: skipped.length,
    errorCount: errors.length,
    applied,
    skipped,
    errors,
    totalIndexes: indexes.length,
  })
}
