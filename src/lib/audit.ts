import { db } from "@/lib/db"

/**
 * Internal secret for server-side audit log creation via the API route.
 *
 * SECURITY: NO FALLBACK. If the env var is not set, the audit API route
 * refuses to create logs (returns 500 "audit-not-configured"). This
 * prevents a known-default secret from being exploitable.
 *
 * Server-side code that calls logAuditEvent() directly (inside a
 * transaction) does NOT need this secret — it writes to the DB via
 * Prisma, bypassing the HTTP API route entirely.
 */
export const AUDIT_INTERNAL_SECRET = process.env.AUDIT_INTERNAL_SECRET

/**
 * Server-side audit log helper.
 *
 * Creates an AuditLog record directly via Prisma (not via HTTP fetch).
 * When `tx` is provided, the record is created inside the caller's
 * transaction — if it fails, the whole transaction rolls back.
 *
 * This is the ONLY way audit logs should be created for sensitive
 * operations (sales, refunds, exchanges, stock mutations, etc.).
 * The browser must NEVER send audit log requests — all audit logging
 * happens server-side inside API route transactions.
 *
 * Usage inside a transaction:
 *   await logAuditEvent({ tx, userId: user.id, userName: user.name,
 *     action: "SALE_CREATED", description: `فاتورة ${invoiceNo}`,
 *     saleId: sale.id })
 */
export async function logAuditEvent(opts: {
  tx?: any
  userId: string
  userName?: string | null
  action: string
  description?: string | null
  saleId?: string | null
  productId?: string | null
  supervisorId?: string | null
  supervisorName?: string | null
  deviceInfo?: string | null
  metadata?: string | null
}): Promise<any> {
  const client = opts.tx || db
  return client.auditLog.create({
    data: {
      userId: opts.userId,
      userName: opts.userName || null,
      action: opts.action,
      description: opts.description || null,
      saleId: opts.saleId || null,
      productId: opts.productId || null,
      supervisorId: opts.supervisorId || null,
      supervisorName: opts.supervisorName || null,
      deviceInfo: opts.deviceInfo || null,
      metadata: opts.metadata || null,
    },
  })
}

// NOTE: The client-side `logAudit()` helper has been REMOVED for security.
// All audit logging must happen server-side via `logAuditEvent()` inside
// API route transactions. The browser must not send audit log requests
// because it cannot safely hold the internal secret.
//
// If a client component previously called `logAudit()`, the corresponding
// server API route already calls `logAuditEvent()` — the client call was
// redundant and has been removed.
