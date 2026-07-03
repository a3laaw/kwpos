# Worklog — نظام إدارة المبيعات والمخازن والمشتريات

This file tracks work done by the main agent and subagents on the Small Business ERP.

---
Task ID: 0
Agent: main
Task: Project foundation (DB schema, auth, layout, types, seed, all API routes)

Work Log:
- Installed `bcryptjs` + types.
- Wrote Prisma schema (User, Category, Supplier, Product, PurchaseOrder, PurchaseOrderItem, Sale, SaleItem) and ran `bun run db:push`.
- Configured NextAuth (credentials provider, JWT strategy, role on session/token) in `src/lib/auth.ts` + `[...nextauth]/route.ts`.
- Added `types/next-auth.d.ts` to augment session with `role`.
- Root layout: RTL (`dir="rtl"`, `lang="ar"`), Tajawal Arabic font, ThemeProvider (next-themes) + React Query provider.
- `globals.css`: emerald-based theme (light/dark), RTL scrollbar utilities, sidebar active nav styling.
- Shared libs: `src/lib/types.ts` (all API types), `src/lib/format.ts` (currency/date/invoice formatters), `src/lib/session.ts` (getCurrentUser, hasRole, ROLE_PERMISSIONS), `src/lib/serialize.ts` (Prisma→API mappers), `src/lib/store.ts` (Zustand: user + current view + sidebar).
- Seed route `POST /api/seed` (reset=true): 3 demo users (admin/sales/warehouse), 6 categories, 4 suppliers, 22 products, 2 purchase orders (1 received, 1 pending), 14 sales across last 7 days.
- API routes implemented (all under `src/app/api`):
  - `products` (GET list w/ search+filter, POST), `products/[id]` (GET, PUT, DELETE) — ADMIN/WAREHOUSE only for mutations.
  - `categories` (GET, POST).
  - `suppliers` (GET, POST), `suppliers/[id]` (PUT, DELETE w/ linked-guard).
  - `purchase-orders` (GET, POST), `purchase-orders/[id]` (GET, PUT, DELETE), `purchase-orders/[id]/receive` (POST → transactionally bumps inventory + sets RECEIVED).
  - `sales` (GET list, POST → transactional stock decrement + invoice no), `sales/[id]` (GET).
  - `dashboard` (GET → aggregated stats: total/today sales, counts, low-stock, inventory value, 7-day trend, top products, category distribution, recent sales).
- Demo credentials: admin@demo.com/admin123, sales@demo.com/sales123, warehouse@demo.com/warehouse123.
- Dev server started via `.zscripts/dev.sh` (PID persisted). Seed executed successfully (3 users, 22 products, 14 sales).

Stage Summary:
- All backend APIs are ready and tested via curl. Database seeded.
- Frontend (login, app shell, sidebar, 4 feature views, dashboard) NOT yet built — to be done next.
- Conventions for subagents: use shadcn/ui from `src/components/ui/*`, import types from `@/lib/types`, format money with `formatCurrency` from `@/lib/format`, use TanStack Query for server state, `useAppStore` (Zustand) for view switching, toast via `sonner` (`toast(...)` from `@/components/ui/sonner`). Arabic RTL UI. Emerald theme already set. Single visible route is `/`.

---
Task ID: FINAL
Agent: main
Task: Frontend views + end-to-end verification

Work Log:
- Built all 6 view components:
  - DashboardView: KPI stat cards (total/today sales, products, low-stock), 7-day sales area chart (recharts), category distribution pie chart, top products w/ progress bars, low-stock alerts list, recent sales list, pending-purchases banner.
  - InventoryView: search + category filter + low-stock toggle, responsive table, CRUD via ProductFormDialog (margin calc), delete confirm, loading skeleton + empty states.
  - SuppliersView: card grid w/ contact info + counts, CRUD via SupplierFormDialog, delete w/ linked-guard handling.
  - PurchasesView: status filter, table, create PO dialog (dynamic line items w/ auto unit-cost prefill), receive action (transactional inventory bump), cancel, delete, detail dialog.
  - SalesView (POS): product grid w/ optimistic availability badges, cart w/ qty controls, customer/payment/discount/tax inputs, auto subtotal+tax+total, transactional checkout w/ stock validation, receipt dialog w/ print.
  - InvoicesView: searchable list, payment-method badges, detail dialog w/ full breakdown + print.
- Shared components: PageHeader, EmptyState, LoadingState/TableSkeleton, ConfirmDialog, StatCard.
- TanStack Query hooks (`src/hooks/use-api.ts`) for all entities + mutations w/ cache invalidation.
- page.tsx: server-side session gate → LoginScreen or AppShell.

End-to-end verification (Agent Browser):
- Login (admin) → dashboard renders with charts + KPIs. ✓
- Inventory: table with Arabic numerals/currency, 22 seeded products. ✓
- POS: added 2 products → cart auto-calc 48 + 15% tax = 55.20 SAR → checkout → receipt INV-00015. ✓
- Inventory decrement verified: أرز 80→79, سكر 8→7. ✓
- Purchases: confirmed receipt of pending PO → status→مستلم, toast, inventory bumped. ✓
- Role-based access: warehouse user sees only Dashboard/Inventory/Purchases/Suppliers (no POS/Invoices). ✓
- Responsive: mobile drawer sidebar, adaptive table columns. ✓
- Sticky footer: short page footer at viewport bottom (844=844); long page footer pushed down (1739>844). ✓
- Dark mode toggle works. ✓
- No console/runtime errors; ESLint clean. ✓
- Fixed a11y warnings (added DialogDescription to 3 detail dialogs).

Stage Summary:
- App fully functional and verified end-to-end. All requirements met.
- Demo credentials: admin@demo.com/admin123, sales@demo.com/sales123, warehouse@demo.com/warehouse123.

---
Task ID: KUWAIT+SHOPIFY
Agent: main
Task: Adapt app to Kuwait + build Shopify integration module

Work Log:
Kuwait adaptation:
- `src/lib/format.ts`: switched currency to KWD (3 decimals — fils), locale to ar-KW for currency/number/date. Added `DEFAULT_TAX_RATE = 0`.
- `src/app/api/seed/route.ts`: rewrote suppliers (4 Kuwaiti: شركة المركز للأغذية/حولي، مؤسسة الإمداد/الشويخ الصناعية، شركة التقنية الحديثة/الفروانية، بيت القرطاسية/السالمية) with +965 phones and .kw emails; repriced all 22 products in KWD (3-decimal); PO unit costs in KWD; sales tax = 0% (Kuwait has no VAT); discounts scaled to KWD.
- `src/components/sales/sales-view.tsx`: default tax rate 0 (was 15).
- `src/components/dashboard/dashboard-view.tsx`: chart subtitle → "دينار كويتي".
- Re-seeded (reset=true): 3 users, 22 products, 14 sales, total 306.955 KWD.
- Verified via browser: KWD formatting (٣٫١٠٠د.ك), tax=0 in POS, Kuwaiti suppliers render.

Shopify integration (optional, admin-only):
- `src/lib/shopify.ts`: Shopify Admin REST helper (config check, fetch products, fetch orders). Reads SHOPIFY_STORE_DOMAIN + SHOPIFY_ACCESS_TOKEN from env.
- `.env`: added SHOPIFY_STORE_DOMAIN / SHOPIFY_ACCESS_TOKEN placeholders (empty by default).
- API routes (all admin-only):
  - `GET /api/shopify/status` — configured? + domain.
  - `POST /api/shopify/sync-products` — pulls Shopify products, upserts local inventory by barcode/SKU or name, auto-creates "Shopify" category.
  - `POST /api/shopify/import-orders` — pulls last 50 Shopify orders, creates local sales (invoiceNo = SHP-<id>, idempotent), matches line items to local products.
- New `AppView "integrations"` added to types + ADMIN permissions + nav item "التكاملات" (Plug icon).
- `src/components/integrations/integrations-view.tsx`: status badge, sync/import buttons with result summaries + error lists, and a 4-step setup guide (with link to Shopify dev apps) shown when not configured.
- AppShell routes `integrations` view.

Verification:
- ESLint clean. Dev log clean (no errors). Browser: Integrations page renders "غير مُعد" + setup guide; dashboard shows KWD; POS tax=0; suppliers show +965 Kuwait phones.

Stage Summary:
- DB stays as SQLite file at /home/z/my-project/db/custom.db (file-based, runs instantly). For multi-user production, switch DATABASE_URL to PostgreSQL/MySQL.
- Kuwait fully applied (KWD/ar-KW, no VAT, Kuwaiti seed data).
- Shopify integration ready — activates the moment the user adds their store domain + access token to .env and restarts.

---
Task ID: HYDRATION-FIX
Agent: main
Task: Fix Radix useId hydration mismatch on reload

Root cause:
- Zustand `persist` middleware hydrated the saved `view` (e.g. "inventory") from
  localStorage SYNCHRONOUSLY during store creation on the client.
- Server render used the default `view` ("dashboard") since localStorage is
  unavailable server-side.
- => client first render rendered a different component tree than the server
  HTML, which shifted every subsequent Radix `useId` identifier
  (radix-_R_27atplb_ vs radix-_R_8uatplb_) → React hydration mismatch error
  on the Topbar DropdownMenu trigger.

Fix:
1. `src/lib/store.ts`: added `skipHydration: true` to the persist config so the
   store starts with the default `view` on both server and client (matching
   first render). Removed `user`/`setUser` from the store entirely.
2. `src/components/app-shell.tsx`: call `useAppStore.persist.rehydrate()` inside
   a `useEffect` so the persisted `view` is applied AFTER hydration completes
   (safe post-hydration update, no mismatch).
3. `src/components/user-context.tsx` (new): `UserProvider` + `useUser()` React
   context populated from the server-rendered `user` prop. This gives views
   synchronous access to the authenticated user (no `useEffect`/flash) and
   removes the need to mirror the user in Zustand.
4. Updated `inventory-view`, `purchases-view`, `suppliers-view` to use
   `useUser()` instead of `useAppStore((s) => s.user)`; `user.role` is now
   always defined (no more `?.`).

Verification (Agent Browser):
- Logged in, navigated to Inventory (persists view), reloaded → no hydration
  error, page rendered correctly, persisted view re-applied after mount.
- Same for POS and Dashboard.
- `agent-browser errors` and `console` clean (no hydration/mismatch warnings).
- ESLint clean.

Stage Summary:
- Hydration mismatch fully resolved. Persisted last-view navigation still works
  (applied safely post-hydration). User role available synchronously in views.

---
Task ID: ACCOUNTING+CRM+ANALYTICS
Agent: main
Task: Build Module 1 (Accounting) + Module 2 (CRM & Analytics) with Shopify revenue ingestion

DB schema additions (prisma/schema.prisma):
- Account: code (unique), name, type (ASSET|LIABILITY|EQUITY|REVENUE|EXPENSE), parentId (self-ref "AccountTree"), balance, isSystem
- ExpenseTransaction: type (SALARY|ADMIN), employeeName/payDate (salary), title/category/date (admin), amount, accountId (expense), paymentAccountId (asset credited), note
- Customer: name, phone, address, timestamps

Seed additions (POST /api/seed reset=true):
- 6 simulated Shopify orders (tagged SHP-1001..1006, with Kuwaiti customer names) — feed P&L revenue + analytics.
- Chart of Accounts hierarchy: 5 root types + 12 child accounts (Cash 1850, Bank 4200, Accounts Payable 320, Capital 5000, Sales Revenue, Shopify Revenue, Salaries/Rent/Utilities/Subscriptions/Marketing/Other Expense).
- 8 expense transactions (3 salaries: 450+320+280; 5 admin: rent 250, utilities 65, shopify sub 18, marketing 40, office 12) — each transactionally updates account balances.
- 8 CRM customers (Kuwaiti names + +965 phones + addresses).
- Final counts: 20 sales, 17 accounts, 8 expenses, 8 customers.

API routes (all new):
- GET/POST /api/accounts (tree builder w/ recursive subtree totals; create with parent-type inheritance)
- PUT/DELETE /api/accounts/[id] (system accounts + accounts w/ children/transactions protected)
- GET/POST /api/expenses (POST runs in a transaction: create entry + debit expense account + credit payment asset)
- DELETE /api/expenses/[id] (transactional reversal of balances)
- GET/POST /api/customers (CRUD), PUT/DELETE /api/customers/[id]
- GET /api/financial-reports (P&L: revenue from all sales incl SHP-, COGS from saleItems×costPrice, salaries+admin expenses, gross/net profit; date-range filter)
- GET /api/analytics (5 widgets: top-selling by qty+volume, stagnant by turnover ratio, most-expensive/cheapest by cost, highest-margin by abs(sale-cost); date range for sales-based)

Frontend views:
- AccountingView (3 tabs): Chart of Accounts (collapsible tree w/ live balances, add root/child accounts), Expenses (Salary/Admin tabs form w/ OPTIMISTIC updates via qc.setQueryData + transactional list), P&L (headline net profit + full breakdown + expense-by-category bars).
- CustomersView: search + CRUD table + modal forms.
- AnalyticsView: date-range filter + 5 cards (top selling, stagnant, most/least expensive, highest margin) w/ progress bars & badges.
- New nav items (العملاء، تحليلات المبيعات، المحاسبة) + role permissions (accounting admin-only; customers+analytics for admin+sales).

Verification (Agent Browser):
- Accounting → Chart of Accounts: 17 accounts render as tree with live balances (Assets 4615 KWD = Cash 1243 + Bank 3372 after expense deductions). ✓
- Expenses: recorded a new salary "محمد التجريبي 200 KWD" — list updated INSTANTLY (optimistic) + toast success + no errors. ✓
- P&L: Revenue 395.750 (incl Shopify), COGS 247.870, Gross 147.880, Salaries 1250 (incl new), Net -1487.120 — math correct. ✓
- Customers: 8 seeded customers w/ names/phones/addresses render in table. ✓
- Analytics: all 5 widgets render (top-selling: دفتر A4, أرز بسمتي; most expensive: مكنسة, طقم أواني). ✓
- Mobile (iPhone 14): accounting tabs collapse to compact labels, layout responsive. ✓
- Reload: NO hydration errors, sticky footer pushed below content (top 1753 > vh 577). ✓
- ESLint clean, dev log clean.

Stage Summary:
- Both new modules fully functional and verified end-to-end.
- Shopify revenue ingestion via simulated SHP- tagged sales (real Shopify sync already exists in /api/shopify/import-orders which creates SHP-<id> sales — same mechanism).
- P&L pulls revenue from all sales (POS + Shopify), subtracts COGS + salaries + admin expenses → true net profit.

---
Task ID: PRINT+UNITS+CATEGORIES
Agent: main
Task: Print system (thermal/A4/barcode) + Units & Categories settings + fix stale-session POS

Fixes:
- Removed debug console.log from sales route.
- Fixed POS 500 error (was caused by stale session after re-seed; logout+login resolves).
- Verified fresh session: sale INV-00021 → POST 201 + journal entry JE-00002 auto-created. Trial balance stays balanced.

Print system (src/lib/print.ts):
- `printThermalReceipt(sale)` — 80mm thermal receipt (store header, invoice #, items table, totals, barcode of invoice #, footer). @page size: 80mm auto.
- `printA4Invoice(sale)` — full A4 invoice (branded header with store info + VAT#, customer/seller parties block, items table with #/name/qty/price/total, totals box with grand total, footer). Professional emerald design.
- `printBarcodeLabels(products, copies)` — A4 sheet of 3-column barcode labels (Code 39 font) with store name, product name, price, and scannable barcode.
- All three open a dedicated print window with proper @page CSS and auto-trigger window.print().
- Store info (name/address/phone/vat#) stored in localStorage key "erp-store-info" (configurable later).

Print buttons wired:
- POS receipt dialog → "طباعة حرارية" (thermal 80mm).
- Invoices detail dialog → "طباعة الفاتورة (A4)".
- Inventory header → "طباعة باركود" (prints barcode labels for all visible products).

Units of measure (DB + API + UI):
- New `Unit` model (id, name unique, createdAt). db:push'd.
- API: GET/POST /api/units (admin-only POST), DELETE /api/units/[id] (admin-only).
- Seed: 11 default units (قطعة، كيلو، جرام، علبة، كيس، زجاجة، كرتون، رزمة، طقم، لتر، متر).
- Hooks: useUnits, useCreateUnit, useDeleteUnit.
- Product form: unit field changed from free-text Input to a Select dropdown populated from units (with fallback warning if the product's existing unit isn't in the list).
- Settings page: "وحدات القياس" card with add (pill input) + delete (X on each pill) — verified adding "صندوق" works.

Categories management:
- Settings page: "التصنيفات" card showing all categories as pills + add form. Uses existing useCategories/useCreateCategory hooks.

Verification (Agent Browser):
- Settings: 11 units render as pills + 6 categories render. Added "صندوق" unit successfully (toast + appeared). ✓
- Product form: unit field is now a dropdown showing "قطعة" by default. ✓
- Inventory: "طباعة باركود" button opens print window titled "ملصقات باركود" with all product names. ✓
- POS: checkout → receipt dialog → "طباعة حرارية" opens window titled "إيصال INV-00021" with store/items/barcode. ✓
- Invoices: detail → "طباعة الفاتورة (A4)" opens window titled "فاتورة INV-00021" with full A4 layout. ✓
- No errors, no hydration mismatch, ESLint clean. ✓

Stage Summary:
- 3 print formats working (thermal 80mm, A4 invoice, barcode labels A4).
- Units & categories fully manageable from Settings (admin-only mutations).
- POS customer auto-registration by phone confirmed working (INV-00021).
- Journal entries auto-generated on every sale (double-entry balanced).

---
Task ID: STALE-SESSION-FIX
Agent: main
Task: Root-cause fix for FK constraint error on tx.sale.create() after re-seed

Root cause:
- Every `POST /api/sales` with a stale session cookie failed with
  "Foreign key constraint violated on the foreign key" (Prisma P2003) on
  `tx.sale.create()`. The session JWT held the user id from BEFORE a re-seed,
  but re-seeding deleted + recreated users with NEW cuid() ids — so the sale's
  `userId` FK pointed at a non-existent user.

Fix (two layers):
1. **Stable user IDs in seed** (`src/app/api/seed/route.ts`): demo users now use
   fixed ids (`user-admin-demo`, `user-sales-demo`, `user-warehouse-demo`) instead
   of random cuids. After a re-seed, the existing session JWT still references a
   valid user id → sales work without re-login.
2. **Defensive session check in sales route** (`src/app/api/sales/route.ts`):
   before the transaction, `db.user.findUnique({ where: { id: user.id } })`.
   If the user no longer exists (truly stale session), return
   `{ error: "session-expired" }` (401) instead of a cryptic FK error.
3. **Frontend auto-logout on session-expired** (`src/components/sales/sales-view.tsx`):
   the checkout catch block detects `session-expired`, shows a toast, and calls
   `signOut()` + reload after 1.5s — so the user is gracefully sent back to
   login instead of seeing a raw error.

Verification (Agent Browser):
- Logged in → re-seeded (reset=true) → went straight to POS → added product →
  checked out → **sale succeeded (INV-00021, POST 201) WITHOUT logging out**.
  Previously this exact flow threw the FK error. ✓
- No errors, no hydration mismatch, ESLint clean. ✓

Stage Summary:
- The FK error is permanently resolved. Re-seeding no longer breaks the POS.
- Two safety nets: stable IDs (primary) + defensive check + auto-logout (fallback).

---
Task ID: PRINT-FIX-THERMAL
Agent: main
Task: Fix thermal receipt printing (barcode not rendering + garbled date + width)

Root cause (from user-uploaded screenshot of actual print):
1. Barcode showed as plain text "*INV-00023*" instead of vertical lines — the
   "Libre Barcode 39" font was referenced in CSS but never LOADED (no <link>
   to Google Fonts in the print window), so it fell back to monospace text.
2. Date was garbled ("2026/7/3" / "10/42:43") — used `toLocaleString("ar")`
   which is locale-dependent and produces inconsistent output across browsers.
3. Receipt was slightly too wide and had a duplicated/empty "العميل" field.

Fix (src/lib/print.ts):
1. **Font loading**: added <link> tags for Google Fonts (Libre Barcode 39 +
   Tajawal) in ALL three print templates (thermal, A4, barcode labels).
2. **Font-ready printing**: `openPrintWindow` now waits for `document.fonts.ready`
   before triggering `window.print()` — guarantees the barcode font is loaded
   so it renders as actual vertical bars, not text.
3. **Date formatting**: replaced `toLocaleString("ar")` with explicit
   `Intl.DateTimeFormat("ar-EG", {...})` producing "٣ يوليو ٢٠٢٦ في ٠٧:٤٨ ص".
4. **Width**: set `html, body { width: 80mm; max-width: 80mm; }` + tighter
   padding (3mm 2mm) + smaller font sizes for a true 80mm thermal fit.
5. **Layout**: fixed duplicated field, cleaner info section, added barcode
   code text under the bars.

Verification (Agent Browser + VLM):
- Printed thermal receipt INV-00024 → screenshot analyzed by vision model:
  "الباركود يظهر كخطوط عمودية حقيقية (قابل للمسح)" ✓
  "العرض مناسب لطابعة حرارية 80mm (ضيق)" ✓
- DOM snapshot confirms date = "٣ يوليو ٢٠٢٦ في ٠٧:٤٨ ص" (no longer garbled) ✓
- ESLint clean.

Stage Summary:
- Thermal receipt now prints with real scannable barcode, correct Arabic
  date, and proper 80mm width. A4 invoice + barcode labels also load fonts.

---
Task ID: LATIN-NUMBERS+FILTERS
Agent: main
Task: Latin digits (0123) everywhere + date-range filters on reports

Latin numbers fix:
- `src/lib/format.ts`: all formatters now use locale `ar-KW-u-nu-latn` (Arabic
  text/months + Latin 0123 digits). `toFormatLocale` appends `-u-nu-latn` to
  the country's base locale.
- `src/components/currency-context.tsx`: `useFmt().number/date/dateTime` now
  pass the latinized locale (was passing raw `country.locale` → Arabic digits).
- `src/lib/print.ts`: `fmtNum` + all date formatters switched to `ar-KW-u-nu-latn`.
- `src/components/analytics/analytics-view.tsx`: `toLocaleDateString("ar-KW")` →
  `ar-KW-u-nu-latn`.
- Verified across dashboard, inventory, trial balance: 408.050, 77 كيس,
  648.300, 2,544.000 — all Latin digits. ✓

Dashboard date-range filter:
- `GET /api/dashboard` now accepts `?from=&to=&range=` query params. Total
  sales, sales count, sales trend, and top products are all scoped to the
  selected period. Quick ranges: 7/30/90/365 days. Explicit from/to override.
  Trend chart fills missing days with 0 for a continuous line.
- `useDashboard(from, to, range)` hook updated.
- `DashboardView` now renders a filter bar (date inputs + quick-range select +
  apply/reset buttons + active-range badge). Trend chart subtitle shows range.
- Verified: switched from "آخر 30 يوم" → "آخر 7 أيام" → numbers + badge +
  chart subtitle updated correctly.

Verification (Agent Browser):
- Dashboard: 408.050 KWD (Latin) + filter bar works + badge updates. ✓
- Inventory: "77 كيس" (Latin 77). ✓
- Trial balance: 648.300 / 2,544.000 (Latin) + "متوازن ✓". ✓
- No errors, no hydration mismatch, ESLint clean. ✓

Stage Summary:
- All numbers across the app now use Latin digits (0123) while keeping Arabic
  text, month names, and currency symbols.
- Dashboard + analytics + P&L + trial balance all support date-range filtering.

---
Task ID: COLOR-PALETTE-APPLY
Agent: main
Task: Apply user-uploaded color palette to the entire system

Palette (from /home/z/my-project/upload/color-palette.jpg, analyzed via VLM):
- Primary blue: #055BE5
- Aqua green accent: #5CDE9D
- Dark teal (sidebar): #185B6B
- White background: #FFFFFF

Changes (src/app/globals.css):
- `:root` light theme: primary = oklch(0.54 0.22 264) [#055BE5], accent =
  oklch(0.84 0.14 162) [#5CDE9D], sidebar = oklch(0.38 0.06 220) [#185B6B],
  background = oklch(0.99 0.004 240) [white]. All chart colors, ring, border,
  sidebar-primary/accent updated to match.
- `.dark` theme: primary lightened to oklch(0.65 0.2 264), accent stays aqua,
  sidebar very dark teal.
- Dashboard PIE_COLORS array → [#055BE5, #5CDE9D, #185B6B, ...].
- Dashboard area chart gradient + stroke → #055BE5 (was emerald #10b981).
- Login screen branding glow → bg-[#5CDE9D] (was emerald-400); demo-account
  tone → text-[#055BE5]/[#5CDE9D].

Kept semantic emerald usages (success/positive indicators: POS receipt success
icon, positive net profit color, received PO status, cash payment badge) —
green = good is a universal convention; only the BRAND identity changed.

Verification (Agent Browser + VLM):
- Login screen: "اللون الأساسي هو الأزرق، الشريط الجانبي أزرق غامق" ✓
- Dashboard: "الشريط الجانبي أزرق غامق/تيركواز داكن، الأزرار أزرق #055BE5،
  الرسم البياني أزرق #055BE5" ✓
- Aqua accent: "عناصر باللون الأخضر المائي #5CDE9D في الأيقونات النشطة" ✓
- No errors, ESLint clean. ✓

Stage Summary:
- Full brand color migration from emerald to the user's blue/aqua/teal palette.

---
Task ID: REPORTS-REDESIGN+SETTINGS-MODERN
Agent: main
Task: Redesigned reports page with modern filters + modernized settings (units/categories)

New Reports module:
- `GET /api/reports` — unified filterable report endpoint. Accepts: from, to,
  productId, categoryId, paymentMethod, source (POS|SHOPIFY). Returns summary
  KPIs (revenue, cost, gross profit, margin, discount, tax, count, items, avg)
  + breakdowns by day, by product, by category, by payment method + catalog
  (products/categories) for filter dropdowns.
- `useReport(filters)` hook.
- `ReportsView` (`src/components/reports/reports-view.tsx`) — modern dashboard:
  - Filter bar (card with border-primary/20): date from/to, quick-range buttons
    (7/30/90 days), category select, product select, payment-method select,
    source select (POS/Shopify), apply + reset buttons, active-filter count badge.
  - 4 summary KPI StatCards (revenue, cost, profit, avg sale).
  - Revenue trend area chart (blue gradient) + payment-method pie chart with legend.
  - Category breakdown bar chart (revenue + profit bars).
  - Product breakdown table (name, category, qty, revenue, cost, profit).
  - Print/export button.
- Added "reports" to AppView, nav-config (FileBarChart icon), role permissions
  (admin + sales), AppShell routing.

Settings redesign (`src/components/settings/settings-view.tsx`):
- Units manager: modern grid layout (3-4 cols) with icon chips, delete-on-hover
  (X button appears top-left on hover), search when > 4 units, add form.
- Categories manager: pill badges with primary border, search when > 4, add form.
- Current-config card: gradient background (from-primary/5), 4 config cells.

Verification (Agent Browser):
- Reports: filter bar with 6 filters + quick ranges; applied "نقدي" payment
  filter → revenue dropped 408.050 → 47.250 KWD (9 cash invoices), "1 مفعّل"
  badge appeared. ✓
- KPIs: 408.050 revenue, 256.270 cost, 151.780 profit — math correct. ✓
- Settings: units grid (قطعة، كيلو، جرام...) + categories pills + search. ✓
- No errors, no hydration mismatch, ESLint clean. ✓

Stage Summary:
- New modern Reports page with 6 filter dimensions + 4 KPIs + 3 charts + table.
- Settings redesigned (units grid + categories pills + search).
- Note: existing modules (inventory, purchases, suppliers, accounting) remain
  intact. Awaiting user clarification on "لا أريد إدخال الأصناف في المخازن".

---
Task ID: MULTI-WAREHOUSE+PRODUCT-ENTRY
Agent: main
Task: Upgrade inventory to multi-warehouse + enhanced product entry panel

DB schema changes (prisma/schema.prisma):
- New `Warehouse` model (id, name, code, location, isActive) with relations to
  StockItem + PurchaseOrder ("POWarehouse").
- New `StockItem` join model (productId, warehouseId, quantity) with
  @@unique([productId, warehouseId]) — a product can live in many warehouses.
- `Product` gained `unitId` (FK to Unit) + `stockItems` relation.
- `PurchaseOrder` gained optional `warehouseId` (destination warehouse).
- `Unit` gained back-relation `products`.
- db:push'd; client regenerated; server restarted.

API:
- `GET/POST /api/warehouses`, `PUT/DELETE /api/warehouses/[id]` (admin/warehouse
  for mutations; delete guarded against non-empty stock).
- `GET /api/products` now includes `stockItems { include warehouse }` + accepts
  `?warehouseId=` filter.
- `POST /api/products` accepts `warehouseStock: [{warehouseId, quantity}]` and
  creates StockItem rows; total quantity auto-computed.
- `PUT /api/products/[id]` includes stockItems in response.
- `serializeProduct` now returns `stockByWarehouse[]`; new `serializeWarehouse`.

Hooks: useWarehouses, useCreateWarehouse, useUpdateWarehouse, useDeleteWarehouse.

UI:
- `WarehouseFormDialog` — add/edit warehouse (name, code, location).
- `WarehouseManager` — card grid showing each warehouse (icon, code, location,
  productsCount badge, totalStock badge, isActive) + add/edit/delete actions.
- `InventoryView` now has 2 tabs: "الأصناف" (existing products table) + "المخازن"
  (WarehouseManager).
- `ProductFormDialog` enhanced: renamed quantity → "الكمية الإجمالية" + added
  "توزيع الكمية على المخازن" section — a grid of inputs (one per warehouse)
  with live running total; shows warning if warehouse sum ≠ total. Edit mode
  pre-fills from product.stockByWarehouse.

Seed: 3 warehouses created (WH-01 الرئيسي, WH-02 الفرع السالمية, WH-03 الإلكترونيات).
Food/drink products split across WH-01+WH-02; electronics in WH-01; rest in WH-01.

Verification (Agent Browser):
- Inventory shows 2 tabs (الأصناف + المخازن). ✓
- Warehouses tab: 3 warehouse cards with codes (WH-01/02/03) + counts. ✓
- Product form: "توزيع الكمية على المخازن" section with 3 warehouse inputs +
  live total. ✓
- No errors, no hydration mismatch, ESLint clean. ✓

Stage Summary:
- Inventory upgraded to multi-warehouse with per-warehouse stock distribution.
- Enhanced product entry panel with warehouse allocation.
- Shopify sync can optionally push to a specific warehouse (future enhancement).
