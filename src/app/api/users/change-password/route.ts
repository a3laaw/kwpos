import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import bcrypt from "bcryptjs"
import { logAuditEvent } from "@/lib/audit"

export const dynamic = "force-dynamic"

/**
 * Password strength validation (SIMPLIFIED).
 * Rule: min 4 characters. No uppercase/lowercase/digit complexity requirements —
 * the shop owner wants simple passwords for staff accounts.
 * Returns an error code (string) when invalid, or null when valid.
 */
function validatePasswordStrength(pwd: string): string | null {
  if (typeof pwd !== "string" || pwd.length < 4) return "password-too-short"
  return null
}

/**
 * POST /api/users/change-password
 * Body: { oldPassword, newPassword, confirmPassword }
 *
 * Allows the currently-authenticated user to change their own password by
 * verifying the old password against the stored hash, validating the new
 * password strength, ensuring the new password matches confirmPassword,
 * then updating `passwordHash`.
 *
 * Returns:
 *   200 { ok: true }            — password updated
 *   400 { error: "..." }        — validation error
 *   401 { error: "unauthorized" } — not signed in
 *   500 { error: "..." }        — unexpected failure
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { oldPassword, newPassword, confirmPassword } = body || {}

  if (typeof oldPassword !== "string" || !oldPassword) {
    return NextResponse.json({ error: "old-password-required" }, { status: 400 })
  }
  if (typeof newPassword !== "string" || !newPassword) {
    return NextResponse.json({ error: "new-password-required" }, { status: 400 })
  }
  if (typeof confirmPassword !== "string" || !confirmPassword) {
    return NextResponse.json({ error: "confirm-password-required" }, { status: 400 })
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "passwords-do-not-match" }, { status: 400 })
  }

  // Strength validation
  const pwdError = validatePasswordStrength(newPassword)
  if (pwdError) {
    return NextResponse.json({ error: pwdError }, { status: 400 })
  }

  // Load the user's stored hash
  const existing = await db.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, passwordHash: true },
  })
  if (!existing) {
    return NextResponse.json({ error: "not-found" }, { status: 404 })
  }

  // Verify old password
  const ok = await bcrypt.compare(oldPassword, existing.passwordHash)
  if (!ok) {
    return NextResponse.json({ error: "old-password-incorrect" }, { status: 400 })
  }

  // Hash + persist
  const passwordHash = await bcrypt.hash(newPassword, 10)
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash },
  })

  // Audit log
  await logAuditEvent({
    userId: user.id,
    userName: user.name,
    action: "USER_PASSWORD_CHANGED",
    description: `تغيير كلمة المرور ${existing.email}`,
  })

  return NextResponse.json({ ok: true })
}
