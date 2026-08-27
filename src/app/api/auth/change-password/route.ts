import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import bcrypt from "bcryptjs"
import { logAuditEvent } from "@/lib/audit"
import { reportServerError } from "@/lib/error-monitor"

export const dynamic = "force-dynamic"

/**
 * Password strength validation for the FIRST-LOGIN forced change.
 * Stricter than the legacy /api/users/change-password route (which only
 * requires 4 chars): the user is being forced to set a new password here,
 * so we require min 8 chars + uppercase + lowercase + digit. This matches
 * the task spec for the force-change-password feature.
 *
 * Returns an error code (string) when invalid, or null when valid.
 */
function validatePasswordStrength(pwd: string): string | null {
  if (typeof pwd !== "string" || pwd.length < 8) return "password-too-short"
  if (!/[A-Z]/.test(pwd)) return "password-needs-uppercase"
  if (!/[a-z]/.test(pwd)) return "password-needs-lowercase"
  if (!/[0-9]/.test(pwd)) return "password-needs-digit"
  return null
}

/**
 * POST /api/auth/change-password
 * Body: { currentPassword, newPassword }
 *
 * Used by the non-dismissable "force change password" modal that pops up
 * on first login (when the user's `passwordStatus === "MUST_CHANGE"`).
 *
 * Verifies the current password with bcrypt, validates the new password
 * (min 8 chars + uppercase + lowercase + digit), then updates passwordHash
 * AND clears `passwordStatus` to "OK". If the `passwordStatus` column
 * doesn't exist in the DB yet (graceful fallback), only the passwordHash
 * is updated.
 *
 * Returns:
 *   200 { ok: true }                  — password updated
 *   400 { error: "..." }              — validation error
 *   401 { error: "unauthorized" }      — not signed in
 *   500 { error: "..." }               — unexpected failure
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const { currentPassword, newPassword } = body || {}

  if (typeof currentPassword !== "string" || !currentPassword) {
    return NextResponse.json({ error: "current-password-required" }, { status: 400 })
  }
  if (typeof newPassword !== "string" || !newPassword) {
    return NextResponse.json({ error: "new-password-required" }, { status: 400 })
  }

  // Strength validation: min 8 chars + uppercase + lowercase + digit.
  const pwdError = validatePasswordStrength(newPassword)
  if (pwdError) {
    return NextResponse.json({ error: pwdError }, { status: 400 })
  }

  // Don't allow the new password to be identical to the current one.
  if (currentPassword === newPassword) {
    return NextResponse.json({ error: "password-must-differ" }, { status: 400 })
  }

  // Load the user's stored hash.
  let existing: { id: string; email: string; passwordHash: string } | null = null
  try {
    existing = await db.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, passwordHash: true },
    })
  } catch (e) {
    // Unexpected — log and surface a generic error.
    await reportServerError(e as Error, {
      endpoint: "/api/auth/change-password",
      userId: user.id,
    })
    return NextResponse.json({ error: "server-error" }, { status: 500 })
  }
  if (!existing) {
    return NextResponse.json({ error: "not-found" }, { status: 404 })
  }

  // Verify current password with bcrypt.
  const ok = await bcrypt.compare(currentPassword, existing.passwordHash)
  if (!ok) {
    return NextResponse.json({ error: "current-password-incorrect" }, { status: 400 })
  }

  // Hash + persist new password, AND clear passwordStatus. The
  // passwordStatus update is wrapped in try/catch because the column
  // may not exist in the DB yet — in that case we only update the hash.
  const passwordHash = await bcrypt.hash(newPassword, 10)
  try {
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordStatus: "OK",
      },
    })
  } catch {
    // Fallback: `passwordStatus` column missing — update only the hash.
    try {
      await db.user.update({
        where: { id: user.id },
        data: { passwordHash },
      })
    } catch (e) {
      await reportServerError(e as Error, {
        endpoint: "/api/auth/change-password",
        userId: user.id,
      })
      return NextResponse.json({ error: "server-error" }, { status: 500 })
    }
  }

  // Audit log: record that the user changed their own password (covers
  // both first-login forced change and any subsequent self-change via
  // this endpoint). Wrapped in try/catch — an audit failure must not
  // block the password change from being reported as successful.
  try {
    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: "USER_PASSWORD_CHANGED",
      description: `تغيير كلمة المرور ${existing.email}`,
    })
  } catch (e) {
    await reportServerError(e as Error, {
      endpoint: "/api/auth/change-password",
      userId: user.id,
    })
  }

  return NextResponse.json({ ok: true })
}
