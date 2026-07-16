import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/diagnose — minimal unauthenticated health probe.
 *
 * Returns ONLY: { connected: boolean, timestamp: string }
 *
 * No env vars, no admin info, no user counts, no diagnosis hints, no
 * error details. Use this only to verify the app is reachable + the
 * database connection works. For deeper diagnostics, an authenticated
 * OWNER/ADMIN should check server logs or use authenticated endpoints.
 *
 * Rationale: previously this endpoint leaked:
 *   - presence/absence of env vars (DATABASE_URL, DIRECT_DATABASE_URL,
 *     NEXTAUTH_SECRET, BOOTSTRAP_ADMIN_PASSWORD)
 *   - NODE_ENV
 *   - user count
 *   - admin existence + admin email/name/role
 *   - raw DB error messages (could leak infrastructure details)
 *   - actionable hints pointing to /api/bootstrap-admin
 * All of that is now removed to avoid information disclosure on a
 * public, unauthenticated route.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  try {
    await db.user.count()
    return NextResponse.json(
      { connected: true, timestamp: new Date().toISOString() },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { connected: false, timestamp: new Date().toISOString() },
      { status: 200 }
    )
  }
}
