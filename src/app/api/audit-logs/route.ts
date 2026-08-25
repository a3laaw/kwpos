import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { logAuditEvent, AUDIT_INTERNAL_SECRET } from "@/lib/audit"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/** GET /api/audit-logs — list logs with filters (ADMIN only). */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const action = searchParams.get("action") || undefined
  const userId = searchParams.get("userId") || undefined
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const where: any = {}
  if (action) where.action = action
  if (userId) where.userId = userId
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from)
    if (to) {
      const t = new Date(to)
      t.setHours(23, 59, 59, 999)
      where.createdAt.lte = t
    }
  }

  const logs = await db.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
  })

  return NextResponse.json({ items: logs })
}

/**
 * POST /api/audit-logs — RESTRICTED (internal-only).
 *
 * Only accepts requests with the internal secret header (X-Audit-Internal).
 * This prevents clients from forging audit log entries. Normal audit
 * logging happens server-side via logAuditEvent() inside API route
 * transactions — not via this endpoint.
 *
 * SECURITY: ADMIN can NO LONGER POST arbitrary audit entries via this
 * endpoint. Previously, an `|| isAdmin` branch allowed any ADMIN to
 * inject fake VOID_ITEM / SALE_REFUNDED / USER_PASSWORD_CHANGED entries
 * that looked identical to server-generated ones in the audit trail.
 * This is a defense-in-depth measure: the audit trail must only contain
 * events that genuinely originated from server-side business logic.
 *
 * If the secret is not configured, this endpoint returns 500
 * "audit-not-configured" — it does NOT fall back to a default secret.
 */
// Whitelist of valid audit actions (mirrors all action: "..." usages in
// src/lib and src/app/api). Rejecting unknown actions prevents an
// attacker with the internal secret from injecting malformed actions
// that could confuse downstream audit analysis.
const VALID_AUDIT_ACTIONS = new Set<string>([
  // Sale lifecycle
  "SALE_CREATED", "SALE_REFUNDED", "SALE_EXCHANGED", "CANCEL_TXN",
  "REFUND", "EXCHANGE", "VOID_ITEM", "MANUAL_DISCOUNT",
  // Cash / drawer / approvals
  "DRAWER_OPEN", "HOLD_BILL", "MANAGER_APPROVAL",
  // Shifts
  "SHIFT_OPENED", "SHIFT_CLOSED",
  // Inventory / stock
  "STOCK_TAKE_APPROVED", "STOCK_TRANSFER_CREATED", "STOCK_TRANSFER_RECEIVED",
  "STOCK_TRANSFER_CANCELLED", "PRODUCT_UPDATED", "PRODUCT_DELETED",
  "SPOT_CHECK_CREATED",
  // Bundles & compositions
  "BUNDLE_CREATED", "BUNDLE_UPDATED", "BUNDLE_DELETED",
  "COMPOSITION_CREATED", "COMPOSITION_UPDATED", "COMPOSITION_DELETED",
  "COMPOSITION_PRODUCED",
  // Purchases & suppliers
  "PO_RECEIVED", "PURCHASE_INVOICE_POSTED", "PURCHASE_RETURN_CREATED",
  "SUPPLIER_PAYMENT_CREATED", "CUSTOMS_ANNEX_POSTED",
  // Users & system
  "USER_CREATED", "USER_UPDATED", "USER_DELETED", "USER_PASSWORD_CHANGED",
  "CLEAR_TRANSACTIONS",
])

export async function POST(req: NextRequest) {
  // Fail-closed: if the secret is not configured, refuse all POSTs.
  if (!AUDIT_INTERNAL_SECRET) {
    return NextResponse.json(
      { error: "audit-not-configured", message: "AUDIT_INTERNAL_SECRET env var is not set" },
      { status: 500 }
    )
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const internalSecret = req.headers.get("x-audit-internal")
  const isInternal = internalSecret === AUDIT_INTERNAL_SECRET

  // NOTE: the `|| isAdmin` branch was intentionally REMOVED. See JSDoc above.
  if (!isInternal) {
    return NextResponse.json(
      { error: "forbidden", message: "Audit logs can only be created server-side" },
      { status: 403 }
    )
  }

  const body = await req.json().catch(() => ({} as any))
  const { action, description, saleId, productId, supervisorId, supervisorName, metadata } = body || {}

  if (!action) return NextResponse.json({ error: "action-required" }, { status: 400 })

  // Validate action against the whitelist to prevent malformed entries.
  if (!VALID_AUDIT_ACTIONS.has(String(action))) {
    return NextResponse.json(
      { error: "invalid-action", message: `Unknown audit action: ${String(action).slice(0, 50)}` },
      { status: 400 }
    )
  }

  const log = await logAuditEvent({
    userId: user.id,
    userName: user.name,
    action,
    description: description || null,
    saleId: saleId || null,
    productId: productId || null,
    supervisorId: supervisorId || null,
    supervisorName: supervisorName || null,
    deviceInfo: req.headers.get("user-agent") || null,
    metadata: metadata ? JSON.stringify(metadata) : null,
  })

  return NextResponse.json(log, { status: 201 })
}
