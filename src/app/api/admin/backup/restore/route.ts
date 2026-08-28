import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { hasRole } from "@/lib/session"
import { logAuditEvent } from "@/lib/audit"
import bcrypt from "bcryptjs"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * POST /api/admin/backup/restore
 *
 * Accepts a JSON backup file (produced by GET /api/admin/backup) and
 * restores it into the current database. Validation + upsert behavior:
 *
 *   - Validates the top-level structure (`format === "kwpos-backup"`,
 *     `version === 1`, `data` is an object).
 *   - Upserts each row by its primary key (`id`) — existing rows are
 *     updated to match the backup; rows in the DB but NOT in the backup
 *     are left untouched (preserves new data created since the backup).
 *   - Per-row try/catch — a single bad row doesn't abort the restore.
 *     Counts of `applied` / `skipped` per table are returned.
 *
 * ⚠️ Users: the backup does NOT include `passwordHash`. When restoring
 * a user that doesn't yet exist in the DB, we create them with a
 * placeholder password ("Restored@2026") and `passwordStatus: "MUST_CHANGE"`
 * so they're forced to set a new password on first login. For users that
 * already exist in the DB (same id), we DO NOT touch their passwordHash —
 * only the fields present in the backup are updated.
 *
 * Auth: OWNER/ADMIN only + production gate (ENABLE_ADMIN_DDL).
 */
export async function POST(req: NextRequest) {
  // ── Production gate ────────────────────────────────────────────────
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_ADMIN_DDL !== "true"
  ) {
    return NextResponse.json(
      { error: "admin-ddl-disabled-in-production" },
      { status: 403 }
    )
  }

  // ── Auth + role gate ───────────────────────────────────────────────
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  if (!hasRole(user.role, ["OWNER", "ADMIN"] as Role[])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  // ── Parse the body ────────────────────────────────────────────────
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 })
  }

  // ── Validate the backup structure ─────────────────────────────────
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid-payload" }, { status: 400 })
  }
  if (body.format !== "kwpos-backup") {
    return NextResponse.json(
      {
        error: "invalid-format",
        hint:
          'Expected `format: "kwpos-backup"`. Got: ' +
          JSON.stringify(body.format),
      },
      { status: 400 }
    )
  }
  if (body.version !== 1) {
    return NextResponse.json(
      {
        error: "unsupported-version",
        hint:
          "This restore endpoint only supports backup format version 1. Got: " +
          JSON.stringify(body.version),
      },
      { status: 400 }
    )
  }
  const data = body.data
  if (!data || typeof data !== "object") {
    return NextResponse.json({ error: "missing-data" }, { status: 400 })
  }

  // Track per-table results.
  const summary: Record<
    string,
    { applied: number; skipped: number; errors: string[] }
  > = {}

  /**
   * Upsert every row in `rows` into the Prisma delegate `delegate` using
   * `id` as the where-key. Each row is wrapped in its own try/catch so a
   * single bad row (e.g. unique-constraint violation on `email`) doesn't
   * abort the rest of the restore.
   *
   * `updateTransform` and `createTransform` let the caller produce
   * different payloads for the `update` and `create` branches of the
   * Prisma upsert. This is needed for users: the `create` branch must
   * add a placeholder `passwordHash` (the backup omits it), while the
   * `update` branch must NOT touch the existing password.
   */
  async function upsertTable(
    delegate: keyof typeof db,
    rows: any[] | undefined,
    opts?: {
      updateTransform?: (row: any) => any
      createTransform?: (row: any) => any
    }
  ): Promise<void> {
    const key = String(delegate)
    summary[key] = { applied: 0, skipped: 0, errors: [] }
    if (!Array.isArray(rows)) return
    const client = (db as any)[delegate]
    if (!client || typeof client.upsert !== "function") return
    for (const row of rows) {
      if (!row || typeof row !== "object" || !row.id) {
        summary[key].skipped++
        continue
      }
      const update =
        opts?.updateTransform?.(row) ?? row
      const create = opts?.createTransform?.(row) ?? update
      try {
        await client.upsert({
          where: { id: row.id },
          update,
          create,
        })
        summary[key].applied++
      } catch (e: any) {
        summary[key].skipped++
        const msg = String(e?.message || e).slice(0, 150)
        if (summary[key].errors.length < 5) {
          summary[key].errors.push(`${row.id}: ${msg}`)
        }
      }
    }
  }

  // Pre-compute a placeholder bcrypt hash for new users. The backup
  // never includes passwordHash (see GET /api/admin/backup), so when we
  // CREATE a user (id not in DB) we need to provide one. Use the known
  // temporary password "Restored@2026" — the admin should communicate
  // this to each restored user. `passwordStatus: "MUST_CHANGE"` is set
  // so the ForceChangePasswordModal blocks all actions until they pick
  // a new password on first login.
  const PLACEHOLDER_PASSWORD = "Restored@2026"
  const placeholderHash = bcrypt.hashSync(PLACEHOLDER_PASSWORD, 10)

  // Helper: strip passwordHash from a row (defensive — should never be
  // present in the backup, but if a hand-crafted backup includes it, we
  // refuse to write it back).
  function stripPasswordHash(row: any): any {
    if (!row || typeof row !== "object") return row
    const { passwordHash: _drop, ...rest } = row
    void _drop
    return rest
  }

  try {
    // ── Restore in dependency order (parent first) ──────────────────
    // Master data (no FK out to other business tables).
    await upsertTable("setting", data.settings)
    await upsertTable("unit", data.units)

    // Categories have a self-ref (parentId) — upsert root categories
    // (parentId === null) first so children can resolve their FK.
    if (Array.isArray(data.categories)) {
      const sorted = [...data.categories].sort((a, b) => {
        if (!a?.parentId && b?.parentId) return -1
        if (a?.parentId && !b?.parentId) return 1
        return 0
      })
      await upsertTable("category", sorted)
    } else {
      await upsertTable("category", data.categories)
    }

    await upsertTable("warehouse", data.warehouses)
    await upsertTable("supplier", data.suppliers)

    // Accounts have a self-ref via parentId — same approach as categories.
    if (Array.isArray(data.accounts)) {
      const sorted = [...data.accounts].sort((a, b) => {
        if (!a?.parentId && b?.parentId) return -1
        if (a?.parentId && !b?.parentId) return 1
        return 0
      })
      await upsertTable("account", sorted)
    } else {
      await upsertTable("account", data.accounts)
    }

    await upsertTable("customer", data.customers)

    // ── Users ──────────────────────────────────────────────────────
    // update: keep all fields EXCEPT passwordHash (preserve the
    //         existing user's real password).
    // create: same fields + placeholder passwordHash + MUST_CHANGE
    //         flag so the user is forced to pick a new password.
    await upsertTable("user", data.users, {
      updateTransform: (row) => stripPasswordHash(row),
      createTransform: (row) => ({
        ...stripPasswordHash(row),
        passwordHash: placeholderHash,
        passwordStatus: row.passwordStatus ?? "MUST_CHANGE",
      }),
    })

    // Products — refs Category, Supplier, Unit, defaultSupplier (all
    // already upserted above).
    await upsertTable("product", data.products)

    // Per-warehouse stock levels (refs Product, Warehouse). The
    // stockItem table has a composite unique key on (productId,
    // warehouseId) PLUS a primary key `id`. Upserting by `id` works
    // when the row's id is preserved across backup/restore; if a row
    // already exists with the same composite key but a different id,
    // the create will fail with a unique-constraint error, which we
    // catch and count as `skipped` — that's the right behavior (the
    // existing stock level stays).
    await upsertTable("stockItem", data.stockItems)

    // Pricing / promotions.
    await upsertTable("promotion", data.promotions)
    await upsertTable("priceChange", data.priceChanges)

    // Shifts + spot-checks (refs User, Product).
    await upsertTable("shift", data.shifts)
    await upsertTable("spotCheck", data.spotChecks)

    // Bundles + compositions.
    await upsertTable("bundle", data.bundles)
    await upsertTable("bundleItem", data.bundleItems)
    await upsertTable("composition", data.compositions)
    await upsertTable("compositionIngredient", data.compositionIngredients)

    // Purchases.
    await upsertTable("purchaseOrder", data.purchaseOrders)
    await upsertTable("purchaseOrderItem", data.purchaseOrderItems)
    await upsertTable("purchaseInvoice", data.purchaseInvoices)
    await upsertTable("purchaseInvoiceItem", data.purchaseInvoiceItems)
    await upsertTable("customsAnnex", data.customsAnnexes)
    await upsertTable("supplierPayment", data.supplierPayments)
    await upsertTable("purchaseReturn", data.purchaseReturns)
    await upsertTable("purchaseReturnItem", data.purchaseReturnItems)

    // Accounting.
    await upsertTable("expenseTransaction", data.expenseTransactions)
    await upsertTable("journalEntry", data.journalEntries)
    await upsertTable("journalLine", data.journalLines)

    // Sales + items.
    await upsertTable("sale", data.sales)
    await upsertTable("saleItem", data.saleItems)
    await upsertTable("suspendedSale", data.suspendedSales)
    await upsertTable("exchangeSale", data.exchangeSales)
    await upsertTable("exchangeLine", data.exchangeLines)

    // Inventory ops.
    await upsertTable("stockTake", data.stockTakes)
    await upsertTable("stockTakeItem", data.stockTakeItems)
    await upsertTable("stockTransfer", data.stockTransfers)
    await upsertTable("stockTransferItem", data.stockTransferItems)

    // Audit log (last — references users/sales/products by id but
    // those are not FK-enforced, so order doesn't matter for this table).
    await upsertTable("auditLog", data.auditLogs)

    // ── Compute summary totals ────────────────────────────────────
    let totalApplied = 0
    let totalSkipped = 0
    for (const k of Object.keys(summary)) {
      totalApplied += summary[k].applied
      totalSkipped += summary[k].skipped
    }

    // ── Audit-log the restore ──────────────────────────────────────
    try {
      await logAuditEvent({
        userId: user.id,
        userName: user.name,
        action: "BACKUP_RESTORE",
        description: `استعادة نسخة احتياطية (${totalApplied} صف ناجح، ${totalSkipped} متخطى) بواسطة ${user.name || user.id}`,
        metadata: JSON.stringify({
          backupGeneratedAt: body.generatedAt,
          totalApplied,
          totalSkipped,
        }),
      })
    } catch (e: any) {
      console.error(
        "[restore] AuditLog write FAILED (restore succeeded but no audit record):",
        e?.message
      )
    }

    return NextResponse.json({
      ok: true,
      message: "Backup restored.",
      backupGeneratedAt: body.generatedAt,
      placeholderPassword: PLACEHOLDER_PASSWORD,
      totalApplied,
      totalSkipped,
      perTable: summary,
    })
  } catch (e: any) {
    console.error("[restore] failed:", e?.message)
    return NextResponse.json(
      {
        error: "restore-failed",
        detail: String(e?.message || e).slice(0, 200),
        partialSummary: summary,
      },
      { status: 500 }
    )
  }
}
