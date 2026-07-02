import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import type { Role } from "@/lib/types"

export async function getSession() {
  return getServerSession(authOptions)
}

/** Get current user + role from the session (server-side). */
export async function getCurrentUser() {
  const session = await getSession()
  if (!session?.user) return null
  return session.user as { id: string; name?: string | null; email?: string | null; role: Role }
}

/** Role-based access check helper. */
export function hasRole(userRole: Role | undefined, allowed: Role[]): boolean {
  if (!userRole) return false
  return allowed.includes(userRole)
}

/** Role permissions map used by both server and client. */
export const ROLE_PERMISSIONS: Record<Role, {
  label: string
  views: import("@/lib/types").AppView[]
}> = {
  ADMIN: {
    label: "مدير النظام",
    views: [
      "dashboard", "sales", "invoices", "inventory", "purchases", "suppliers",
      "customers", "analytics", "accounting", "integrations",
    ],
  },
  SALES: {
    label: "موظف مبيعات",
    views: ["dashboard", "sales", "invoices", "inventory", "customers", "analytics"],
  },
  WAREHOUSE: {
    label: "أمين مخزن",
    views: ["dashboard", "inventory", "purchases", "suppliers"],
  },
}
