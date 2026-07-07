import { db } from "@/lib/db"
import type { AuditAction } from "@/lib/types"

/**
 * Internal secret for server-side audit log creation via the API route.
 * Clients don't have this — only server code does.
 */
export const AUDIT_INTERNAL_SECRET = process.env.AUDIT_INTERNAL_SECRET || "kwpos-internal-audit-2026"

/**
 * Server-side audit log helper.
 *
 * Creates an AuditLog record directly via Prisma (not via HTTP fetch).
 * When `tx` is provided, the record is created inside the caller's
 * transaction — if it fails, the whole transaction rolls back.
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

/**
 * CLIENT-SIDE helper (kept for backward compatibility with existing
 * components that call logAudit from the browser).
 *
 * This now sends the internal secret header so the API route accepts it.
 * However, new code should use logAuditEvent (server-side) instead.
 */
export async function logAudit(
  action: AuditAction,
  payload?: {
    description?: string
    saleId?: string
    productId?: string
    supervisorId?: string
    supervisorName?: string
    metadata?: any
  }
) {
  try {
    await fetch("/api/audit-logs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-audit-internal": AUDIT_INTERNAL_SECRET,
      },
      body: JSON.stringify({ action, ...payload }),
    })
  } catch {
    // Silent fail — client-side audit logging is best-effort
  }
}
