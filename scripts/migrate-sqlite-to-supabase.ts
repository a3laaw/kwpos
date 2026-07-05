/**
 * SQLite → Supabase (PostgreSQL) data migration script (v3).
 *
 * Handles all SQLite→PostgreSQL type conversions:
 * - DateTime: epoch-ms integer → ISO string
 * - Boolean: 0/1 integer → true/false
 * - Float: stays as number
 *
 * Usage:
 *   DATABASE_URL=... DIRECT_DATABASE_URL=... bun scripts/migrate-sqlite-to-supabase.ts
 */

import { PrismaClient } from "@prisma/client"
import { Database } from "bun:sqlite"
import * as path from "path"

const SQLITE_PATH = path.resolve(process.cwd(), "db/custom-backup-2026-07-05.db")
const sqlite = new Database(SQLITE_PATH, { readonly: true })
const dest = new PrismaClient({ log: ["error"] })

const DATE_FIELDS = new Set([
  "createdAt", "updatedAt", "openedAt", "closedAt", "startAt", "endAt",
  "date", "payDate", "resumedAt", "changedAt",
])

const BOOL_FIELDS: Record<string, Set<string>> = {
  Warehouse: new Set(["isActive"]),
  Account: new Set(["isSystem"]),
  Promotion: new Set(["isActive"]),
  ExchangeLine: new Set(["isReturn"]),
  PurchaseOrder: new Set(["landedCostApplied"]),
}

function convertRow(row: any, table: string): any {
  const out: any = {}
  const bools = BOOL_FIELDS[table] || new Set()
  for (const [key, val] of Object.entries(row)) {
    if (DATE_FIELDS.has(key) && typeof val === "number") {
      out[key] = new Date(val).toISOString()
    } else if (bools.has(key) && typeof val === "number") {
      out[key] = val !== 0
    } else {
      out[key] = val
    }
  }
  return out
}

const TABLES: Array<{ model: string; table: string }> = [
  { model: "user", table: "User" },
  { model: "category", table: "Category" },
  { model: "unit", table: "Unit" },
  { model: "supplier", table: "Supplier" },
  { model: "customer", table: "Customer" },
  { model: "warehouse", table: "Warehouse" },
  { model: "product", table: "Product" },
  { model: "stockItem", table: "StockItem" },
  { model: "account", table: "Account" },
  { model: "purchaseOrder", table: "PurchaseOrder" },
  { model: "purchaseOrderItem", table: "PurchaseOrderItem" },
  { model: "sale", table: "Sale" },
  { model: "saleItem", table: "SaleItem" },
  { model: "journalEntry", table: "JournalEntry" },
  { model: "journalLine", table: "JournalLine" },
  { model: "expenseTransaction", table: "ExpenseTransaction" },
  { model: "shift", table: "Shift" },
  { model: "spotCheck", table: "SpotCheck" },
  { model: "suspendedSale", table: "SuspendedSale" },
  { model: "exchangeSale", table: "ExchangeSale" },
  { model: "exchangeLine", table: "ExchangeLine" },
  { model: "promotion", table: "Promotion" },
  { model: "priceChange", table: "PriceChange" },
  { model: "setting", table: "Setting" },
]

async function migrate() {
  console.log("═══════════════════════════════════════════════════════")
  console.log("  SQLite → Supabase PostgreSQL Migration (v3)")
  console.log("═══════════════════════════════════════════════════════\n")

  let totalMigrated = 0
  let totalErrors = 0

  for (const { model, table } of TABLES) {
    const rawRows = sqlite.prepare(`SELECT * FROM "${table}"`).all()
    console.log(`  ${table}: ${rawRows.length} rows`)

    if (rawRows.length === 0) {
      console.log(`    → skipped\n`)
      continue
    }

    let migrated = 0
    let errors = 0

    for (const rawRow of rawRows) {
      try {
        const row = convertRow(rawRow, table)
        await (dest as any)[model].create({ data: row })
        migrated++
      } catch (err: any) {
        errors++
        if (errors <= 1) {
          console.log(`    ⚠ ${err.message?.slice(0, 200)}`)
        }
      }
    }

    totalMigrated += migrated
    totalErrors += errors
    console.log(`    → ${migrated}/${rawRows.length} OK, ${errors} errors\n`)
  }

  console.log("═══════════════════════════════════════════════════════")
  console.log(`  COMPLETE: ${totalMigrated} migrated, ${totalErrors} errors`)
  console.log("═══════════════════════════════════════════════════════")

  sqlite.close()
  await dest.$disconnect()
}

migrate().catch((e) => {
  console.error("FATAL:", e)
  sqlite.close()
  process.exit(1)
})
