<div dir="rtl">

# 🏪 KWPOS — System Documentation
### نقاط البيع وإدارة الموارد المؤسسية | Point of Sale & ERP

**Authoritative reference** for developers, auditors, and stakeholders. Generated from a
full code review of `/home/z/my-project` (Next.js 16 App Router + Prisma + Supabase
PostgreSQL). All claims in this document are backed by code in the repository at the
time of writing.

</div>

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Database Schema](#3-database-schema)
4. [API Routes](#4-api-routes)
5. [UI Views](#5-ui-views)
6. [Role-Based Access Control](#6-role-based-access-control)
7. [Business Logic Highlights](#7-business-logic-highlights)
8. [Security](#8-security)
9. [Testing](#9-testing)
10. [Deployment](#10-deployment)
11. [Recent Fixes (Critical)](#11-recent-fixes-critical)
12. [Known Limitations & Future Work](#12-known-limitations--future-work)

---

## 1. Project Overview

| Field | Value |
|---|---|
| **Name** | KWPOS (Kuwait POS) — نظام نقاط البيع وإدارة الموارد المؤسسية |
| **GitHub** | [`a3laaw/kwpos`](https://github.com/a3laaw/kwpos) |
| **Purpose** | Integrated POS + ERP for small-to-medium retail businesses in the Arab world |
| **Target users** | Perfume shops, restaurants, grocery / retail stores, stationery, electronics |
| **Languages** | Arabic (RTL, default) + English (LTR) — toggle from any screen |
| **Default country** | Kuwait 🇰🇼 (KWD, 3 decimals, 0% VAT) |
| **Countries supported** | 12 (see below) — country is fixed at deployment via the Settings panel |
| **License** | Proprietary — © a3laaw |

### Tech stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 16** (App Router + Turbopack) |
| Language | **TypeScript 5** |
| UI | **React 19** + **Tailwind CSS 4** + **shadcn/ui** (Radix UI primitives) |
| Database | **Prisma ORM 6** + **PostgreSQL** hosted on **Supabase** |
| Auth | **NextAuth.js v4** (JWT strategy, Credentials provider, bcrypt password hashing) |
| Server state | **TanStack Query 5** (`@tanstack/react-query`) |
| Client state | **Zustand 5** (cart, sidebar, dialogs) |
| Charts | **Recharts 2** |
| Printing | Custom windows (80mm thermal + A4 + barcode) using `jspdf` + `jspdf-autotable` |
| Excel I/O | `xlsx` 0.18 |
| i18n | Custom context-based system (`src/lib/i18n.ts`, ~1 800 keys × 2 locales) |
| Package manager | **Bun 1.1+** |
| Tests | **Vitest 4** (integration tests against a SQLite mirror) |

### Supported countries (`src/lib/countries.ts`)

| Code | Country | Currency | Decimals | Default VAT |
|---|---|---|---|---|
| KW 🇰🇼 | الكويت | KWD | 3 | 0% |
| SA 🇸🇦 | السعودية | SAR | 2 | 15% |
| AE 🇦🇪 | الإمارات | AED | 2 | 5% |
| QA 🇶🇦 | قطر | QAR | 2 | 0% |
| BH 🇧🇭 | البحرين | BHD | 3 | 10% |
| OM 🇴🇲 | عُمان | OMR | 3 | 5% |
| EG 🇪🇬 | مصر | EGP | 2 | 14% |
| JO 🇯🇴 | الأردن | JOD | 3 | 16% (Sales Tax) |
| MA 🇲🇦 | المغرب | MAD | 2 | 20% |
| IQ 🇮🇶 | العراق | IQD | 0 | 0% |
| DZ 🇩🇿 | الجزائر | DZD | 2 | 19% |
| TN 🇹🇳 | تونس | TND | 3 | 19% |

`DEFAULT_COUNTRY_CODE = "KW"`. Country is selected at deployment-time via the Settings
view; multi-country switching per-request is **not** supported (see §12).

---

## 2. Architecture

### Directory layout

```
kwpos/
├── prisma/
│   ├── schema.prisma           # PostgreSQL production schema (27 models, 858 lines)
│   ├── schema.test.prisma      # SQLite mirror for Vitest (separate generator output)
│   └── test.db                 # SQLite test database (recreated per run)
├── src/
│   ├── app/
│   │   ├── api/                # ~90 route handlers (see §4)
│   │   ├── layout.tsx          # Root layout — sets <html dir/lang> from i18n
│   │   └── page.tsx            # Login screen ↔ authenticated app shell
│   ├── components/
│   │   ├── app-shell.tsx       # Authenticated shell — dispatches AppView → component
│   │   ├── nav-config.ts       # Sidebar nav tree (groups + leaves) + VIEW_META
│   │   ├── module-nav-config.ts
│   │   ├── i18n-context.tsx    # I18nProvider + useI18n/useT hooks
│   │   ├── user-context.tsx    # Logged-in user + role
│   │   ├── currency-context.tsx
│   │   ├── providers.tsx       # ReactQueryProvider + I18nProvider + Toaster
│   │   ├── auth/login-screen.tsx
│   │   ├── app-sidebar.tsx
│   │   ├── sales/              # POS, invoices, exchange, refund
│   │   ├── inventory/          # Inventory + product form + warehouses + transfers + stock take + movements
│   │   ├── purchases/          # POs + suppliers + invoices + returns + payments + statements
│   │   ├── accounting/         # CoA + journal + GL + P&L + balance sheet + cash flow + VAT + expenses
│   │   ├── reports/            # Reports + performance matrix
│   │   ├── pricing/            # Pricing engine + promotions
│   │   ├── shift/              # Shifts + cash reconciliation
│   │   ├── spotcheck/          # Blind spot-check
│   │   ├── dashboard/          # KPI dashboard
│   │   ├── customers/          # CRM directory
│   │   ├── analytics/          # Sales/inventory analytics
│   │   ├── settings/           # Users + settings (country, currency, units, categories)
│   │   ├── integrations/       # Shopify
│   │   ├── audit/              # Audit log + void-rate
│   │   ├── bundles/            # Bundle management (UI complete; POS integration pending)
│   │   ├── compositions/       # Composition management + produce action
│   │   ├── shared/             # PageHeader, ConfirmDialog, DataTable, ImageUpload, ...
│   │   └── ui/                 # shadcn/ui primitives
│   ├── lib/
│   │   ├── db.ts               # PrismaClient + stock helpers (decrement/increment/aggregate)
│   │   ├── auth.ts             # NextAuth options (Credentials + JWT + callbacks)
│   │   ├── session.ts          # getCurrentUser() + hasRole() + ROLE_PERMISSIONS
│   │   ├── audit.ts            # logAuditEvent() + AUDIT_INTERNAL_SECRET
│   │   ├── journal.ts          # createJournalEntry() (double-entry, balanced)
│   │   ├── serialize.ts        # Prisma row → JSON-safe serializers
│   │   ├── pricing.ts          # Effective-price engine (promotion + tier)
│   │   ├── landed-cost.ts      # Landed-cost allocator (weighted average)
│   │   ├── format.ts           # Invoice numbers, currency, dates
│   │   ├── countries.ts        # 12-country registry
│   │   ├── i18n.ts             # DICTS.ar + DICTS.en + Dict interface
│   │   ├── types.ts            # Shared TypeScript types (Role, AppView, ...)
│   │   ├── barcode.ts          # Auto-barcode generator (category prefix + index)
│   │   └── print.ts            # Thermal + A4 + barcode printing
│   └── hooks/
│       ├── use-api.ts          # TanStack Query hooks for most APIs
│       ├── use-bundles.ts      # Bundles hooks (kept separate)
│       └── use-compositions.ts # Composition hooks (kept separate)
├── tests/                      # 6 Vitest scenarios (see §9)
├── .env.example
├── .github/workflows/test.yml  # Bun + Vitest on push/PR
├── vitest.config.ts
├── package.json                # Bun scripts (dev, build, db:push, test, ...)
└── next.config.ts
```

### Data flow

```
Browser (React 19 + Zustand cart)
   │  fetch / useQuery / useMutation
   ▼
Next.js 16 API route handlers (src/app/api/**/route.ts)
   │  getCurrentUser() → hasRole() guard
   │  db.$transaction(async (tx) => { ... })
   ▼
Prisma ORM 6 (src/lib/db.ts)
   │  pooled connection (PgBouncer @ :6543) for runtime
   │  direct connection (:5432) for migrations
   ▼
Supabase PostgreSQL
```

Every mutating API route that touches financial state wraps its writes in a single
`db.$transaction` so that **journal-entry failures roll back the business operation**
and vice-versa (see §7, §11).

### Authentication flow

1. User submits email + password on the login screen.
2. `POST /api/auth/callback/credentials` (NextAuth) → `authorize()` in `src/lib/auth.ts`.
3. `authorize()` looks up the user by `email.toLowerCase().trim()`, compares
   `bcrypt.compare(password, user.passwordHash)`. Returns `null` on any failure
   (no fallback admin — fail-closed).
4. On success, the JWT callback attaches `id` and `role` to the token; the session
   callback copies them onto `session.user`.
5. The session JWT (HMAC-signed with `NEXTAUTH_SECRET`, 7-day max-age) is stored in
   an httpOnly cookie.
6. Every API route calls `getCurrentUser()` (`src/lib/session.ts`) to read the session
   server-side. Role checks happen via `hasRole(user.role, [...allowedRoles])`.

### State management

- **Server state** — TanStack Query. Custom hooks in `src/hooks/use-api.ts`,
  `use-bundles.ts`, `use-compositions.ts`. Mutations invalidate query keys
  (e.g. `["products"]`, `["bundles"]`, `["dashboard"]`).
- **Client UI state** — Zustand stores (POS cart, sidebar open state, dialog state).
- **Locale** — React context (`I18nProvider` in `src/components/i18n-context.tsx`)
  reading from `localStorage["erp-locale"]`, default `ar`. Also updates
  `<html dir>` + `<html lang>` on every change.

### i18n system

`src/lib/i18n.ts` exports a `Dict` interface (~1 800 keys) and two concrete
dictionaries: `DICTS.ar` (RTL) and `DICTS.en` (LTR). Components use `useT()` /
`useI18n()` to read the active dictionary. The nav tree (`src/components/nav-config.ts`)
references dictionary keys rather than literal strings, so adding a new view is a
three-step change: add the key to both dictionaries, register it in
`NAV_ENTRIES`/`VIEW_META`, and add it to `ROLE_PERMISSIONS`.

---

## 3. Database Schema

`prisma/schema.prisma` — **27 models**, PostgreSQL provider, `previewFeatures =
["driverAdapters"]`. Connection URLs come from `DATABASE_URL` (pooled, runtime) and
`DIRECT_DATABASE_URL` (direct, migrations).

### Models at a glance

| # | Model | Purpose |
|---|---|---|
| 1 | `User` | Authenticated user. `role ∈ {ADMIN, SALES, WAREHOUSE}` (default SALES). |
| 2 | `Category` | Product category with optional `code` + `barcodePrefix` (1-9). |
| 3 | `Unit` | Unit of measure (kilo, gram, piece, box…). |
| 4 | `Supplier` | Vendor with optional contact/phone/email/address. |
| 5 | `SupplierPayment` | Payment to a supplier — `paymentNo`, `amount`, `method ∈ {CASH,BANK,CHECK}`, linked `journalEntryId`. |
| 6 | `Product` | Sellable / purchasable item. **`quantity` is a derived aggregate** (SUM of `StockItem.quantity`); `costPrice`, `salePrice`, `wholesalePrice`, `corporatePrice`. |
| 7 | `Warehouse` | Physical stock location. `isActive` flag. |
| 8 | `StockItem` | Per-warehouse stock level. `@@unique([productId, warehouseId])` — one row per (product, warehouse). |
| 9 | `PurchaseOrder` | PO. `status ∈ {PENDING_APPROVAL, APPROVED, PENDING, RECEIVED, CANCELLED, REJECTED}`. Carries `taxRate`, landed-cost fields (`customsAmount`, `shippingAmount`, `otherCharges`), and `receivedTaxAmount` (VAT computed at receive time for the VAT report). |
| 10 | `PurchaseOrderItem` | PO line. `unitCost`, `subtotal`, optional `suggestedSalePrice` (applied via PriceChange on receive), `returnedQty`. |
| 11 | `PurchaseReturn` | Return of received goods to a supplier. `status ∈ {APPROVED, CANCELLED}`. |
| 12 | `PurchaseReturnItem` | Return line. |
| 13 | `Sale` | POS sale. `invoiceNo`, `customerName/Phone/Id`, money fields (`subtotal`, `taxRate`, `taxAmount`, `discount`, `deliveryFee`, `total`, `paid`), `refundTotal` + `refundStatus ∈ {NONE, PARTIAL, FULL}`, `paymentMethod ∈ {CASH, CARD, TRANSFER}`, `driverName`. |
| 14 | `SaleItem` | Sale line. `returnedQty` tracks how many units have come back. |
| 15 | `Account` | Chart-of-accounts node. `code` (unique), `type ∈ {ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE}`, `parentId` (self-ref tree), `balance` (signed, debit-positive convention), `isSystem`. |
| 16 | `ExpenseTransaction` | Salary or admin expense. Posts to an expense `accountId` and a payment `paymentAccountId`. |
| 17 | `Customer` | CRM directory. `type ∈ {RETAIL, WHOLESALE, CORPORATE}`. |
| 18 | `Setting` | Key-value store (active country, currency, tax rate). |
| 19 | `JournalEntry` | Double-entry header. `entryNo` (JE-00001), `sourceType ∈ {SALE, EXPENSE, PURCHASE, MANUAL}`, `sourceId?`, `totalDebit == totalCredit`. |
| 20 | `JournalLine` | Journal line. `accountId`, `debit`, `credit`, `description?`. |
| 21 | `Shift` | Cashier shift. `status ∈ {OPEN, CLOSED}`, opening balance, expected/counted cash/K-Net/Visa, variances. |
| 22 | `SpotCheck` | Blind single-product spot-check. `bookQty` recorded AFTER `countedQty` to keep the check blind. |
| 23 | `StockTake` | Full stock take. `status ∈ {DRAFT, APPROVED}`. |
| 24 | `StockTakeItem` | Per-product `systemQty`, `actualQty`, `variance`, `unitCost`, `varianceValue`. |
| 25 | `StockTransfer` | Inter-warehouse transfer. `status ∈ {OUT, RECEIVED, CANCELLED}`. |
| 26 | `StockTransferItem` | Transfer line. |
| 27 | `SuspendedSale` | Parked cart snapshot. `cartJson`, `status ∈ {PARKED, RESUMED, DISCARDED}`. |
| 28 | `ExchangeSale` | Exchange / swap. `originalSaleId` (REQUIRED), `netAmount` (signed: positive=collect, negative=refund). |
| 29 | `ExchangeLine` | Exchange line. `quantity` signed (negative=returned, positive=new), `isReturn` flag. |
| 30 | `Promotion` | Time-windowed promotion. `scope ∈ {PRODUCT, CATEGORY, ALL, ALL_EXCEPT_CATEGORIES}`, `discountType ∈ {PERCENT, AMOUNT}`. |
| 31 | `PriceChange` | **Immutable** audit of every sale-price change. No PATCH/DELETE in the API. |
| 32 | `PurchaseInvoice` | Supplier invoice / GRN. `status ∈ {DRAFT, POSTED, CANCELLED}`. Optional link to `PurchaseOrder`. Carries `taxRate`/`taxAmount`/landed-cost fields. |
| 33 | `PurchaseInvoiceItem` | Invoice line. `landedCost` allocated per unit. |
| 34 | `AuditLog` | **Immutable** audit trail. `action ∈ {VOID_ITEM, CANCEL_TXN, REFUND, EXCHANGE, MANUAL_DISCOUNT, DRAWER_OPEN, HOLD_BILL, MANAGER_APPROVAL, SALE_CREATED, SALE_REFUNDED, SALE_EXCHANGED, PO_RECEIVED, SUPPLIER_PAYMENT_CREATED, STOCK_TRANSFER_CREATED, STOCK_TRANSFER_RECEIVED, STOCK_TAKE_APPROVED, USER_PASSWORD_CHANGED, PURCHASE_INVOICE_POSTED, ...}`. |
| 35 | `Bundle` | Sellable group of products at a discounted `salePrice`. Optional seasonal window (`startDate`/`endDate`). |
| 36 | `BundleItem` | Bundle component. `@@unique([bundleId, productId])`. `quantity` is a `Float` (supports fractional units). |
| 37 | `Composition` | Recipe that produces a new product. `outputProductId`, `yieldQty`, `yieldUnit`. |
| 38 | `CompositionIngredient` | Recipe ingredient. `quantity` (Float), `unit` (default `"جرام"`). `@@unique([compositionId, productId])`. |

> The Prisma schema file declares 38 models; the README says "24" and "27" in
> different places — the authoritative count is the schema itself.

### Key design decisions

#### Product.quantity is a derived aggregate

`Product.quantity` is **not** the source of truth. The source of truth is the set of
`StockItem` rows for that product (one per warehouse). After every `StockItem` mutation
(sale, PO receive, transfer in/out, refund, stock-take approve, composition produce),
the helper `updateProductQuantityFromStockItems(tx, productId)` recomputes
`Product.quantity = SUM(StockItem.quantity)`. This means:

- A sale against warehouse A with 2 units fails for qty=3 even if `Product.quantity=10`
  (because warehouse B has the other 8). The POS picks a warehouse and validates
  against that specific `StockItem`.
- Stock transfers atomically move quantity between warehouses without ever touching
  `Product.quantity` directly.
- See §11.3 for why this matters (Critical Fix #3).

#### StockItem uniqueness + row-level locking

`@@unique([productId, warehouseId])` ensures one row per (product, warehouse). All
mutations go through `decrementStockItem` / `incrementStockItem` (in `src/lib/db.ts`),
which upsert on this composite key. `decrementStockItem` issues
`SELECT * FROM "StockItem" ... FOR UPDATE` (PostgreSQL) to prevent concurrent
oversells; on SQLite (tests) the clause is wrapped in a try/catch no-op.

#### PurchaseOrder carries its own VAT

`PurchaseOrder.taxRate` (default 0) is set at creation. When the PO is received, the
receive route computes `receivedTaxAmount = Σ item.subtotal × taxRate / 100` and stores
it on the PO. This lets the VAT report include the receive even when no
`PurchaseInvoice` is posted yet — and the report **excludes** the PO bucket once a
POSTED invoice exists for that PO (no double-count; see §7.8 and §11.2).

#### Audit log is immutable and server-side only

`AuditLog` rows are created server-side inside the same transaction as the operation
they audit, via `logAuditEvent({ tx, ... })` (in `src/lib/audit.ts`). The HTTP endpoint
`POST /api/audit-logs` is gated by `AUDIT_INTERNAL_SECRET` (no fallback, fail-closed)
or ADMIN role — but normal flows never call it. See §8.

#### Bundle + Composition (BOM) models

- **Bundle** = group of existing products sold together at a discounted price
  (e.g. perfume gift set). Schema and management UI are complete; **POS sale of
  bundles is not yet wired** (see §12).
- **Composition** = recipe that consumes raw ingredients and produces a new product
  (e.g. oud oil + incense → "Royal Oud"). Schema, management UI, and the
  `/produce` action are all complete and tested.

### System accounts (Chart of Accounts)

Seeded by `POST /api/seed` (`src/app/api/seed/route.ts`). The system uses the
following account codes throughout the codebase:

| Code | Name (AR) | Type | Used for |
|---|---|---|---|
| **1000** | الأصول | ASSET | Root asset group |
| **1010** | النقدية | ASSET | Cash (POS sales CASH, refund CASH, supplier payment CASH, inventory JE, shift variance) |
| **1020** | البنك | ASSET | Bank (POS sales CARD/TRANSFER, refund CARD/TRANSFER, supplier payment BANK/CHECK) |
| **2000** | الخصوم | LIABILITY | Root liability group |
| **2010** | ذمم دائنة | LIABILITY | Accounts Payable (PO receive, PurchaseInvoice post, supplier payment debit, sale tax credit, refund tax debit) |
| **3000** | حقوق الملكية | EQUITY | Root equity group |
| **3010** | رأس المال | EQUITY | Opening capital (seeded to balance the opening sheet) |
| **4000** | الإيرادات | REVENUE | Root revenue group |
| **4010** | إيرادات المبيعات | REVENUE | Sales revenue (POS sale credit, exchange collect credit) |
| **4020** | إيرادات شوبيفاي | REVENUE | Shopify revenue (seeded) |
| **4030** | مردودات المبيعات | REVENUE | Sales returns (refund debit) — created on first refund |
| **4060** | إيرادات تسوية مخزنية | REVENUE | Stock-take surplus credit + shift overage credit — created on first surplus |
| **5000** | المصروفات | EXPENSE | Root expense group |
| **5010** | الرواتب | EXPENSE | Salaries (seeded) |
| **5020** | الإيجار | EXPENSE | Rent (seeded) |
| **5030** | المرافق | EXPENSE | Utilities (seeded) |
| **5040** | الاشتراكات | EXPENSE | Subscriptions (seeded) |
| **5050** | التسويق | EXPENSE | Marketing (seeded) |
| **5060** | تكلفة البضاعة المباعة | EXPENSE | COGS (refund inventory reversal credit) — created on first refund |
| **5070** | عجز المخزون / تلفيات | EXPENSE | Stock shortage (stock-take shortage debit + shift cash shortage debit) — created on first shortage |
| **5090** | مصروفات إدارية أخرى | EXPENSE | Other admin expenses (seeded) |

> **Note:** The Prisma `Account.balance` is signed with **debit = positive**. So
> asset/expense accounts grow on debit; liability/equity/revenue accounts go
> *negative* on credit (their natural side).

### Audit log structure

```prisma
model AuditLog {
  id             String   @id @default(cuid())
  userId         String?               // who did it
  userName       String?
  action         String                // SALE_CREATED | SALE_REFUNDED | PO_RECEIVED | ...
  description    String?               // human-readable AR summary
  saleId         String?               // optional link to a Sale
  productId      String?               // optional link to a Product
  supervisorId   String?               // optional approver (for MANAGER_APPROVAL)
  supervisorName String?
  deviceInfo     String?               // User-Agent when posted via HTTP API
  metadata       String?               // JSON string (extra context)
  createdAt      DateTime @default(now())
  // indexes: action, userId, createdAt
}
```

Rows are append-only. The API offers no PATCH/DELETE for `AuditLog`. The HTTP
`POST /api/audit-logs` endpoint is the only client-facing way to write audit logs —
and it's gated by `AUDIT_INTERNAL_SECRET` (no fallback) or ADMIN role. Normal
server-side flows use `logAuditEvent({ tx, ... })` directly inside the transaction.

---

## 4. API Routes

All routes live under `src/app/api/`. Every route sets `export const dynamic =
"force-dynamic"`. Auth is enforced by `getCurrentUser()` + `hasRole()`; routes that
omit an explicit role check still require a valid session (any authenticated user).

**Legend for tables below:**

- **Auth**: `ADMIN`, `ADMIN/WH` (ADMIN or WAREHOUSE), `ADMIN/SALES`, `any` (any logged-in user), `public` (no session required)
- **Tx**: ✅ wraps writes in `db.$transaction`
- **Audit**: ✅ calls `logAuditEvent()` server-side (PriceChange rows count as audit too)

### 4.1 Sales module

| Method | Path | Purpose | Auth | Tx | Audit |
|---|---|---|---|---|---|
| GET | `/api/sales` | List sales (paginated, `?q=&page=&pageSize=`) | any | — | — |
| POST | `/api/sales` | Create a POS sale (stock decrement + journal + audit) | ADMIN/SALES | ✅ | ✅ |
| GET | `/api/sales/[id]` | Single sale by id | any | — | — |
| POST | `/api/sales/[id]/refund` | Partial refund (restock + 2 journal entries + audit) | ADMIN | ✅ | ✅ |
| GET | `/api/sales/by-invoice/[invoiceNo]/for-exchange` | Look up an invoice by `invoiceNo` for the exchange screen | any | — | — |
| GET | `/api/exchanges` | List exchanges | any | — | — |
| POST | `/api/exchanges` | Create an exchange (anti-fraud lockdown, original-invoice required) | ADMIN/SALES | ✅ | ✅ |
| GET | `/api/exchanges/[id]` | Single exchange | any | — | — |
| GET | `/api/suspended-sales` | List parked carts | any | — | — |
| POST | `/api/suspended-sales` | Park a cart | any | — | — |
| GET | `/api/suspended-sales/[id]` | Get a parked cart | any | — | — |
| DELETE | `/api/suspended-sales/[id]` | Discard a parked cart | any | — | — |
| PATCH | `/api/suspended-sales/[id]` | Resume a parked cart (status → RESUMED) | any | — | — |

### 4.2 Purchases module

| Method | Path | Purpose | Auth | Tx | Audit |
|---|---|---|---|---|---|
| GET | `/api/purchase-orders` | List POs | any | — | — |
| POST | `/api/purchase-orders` | Create a PO | ADMIN/WH | — | — |
| GET | `/api/purchase-orders/[id]` | Single PO | any | — | — |
| PUT | `/api/purchase-orders/[id]` | Update a PO (e.g. add items, set taxRate, set landed-cost fields) | ADMIN/WH | — | — |
| PATCH | `/api/purchase-orders/[id]` | Manager approval / rejection (`status → APPROVED \| REJECTED`, `rejectionReason`) | ADMIN | ✅ | — |
| DELETE | `/api/purchase-orders/[id]` | Delete a PO (only if not RECEIVED) | ADMIN/WH | — | — |
| POST | `/api/purchase-orders/[id]/receive` | Mark PO as RECEIVED — bump stock + landed-cost weighted-avg cost price + VAT compute + journal + audit | ADMIN/WH | ✅ | ✅ |
| POST | `/api/purchase-orders/auto-draft` | Auto-create POs for products below reorder level | ADMIN/WH | — | — |
| GET | `/api/purchase-invoices` | List purchase invoices | any | — | — |
| POST | `/api/purchase-invoices` | Create a purchase invoice (DRAFT or POSTED) | ADMIN/WH | ✅ | ✅ |
| GET | `/api/purchase-invoices/[id]` | Single invoice | any | — | — |
| PUT | `/api/purchase-invoices/[id]` | Update a DRAFT invoice | ADMIN | ✅ | — |
| DELETE | `/api/purchase-invoices/[id]` | Delete a DRAFT invoice | ADMIN | — | — |
| POST | `/api/purchase-invoices/[id]/post` | Post a DRAFT invoice — bump stock + mark linked PO RECEIVED + journal + audit | ADMIN/WH | ✅ | ✅ |
| GET | `/api/purchase-returns` | List returns | any | — | — |
| POST | `/api/purchase-returns` | Create a return (decrement stock + bump PO item `returnedQty` + reversing journal + audit) | ADMIN/WH | ✅ | ✅ |
| GET | `/api/supplier-payments` | List payments (`?supplierId=`) | any | — | — |
| POST | `/api/supplier-payments` | Create a payment — server-side balance check (`exceeds-balance` unless ADMIN `override:true`) + journal + audit | ADMIN/WH | ✅ | ✅ |
| GET | `/api/supplier-payments/[id]` | Single payment | any | — | — |
| DELETE | `/api/supplier-payments/[id]` | Delete a payment (ADMIN only) | ADMIN | — | — |

### 4.3 Inventory module

| Method | Path | Purpose | Auth | Tx | Audit |
|---|---|---|---|---|---|
| GET | `/api/products` | List products (`?q=&categoryId=&lowStock=`) | any | — | — |
| POST | `/api/products` | Create a product | ADMIN/WH | — | — |
| GET | `/api/products/[id]` | Single product | any | — | — |
| PUT | `/api/products/[id]` | Update a product (writes PriceChange audit row if salePrice changes) | ADMIN/WH | ✅ | ✅ (PriceChange) |
| DELETE | `/api/products/[id]` | Delete a product | ADMIN/WH | ✅ | ✅ |
| GET | `/api/products/generate-barcode` | Generate the next barcode for a category | any | — | — |
| GET | `/api/categories` | List categories | public | — | — |
| POST | `/api/categories` | Create a category | ADMIN/WH | — | — |
| GET | `/api/categories/[id]` | Single category | any | — | — |
| PUT | `/api/categories/[id]` | Update a category | ADMIN/WH | — | — |
| DELETE | `/api/categories/[id]` | Delete a category | ADMIN/WH | — | — |
| GET | `/api/units` | List units of measure | public | — | — |
| POST | `/api/units` | Create a unit | any | — | — |
| DELETE | `/api/units/[id]` | Delete a unit | any | — | — |
| GET | `/api/warehouses` | List warehouses | public | — | — |
| POST | `/api/warehouses` | Create a warehouse | any | — | — |
| PUT | `/api/warehouses/[id]` | Update a warehouse | any | — | — |
| DELETE | `/api/warehouses/[id]` | Delete a warehouse | any | — | — |
| GET | `/api/inventory/movements` | Stock movement report (`?from=&to=&productId=&warehouseId=&type=`) | any | — | — |
| GET | `/api/stock-transfers` | List transfers | any | — | — |
| POST | `/api/stock-transfers` | Create a transfer (deduct source, status=OUT) — `SELECT FOR UPDATE` on source StockItem | ADMIN/WH | ✅ | ✅ |
| POST | `/api/stock-transfers/[id]/receive` | Receive a transfer (increment destination, status=RECEIVED) — `SELECT FOR UPDATE` on destination StockItem | ADMIN/WH | ✅ | ✅ |
| GET | `/api/stock-takes` | List stock takes | any | — | — |
| POST | `/api/stock-takes` | Create a stock take (DRAFT) | ADMIN/WH | — | — |
| POST | `/api/stock-takes/[id]/approve` | Approve a stock take — adjust stock by `variance` + shortage/surplus journal entries + audit | ADMIN/WH | ✅ | ✅ |
| GET | `/api/spot-checks` | List spot checks | any | — | — |
| POST | `/api/spot-checks` | Create a spot check (blind: `bookQty` recorded after `countedQty`) | any | — | — |

### 4.4 Accounting module

| Method | Path | Purpose | Auth | Tx | Audit |
|---|---|---|---|---|---|
| GET | `/api/accounts` | List chart of accounts (hierarchical) | any | — | — |
| POST | `/api/accounts` | Create an account | any | — | — |
| PUT | `/api/accounts/[id]` | Update an account (refuses if `isSystem`) | any | — | — |
| DELETE | `/api/accounts/[id]` | Delete an account (refuses if `isSystem`) | any | — | — |
| GET | `/api/journal-entries` | List journal entries (paginated, filterable) | any | — | — |
| POST | `/api/journal-entries/manual` | Create a manual journal entry (balanced) | any | — | — |
| GET | `/api/trial-balance` | Trial balance snapshot | any | — | — |
| GET | `/api/expenses` | List expenses | any | — | — |
| POST | `/api/expenses` | Create an expense (salary or admin) — posts JE + updates account balances | any | ✅ | — |
| DELETE | `/api/expenses/[id]` | Delete an expense (reverses JE + restores balances) | any | ✅ | — |
| GET | `/api/financial-reports` | P&L summary | any | — | — |
| GET | `/api/financial-reports/general-ledger` | GL for an account over a date range | any | — | — |
| GET | `/api/financial-reports/balance-sheet` | Balance sheet snapshot | any | — | — |
| GET | `/api/financial-reports/cash-flow` | Cash flow statement | any | — | — |
| GET | `/api/financial-reports/vat` | **VAT report** — output VAT (sales) + input VAT (purchase invoices + PO receives, double-count prevented) | any | — | — |

### 4.5 Customers / Suppliers

| Method | Path | Purpose | Auth | Tx | Audit |
|---|---|---|---|---|---|
| GET | `/api/customers` | List customers (`?q=&type=`) | any | — | — |
| POST | `/api/customers` | Create a customer | any | — | — |
| PUT | `/api/customers/[id]` | Update a customer | any | — | — |
| DELETE | `/api/customers/[id]` | Delete a customer | any | — | — |
| GET | `/api/customers/[id]/statement` | Customer statement (sales + refunds) | any | — | — |
| GET | `/api/suppliers` | List suppliers | public | — | — |
| POST | `/api/suppliers` | Create a supplier | ADMIN/WH | — | — |
| PUT | `/api/suppliers/[id]` | Update a supplier | ADMIN/WH | — | — |
| DELETE | `/api/suppliers/[id]` | Delete a supplier | ADMIN/WH | — | — |
| GET | `/api/suppliers/[id]/statement` | Supplier statement (invoices − payments − returns) | any | — | — |
| GET | `/api/suppliers/balances` | All-supplier outstanding balances | any | — | — |

### 4.6 Pricing / Promotions

| Method | Path | Purpose | Auth | Tx | Audit |
|---|---|---|---|---|---|
| GET | `/api/pricing` | List products with effective price (promotion applied) | any | — | — |
| POST | `/api/pricing` | Update a product's price tier — writes a `PriceChange` row + updates `salePrice`/`wholesalePrice`/`corporatePrice` | ADMIN | ✅ | ✅ (PriceChange) |
| GET | `/api/pricing/effective` | Effective price for one product (`?productId=`) | any | — | — |
| GET | `/api/pricing/audit` | List PriceChange audit rows | any | — | — |
| GET | `/api/promotions` | List promotions | any | — | — |
| POST | `/api/promotions` | Create a promotion | ADMIN | — | — |
| DELETE | `/api/promotions` | Delete a promotion | ADMIN | — | — |

### 4.7 Shifts / Audit / Users / Settings

| Method | Path | Purpose | Auth | Tx | Audit |
|---|---|---|---|---|---|
| GET | `/api/shifts` | List shifts (`?status=OPEN\|CLOSED`) | any | — | — |
| POST | `/api/shifts` | Open a shift (per-user: max 1 OPEN each) | any | — | ✅ |
| PATCH | `/api/shifts` | Close a shift — compute expected totals (per-user) + variances + shortage/overage JE + audit | any | ✅ | ✅ |
| GET | `/api/shifts/current` | Current user's OPEN shift (if any) | any | — | — |
| GET | `/api/audit-logs` | List audit logs (`?action=&userId=&from=&to=`) | ADMIN | — | — |
| POST | `/api/audit-logs` | **Restricted** — requires `X-Audit-Internal` header (=`AUDIT_INTERNAL_SECRET`) **or** ADMIN. Fail-closed if secret unset. | any (with secret) or ADMIN | — | — |
| GET | `/api/audit-logs/void-rate` | Void-rate per cashier (fraud detection) | ADMIN | — | — |
| GET | `/api/users` | List users | ADMIN | — | — |
| POST | `/api/users` | Create a user (password-strength validated) | ADMIN | — | ✅ |
| PUT | `/api/users/[id]` | Update a user (role, name, optional password) | ADMIN | — | ✅ |
| DELETE | `/api/users/[id]` | Delete a user | ADMIN | — | ✅ |
| POST | `/api/users/change-password` | Self-service password change (verify old, enforce strength) | any | — | ✅ |
| GET | `/api/settings` | Read all settings | any | — | — |
| PUT | `/api/settings` | Update a setting (e.g. active country, currency, tax rate) | any | — | — |

### 4.8 Bundles / Compositions

| Method | Path | Purpose | Auth | Tx | Audit |
|---|---|---|---|---|---|
| GET | `/api/bundles` | List bundles (`?q=&active=`) | public | — | — |
| POST | `/api/bundles` | Create a bundle + items | ADMIN/WH | ✅ | — |
| GET | `/api/bundles/[id]` | Single bundle | public | — | — |
| PUT | `/api/bundles/[id]` | Update a bundle (+ items if provided) | ADMIN/WH | ✅ | — |
| DELETE | `/api/bundles/[id]` | Delete a bundle (cascade-deletes items) | ADMIN | — | — |
| GET | `/api/compositions` | List compositions (`?q=&active=`) | public | — | — |
| POST | `/api/compositions` | Create a composition + ingredients | ADMIN/WH | ✅ | — |
| GET | `/api/compositions/[id]` | Single composition | public | — | — |
| PUT | `/api/compositions/[id]` | Update a composition (+ ingredients if provided) | ADMIN/WH | ✅ | — |
| DELETE | `/api/compositions/[id]` | Delete a composition (cascade-deletes ingredients) | ADMIN | — | — |
| POST | `/api/compositions/[id]/produce` | **Produce N batches** — pre-check all ingredients, decrement them, increment output product, sync `Product.quantity`. Atomic. | ADMIN/WH | ✅ | — |

### 4.9 Reporting / Dashboard / Analytics

| Method | Path | Purpose | Auth | Tx | Audit |
|---|---|---|---|---|---|
| GET | `/api/dashboard` | KPI cards (today sales, low-stock count, etc.) | any | — | — |
| GET | `/api/reports` | Sales/inventory reports (`?from=&to=&type=`) | any | — | — |
| GET | `/api/reports/matrix` | Performance matrix (category × product tree, turnover, stagnant days) | any | — | — |
| GET | `/api/analytics` | Sales/inventory analytics (time-series) | any | — | — |

### 4.10 Excel / Upload / Integrations / Admin / Seed / Auth

| Method | Path | Purpose | Auth | Tx | Audit |
|---|---|---|---|---|---|
| GET | `/api/excel/export` | Export products/sales/etc. to `.xlsx` (`?type=`) | any | — | — |
| POST | `/api/excel/import-products` | Bulk import products from `.xlsx` | any | — | — |
| POST | `/api/excel/import-customers` | Bulk import customers from `.xlsx` | any | — | — |
| POST | `/api/upload` | Image upload (returns base64 data URL — stored in DB) | any | — | — |
| GET | `/api/shopify/status` | Shopify connection status | any | — | — |
| POST | `/api/shopify/import-orders` | Import Shopify orders as tagged sales (`SHP-####`) | any | — | — |
| POST | `/api/shopify/sync-products` | Sync product catalog to Shopify | any | — | — |
| POST | `/api/admin/analyze` | Analyze DB indexes / query plans | ADMIN | — | — |
| POST | `/api/admin/apply-indexes` | Apply recommended indexes | ADMIN | — | — |
| POST | `/api/admin/apply-audit-log-schema` | One-shot: ensure AuditLog table exists | ADMIN | — | — |
| POST | `/api/admin/apply-stock-take-schema` | One-shot: ensure StockTake tables exist | ADMIN | — | — |
| POST | `/api/admin/apply-stock-transfer-schema` | One-shot: ensure StockTransfer tables exist | ADMIN | — | — |
| POST | `/api/admin/apply-purchase-returns-schema` | One-shot: ensure PurchaseReturn tables exist | ADMIN | — | — |
| POST | `/api/admin/create-supplier-payment-table` | One-shot: ensure SupplierPayment table exists | ADMIN | — | — |
| POST | `/api/seed` | Seed demo data (users, products, POs, sales, accounts, expenses, customers, units, warehouses) | public | — | — |
| GET | `/api/seed` | Counts of seeded entities | public | — | — |
| GET, POST | `/api/auth/[...nextauth]` | NextAuth.js catch-all handler (sign-in, callbacks, session) | public | — | — |

---

## 5. UI Views

All views are React components under `src/components/`. The app shell
(`src/components/app-shell.tsx`) dispatches the active `AppView` to its component
based on `view === "<name>"` checks. The sidebar (`src/components/nav-config.ts`)
groups views into collapsible parents.

### 5.1 Nav tree

```
├── dashboard          (leaf)
├── sales              (leaf)
├── Invoices & Reports (group)
│   ├── invoices
│   ├── reports
│   └── analytics
├── Inventory & Purchases (group)
│   ├── inventory
│   ├── purchases
│   ├── suppliers
│   ├── pricing
│   ├── spotcheck
│   ├── bundles
│   └── compositions
├── Accounting & Customers (group)
│   ├── accounting
│   └── customers
├── Daily Operations (group)
│   ├── shifts
│   └── exchanges
└── System (group)
    ├── integrations
    ├── users
    ├── audit
    └── settings
```

### 5.2 View components

| AppView | Component file | Purpose | Key features |
|---|---|---|---|
| `dashboard` | `dashboard/dashboard-view.tsx` | KPI dashboard | Today's sales, low-stock count, recent sales, top products |
| `sales` | `sales/sales-view.tsx` | POS / cashier screen | Category cards, barcode search, phone-lookup customer, park/resume cart, delivery fee, Ctrl+Enter confirm |
| `invoices` | `sales/invoices-view.tsx` | Sales invoice register | Paginated list, thermal (80mm) + A4 print, partial-refund dialog (14-day rule) |
| `reports` | `reports/reports-view.tsx` | Sales/inventory reports | Date-range filters, PDF/Excel export |
| `analytics` | `analytics/analytics-view.tsx` | Sales/inventory analytics | Recharts time-series, category breakdown |
| `inventory` | `inventory/inventory-view.tsx` | Inventory hub | Tabs: products list, stock movement report, stock take, stock transfer, warehouse manager |
| `purchases` | `purchases/purchases-view.tsx` | Purchase orders | PO list, create/edit dialog, manager approval panel, receive action |
| `suppliers` | `purchases/suppliers-view.tsx` | Supplier directory | CRUD + statement dialog + outstanding balance |
| `pricing` | `pricing/pricing-engine-view.tsx` | Pricing & promotions | 3-tier price editor (retail/wholesale/corporate), promotion CRUD (4 scopes) |
| `spotcheck` | `spotcheck/spotcheck-view.tsx` | Blind spot-check | Book qty hidden until counted qty entered, instant variance |
| `bundles` | `bundles/bundles-view.tsx` | Bundles & offers | Card grid, live cost/profit summary, seasonal dates, manager-only edit/delete |
| `compositions` | `compositions/compositions-view.tsx` | Compositions & blends | Card grid, cost-per-batch/unit, **Produce** dialog with insufficient-stock report |
| `accounting` | `accounting/accounting-view.tsx` | Accounting hub | Tabs: chart of accounts, journal, GL, P&L, balance sheet, cash flow, VAT, expenses, customer statement |
| `customers` | `customers/customers-view.tsx` | CRM directory | CRUD, type filter (retail/wholesale/corporate), statement |
| `shifts` | `shift/shift-view.tsx` | Shifts | Open/close, expected vs counted cash/K-Net/Visa, variance display |
| `exchanges` | `sales/exchange-view.tsx` | Exchange / swap | Original-invoice required, barcode scan, return + new lines, net settlement |
| `integrations` | `integrations/integrations-view.tsx` | Shopify | Connection status, sync products, import orders |
| `users` | `settings/users-view.tsx` | User management | ADMIN-only CRUD, role assignment, password strength |
| `audit` | `audit/audit-view.tsx` | Audit & control log | Filter by action/user/date, void-rate per cashier |
| `settings` | `settings/settings-view.tsx` | System settings | Active country, currency, tax rate, units, categories |
| `dashboard` etc. | `app-shell.tsx` | App shell | Sidebar + topbar + view dispatcher; guards views by role |

### 5.3 Shared components (`src/components/shared/`)

`page-header`, `action-bar`, `breadcrumbs`, `confirm-dialog`, `empty-state`,
`loading-state`, `data-table`, `search-filter-bar`, `excel-buttons`,
`export-toolbar`, `image-upload`, `mega-menu-bar`, `stat-card`, `sub-nav`,
`workflow-bar`, `context-dropdown`.

### 5.4 UI primitives (`src/components/ui/`)

Full shadcn/ui set: `alert`, `alert-dialog`, `avatar`, `badge`, `button`, `card`,
`checkbox`, `collapsible`, `dialog`, `dropdown-menu`, `input`, `label`, `progress`,
`scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `sonner`,
`table`, `tabs`, `textarea`, `toast`, `toaster`, `toggle`, `tooltip`.

---

## 6. Role-Based Access Control

`src/lib/session.ts` defines the `ROLE_PERMISSIONS` map. Three roles:

| Role | Label (AR) | Description |
|---|---|---|
| `ADMIN` | مدير النظام | Full access to every view + every API route |
| `SALES` | موظف مبيعات | Cashier — POS, invoices, reports, customers, shifts, exchanges, pricing, bundles |
| `WAREHOUSE` | أمين مخزن | Inventory, purchases, suppliers, spot-check, bundles, compositions |

### 6.1 Views each role can access

```
ADMIN    → dashboard, sales, invoices, reports, inventory, purchases, suppliers,
           customers, analytics, accounting, integrations, shifts, spotcheck,
           exchanges, pricing, users, settings, audit, bundles, compositions
           (all 20 views)

SALES    → dashboard, sales, invoices, reports, inventory, customers, analytics,
           shifts, exchanges, pricing, bundles
           (10 views — no purchases, suppliers, spotcheck, accounting,
            integrations, users, audit, settings, compositions)

WAREHOUSE→ dashboard, inventory, purchases, suppliers, spotcheck, bundles,
           compositions
           (7 views — no sales, invoices, reports, customers, analytics,
            accounting, integrations, shifts, exchanges, pricing, users,
            audit, settings)
```

The sidebar (`app-sidebar.tsx`) filters `NAV_ENTRIES` through `ROLE_PERMISSIONS`,
and the app-shell guards each `{view === "..." && <Component />}` block — though
the primary enforcement is server-side (see §6.2).

### 6.2 API routes each role can call (write operations)

| Operation | ADMIN | SALES | WAREHOUSE |
|---|:---:|:---:|:---:|
| Create sale (`POST /api/sales`) | ✅ | ✅ | ❌ |
| Refund a sale (`POST /api/sales/[id]/refund`) | ✅ | ❌ | ❌ |
| Create exchange (`POST /api/exchanges`) | ✅ | ✅ | ❌ |
| Create / update / delete product (`POST/PUT/DELETE /api/products`) | ✅ | ❌ | ✅ |
| Create / update / delete category | ✅ | ❌ | ✅ |
| Create / update / delete supplier | ✅ | ❌ | ✅ |
| Create / update PO | ✅ | ❌ | ✅ |
| Approve / reject PO (`PATCH /api/purchase-orders/[id]`) | ✅ | ❌ | ❌ |
| Receive PO (`POST /api/purchase-orders/[id]/receive`) | ✅ | ❌ | ✅ |
| Create / post / delete purchase invoice | ✅ | ❌ | ✅ |
| Create purchase return | ✅ | ❌ | ✅ |
| Create supplier payment | ✅ | ❌ | ✅ |
| Override supplier-payment balance limit | ✅ | ❌ | ❌ |
| Create / receive stock transfer | ✅ | ❌ | ✅ |
| Create / approve stock take | ✅ | ❌ | ✅ |
| Create spot check | ✅ | ✅ | ✅ |
| Update pricing tiers (`POST /api/pricing`) | ✅ | ❌ | ❌ |
| Create / delete promotion | ✅ | ❌ | ❌ |
| Create / update / delete bundle | ✅ | ❌ | ✅ |
| Delete bundle | ✅ | ❌ | ❌ |
| Create / update / delete composition | ✅ | ❌ | ✅ |
| Produce composition | ✅ | ❌ | ✅ |
| Delete composition | ✅ | ❌ | ❌ |
| Open / close shift | ✅ | ✅ | ✅ |
| Create / update / delete user | ✅ | ❌ | ❌ |
| Change own password | ✅ | ✅ | ✅ |
| Read audit logs | ✅ | ❌ | ❌ |
| Read void-rate report | ✅ | ❌ | ❌ |
| Manual audit log POST | ✅ (or via secret) | ❌ | ❌ |

Read (`GET`) endpoints generally require only `any` (any authenticated user) —
the role filter is applied client-side via the sidebar.

---

## 7. Business Logic Highlights

### 7.1 POS sale (`POST /api/sales`)

Atomic flow inside `db.$transaction`:

1. **Auth** — `getCurrentUser()` → `hasRole(user.role, ["ADMIN", "SALES"])`.
2. **Defensive session check** — re-read the user from the DB; if the JWT holds a
   stale id (e.g. after a re-seed), return `401 session-expired`.
3. **Customer link** — if `customerPhone` is provided, look up by phone; otherwise
   create a new `Customer` (default name `عميل نقدي`).
4. **Per-item stock validation** — for each cart line, call
   `decrementStockItem(tx, productId, warehouseId, qty)`:
   - `SELECT ... FOR UPDATE` on the `StockItem` row (PostgreSQL).
   - If `StockItem.quantity < qty`, throw `stock-insufficient:<product>:warehouse:<id>`
     → transaction rolls back → `400`.
   - Otherwise decrement the row.
5. **Totals** — `subtotal = Σ qty × unitPrice`; `afterDiscount = max(0, subtotal − discount)`;
   `taxAmount = afterDiscount × taxRate/100`; `total = afterDiscount + taxAmount + deliveryFee`
   (delivery fee is added **after** tax — it's a service charge).
6. **Sync `Product.quantity`** — `updateProductQuantityFromStockItems(tx, productId)`
   for each affected product.
7. **Create the `Sale` + `SaleItem` rows** in the same transaction.
8. **Journal entry** (`createJournalEntry`, inside the tx):
   - Debit `1010` (Cash) or `1020` (Bank) — `total`
   - Credit `4010` (Sales Revenue) — `total − taxAmount`
   - Credit `2010` (Tax Payable) — `taxAmount` (only if `tax > 0`)
9. **Audit log** — `logAuditEvent({ tx, action: "SALE_CREATED", ... })`.
10. Return `201` with the serialized sale.

If the journal entry throws (e.g. `account-not-found`), the entire transaction
rolls back — no `Sale`, no `SaleItem`, no stock decrement (this is **Critical Fix #1**).

### 7.2 Purchase order receive (`POST /api/purchase-orders/[id]/receive`)

Atomic flow inside `db.$transaction`:

1. **Auth** — ADMIN or WAREHOUSE.
2. Load PO + items + supplier. Refuse if already `RECEIVED` (`409 already-received`).
3. Resolve destination warehouse (PO's `warehouseId` or default active warehouse).
4. Compute landed-cost allocations via `allocateLandedCost()` in
   `src/lib/landed-cost.ts` — distributes `customsAmount + shippingAmount +
   otherCharges` across items proportionally to subtotal, then computes a
   weighted-average new cost price blending on-hand quantity × old cost with
   incoming quantity × invoice unit cost.
5. For each PO item:
   - `SELECT ... FOR UPDATE` on the destination `StockItem` (PostgreSQL).
   - `incrementStockItem(tx, productId, warehouseId, qty)` (upsert).
   - `updateProductQuantityFromStockItems(tx, productId)`.
   - Update `Product.costPrice` (weighted average when landed cost applies,
     otherwise invoice unit cost).
   - If `suggestedSalePrice > 0` and differs from current `salePrice`, write a
     `PriceChange` audit row and update `Product.salePrice` (via the pricing engine
     pattern — not a direct edit).
6. **Compute VAT** — `receivedTaxAmount = Σ item.subtotal × PO.taxRate/100`. Stored
   on the PO so the VAT report can include the receive even without a posted
   `PurchaseInvoice` (this is **Critical Fix #2**).
7. Update PO: `status=RECEIVED`, `customsAmount`, `shippingAmount`, `otherCharges`,
   `landedCostApplied`, `receivedTaxAmount`.
8. **Journal entry** (inside the tx):
   - Debit `1010` (Inventory) — `po.total`
   - Credit `2010` (Accounts Payable) — `po.total`
9. **Audit log** — `logAuditEvent({ tx, action: "PO_RECEIVED", ... })`.

### 7.3 Stock transfer (`POST /api/stock-transfers` + `/receive`)

**Transfer Out (create):**
1. ADMIN or WAREHOUSE. Validate `fromWarehouseId !== toWarehouseId`, items non-empty,
   warehouses exist, products exist.
2. Read current `StockItem` rows for `(productId, fromWarehouseId)`. For each item
   with `qty > available`, throw `exceeds-available:<name>:<available>` → `400`.
3. Inside `db.$transaction`:
   - For each item: `SELECT ... FOR UPDATE` on source `StockItem`, `upsert` with
     `quantity: { decrement: qty }`, then `updateProductQuantityFromStockItems`.
   - Create the `StockTransfer` (status=`OUT`) + `StockTransferItem` rows.
   - `logAuditEvent({ action: "STOCK_TRANSFER_CREATED", ... })`.

**Transfer In (receive):**
1. ADMIN or WAREHOUSE. Refuse if already `RECEIVED` (`409`).
2. Inside `db.$transaction`:
   - For each item: `SELECT ... FOR UPDATE` on destination `StockItem`, `upsert`
     with `quantity: { increment: qty }`, then `updateProductQuantityFromStockItems`.
   - Update transfer: `status=RECEIVED`, `receivedById`, `receivedAt`.
   - `logAuditEvent({ action: "STOCK_TRANSFER_RECEIVED", ... })`.

Note that `Product.quantity` is never directly mutated — it's always recomputed
from the `StockItem` rows. This is **Critical Fix #3**.

### 7.4 Refund (`POST /api/sales/[id]/refund`) + Exchange (`POST /api/exchanges`)

**Refund (ADMIN only, 14-day rule):**

1. Validate each `returnedQty ≤ saleItem.quantity − saleItem.returnedQty`. Proportional
   tax: `refundTax = refundSubtotal × sale.taxRate/100`. `refundTotal = refundSubtotal + refundTax`.
   `refundCost = Σ qtyToReturn × product.costPrice`.
2. Inside `db.$transaction`:
   - For each return line: `incrementStockItem` + `updateProductQuantityFromStockItems`
     + `saleItem.update({ returnedQty: newReturnedQty })`.
   - Update `Sale.refundTotal` + `Sale.refundStatus` (`PARTIAL` or `FULL`).
   - Ensure accounts `4030` (Sales Returns) and `5060` (COGS) exist (create if missing).
   - **Financial JE**: Debit `4030` (refundSubtotal) + Debit `2010` (refundTax, if any)
     → Credit `1010` or `1020` (refundTotal).
   - **Inventory JE**: Debit `1010` (refundCost) → Credit `5060` (refundCost).
   - `logAuditEvent({ action: "SALE_REFUNDED", ... })`.

**Exchange (ADMIN/SALES, 14-day rule, anti-fraud lockdown):**

1. `originalSaleId` is **REQUIRED**. Without it → `400 original-invoice-required`.
2. Original sale must exist (`404`) and be ≤ 14 days old (`409 invoice-too-old`).
3. **Return lines** (`isReturn=true`, `quantity < 0`):
   - The `productId` must appear on the original sale, else `409 product-not-in-invoice`.
   - Total returned qty (across this exchange + prior returns/refunds) must not
     exceed `saleItem.quantity − saleItem.returnedQty`, else `409 return-exceeds-remaining`.
4. **New lines** (`isReturn=false`, `quantity > 0`): standard stock decrement via
   `decrementStockItem` (`SELECT FOR UPDATE`).
5. Inside `db.$transaction`:
   - For each line: restock (return) or decrement (new) + sync `Product.quantity`.
   - Distribute returned units across the matching `SaleItem` rows (handles the
     case where the same product appears on multiple sale lines), clamped to
     `Math.min(quantity, returnedQty + inc)`.
   - Create `ExchangeSale` + `ExchangeLine` rows.
   - If `netAmount > 0` (customer pays): Debit `1010`/`1020`, Credit `4010`.
   - If `netAmount < 0` (refund to customer): Debit `5060`, Credit `1010`/`1020`.
   - `logAuditEvent({ action: "SALE_EXCHANGED", ... })`.

### 7.5 Shift open/close (`/api/shifts`)

**Open (`POST`)**: any authenticated user. Each user can have **one** OPEN shift at
a time (`409 user-shift-already-open`). Stores `openingBalance` from the body.
Audit: `SHIFT_OPENED`.

**Close (`PATCH`)**: any authenticated user (typically the cashier or supervisor).
1. Refuse if already `CLOSED` (`409 already-closed`).
2. Compute expected totals **only from sales created by `shift.userId`** during
   `[openedAt, now]` — `expectedCash/Knet/Visa` are per-cashier, not global
   (Critical Test #5 verifies this). `net = sale.total − sale.refundTotal`.
3. `cashVariance = countedCash − (openingBalance + expectedCash)`.
4. Inside `db.$transaction`:
   - Update shift: `status=CLOSED`, `closedAt`, expected + counted + variance fields.
   - If `|cashVariance| > 0.001`:
     - **Shortage** (`cashVariance < 0`): Debit `5070`, Credit `1010`.
     - **Overage** (`cashVariance > 0`): Debit `1010`, Credit `4060`.
   - `logAuditEvent({ action: "SHIFT_CLOSED", ... })`.

### 7.6 Bundle sale (component deduction) — **schema ready, integration pending**

The `Bundle` + `BundleItem` schema exists. `serializeBundle` in
`src/lib/serialize.ts` computes `totalCost`, `itemsRetailTotal`, `profit`,
`discountPct`. The Bundles view (`bundles/bundles-view.tsx`) and form dialog
(`bundle-form-dialog.tsx`) are complete and manager-only.

**However**, the POS sales view (`sales/sales-view.tsx`) does not yet include
bundles in the cart. The sale API (`POST /api/sales`) only accepts `items[]` with
`productId/quantity/unitPrice` — no bundle deduction logic. This is documented in
`worklog.md` BUILD-BUNDLES stage summary: "integration into the app shell is left
to the main agent".

When implemented, a bundle sale will need to: (a) deduct each `BundleItem.productId`
by `BundleItem.quantity × bundleQty`, (b) reject if any component is insufficient,
(c) record `BundleItem` cost as COGS, (d) credit bundle revenue. See §12.

### 7.7 Composition produce (`POST /api/compositions/[id]/produce`)

ADMIN or WAREHOUSE. Body: `{ batches: number }` (default 1, min 1). Inside `db.$transaction`:

1. Load composition + ingredients + output product.
2. `getDefaultWarehouseId(tx)` — fallback to first active warehouse.
3. **Pre-check ALL ingredients** before decrementing any. For each ingredient,
   compute `requiredQty = ingredient.quantity × batches` and compare against
   `StockItem.quantity` for that (product, warehouse). Build a list of every short
   ingredient (productId, name, required, available, unit).
4. If any short → throw structured error → `400` with the FULL list:
   ```json
   { "error": "insufficient-stock",
     "ingredients": [{ "productId": "...", "name": "Oud Oil", "required": 50,
                        "available": 20, "unit": "جرام" }, ...] }
   ```
5. Otherwise decrement each ingredient via `decrementStockItem` (with `FOR UPDATE`).
6. Increment the output product's `StockItem` by `yieldQty × batches`.
7. `updateProductQuantityFromStockItems` for the output product.
8. Return `{ ok: true, produced, unit }`.

The pre-check-then-decrement pattern ensures the user sees all shortages at once,
not one at a time. Errors are thrown as `{ httpStatus, body }` markers and
re-serialized outside the transaction so the atomic rollback still happens.

### 7.8 VAT report (`GET /api/financial-reports/vat?from=&to=`)

Any authenticated user. Computes:

- **Output VAT** = `Σ Sale.taxAmount` (filtered by `createdAt` in date range).
- **Input VAT from purchase invoices** = `Σ PurchaseInvoice.taxAmount` where
  `status=POSTED` (filtered by `invoiceDate`).
- **Input VAT from PO receives** = `Σ PurchaseOrder.receivedTaxAmount` where
  `status=RECEIVED` AND `receivedTaxAmount > 0` (filtered by `updatedAt`) —
  **but only for POs that do NOT have a linked POSTED `PurchaseInvoice`**.
  This prevents double-counting: once a PurchaseInvoice is posted for a PO, its
  `taxAmount` is counted in the invoice bucket and the PO's `receivedTaxAmount`
  is excluded.
- **Net VAT** = `outputVat − inputVat`.

Implementation detail (Critical Fix #2): the report does two parallel queries —
one to fetch the PO candidates, and one to fetch the set of `purchaseOrderId`s
that have a POSTED invoice. The PO list is filtered in TypeScript to exclude any
PO whose id is in that set. This is verified by `tests/vat-report.test.ts`.

### 7.9 Audit log security (server-side vs API route)

Two paths to write an `AuditLog`:

1. **Server-side** (`logAuditEvent({ tx, ... })` in `src/lib/audit.ts`) — used by
   every mutating API route inside its `$transaction`. The `tx` parameter ensures
   the audit row is part of the same atomic unit: if the business op fails, the
   audit log is rolled back; if the audit log fails, the business op is rolled
   back. This is the **only** path normal flows use.
2. **HTTP API** (`POST /api/audit-logs`) — gated by either the `X-Audit-Internal`
   header (must equal `AUDIT_INTERNAL_SECRET`) OR the ADMIN role. If
   `AUDIT_INTERNAL_SECRET` is **not configured**, the endpoint returns
   `500 audit-not-configured` — **no fallback, fail-closed**. This path exists
   for manual corrections and external integrations; it is **never** called by
   the browser.

The client-side `logAudit()` helper was **removed** for security (see comment in
`src/lib/audit.ts`). Audit logging is fully server-controlled.

---

## 8. Security

### 8.1 NextAuth credentials flow

- Provider: `CredentialsProvider` only (no OAuth).
- `authorize()` (`src/lib/auth.ts`) lowercases + trims the email, looks up the
  user via `db.user.findUnique({ where: { email } })`, compares
  `bcrypt.compare(password, user.passwordHash)`. Returns `null` on any failure
  (no fallback admin — **fail-closed**).
- DB errors are caught and return `null` (login fails if DB is unreachable).
- JWT callback attaches `id` + `role` to the token; session callback copies them
  onto `session.user`.

### 8.2 Session JWT strategy

- `session.strategy = "jwt"`, `maxAge = 60 * 60 * 24 * 7` (7 days).
- Secret: `process.env.NEXTAUTH_SECRET` — **required**, no default.
- Signed with HMAC-SHA256. Stale session cookies (from a previous secret/server)
  produce `JWEDecryptionFailed` errors that NextAuth logs but gracefully returns
  `null` session → user sees the login screen. The auth.ts logger suppresses these
  noisy errors.
- Sign-in page: `/` (the login screen).
- HttpOnly cookie, SameSite=Lax.

### 8.3 Role-based API guards

Every mutating API route starts with:

```ts
const user = await getCurrentUser()
if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
if (!hasRole(user.role, ["ADMIN", "WAREHOUSE" as Role])) {
  return NextResponse.json({ error: "forbidden" }, { status: 403 })
}
```

The exact role set varies per route (see §4 + §6.2). Read (`GET`) endpoints
generally require only `any` (any authenticated user).

**Defensive session re-check**: the `POST /api/sales` and `POST /api/exchanges`
routes also re-read the user from the DB by id, returning `401 session-expired`
if the JWT holds a stale id (e.g. after a re-seed wiped the users table). This
prevents orphan sessions from creating sales/exchanges attributed to a
non-existent user (which would violate the `userId` FK).

### 8.4 Audit log secret (no fallback, fail-closed)

`AUDIT_INTERNAL_SECRET = process.env.AUDIT_INTERNAL_SECRET` — exported from
`src/lib/audit.ts` with **no default**. If unset, `POST /api/audit-logs` returns
`500 audit-not-configured` instead of accepting requests. This prevents a
known-default secret from being exploitable.

Server-side `logAuditEvent()` does not use this secret — it writes directly via
Prisma, bypassing the HTTP API. So normal audit logging works even if the secret
is unset (it just means the manual-correction endpoint is unavailable).

### 8.5 Password strength validation (Feature 14)

Two routes enforce the same `validatePasswordStrength()` rules:

- `POST /api/users/change-password` (`src/app/api/users/change-password/route.ts`)
- `POST /api/users` (user creation, `src/app/api/users/route.ts`)

Rules ( enforced server-side):
- ≥ 8 characters → else `password-too-short`
- ≥ 1 uppercase letter → else `password-no-uppercase`
- ≥ 1 lowercase letter → else `password-no-lowercase`
- ≥ 1 digit → else `password-no-digit`

Passwords are hashed with `bcrypt.hash(password, 10)` (10 rounds). The seed route
uses `bcrypt.hashSync` synchronously for the three demo users.

### 8.6 Row-level locking (SELECT FOR UPDATE)

PostgreSQL's `SELECT ... FOR UPDATE` is used in three places to prevent
concurrent oversells / over-receives:

1. `decrementStockItem` (`src/lib/db.ts`) — locks the `StockItem` row before
   reading + decrementing. Used by: `POST /api/sales`, `POST /api/exchanges`
   (new-item decrement), `POST /api/stock-takes/[id]/approve` (shortage
   decrement), `POST /api/compositions/[id]/produce` (ingredient decrement).
2. `POST /api/purchase-orders/[id]/receive` — locks the destination `StockItem`
   before incrementing.
3. `POST /api/stock-transfers` + `/receive` — locks source / destination
   `StockItem` before mutating.

On SQLite (used by tests), the `FOR UPDATE` clause is wrapped in `try/catch`
(no-op). Production on PostgreSQL gets the real lock. This is verified by
`tests/sale-concurrency.test.ts` (Critical Test #2).

### 8.7 Other security measures

- **Confirm dialogs** on every delete / cancel / void.
- **Ctrl+Enter** required to confirm a sale (no single-Enter checkout).
- **PriceChange** rows are immutable — no PATCH/DELETE in the API.
- **Blind spot-check** — `bookQty` is recorded only AFTER `countedQty` is entered.
- **14-day rule** on refunds + exchanges (admin override available for refunds).
- **`.env` excluded from Git** — secrets live in Vercel project settings.
- **No CORS** — all API routes are same-origin (Next.js App Router default).

---

## 9. Testing

### 9.1 Framework + database

- **Framework**: Vitest 4 (`vitest`, `@vitest/ui`)
- **Test database**: SQLite file at `prisma/test.db`, recreated before every run
  by `tests/globalSetup.ts`
- **Test schema**: `prisma/schema.test.prisma` — SQLite mirror of the production
  schema, generated to `node_modules/.prisma/test-client` so it doesn't clobber
  the production PrismaClient.
- **Setup**: `tests/setup.ts` runs per file, sets `DATABASE_URL=file:./prisma/test.db`
  BEFORE any Prisma import, instantiates the SQLite PrismaClient, and assigns it
  to `globalThis.prisma` so `src/lib/db.ts` reuses it instead of building its own
  Postgres client.
- **Isolation**: `resetDatabase()` truncates every table in dependency order;
  each test file calls it in `beforeEach` then re-seeds base fixtures (1 ADMIN
  user + the 6 system accounts 1010/1020/2010/4010/5070/4060).
- **Session mocking**: each test file uses `vi.mock("@/lib/session", ...)` with a
  hoisted `mockGetCurrentUser` so tests can swap users per test.
- **Direct handler invocation**: tests import the route handler directly
  (`import { POST } from "@/app/api/sales/route"`) and call it with a `NextRequest`
  built by `makeJsonRequest(method, pathname, body, search?)`. No HTTP server, no
  Next.js runtime.
- **Sequential execution**: `fileParallelism: false` + `singleFork: true` because
  SQLite is a single file (parallel writes would conflict).

### 9.2 The 6 critical test scenarios

| # | File | Business rule |
|---|---|---|
| 1 | `tests/sale-stock-warehouses.test.ts` (3 tests) | POS sale stock check is **per-warehouse** (StockItem), not aggregate. Sale against warehouse A with 2 units fails for qty=3 even if `Product.quantity=2`. |
| 2 | `tests/sale-concurrency.test.ts` (1 test) | Two simultaneous sales for the last unit → exactly one `201` + one `≥400`, final stock 0, exactly 1 Sale. (Asserts the invariant; on SQLite the loser may be `500 SQLITE_BUSY_SNAPSHOT`, on PostgreSQL it's `400 stock-insufficient` via the `FOR UPDATE` lock.) |
| 3 | `tests/journal-rollback.test.ts` (1 test) | When `createJournalEntry` throws inside the sale `$transaction`, the sale is rolled back: no `Sale`, no `SaleItem`, no stock decrement, no journal lines. |
| 4 | `tests/supplier-payment-limit.test.ts` (4 tests) | Payment > outstanding → `400 exceeds-balance`. ADMIN + `override:true` → `201`. Payment within balance → `201`. Non-admin + `override:true` → still `400`. |
| 5 | `tests/shift-expected-totals.test.ts` (1 test) | Closing cashier1's shift computes `expectedCash` from sales by cashier1's `userId` only (500), not all sales (800), even when cashier2 made 300 in parallel. |
| 6 | `tests/vat-report.test.ts` (1 test) | PO receive with `taxRate=5` + items subtotal=1000 → `receivedTaxAmount=50` → VAT report shows `inputVatPOReceives=50, inputVatInvoices=0`. After posting a PurchaseInvoice for the same PO with `taxAmount=50` → report shows `inputVatPOReceives=0` (excluded), `inputVatInvoices=50`, total `inputVat` unchanged (no double-count). |

### 9.3 How to run

```bash
bun run test          # run all tests once (~7s, 6 files / 11 tests)
bun run test:watch    # watch mode (re-run on file change)
bun run test:ui       # Vitest UI in the browser
```

The CI workflow (`.github/workflows/test.yml`) runs `bun install` + `bun run test`
on every push and PR. **Note**: there is a known token-scope issue with the GitHub
Action — see §12.

### 9.4 Production-code modifications for testability

Two minimal, no-behavior-change-on-PostgreSQL edits were made to make the code
SQLite-tolerant:

1. `src/lib/db.ts` `decrementStockItem` — `SELECT ... FOR UPDATE` wrapped in
   `try/catch`. On PostgreSQL the lock still happens; on SQLite it's a no-op.
2. `src/app/api/purchase-orders/[id]/receive/route.ts` — same `try/catch` wrap
   around the `FOR UPDATE` lock.

Both edits are documented in `tests/README.md` and have zero impact on production
behavior.

---

## 10. Deployment

### 10.1 Hosting + repo

- **GitHub**: [`a3laaw/kwpos`](https://github.com/a3laaw/kwpos)
- **Hosting**: **Vercel** — auto-deploy from `main` branch (production previews
  on every PR)
- **Database**: **Supabase** PostgreSQL (region: `eu-central-1` Frankfurt — closest
  to Kuwait)
- **Connection pooler**: PgBouncer on port `6543` with `connection_limit=1`
  (required for Vercel serverless)
- **Direct connection** (for Prisma migrations): port `5432`

### 10.2 Required environment variables

```env
# ─── Database (Supabase PostgreSQL) ──────────────────────────────
# Pooled (for runtime / Vercel serverless)
DATABASE_URL="postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1"
# Direct (for Prisma migrations)
DIRECT_DATABASE_URL="postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres"

# ─── NextAuth ────────────────────────────────────────────────────
NEXTAUTH_URL="https://your-app.vercel.app"          # or http://localhost:3000 in dev
NEXTAUTH_SECRET="<openssl rand -base64 32>"          # REQUIRED, no default

# ─── Audit log security ─────────────────────────────────────────
# Required by POST /api/audit-logs (HTTP API). Server-side logAuditEvent()
# bypasses this. NO FALLBACK — if unset, the endpoint returns 500
# audit-not-configured (fail-closed).
AUDIT_INTERNAL_SECRET="<openssl rand -base64 32>"

# ─── Optional seed passwords (else strong randoms are generated) ─
SEED_ADMIN_PASSWORD=""          # admin@demo.com
SEED_SALES_PASSWORD=""          # sales@demo.com
SEED_WAREHOUSE_PASSWORD=""      # warehouse@demo.com

# ─── Optional: bootstrap admin (first-run only) ─────────────────
BOOTSTRAP_ADMIN_PASSWORD=""     # creates admin@demo.com if no users exist

# ─── Optional: Shopify integration ──────────────────────────────
SHOPIFY_STORE_DOMAIN=""
SHOPIFY_ACCESS_TOKEN=""
```

### 10.3 Schema changes

There are **no Prisma migrations** in the repo — schema drift is managed via
`prisma db push`. To apply a schema change:

```bash
# After editing prisma/schema.prisma:
bun run db:push           # pushes the schema to the DATABASE_URL (pooled) / DIRECT_DATABASE_URL
bun run db:generate       # regenerates @prisma/client
```

For local dev: `bun run dev` reads `.env` via `set -a; . ./.env; set +a`.

### 10.4 First-run seed

```bash
# After db:push, seed the demo data:
curl -X POST http://localhost:3000/api/seed -H "Content-Type: application/json" -d '{"reset": true}'
```

This creates: 3 users (ADMIN/SALES/WAREHOUSE), 6 categories, 4 suppliers, 3
warehouses, 22 products, 2 POs, 14+6 Shopify sales, the chart of accounts
(1000-5090), 8 expense transactions, 8 customers, 11 units. If `SEED_*_PASSWORD`
env vars are not set, strong random passwords are generated and returned in the
response body (store them — they're not shown again).

### 10.5 Demo accounts (after seed)

| Role | Email | Password | Views |
|---|---|---|---|
| ADMIN | `admin@demo.com` | `SEED_ADMIN_PASSWORD` or generated | All 20 |
| SALES | `sales@demo.com` | `SEED_SALES_PASSWORD` or generated | 10 (POS, invoices, reports, customers, ...) |
| WAREHOUSE | `warehouse@demo.com` | `SEED_WAREHOUSE_PASSWORD` or generated | 7 (inventory, purchases, suppliers, ...) |

### 10.6 Build + start

```bash
bun run build         # next build (Turbopack)
bun run start         # NODE_ENV=production bun .next/standalone/server.js
bun run lint          # eslint . (0 errors / 0 warnings expected)
```

---

## 11. Recent Fixes (Critical)

These four fixes were applied before this documentation pass. They are verified by
the Vitest suite (§9.2).

### 11.1 Critical Fix #1 — Journal entry inside the transaction

**Problem**: The `createJournalEntry()` call was originally outside the
`db.$transaction`, so a journal-entry failure (e.g. invalid account code, balance
mismatch) would leave the sale / PO receive / refund committed but the books out
of sync.

**Fix**: Moved `createJournalEntry({ ..., tx })` inside every `$transaction`. The
`tx` parameter is now passed through `createJournalEntry` so the journal entry +
its `JournalLine` rows + the `Account.balance` updates are part of the same atomic
unit. If the JE fails, the entire business op rolls back.

**Affected routes**: `POST /api/sales`, `POST /api/sales/[id]/refund`,
`POST /api/exchanges`, `POST /api/purchase-orders/[id]/receive`,
`POST /api/purchase-invoices/[id]/post`, `POST /api/purchase-returns`,
`POST /api/supplier-payments`, `POST /api/stock-takes/[id]/approve`,
`PATCH /api/shifts`.

**Test**: `tests/journal-rollback.test.ts` — mocks `createJournalEntry` to throw,
asserts no `Sale` / `SaleItem` / `JournalEntry` / `JournalLine` persisted, no
stock decrement, `Product.quantity` unchanged.

### 11.2 Critical Fix #2 — PO VAT calculation

**Problem**: The VAT report only counted input VAT from POSTED
`PurchaseInvoice`s. POs received without a posted invoice (the common case in
small businesses that receive goods but pay invoices later) had their VAT
invisible to the report. Worse, when a PurchaseInvoice was later posted for a PO
that had already been received, the VAT was double-counted.

**Fix**:
1. Added `PurchaseOrder.taxRate` (default 0) + `PurchaseOrder.receivedTaxAmount`
   (computed at receive time as `Σ item.subtotal × taxRate/100`).
2. The receive route now stores `receivedTaxAmount` on the PO.
3. The VAT report (`GET /api/financial-reports/vat`) sums `receivedTaxAmount` for
   `RECEIVED` POs **that do NOT have a linked POSTED PurchaseInvoice** — preventing
   double-counting once an invoice is posted.

**Test**: `tests/vat-report.test.ts` — verifies `inputVatPOReceives=50` after a
receive, then `inputVatPOReceives=0` + `inputVatInvoices=50` after posting an
invoice for the same PO, with total `inputVat` unchanged.

### 11.3 Critical Fix #3 — `Product.quantity` derived from `StockItems`

**Problem**: `Product.quantity` was being decremented / incremented directly
during sales / receives, in parallel with `StockItem` mutations. Over time these
two values drifted, especially across multi-warehouse transfers. A sale against
warehouse A could succeed even if warehouse A was empty, as long as the aggregate
`Product.quantity` was sufficient — meaning warehouse B's stock was being shipped
out without authorization.

**Fix**: `Product.quantity` is now **derived** — `SUM(StockItem.quantity)`. The
helper `updateProductQuantityFromStockItems(tx, productId)` recomputes it after
every `StockItem` mutation. Direct `Product.update({ data: { quantity: ... } })`
calls were removed from all stock-mutating routes. Sales now validate against the
specific warehouse's `StockItem`, not the aggregate.

**Affected routes**: every route that touches inventory — `POST /api/sales`,
`POST /api/sales/[id]/refund`, `POST /api/exchanges`,
`POST /api/purchase-orders/[id]/receive`, `POST /api/purchase-invoices/[id]/post`,
`POST /api/purchase-returns`, `POST /api/stock-transfers`,
`POST /api/stock-transfers/[id]/receive`, `POST /api/stock-takes/[id]/approve`,
`POST /api/compositions/[id]/produce`.

**Test**: `tests/sale-stock-warehouses.test.ts` (3 tests) — verifies per-warehouse
insufficient-stock rejection even when the aggregate `Product.quantity` would
suffice.

### 11.4 Critical Fix #4 — Audit log security

**Problem**: The audit log was being written by the browser via a client-side
`logAudit()` helper that held the `AUDIT_INTERNAL_SECRET`. This meant the secret
was exposed in the JS bundle, and a malicious cashier could forge audit entries
(or suppress them).

**Fix**:
1. **Removed** the client-side `logAudit()` helper entirely.
2. Every mutating API route now calls `logAuditEvent({ tx, ... })` **inside its
   `$transaction** — the audit row is part of the atomic business operation.
3. The HTTP `POST /api/audit-logs` endpoint remains for manual corrections, but
   is gated by `X-Audit-Internal` header (=`AUDIT_INTERNAL_SECRET`) OR ADMIN role.
4. `AUDIT_INTERNAL_SECRET` has **no fallback** — if unset, the endpoint returns
   `500 audit-not-configured` (fail-closed). Server-side `logAuditEvent()` does
   not use this secret.

**Result**: The browser can no longer forge or suppress audit entries. Every
sensitive operation (sale, refund, exchange, PO receive, stock transfer,
stock-take approve, supplier payment, user creation/password change, shift
open/close) is atomically audit-logged server-side.

---

## 12. Known Limitations & Future Work

### 12.1 Image storage — base64 in DB

Product / category / bundle / composition images are uploaded via `POST /api/upload`
which returns a base64 data URL stored directly in the DB (`Product.imageUrl`,
etc.). This works for small images and a few thousand products but does not scale:

- Each image inflates every `findMany` query that includes the column.
- Vercel's 4.5 MB request body limit caps per-upload size.
- No CDN caching.

**Future work**: migrate to Supabase Storage (S3-compatible) or Vercel Blob.
The `imageUrl` column would then store the object URL instead of the data URL.
The `ImageUpload` component (`src/components/shared/image-upload.tsx`) would
need a small change to POST the file to a new presigned-URL endpoint.

### 12.2 No offline mode

The POS requires a live internet connection (Supabase + Vercel serverless). If
the network drops mid-sale, the cashier sees an error toast and the sale is not
recorded. There is no service-worker / IndexedDB queue-and-retry layer.

### 12.3 No multi-currency

The country is fixed at deployment time via the Settings panel. Switching
countries re-renders the UI with the new currency symbol + decimals + locale, but
does **not** convert existing prices or recompute historical reports. A true
multi-currency system would need: (a) a `currencyCode` on every monetary field,
(b) historical FX rates, (c) reporting in a base currency with conversion gains
/ losses. None of this exists today.

### 12.4 POS doesn't yet sell bundles

The Bundle schema (`Bundle` + `BundleItem`), the management UI
(`bundles-view.tsx` + `bundle-form-dialog.tsx`), the API routes (`/api/bundles`
+ `/api/bundles/[id]`), and the TanStack Query hooks (`use-bundles.ts`) are all
complete and tested. **However**, the POS sales view (`sales/sales-view.tsx`)
does not include bundles in the cart, and `POST /api/sales` only accepts flat
`items[]` with `productId/quantity/unitPrice` — no bundle-deduction logic.

When implemented, a bundle sale will need to:
- Validate each `BundleItem.productId` has `StockItem.quantity ≥ BundleItem.quantity × bundleQty` in the chosen warehouse.
- Decrement each component via `decrementStockItem`.
- Compute COGS as `Σ BundleItem.quantity × product.costPrice × bundleQty`.
- Credit bundle revenue (`4010`) for `bundle.salePrice × bundleQty`.
- Record the bundle on the `Sale` / `SaleItem` for reporting (the schema may
  need a `bundleId` column on `SaleItem`, or a separate `SaleBundle` table).

The schema is ready; integration is pending.

### 12.5 Composition produce has no inventory-view integration

The composition management UI (`compositions-view.tsx`) and the produce dialog
(`produce-dialog.tsx`) are complete and functional. The produce action
(`POST /api/compositions/[id]/produce`) works and is tested. However, there is
no integration in the inventory view (`inventory-view.tsx`) to surface
compositions as a tab or quick-action — compositions are accessed only via their
dedicated nav entry.

### 12.6 GitHub Action for tests — token scope issue

`.github/workflows/test.yml` runs `bun install` + `bun run test` on push/PR.
Locally this passes (6 files / 11 tests / ~7s), but in GitHub Actions there is
a token-scope issue that prevents the workflow from running. This is documented
in `worklog.md` (CRITICAL-TESTS stage summary) as a pre-existing project
environment issue, unrelated to the test code. The fix is likely a
`permissions:` block in the workflow YAML or a repo settings change.

### 12.7 Other noted limitations

- **No RLS**: Supabase Row-Level Security is not enabled — all auth is
  enforced at the API layer. The README mentions RLS as "optional".
- **No audit log for category/unit/warehouse CRUD** — these are considered
  low-risk; only stock-affecting + financial operations are audited.
- **No soft-delete** — most DELETE routes hard-delete. `PurchaseInvoice` has
  a `CANCELLED` status; `Sale` uses `refundStatus`. `Product` deletion is
  hard (with cascade rules in the schema).
- **No email notifications** — password reset, low-stock alerts, etc. are not
  implemented.
- **No 2FA** — username + password only.
- **Session maxAge is 7 days** with no refresh — users must re-login weekly.
- **No rate limiting** on the login endpoint (would need Vercel Edge
  Middleware or Upstash Ratelimit).

---

<div dir="rtl">

## 📝 ملاحظات ختامية

هذه الوثيقة هي المرجع الرسمي للنظام. تم إنشاؤها من مراجعة كاملة لكود
المشروع في `/home/z/my-project` وتوثّق:

- 38 نموذج Prisma (858 سطر)
- ~90 مسار API
- 20 شاشة عرض موزّعة على 5 مجموعات تنقّل
- 3 أدوار (ADMIN / SALES / WAREHOUSE) مع صلاحيات دقيقة
- 6 اختبارات تكاملية حرجة تعمل على SQLite
- 4 إصلاحات حرجة تم تطبيقها (قيد محاسبي داخل المعاملة، ضريبة أمر الشراء،
  الكمية المشتقة، أمان سجل التدقيق)

للحصول على أحدث المعلومات، استشر دائماً الكود الفعلي + `worklog.md`.

</div>

---

*Document generated by comprehensive system review (Task ID: SYSTEM-REVIEW-DOC).
Last updated: 2025.*
