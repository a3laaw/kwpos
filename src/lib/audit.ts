import type { AuditAction } from "@/lib/types"

/**
 * Log a sensitive action to the audit log. Silent-fail — audit logging
 * must never break the user flow.
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    })
  } catch {
    // Silent fail
  }
}
