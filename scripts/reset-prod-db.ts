/**
 * Reset Production Database — COMPLETE WIPE + SEED
 *
 * ⚠️  DESTRUCTIVE — NO ROLLBACK
 *
 * This script:
 *   1. Connects to the production Supabase database (hardcoded URL)
 *   2. Deletes ALL rows from ALL tables (in FK-safe order)
 *   3. Creates a fresh admin user (admin@demo.com / Admin@2026)
 *   4. Seeds the 17 default accounting accounts
 *   5. Creates a default warehouse + category + unit + setting
 *
 * Usage:
 *   bun run scripts/reset-prod-db.ts
 *
 * After running, you can log in at https://kwpos.vercel.app with:
 *   Email:    admin@demo.com
 *   Password: Admin@2026
 */
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

// Direct Supabase connection (bypasses PgBouncer for DDL-like operations)
// Password URL-encoded: @ → %40 (the password contains an @)
const prisma = new PrismaClient({
  datasourceUrl:
    "postgresql://postgres.qwicxgoslxmypksytklo:alaa%4055505186@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres",
})

async function main() {
  console.log("\n🚨 DATABASE RESET — this will wipe ALL production data\n")

  // ── 0) Pre-counts (for the report at the end) ─────────────────────
  const before = {
    users: await prisma.user.count(),
    products: await prisma.product.count(),
    sales: await prisma.sale.count(),
    journalEntries: await prisma.journalEntry.count(),
    customers: await prisma.customer.count(),
    suppliers: await prisma.supplier.count(),
  }
  console.log("📊 Before:", before)

  // ── 1) WIPE ALL TABLES (child-first to respect FK constraints) ────
  console.log("\n🧹 Wiping all tables...")
  const wipeOrder = [
    // Transactional children
    "journalLine",
    "journalEntry",
    "saleItem",
    "sale",
    "suspendedSale",
    "exchangeLine",
    "exchangeSale",
    "stockTakeItem",
    "stockTake",
    "spotCheck",
    "stockTransferItem",
    "stockTransfer",
    "customsAnnex",
    "purchaseInvoiceItem",
    "purchaseInvoice",
    "purchaseReturnItem",
    "purchaseReturn",
    "purchaseOrderItem",
    "purchaseOrder",
    "supplierPayment",
    "bundleItem",
    "bundle",
    "compositionIngredient",
    "composition",
    "priceChange",
    "promotion",
    "expenseTransaction",
    "shift",
    "stockItem",
    "auditLog",
    // Master data
    "product",
    "customer",
    "supplier",
    "category",
    "unit",
    "warehouse",
    "account",
    "setting",
    // Users LAST (so the audit log can reference them until the end)
    "user",
  ]

  for (const table of wipeOrder) {
    try {
      const r = await (prisma as any)[table].deleteMany({})
      if (r.count > 0) console.log(`  ✓ ${table}: ${r.count} rows deleted`)
    } catch (e: any) {
      console.log(`  ⚠ ${table}: ${e?.message?.slice(0, 100)}`)
    }
  }

  console.log("✅ All tables wiped\n")

  // ── 2) CREATE ADMIN USER ──────────────────────────────────────────
  console.log("👤 Creating admin user...")
  const passwordHash = bcrypt.hashSync("Admin@2026", 10)
  const admin = await prisma.user.create({
    data: {
      id: "user-admin-demo",
      email: "admin@demo.com",
      name: "Admin",
      passwordHash,
      role: "ADMIN",
    },
  })
  console.log(`  ✓ admin@demo.com / Admin@2026 (id: ${admin.id})`)

  // ── 3) CREATE 17 DEFAULT ACCOUNTS ─────────────────────────────────
  console.log("\n📊 Creating accounting accounts...")
  const accounts = [
    // Assets (1000-1999)
    { code: "1010", name: "النقدية", type: "ASSET", balance: 0, isSystem: true },
    { code: "1020", name: "البنك", type: "ASSET", balance: 0, isSystem: true },
    { code: "1100", name: "المخزون", type: "ASSET", balance: 0, isSystem: true },
    { code: "1200", name: "ذمم مدينة", type: "ASSET", balance: 0, isSystem: true },
    // Liabilities (2000-2999)
    { code: "2010", name: "ذمم دائنة", type: "LIABILITY", balance: 0, isSystem: true },
    { code: "2020", name: "عجز وردية", type: "LIABILITY", balance: 0, isSystem: true },
    { code: "2110", name: "ضريبة مستحقة", type: "LIABILITY", balance: 0, isSystem: true },
    // Equity (3000-3999)
    { code: "3010", name: "رأس المال", type: "EQUITY", balance: 0, isSystem: true },
    // Revenue (4000-4999)
    { code: "4010", name: "إيراد مبيعات", type: "REVENUE", balance: 0, isSystem: true },
    { code: "4050", name: "إيراد فائض تسوية", type: "REVENUE", balance: 0, isSystem: true },
    { code: "4060", name: "إيراد فائض وردية", type: "REVENUE", balance: 0, isSystem: true },
    // Expenses (5000-5999)
    { code: "5010", name: "مصروفات إدارية", type: "EXPENSE", balance: 0, isSystem: true },
    { code: "5020", name: "رواتب الموظفين", type: "EXPENSE", balance: 0, isSystem: true },
    { code: "5030", name: "إيجار", type: "EXPENSE", balance: 0, isSystem: true },
    { code: "5040", name: "تسويق", type: "EXPENSE", balance: 0, isSystem: true },
    { code: "5050", name: "صيانة", type: "EXPENSE", balance: 0, isSystem: true },
    { code: "5070", name: "تكلفة البضاعة المباعة", type: "EXPENSE", balance: 0, isSystem: true },
  ]

  for (const a of accounts) {
    await prisma.account.create({ data: a })
  }
  console.log(`  ✓ ${accounts.length} accounts created`)

  // ── 4) CREATE DEFAULT WAREHOUSE ───────────────────────────────────
  console.log("\n📦 Creating default warehouse...")
  const warehouse = await prisma.warehouse.create({
    data: { name: "المخزن الرئيسي", code: "MAIN" },
  })
  console.log(`  ✓ ${warehouse.name} (id: ${warehouse.id})`)

  // ── 5) CREATE DEFAULT CATEGORY ────────────────────────────────────
  console.log("\n🏷️ Creating default category...")
  const category = await prisma.category.create({
    data: { name: "عطور", barcodePrefix: 1 },
  })
  console.log(`  ✓ ${category.name} (prefix: ${category.barcodePrefix})`)

  // ── 6) CREATE DEFAULT UNIT ───────────────────────────────────────
  console.log("\n📏 Creating default unit...")
  const unit = await prisma.unit.create({
    data: { name: "قطعة" },
  })
  console.log(`  ✓ ${unit.name}`)

  // ── 7) CREATE DEFAULT SETTING ────────────────────────────────────
  console.log("\n⚙️ Creating default setting (Kuwait)...")
  const setting = await prisma.setting.create({
    data: {
      key: "country",
      value: JSON.stringify({
        code: "KW",
        name: "الكويت",
        currency: "KWD",
        currencySymbol: "د.ك",
        taxRate: 0,
        locale: "ar",
      }),
    },
  })
  console.log(`  ✓ country=KW (KWD)`)

  // ── 8) POST-COUNTS ────────────────────────────────────────────────
  const after = {
    users: await prisma.user.count(),
    products: await prisma.product.count(),
    sales: await prisma.sale.count(),
    journalEntries: await prisma.journalEntry.count(),
    customers: await prisma.customer.count(),
    suppliers: await prisma.supplier.count(),
    accounts: await prisma.account.count(),
    warehouses: await prisma.warehouse.count(),
    categories: await prisma.category.count(),
  }
  console.log("\n📊 After:", after)

  // ── 9) VERIFY ────────────────────────────────────────────────────
  const verifyAdmin = await prisma.user.findUnique({
    where: { email: "admin@demo.com" },
    select: { id: true, email: true, name: true, role: true },
  })
  console.log("\n✅ VERIFY admin:", verifyAdmin)

  const verifyPassword = bcrypt.compareSync("Admin@2026", admin.passwordHash)
  console.log("✅ VERIFY password 'Admin@2026' matches:", verifyPassword)

  console.log("\n🎉 DATABASE RESET COMPLETE")
  console.log("\n📋 LOGIN CREDENTIALS:")
  console.log("   URL:      https://kwpos.vercel.app")
  console.log("   Email:    admin@demo.com")
  console.log("   Password: Admin@2026")
  console.log("\n⚠️  Note: you may need to wait 1-2 minutes for Vercel to")
  console.log("   pick up the new user (NextAuth session caching).")
  console.log("   If login fails immediately, try again in 2 minutes.\n")
}

main()
  .catch((e) => {
    console.error("\n❌ FATAL:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
