import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import bcrypt from "bcryptjs"
import { logAuditEvent } from "@/lib/audit"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/** GET /api/users — list all users (ADMIN only) */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["ADMIN" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({
    items: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    })),
  })
}

/** POST /api/users — create a new user (ADMIN only) */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["ADMIN" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { email, name, password, role } = body || {}

  if (!email?.trim() || !name?.trim() || !password?.trim()) {
    return NextResponse.json({ error: "email-name-password-required" }, { status: 400 })
  }

  const validRoles = ["ADMIN", "SALES", "WAREHOUSE"]
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "invalid-role" }, { status: 400 })
  }

  // Check for duplicate email
  const existing = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  })
  if (existing) {
    return NextResponse.json({ error: "email-exists" }, { status: 409 })
  }

  const created = await db.user.create({
    data: {
      email: email.toLowerCase().trim(),
      name: name.trim(),
      passwordHash: bcrypt.hashSync(password, 10),
      role,
    },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  })

  // ── Audit log ──
  await logAuditEvent({
    userId: user.id,
    userName: user.name,
    action: "USER_CREATED",
    description: `إنشاء مستخدم ${created.email}`,
  })

  return NextResponse.json(created, { status: 201 })
}
