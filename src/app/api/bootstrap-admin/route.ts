import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * POST /api/bootstrap-admin
 *
 * Creates or resets the admin@demo.com account using the
 * BOOTSTRAP_ADMIN_PASSWORD env var. This is the emergency
 * recovery path when login fails because:
 *   - The database was re-seeded with a random password
 *   - The admin password was forgotten
 *   - The database is empty and auto-bootstrap didn't trigger
 *
 * Security:
 *   1. Requires BOOTSTRAP_ADMIN_PASSWORD to be set in env vars.
 *   2. Requires the caller to provide the SAME password in the
 *      request body — this proves the caller has env access
 *      (i.e., is the project owner, not a random attacker).
 *   3. Does NOT bypass any existing auth — it creates/resets
 *      only the admin@demo.com account.
 *
 * Usage from browser console or curl:
 *   curl -X POST https://your-app.vercel.app/api/bootstrap-admin \
 *     -H "Content-Type: application/json" \
 *     -d '{"password": "YOUR_BOOTSTRAP_ADMIN_PASSWORD"}'
 *
 * After success, log in with:
 *   Email:    admin@demo.com
 *   Password: <the BOOTSTRAP_ADMIN_PASSWORD value>
 */
export async function POST(req: NextRequest) {
  const bootstrapPw = process.env.BOOTSTRAP_ADMIN_PASSWORD
  if (!bootstrapPw) {
    return NextResponse.json(
      {
        error: "BOOTSTRAP_ADMIN_PASSWORD is not set. Add it in Vercel → Settings → Environment Variables, redeploy, then call this endpoint again.",
      },
      { status: 503 }
    )
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "invalid-json — send {\"password\": \"...\"}" },
      { status: 400 }
    )
  }

  const providedPw = String(body?.password || "").trim()
  if (!providedPw) {
    return NextResponse.json(
      { error: "password-required — send {\"password\": \"<BOOTSTRAP_ADMIN_PASSWORD value>\"}" },
      { status: 400 }
    )
  }

  // Security gate: the caller must know the env var value
  if (providedPw !== bootstrapPw) {
    return NextResponse.json(
      { error: "password-mismatch — the provided password does not match BOOTSTRAP_ADMIN_PASSWORD" },
      { status: 403 }
    )
  }

  const passwordHash = bcrypt.hashSync(bootstrapPw, 10)

  try {
    // Upsert: create if missing, update password if exists
    const admin = await db.user.upsert({
      where: { email: "admin@demo.com" },
      update: {
        passwordHash,
        role: "ADMIN",
      },
      create: {
        id: "user-admin-demo",
        email: "admin@demo.com",
        name: "Admin",
        passwordHash,
        role: "ADMIN",
      },
      select: { id: true, email: true, name: true, role: true },
    })

    return NextResponse.json({
      ok: true,
      message: "Admin account created/reset. You can now log in.",
      admin,
      loginHint: "Email: admin@demo.com — Password: <your BOOTSTRAP_ADMIN_PASSWORD value>",
    })
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "bootstrap-failed",
        detail: err?.message || String(err),
      },
      { status: 500 }
    )
  }
}
