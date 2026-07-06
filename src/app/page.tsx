import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { LoginScreen } from "@/components/auth/login-screen"
import { AppShell } from "@/components/app-shell"
import { getActiveCountry } from "@/lib/settings"
import type { Role } from "@/lib/types"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

export const dynamic = "force-dynamic"

// Auto-seed: if no users exist AND BOOTSTRAP_ADMIN_PASSWORD env is set,
// create a default admin with that password. If the env var is NOT set,
// no admin is created (fail-safe — the user must seed via /api/seed).
async function ensureDefaultUser() {
  const count = await db.user.count()
  if (count === 0) {
    const bootstrapPw = process.env.BOOTSTRAP_ADMIN_PASSWORD
    if (!bootstrapPw) return // fail-safe: no weak default password
    await db.user.create({
      data: {
        id: "user-admin-demo",
        email: "admin@demo.com",
        name: "Admin",
        passwordHash: bcrypt.hashSync(bootstrapPw, 10),
        role: "ADMIN",
      },
    })
  }
}

export default async function Home() {
  // Auto-create default admin if database is empty (no seed needed)
  try {
    await ensureDefaultUser()
  } catch (e) {
    // If DB is unreachable, continue — login screen will show
  }

  const [session, country] = await Promise.all([
    getServerSession(authOptions),
    getActiveCountry(),
  ])

  if (!session?.user?.id) {
    return <LoginScreen country={country} />
  }

  const user = {
    id: session.user.id,
    name: session.user.name || (session.user.email ?? "User"),
    email: session.user.email ?? "",
    role: (session.user.role as Role) || "SALES",
  }

  return <AppShell user={user} country={country} />
}
