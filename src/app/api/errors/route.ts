import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

/**
 * POST /api/errors
 * Body: { message, stack, url, userAgent, userId, level, context }
 *
 * Client-side error monitor endpoint. Browser code (see
 * `src/lib/error-monitor.ts`) catches `window.onerror` and
 * `unhandledrejection` events and POSTs them here. We log to the server
 * console (visible in Vercel logs) AND store a row in AuditLog so the
 * errors appear alongside other audit events.
 *
 * CRITICAL: this endpoint NEVER returns a non-200 response and NEVER
 * throws. The browser uses `keepalive: true` to fire-and-forget — if we
 * threw, the browser would retry (and potentially spam the log table).
 *
 * The body shape is permissive (any field may be missing) so a
 * half-formed request from a dying page is still accepted.
 */
export async function POST(req: NextRequest) {
  // Always return 200 — the contract is "never fail".
  const respondOk = () => NextResponse.json({ ok: true })

  let body: any
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const message =
    typeof body?.message === "string" ? body.message.slice(0, 1000) : ""
  const stack =
    typeof body?.stack === "string" ? body.stack.slice(0, 2000) : null
  const url =
    typeof body?.url === "string" ? body.url.slice(0, 500) : null
  const userAgent =
    typeof body?.userAgent === "string" ? body.userAgent.slice(0, 500) : null
  const userId =
    typeof body?.userId === "string" ? body.userId.slice(0, 100) : null
  const level =
    body?.level === "warning" || body?.level === "info"
      ? body.level
      : "error"

  // 1) Server-side console log (visible in Vercel logs).
  console.error("[client-error]", {
    level,
    message,
    url,
    userId,
    stack,
    userAgent,
  })

  // 2) AuditLog row (best-effort — never throw).
  try {
    const metadata = JSON.stringify({
      message,
      stack,
      url,
      userAgent,
      level,
    }).slice(0, 4000)

    await db.auditLog.create({
      data: {
        userId: userId || null,
        action: "CLIENT_ERROR",
        description: message || "Unknown client error",
        metadata,
        deviceInfo: userAgent,
      },
    })
  } catch (e) {
    // DB write failed (DB unreachable, schema mismatch, etc.). Log and
    // return 200 — the contract is "never fail".
    console.error("[client-error] failed to persist AuditLog row:", e)
  }

  return respondOk()
}
