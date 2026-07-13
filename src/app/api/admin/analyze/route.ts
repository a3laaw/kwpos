import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/** Admin endpoint to run ANALYZE on all tables (updates query planner stats). */
export async function POST_handler_disabled(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const tables = [
    "Product", "Category", "Supplier", "Unit", "Warehouse", "StockItem",
    "PurchaseOrder", "PurchaseOrderItem", "Sale", "SaleItem", "User",
    "Account", "ExpenseTransaction", "Customer", "Setting",
    "JournalEntry", "JournalLine", "Shift", "SpotCheck",
    "SuspendedSale", "ExchangeSale", "ExchangeLine",
    "Promotion", "PriceChange", "PurchaseInvoice", "PurchaseInvoiceItem",
  ]

  let ok = 0
  let fail = 0
  for (const t of tables) {
    try {
      await db.$executeRawUnsafe(`ANALYZE "${t}"`)
      ok++
    } catch {
      fail++
    }
  }

  return NextResponse.json({ ok: fail === 0, analyzed: ok, failed: fail, total: tables.length })
}

// Disabled in production — DDL should only run via Prisma migrations.
export async function POST(req: any) {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_ADMIN_DDL !== 'true') {
    return Response.json({ error: "admin-ddl-disabled-in-production" }, { status: 403 })
  }
  return POST_handler_disabled(req)
}
