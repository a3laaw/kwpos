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
  if (!hasRole(user.role, ["ADMIN" as Role])) {
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
 * POST /api/audit-logs — RESTRICTED.
 *
 * Only accepts requests with the internal secret header (X-Audit-Internal).
 * This prevents clients from forging audit log entries. Normal audit
 * logging happens server-side via logAuditEvent() inside API route
 * transactions — not via this endpoint.
 *
 * ADMIN can also POST (for manual corrections).
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const internalSecret = req.headers.get("x-audit-internal")
  const isInternal = internalSecret === AUDIT_INTERNAL_SECRET
  const isAdmin = hasRole(user.role, ["ADMIN" as Role])

  if (!isInternal && !isAdmin) {
    return NextResponse.json(
      { error: "forbidden", message: "Audit logs can only be created server-side" },
      { status: 403 }
    )
  }

  const body = await req.json().catch(() => ({} as any))
  const { action, description, saleId, productId, supervisorId, supervisorName, metadata } = body || {}

  if (!action) return NextResponse.json({ error: "action-required" }, { status: 400 })

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
