import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import bcrypt from "bcryptjs"
import { logAuditEvent } from "@/lib/audit"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * Password strength validation.
 * Rules: min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit.
 * Returns an error code (string) when invalid, or null when valid.
 */
function validatePasswordStrength(pwd: string): string | null {
  if (typeof pwd !== "string" || pwd.length < 8) return "password-too-short"
  if (!/[A-Z]/.test(pwd)) return "password-no-uppercase"
  if (!/[a-z]/.test(pwd)) return "password-no-lowercase"
  if (!/[0-9]/.test(pwd)) return "password-no-digit"
  return null
}

/** PUT /api/users/[id] — update a user (ADMIN only) */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { email, name, password, role } = body || {}

  const existing = await db.user.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "not-found" }, { status: 404 })
  }

  const data: Record<string, unknown> = {}
  if (email?.trim()) {
    const lower = email.toLowerCase().trim()
    if (lower !== existing.email) {
      const dup = await db.user.findUnique({ where: { email: lower } })
      if (dup) return NextResponse.json({ error: "email-exists" }, { status: 409 })
      data.email = lower
    }
  }
  if (name?.trim()) data.name = name.trim()
  if (password?.trim()) {
    // Validate password strength before hashing
    const pwdError = validatePasswordStrength(password)
    if (pwdError) {
      return NextResponse.json({ error: pwdError }, { status: 400 })
    }
    data.passwordHash = await bcrypt.hash(password, 10)
  }
  if (role) {
    const validRoles = ["ADMIN", "SALES", "WAREHOUSE"]
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "invalid-role" }, { status: 400 })
    }
    data.role = role
  }

  const updated = await db.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
  })

  // ── Audit log ──
  await logAuditEvent({
    userId: user.id,
    userName: user.name,
    action: "USER_UPDATED",
    description: `تحديث مستخدم ${updated.email}`,
  })

  return NextResponse.json(updated)
}

/** DELETE /api/users/[id] — delete a user (ADMIN only, cannot delete self) */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await params

  // Cannot delete yourself
  if (id === user.id) {
    return NextResponse.json({ error: "cannot-delete-self" }, { status: 400 })
  }

  const existing = await db.user.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "not-found" }, { status: 404 })
  }

  await db.user.delete({ where: { id } })

  // ── Audit log ──
  await logAuditEvent({
    userId: user.id,
    userName: user.name,
    action: "USER_DELETED",
    description: `حذف مستخدم ${existing.email}`,
  })

  return NextResponse.json({ ok: true })
}
