import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/diagnose — unauthenticated diagnostic endpoint.
 *
 * Returns database connection state + user count + admin existence.
 * Does NOT expose any passwords, emails (beyond admin@demo.com check),
 * or sensitive data. Safe to call from a browser.
 *
 * Use this when login fails to determine whether the cause is:
 *   1. Database connection failure (Vercel → Supabase)
 *   2. Empty database (no users seeded)
 *   3. Admin user missing
 *   4. Prisma client not generated
 */
export async function GET() {
  const result: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasDirectDatabaseUrl: !!process.env.DIRECT_DATABASE_URL,
      hasNextauthSecret: !!process.env.NEXTAUTH_SECRET,
      hasBootstrapPw: !!process.env.BOOTSTRAP_ADMIN_PASSWORD,
      nodeEnv: process.env.NODE_ENV,
    },
  }

  // Test 1: Can we connect to the database?
  try {
    const userCount = await db.user.count()
    result.dbConnected = true
    result.userCount = userCount

    if (userCount === 0) {
      result.diagnosis = "DATABASE_EMPTY — no users exist. Set BOOTSTRAP_ADMIN_PASSWORD in Vercel env vars and redeploy, then visit the page to auto-create the admin. Or call POST /api/bootstrap-admin."
    } else {
      // Test 2: Does the admin user exist?
      const admin = await db.user.findUnique({
        where: { email: "admin@demo.com" },
        select: { id: true, email: true, name: true, role: true },
      })

      if (!admin) {
        result.diagnosis = "ADMIN_MISSING — admin@demo.com not found. The database has users but not the expected admin. Call POST /api/bootstrap-admin to create/reset it."
      } else {
        result.adminExists = true
        result.admin = admin
        result.diagnosis = "DB_OK — database is connected and admin exists. If login still fails, the PASSWORD is wrong. Call POST /api/bootstrap-admin to reset the admin password."
      }
    }
  } catch (err: any) {
    result.dbConnected = false
    result.dbError = err?.message || String(err)
    result.diagnosis = "DB_CONNECTION_FAILED — the app cannot reach the database. Check DATABASE_URL and DIRECT_DATABASE_URL in Vercel env vars. If DIRECT_DATABASE_URL was recently added, verify it points to the correct Supabase project (same as DATABASE_URL)."
  }

  return NextResponse.json(result, { status: 200 })
}
