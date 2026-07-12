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
    warehouseId?: string | null
  }
}

/** Role-based access check helper. */
export function hasRole(userRole: Role | undefined, allowed: Role[]): boolean {
  if (!userRole) return false
  return allowed.includes(userRole)
}

/** Role permissions map used by both server and client.
 *
 * Each role is STRICTLY scoped to its own domain:
 *
 *  OWNER     — full access (everything)
 *  ADMIN     — full system management (everything except ownerDashboard)
 *  MANAGER   — operational management (sales, inventory, customers, shifts,
 *              exchanges, pricing, bundles, spotcheck, analytics, reports)
 *              NO users, NO audit, NO accounting, NO settings, NO integrations
 *  ACCOUNTANT— financial only (accounting, reports, invoices, customers,
 *              suppliers, analytics). NO dashboard, NO sales, NO inventory
 *  WAREHOUSE — inventory operations (inventory, purchases, suppliers,
 *              spotcheck, bundles, compositions). NO dashboard, NO sales
 *  SALES     — front-line sales (POS, invoices, customers, inventory view,
 *              shifts, exchanges). NO pricing, NO bundles mgmt, NO analytics,
 *              NO reports, NO dashboard
 *  CASHIER   — POS only (sales, shifts)
 */
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
    // Operational management — NO user management, NO audit logs, NO
    // accounting, NO system settings, NO integrations.
    views: [
      "dashboard", "managerDashboard", "sales", "invoices", "reports",
      "inventory", "customers", "analytics", "shifts", "exchanges",
      "pricing", "bundles", "spotcheck",
    ],
  },
  ACCOUNTANT: {
    label: "محاسب",
    // Financial scope only — NO dashboard (sales-focused), NO sales POS,
    // NO inventory management.
    views: ["accounting", "reports", "invoices", "customers", "suppliers", "analytics"],
  },
  WAREHOUSE: {
    label: "أمين مخزن",
    // Inventory operations only — NO dashboard, NO sales, NO customers.
    views: ["inventory", "purchases", "suppliers", "spotcheck", "bundles", "compositions"],
  },
  SALES: {
    label: "موظف مبيعات",
    // Front-line sales — sell, look up invoices, add/edit customers, view
    // stock levels (NOT cost), process exchanges, manage own shifts.
    // NO pricing management, NO bundle management, NO analytics, NO
    // reports, NO dashboard (company analytics).
    views: ["sales", "invoices", "inventory", "customers", "shifts", "exchanges"],
  },
  CASHIER: {
    label: "كاشير",
    // POS only — sell + close shift. Nothing else.
    views: ["sales", "shifts"],
  },
}
