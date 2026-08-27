/**
 * Production Backup CLI — exports all KWPOS tables to a timestamped JSON file.
 *
 * Run from the project root:
 *
 *   bun run scripts/backup-prod.ts
 *
 * Optional flags:
 *   --out <dir>     Output directory (default: ./backups/)
 *   --quiet         Suppress progress logs (still prints the final path)
 *
 * The script connects to Supabase using the SAME env vars as the Next.js
 * app: `DIRECT_DATABASE_URL` (preferred) or `DATABASE_URL`. This way you
 * don't need to hardcode credentials — load .env first:
 *
 *   bash -c 'set -a; . ./.env; set +a; bun run scripts/backup-prod.ts'
 *
 * The output file is named `kwpos-backup-YYYY-MM-DDTHH-mm-ss.json` and
 * has the exact same shape as the file produced by GET /api/admin/backup,
 * so it can be restored via the UI button or POST /api/admin/backup/restore.
 *
 * Suggested cron (nightly at 02:30 server time):
 *   30 2 * * * cd /path/to/kwpos && bash -c 'set -a; . ./.env; set +a; bun run scripts/backup-prod.ts --quiet' >> /var/log/kwpos-backup.log 2>&1
 */
import { PrismaClient } from "@prisma/client"
import { writeFileSync, mkdirSync, existsSync } from "node:fs"
import { resolve, join } from "node:path"

// ── Parse CLI flags ──────────────────────────────────────────────────────
const argv = process.argv.slice(2)
let outDir = resolve(process.cwd(), "backups")
let quiet = false
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i]
  if (arg === "--out" && argv[i + 1]) {
    outDir = resolve(argv[++i])
  } else if (arg === "--quiet") {
    quiet = true
  } else if (arg === "--help" || arg === "-h") {
    console.log(`Usage: bun run scripts/backup-prod.ts [--out <dir>] [--quiet]
  --out <dir>   Output directory (default: ./backups/)
  --quiet       Suppress progress logs`)
    process.exit(0)
  }
}

function log(...args: any[]) {
  if (!quiet) console.log(...args)
}

// ── Connect to the DB ────────────────────────────────────────────────────
// Prefer DIRECT_DATABASE_URL (port 5432, no pgbouncer) — same strategy as
// src/lib/db.ts. Fall back to DATABASE_URL. If neither is set, bail out.
const datasourceUrl =
  process.env.DIRECT_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim()
if (!datasourceUrl) {
  console.error("❌ FATAL: Neither DIRECT_DATABASE_URL nor DATABASE_URL is set.")
  console.error("   Load .env first: bash -c 'set -a; . ./.env; set +a; bun run scripts/backup-prod.ts'")
  process.exit(1)
}

const prisma = new PrismaClient({
  datasourceUrl,
  log: ["error"],
})

async function main() {
  log("🔄 KWPOS production backup starting...")
  log(`   Output dir: ${outDir}`)

  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true })
  }

  // ── Master data ──────────────────────────────────────────────────────
  log("   Fetching master data...")
  const users = await prisma.user.findMany({
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
  const categories = await prisma.category.findMany()
  const units = await prisma.unit.findMany()
  const suppliers = await prisma.supplier.findMany()
  const warehouses = await prisma.warehouse.findMany()
  const products = await prisma.product.findMany()
  const accounts = await prisma.account.findMany()
  const settings = await prisma.setting.findMany()
  const customers = await prisma.customer.findMany()

  // ── Per-warehouse stock levels ──────────────────────────────────────
  log("   Fetching stock levels...")
  const stockItems = await prisma.stockItem.findMany()

  // ── Sales + items ────────────────────────────────────────────────────
  log("   Fetching sales...")
  const sales = await prisma.sale.findMany()
  const saleItems = await prisma.saleItem.findMany()
  const suspendedSales = await prisma.suspendedSale.findMany()
  const exchangeSales = await prisma.exchangeSale.findMany()
  const exchangeLines = await prisma.exchangeLine.findMany()

  // ── Purchases ────────────────────────────────────────────────────────
  log("   Fetching purchases...")
  const purchaseOrders = await prisma.purchaseOrder.findMany()
  const purchaseOrderItems = await prisma.purchaseOrderItem.findMany()
  const purchaseInvoices = await prisma.purchaseInvoice.findMany()
  const purchaseInvoiceItems = await prisma.purchaseInvoiceItem.findMany()
  const customsAnnexes = await prisma.customsAnnex.findMany()
  const supplierPayments = await prisma.supplierPayment.findMany()
  const purchaseReturns = await prisma.purchaseReturn.findMany()
  const purchaseReturnItems = await prisma.purchaseReturnItem.findMany()

  // ── Accounting ──────────────────────────────────────────────────────
  log("   Fetching accounting...")
  const journalEntries = await prisma.journalEntry.findMany()
  const journalLines = await prisma.journalLine.findMany()
  const expenseTransactions = await prisma.expenseTransaction.findMany()

  // ── Shifts + spot-checks ────────────────────────────────────────────
  log("   Fetching shifts...")
  const shifts = await prisma.shift.findMany()
  const spotChecks = await prisma.spotCheck.findMany()

  // ── Pricing ──────────────────────────────────────────────────────────
  log("   Fetching pricing...")
  const promotions = await prisma.promotion.findMany()
  const priceChanges = await prisma.priceChange.findMany()

  // ── Bundles + compositions ──────────────────────────────────────────
  log("   Fetching bundles + compositions...")
  const bundles = await prisma.bundle.findMany()
  const bundleItems = await prisma.bundleItem.findMany()
  const compositions = await prisma.composition.findMany()
  const compositionIngredients = await prisma.compositionIngredient.findMany()

  // ── Inventory ops ───────────────────────────────────────────────────
  log("   Fetching inventory ops...")
  const stockTakes = await prisma.stockTake.findMany()
  const stockTakeItems = await prisma.stockTakeItem.findMany()
  const stockTransfers = await prisma.stockTransfer.findMany()
  const stockTransferItems = await prisma.stockTransferItem.findMany()

  // ── Audit log (last — largest) ─────────────────────────────────────
  log("   Fetching audit log...")
  const auditLogs = await prisma.auditLog.findMany()

  // ── Assemble the backup payload (same shape as GET /api/admin/backup) ─
  const payload = {
    format: "kwpos-backup",
    version: 1,
    generatedAt: new Date().toISOString(),
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

  const json = JSON.stringify(payload, null, 2)
  const ts = new Date().toISOString().replace(/[:.]/g, "-")
  const filename = `kwpos-backup-${ts}.json`
  const fullPath = join(outDir, filename)
  writeFileSync(fullPath, json, "utf8")

  const sizeKB = Math.round((json.length / 1024) * 10) / 10
  log("\n✅ Backup complete.")
  log(`   File: ${fullPath}`)
  log(`   Size: ${sizeKB} KB`)
  log(`   Generated at: ${payload.generatedAt}`)
  log(`   Total rows: ${Object.values(payload.counts).reduce((a, b) => a + b, 0)}`)
}

main()
  .catch((e) => {
    console.error("\n❌ FATAL:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
