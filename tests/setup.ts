/**
 * Per-file Vitest setup — runs once for each test file.
 *
 * Responsibilities (the heavy one-time work of generating + pushing the
 * SQLite schema lives in tests/globalSetup.ts and runs ONCE before all
 * files):
 *   1. Set `DATABASE_URL` env var to the SQLite test DB BEFORE any Prisma
 *      client is imported.
 *   2. Instantiate the test PrismaClient (from the separately-generated
 *      `node_modules/.prisma/test-client`) and assign it to
 *      `globalThis.prisma` so the production `@/lib/db` module reuses it.
 *   3. Export `testDb` + helpers (`resetDatabase`, `seedBaseFixtures`,
 *      `makeJsonRequest`) for tests to use.
 *
 * NOTE: tests run sequentially (fileParallelism=false) because SQLite is a
 * single file and concurrent writes would error with SQLITE_BUSY.
 */
import path from "node:path"
import { createRequire } from "node:module"

const requireFromTest = createRequire(import.meta.url)

// 1) Env — must be set BEFORE importing any Prisma client.
process.env.DATABASE_URL = "file:./prisma/test.db"
process.env.DIRECT_DATABASE_URL = "file:./prisma/test.db"
// Tests don't need NextAuth sessions (we mock getCurrentUser per-file).
process.env.NEXTAUTH_SECRET = "test-secret-not-real"
process.env.AUDIT_INTERNAL_SECRET = "test-audit-secret"

const repoRoot = path.resolve(__dirname, "..")

// 2) Instantiate the test client. We require from the absolute path so Node
// resolves the generated client at `node_modules/.prisma/test-client`
// (output of the SQLite test schema). The default `@prisma/client` build is
// PostgreSQL-only and cannot talk to a SQLite file.
const testClientPath = path.join(
  repoRoot,
  "node_modules",
  ".prisma",
  "test-client",
  "index.js"
)
const { PrismaClient } = requireFromTest(testClientPath) as {
  PrismaClient: new (opts?: any) => any
}

const prisma = new PrismaClient({
  // Silence Prisma's noisy logs. The sale/receive routes use
  // `SELECT ... FOR UPDATE` (Postgres-only) which throws on SQLite; we
  // catch that in `decrementStockItem`/the receive route, but Prisma still
  // emits an `error` log. Muting keeps the test output readable.
  log: [],
})

// Make the production `@/lib/db` reuse this test client. `@/lib/db`'s
// module-level code checks `globalThis.prisma` and reuses it if present
// (and if it exposes the `purchaseInvoice` delegate — which the test
// client does, since the test schema mirrors the production schema).
;(globalThis as any).prisma = prisma

// 3) Expose helpers for tests.
export const testDb = prisma

/**
 * Truncate every table in the test DB. Call this in `beforeEach` for full
 * test isolation. Tables are wiped in dependency order to avoid FK errors.
 */
export async function resetDatabase(): Promise<void> {
  const tableOrder = [
    "auditLog",
    "journalLine",
    "journalEntry",
    "saleItem",
    "sale",
    "stockTakeItem",
    "stockTake",
    "stockTransferItem",
    "stockTransfer",
    "spotCheck",
    "suspendedSale",
    "exchangeLine",
    "exchangeSale",
    "supplierPayment",
    "purchaseReturnItem",
    "purchaseReturn",
    "purchaseInvoiceItem",
    "purchaseInvoice",
    "purchaseOrderItem",
    "purchaseOrder",
    "bundleItem",
    "bundle",
    "compositionIngredient",
    "composition",
    "priceChange",
    "promotion",
    "stockItem",
    "shift",
    "expenseTransaction",
    "product",
    "warehouse",
    "supplier",
    "customer",
    "category",
    "unit",
    "account",
    "user",
    "setting",
  ]
  for (const table of tableOrder) {
    try {
      await (prisma as any)[table].deleteMany({})
    } catch (e) {
      console.warn(`[setup] failed to wipe ${table}:`, (e as Error).message)
    }
  }
}

/**
 * Seed the minimal shared fixtures every test needs:
 *   - 1 ADMIN user (email admin@test.local)
 *   - System accounts 1010 (Cash), 1020 (Bank), 2010 (AP),
 *     4010 (Sales Revenue), 5070 (Stock Shortage), 4060 (Cash Overage).
 *
 * Returns the admin id + a map of account code → id.
 */
export async function seedBaseFixtures(): Promise<{
  adminId: string
  adminEmail: string
  accounts: Record<string, string>
}> {
  const admin = await prisma.user.create({
    data: {
      email: "admin@test.local",
      name: "Test Admin",
      passwordHash: "$2a$10$dummyhashdummyhashdummyhashdummyhashdummyhashdummy",
      role: "ADMIN",
    },
  })

  const accounts = {
    "1010": "Cash",
    "1020": "Bank",
    "2010": "Accounts Payable",
    "4010": "Sales Revenue",
    "5070": "Stock Shortage",
    "4060": "Cash Overage",
  }
  const accountIds: Record<string, string> = {}
  for (const [code, name] of Object.entries(accounts)) {
    const type =
      code.startsWith("1")
        ? "ASSET"
        : code.startsWith("2")
          ? "LIABILITY"
          : code.startsWith("4")
            ? "REVENUE"
            : "EXPENSE"
    const acc = await prisma.account.create({
      data: { code, name, type, balance: 0, isSystem: true },
    })
    accountIds[code] = acc.id
  }

  return { adminId: admin.id, adminEmail: admin.email, accounts: accountIds }
}

/**
 * Helper: build a NextRequest with a JSON body for POST/PATCH/DELETE routes,
 * or a GET with query params.
 *
 * The route handlers use `req.json()` / `req.text()` + `new URL(req.url)` +
 * `req.nextUrl.searchParams`, so we construct a fully-formed NextRequest
 * against a fake localhost URL.
 */
export function makeJsonRequest(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  pathname: string,
  body?: unknown,
  search?: Record<string, string>
): import("next/server").NextRequest {
  const { NextRequest } = requireFromTest("next/server") as typeof import("next/server")
  const url = new URL(`http://localhost${pathname}`)
  if (search) {
    for (const [k, v] of Object.entries(search)) url.searchParams.set(k, v)
  }
  const init: RequestInit = { method }
  if (body !== undefined) {
    init.body = JSON.stringify(body)
    init.headers = { "content-type": "application/json" }
  }
  return new NextRequest(url.toString(), init)
}
