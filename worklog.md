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
