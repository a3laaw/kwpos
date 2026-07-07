# Tests — KWPOS Integration Suite

Hermetic Vitest integration tests for the most critical business logic of the
KWPOS Next.js 16 POS/ERP system. Tests run against an **in-memory-file SQLite
database** (not the production Supabase PostgreSQL cluster) so they're fast
and don't pollute real data.

## Run

```bash
bun run test          # run all tests once
bun run test:watch    # watch mode (re-run on file change)
bun run test:ui       # Vitest UI in the browser
```

## What's covered (6 scenarios)

| # | File | Business rule under test |
|---|---|---|
| 1 | `sale-stock-warehouses.test.ts` | POS sale stock check is per-warehouse (StockItem), not aggregate. A sale against warehouse A with 2 units fails for qty=3 even if `Product.quantity = 2`. |
| 2 | `sale-concurrency.test.ts` | Two simultaneous sales for the last unit → exactly one succeeds (no oversell). |
| 3 | `journal-rollback.test.ts` | When `createJournalEntry` throws inside the sale `$transaction`, the sale is rolled back: no Sale, no SaleItem, no stock decrement, no journal lines. |
| 4 | `supplier-payment-limit.test.ts` | Payment > outstanding balance → 400 `exceeds-balance`. ADMIN + `override:true` → 201. Payment within balance → 201. Non-admin override → still 400. |
| 5 | `shift-expected-totals.test.ts` | Closing a shift computes expected totals from sales by THAT shift's `userId` only — not all sales. Cashier 1's shift sees 500, not 800, even when cashier 2 made 300 in parallel. |
| 6 | `vat-report.test.ts` | PO receive with `taxRate > 0` contributes `inputVatPOReceives`; after posting a PurchaseInvoice for the same PO the VAT moves to `inputVatInvoices` and the PO-receive bucket is excluded (no double-count). |

## Architecture

### Test database (SQLite, hermetic)

```
prisma/schema.test.prisma   ← SQLite provider, separate generator output
prisma/test.db              ← file DB, recreated before every test run
node_modules/.prisma/test-client  ← separately-generated PrismaClient
```

`tests/setup.ts` runs once per Vitest worker and:

1. Sets `DATABASE_URL=file:./prisma/test.db` BEFORE any Prisma import.
2. Deletes `prisma/test.db` (and any `-journal`/`-wal`/`-shm` siblings).
3. Runs `bunx prisma generate --schema prisma/schema.test.prisma` to produce
   a SQLite-aware PrismaClient at `node_modules/.prisma/test-client`.
4. Runs `bunx prisma db push --schema prisma/schema.test.prisma` to create
   the tables.
5. Instantiates the test PrismaClient and assigns it to `globalThis.prisma`.

Because `src/lib/db.ts` reuses `globalThis.prisma` when present (and the test
client exposes the same `purchaseInvoice` delegate that the reuse-guard
checks for), **every** API route / helper that imports `db` from `@/lib/db`
transparently talks to SQLite during tests — no production code path is
forked.

### Test isolation

`resetDatabase()` truncates every table in dependency order. Each test file
calls it in `beforeEach`, then re-seeds the shared fixtures (1 ADMIN user +
the 6 system accounts 1010/1020/2010/4010/5070/4060). Each test creates
whatever extra data it needs.

### Session mocking

Route handlers call `getCurrentUser()` from `@/lib/session`, which normally
goes through NextAuth. Each test file uses `vi.mock("@/lib/session", ...)`
with a hoisted `mockGetCurrentUser` so the test can swap users per test
(e.g. downgrade to WAREHOUSE to verify override-permission checks).

### Calling route handlers directly

Next.js App Router route handlers are plain async functions. Tests import
them directly (`import { POST } from "@/app/api/sales/route"`) and call them
with a `NextRequest` built by `makeJsonRequest(method, pathname, body,
search?)`. No HTTP server, no Next.js runtime — the route runs in the Vitest
Node process against the SQLite DB.

## Notes & simplifications

### `FOR UPDATE` row locks (production-only)

`decrementStockItem` (in `src/lib/db.ts`) and the PO receive route use
PostgreSQL's `SELECT ... FOR UPDATE` for row-level locking. SQLite doesn't
support this clause. We wrapped both call sites in `try/catch` so the lock
attempt is best-effort: on PostgreSQL (production) it locks the row; on
SQLite (tests) it's a no-op and we rely on SQLite's serializable transaction
isolation. **No production behavior changed** — PostgreSQL still executes
the `FOR UPDATE`.

### Concurrency test (scenario 2)

On SQLite, two parallel `$transaction` calls for the last unit serialize
via SQLite's database-level write lock. The losing transaction either:
- sees the committed `qty=0` and returns `400 stock-insufficient`, OR
- surfaces `SQLITE_BUSY_SNAPSHOT` which the route's `.catch` wraps into a
  `500`.

Both outcomes are valid "failures" — the test asserts the invariant
(exactly one `201`, exactly one `>= 400`, final stock `0`, exactly one
Sale record) rather than the specific failure status code. On PostgreSQL
the loser would always be `400 stock-insufficient` because the
`FOR UPDATE` lock prevents the snapshot conflict.

### Why a separate Prisma client (not just a different DATABASE_URL)?

The PrismaClient generated from `provider = "postgresql"` embeds the
Postgres query engine binary and cannot connect to a SQLite file. Generating
the test schema separately (with `provider = "sqlite"`) produces a
SQLite-aware client. The two clients have the same delegate API, so
`@/lib/db`'s `db` reference works against either.

## CI

`.github/workflows/test.yml` runs `bun install` + `bun run test` on every
push and pull request. The `DATABASE_URL` env var is set explicitly to
`file:./prisma/test.db` (matching `tests/setup.ts`).

## Files

```
tests/
├── setup.ts                              # global setup + helpers
├── sale-stock-warehouses.test.ts         # scenario 1
├── sale-concurrency.test.ts              # scenario 2
├── journal-rollback.test.ts              # scenario 3
├── supplier-payment-limit.test.ts        # scenario 4
├── shift-expected-totals.test.ts         # scenario 5
└── vat-report.test.ts                    # scenario 6
prisma/
└── schema.test.prisma                    # SQLite test schema
vitest.config.ts                          # Vitest config (node env, sequential)
.github/workflows/test.yml                # CI workflow
```
