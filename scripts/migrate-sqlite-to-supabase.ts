/**
 * SQLite → Supabase (PostgreSQL) data migration script.
 *
 * Usage:
 *   1. Ensure schema.prisma provider is "postgresql" + DATABASE_URL points to Supabase pooled URL
 *   2. Run: bun scripts/migrate-sqlite-to-supabase.ts
 *
 * This script reads all data from the local SQLite backup using a read-only
 * Prisma client, then writes it to the Supabase PostgreSQL database using
 * the active Prisma client (configured via DATABASE_URL env var).
 *
 * It preserves all IDs, relationships, and data integrity.
 */

import { PrismaClient } from "@prisma/client"
import { createClient } from "@libsql/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"
import * as path from "path"

// ─── Source: SQLite (read-only) ────────────────────────────────────
const SQLITE_PATH = path.resolve(process.cwd(), "db/custom-backup-2026-07-05.db")

const sqliteLibsql = createClient({
  url: `file:${SQLITE_PATH}`,
})
const sqliteAdapter = new PrismaLibSql({ url: `file:${SQLITE_PATH}` })
const source = new PrismaClient({
  adapter: sqliteAdapter,
  log: ["error"],
})

// ─── Destination: Supabase PostgreSQL (active DATABASE_URL) ────────
const dest = new PrismaClient({
  log: ["error", "warn"],
})

// ─── Migration order (respects FK constraints) ─────────────────────
const TABLES: Array<{ name: string; model: string }> = [
  { name: "User", model: "user" },
  { name: "Category", model: "category" },
  { name: "Unit", model: "unit" },
  { name: "Supplier", model: "supplier" },
  { name: "Customer", model: "customer" },
  { name: "Warehouse", model: "warehouse" },
  { name: "Product", model: "product" },
  { name: "StockItem", model: "stockItem" },
  { name: "Account", model: "account" },
  { name: "PurchaseOrder", model: "purchaseOrder" },
  { name: "PurchaseOrderItem", model: "purchaseOrderItem" },
  { name: "Sale", model: "sale" },
  { name: "SaleItem", model: "saleItem" },
  { name: "JournalEntry", model: "journalEntry" },
  { name: "JournalLine", model: "journalLine" },
  { name: "ExpenseTransaction", model: "expenseTransaction" },
  { name: "Shift", model: "shift" },
  { name: "SpotCheck", model: "spotCheck" },
  { name: "SuspendedSale", model: "suspendedSale" },
  { name: "ExchangeSale", model: "exchangeSale" },
  { name: "ExchangeLine", model: "exchangeLine" },
  { name: "Promotion", model: "promotion" },
  { name: "PriceChange", model: "priceChange" },
  { name: "Setting", model: "setting" },
]

async function migrate() {
  console.log("═══════════════════════════════════════════════════════")
  console.log("  SQLite → Supabase PostgreSQL Migration")
  console.log("═══════════════════════════════════════════════════════")
  console.log(`  Source: ${SQLITE_PATH}`)
  console.log(`  Destination: ${process.env.DATABASE_URL?.slice(0, 50)}...`)
  console.log("═══════════════════════════════════════════════════════\n")

  let totalMigrated = 0
  let totalErrors = 0

  for (const { name, model } of TABLES) {
    try {
      // Read all rows from SQLite
      const rows = await (source as any)[model].findMany()
      console.log(`  ${name}: ${rows.length} rows found`)

      if (rows.length === 0) {
        console.log(`    → skipped (empty)\n`)
        continue
      }

      // Write to PostgreSQL in batches of 50
      const BATCH_SIZE = 50
      let migrated = 0
      let errors = 0

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE)
        try {
          // Use createMany for bulk insert (PostgreSQL supports it)
          await (dest as any)[model].createMany({
            data: batch,
            skipDuplicates: true,
          })
          migrated += batch.length
        } catch (batchErr: any) {
          // If createMany fails, try one by one
          for (const row of batch) {
            try {
              await (dest as any)[model].create({ data: row })
              migrated++
            } catch (rowErr: any) {
              errors++
              if (errors <= 3) {
                console.log(`    ⚠ Row error: ${rowErr.message?.slice(0, 100)}`)
              }
            }
          }
        }
      }

      totalMigrated += migrated
      totalErrors += errors
      console.log(`    → migrated: ${migrated}, errors: ${errors}\n`)
    } catch (err: any) {
      console.log(`  ${name}: FAILED — ${err.message?.slice(0, 100)}\n`)
      totalErrors++
    }
  }

  console.log("═══════════════════════════════════════════════════════")
  console.log(`  MIGRATION COMPLETE`)
  console.log(`  Total rows migrated: ${totalMigrated}`)
  console.log(`  Total errors: ${totalErrors}`)
  console.log("═══════════════════════════════════════════════════════")
}

migrate()
  .catch((e) => {
    console.error("Migration failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await source.$disconnect()
    await dest.$disconnect()
  })
