import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import type { Role } from "@/lib/types"
import { canDelete, canManageProducts, canManagePricing, canSeeCost, canSeeFinancials } from "@/lib/permissions"

/**
 * Require an authenticated user. Returns the user or a 401 NextResponse.
 * Usage:
 *   const user = await requireUser()
 *   if (user instanceof NextResponse) return user
 */
export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  return user
}

/**
 * Require a user with one of the specified roles.
 * Returns the user or a 403 NextResponse.
 * Usage:
 *   const user = await requireRole(["OWNER", "ADMIN"])
 *   if (user instanceof NextResponse) return user
 */
export async function requireRole(roles: Role[]) {
  const user = await requireUser()
  if (user instanceof NextResponse) return user
  if (!roles.includes(user.role as Role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  return user
}

/**
 * Require delete permission (OWNER/ADMIN/MANAGER).
 */
export async function requireDelete() {
  const user = await requireUser()
  if (user instanceof NextResponse) return user
  if (!canDelete(user.role as Role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  return user
}

/**
 * Require product management permission (OWNER/ADMIN/MANAGER/WAREHOUSE).
 */
export async function requireManageProducts() {
  const user = await requireUser()
  if (user instanceof NextResponse) return user
  if (!canManageProducts(user.role as Role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  return user
}

/**
 * Require pricing management permission (OWNER/ADMIN/MANAGER).
 */
export async function requireManagePricing() {
  const user = await requireUser()
  if (user instanceof NextResponse) return user
  if (!canManagePricing(user.role as Role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  return user
}

/**
 * Require financial visibility (OWNER/ADMIN/MANAGER/ACCOUNTANT).
 */
export async function requireSeeFinancials() {
  const user = await requireUser()
  if (user instanceof NextResponse) return user
  if (!canSeeFinancials(user.role as Role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  return user
}

/**
 * Type guard: check if the return value from require* is a NextResponse (error).
 */
export function isErrorResponse(val: any): val is NextResponse {
  return val instanceof NextResponse
}
