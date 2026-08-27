/**
 * Lightweight error monitoring — a Sentry-free alternative.
 *
 * Two halves:
 *
 * 1. CLIENT (browser) — `reportClientError` + `installClientErrorMonitor`.
 *    Catches `window.onerror` and `window.onunhandledrejection` events
 *    and POSTs them to `/api/errors`. The endpoint stores them in the
 *    AuditLog table so they appear alongside other audit events.
 *
 * 2. SERVER (API routes, server components) — `reportServerError`.
 *    Logs the error to the server console (visible in Vercel logs) AND
 *    writes a `SERVER_ERROR` record to the AuditLog table. Best-effort:
 *    never throws (so it can be safely called inside another catch block
 *    without risking a secondary throw).
 *
 * NO external dependencies. Uses dynamic imports for `db`/`audit` so
 * the module is safe to import from client components (the Prisma client
 * is never pulled into the client bundle).
 */

// ── Shared types ─────────────────────────────────────────────────

export interface ClientErrorPayload {
  message: string
  stack?: string | null
  url?: string | null
  userAgent?: string | null
  userId?: string | null
  level?: "error" | "warning" | "info"
  context?: Record<string, unknown> | null
}

export interface ServerErrorContext {
  endpoint?: string
  userId?: string | null
  /** Any extra fields the caller wants to attach to the log row */
  [k: string]: unknown
}

// ── CLIENT side ──────────────────────────────────────────────────

/**
 * Send a client-side error to the /api/errors endpoint. Fire-and-forget
 * (no await) — never throws, even if the fetch fails or the network is
 * down. Uses `keepalive: true` so the request survives page unload.
 *
 * Safe to call during SSR (no-op when `window` is undefined).
 */
export function reportClientError(payload: ClientErrorPayload): void {
  if (typeof window === "undefined") return // SSR: no-op
  try {
    const body = JSON.stringify({
      message: payload.message,
      stack: payload.stack ?? null,
      url: payload.url ?? window.location.href,
      userAgent: payload.userAgent ?? navigator.userAgent,
      userId: payload.userId ?? null,
      level: payload.level ?? "error",
      context: payload.context ?? null,
    })
    void fetch("/api/errors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      /* swallow — never throw from the error reporter */
    })
  } catch {
    /* swallow — never throw from the error reporter */
  }
}

// ── SERVER side ──────────────────────────────────────────────────

/**
 * Log a server-side error to the console AND the AuditLog table.
 *
 * Best-effort: never throws. Safe to call from inside another catch
 * block. If the DB write fails, only the console log is produced.
 *
 * Uses dynamic imports so this module is safe to import from client
 * components — `db`/`logAuditEvent` are only loaded when this function
 * actually runs on the server.
 */
export async function reportServerError(
  error: Error | unknown,
  context?: ServerErrorContext
): Promise<void> {
  // 1) Console log (visible in `vercel logs` / `next dev` output)
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined
  console.error("[error-monitor] SERVER_ERROR", {
    message,
    stack,
    ...context,
  })

  // 2) AuditLog row (best-effort)
  try {
    const { db } = await import("@/lib/db")
    // Build the payload. Cap string lengths to keep the AuditLog.metadata
    // column reasonable (it's a TEXT column in Postgres but we don't want
    // 50KB stacks in every row).
    const metadata = JSON.stringify({
      message,
      stack: stack ? stack.slice(0, 2000) : null,
      ...context,
    }).slice(0, 4000)

    await db.auditLog.create({
      data: {
        userId: context?.userId ?? null,
        action: "SERVER_ERROR",
        description: message ? message.slice(0, 1000) : "Unknown server error",
        metadata,
      },
    })
  } catch (e) {
    // Best-effort: if we can't write to the DB, just log to console.
    // Don't throw — this is called inside catch blocks.
    console.error("[error-monitor] failed to write SERVER_ERROR audit log:", e)
  }
}

// ── Global installers (client only) ──────────────────────────────

let clientInstalled = false

/**
 * Install window-level `error` and `unhandledrejection` listeners that
 * forward uncaught client errors to `/api/errors`. Idempotent — safe to
 * call from multiple components.
 *
 * SSR-safe: no-op when `window` is undefined.
 */
export function installClientErrorMonitor(): void {
  if (typeof window === "undefined") return
  if (clientInstalled) return
  clientInstalled = true

  // Uncaught synchronous errors + resource-load errors
  window.addEventListener("error", (event: ErrorEvent) => {
    reportClientError({
      message: event.message || "Uncaught error",
      stack: event.error?.stack,
      url: event.filename
        ? `${event.filename}:${event.lineno}:${event.colno}`
        : window.location.href,
    })
  })

  // Unhandled promise rejections
  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    const reason = event.reason
    const err = reason instanceof Error ? reason : undefined
    reportClientError({
      message:
        (err?.message) ||
        (typeof reason === "string" ? reason : "Unhandled promise rejection"),
      stack: err?.stack,
      url: window.location.href,
      level: "error",
    })
  })
}
