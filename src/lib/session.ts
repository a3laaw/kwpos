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
  return session.user as {
    id: string
    name?: string | null
    email?: string | null
    role: Role
    posExpressMode?: boolean
  }
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
  OWNER: {
    label: "المالك",
    views: [
      "dashboard", "ownerDashboard", "managerDashboard",
      "sales", "invoices", "reports", "inventory", "purchases", "suppliers",
      "customers", "analytics", "accounting", "integrations", "shifts",
      "spotcheck", "exchanges", "pricing", "users", "settings", "audit",
      "bundles", "compositions",
    ],
  },
  ADMIN: {
    label: "مدير النظام",
    views: [
      "dashboard", "managerDashboard", "sales", "invoices", "reports", "inventory", "purchases", "suppliers",
      "customers", "analytics", "accounting", "integrations", "shifts", "spotcheck", "exchanges",
      "pricing", "users", "settings", "audit", "bundles", "compositions",
    ],
  },
  MANAGER: {
    label: "مدير",
    views: [
      "dashboard", "managerDashboard", "sales", "invoices", "reports", "inventory", "customers",
      "analytics", "shifts", "exchanges", "users", "audit",
    ],
  },
  ACCOUNTANT: {
    label: "محاسب",
    views: [
      "dashboard", "reports", "accounting", "customers", "suppliers",
      "invoices", "analytics",
    ],
  },
  WAREHOUSE: {
    label: "أمين مخزن",
    views: ["dashboard", "inventory", "purchases", "suppliers", "spotcheck", "bundles", "compositions"],
  },
  SALES: {
    label: "موظف مبيعات",
    // SALES can sell, look up invoices, manage customers (add/edit), see
    // stock levels (NOT cost), process exchanges, sell bundles, and use
    // pricing. They do NOT get "analytics" or "reports" — those expose
    // cost/margin/profitability figures.
    views: ["dashboard", "sales", "invoices", "inventory", "customers", "shifts", "exchanges", "pricing", "bundles"],
  },
  CASHIER: {
    label: "كاشير",
    // CASHIER operates the POS only. No dashboard (which shows sales
    // analytics), no reports, no analytics — just sell + close their shift.
    views: ["sales", "shifts"],
  },
}
