import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * GET /api/audit-logs/void-rate — void rate per cashier (ADMIN only).
 * Counts VOID_ITEM actions vs total sale items per user. > 3% = suspicious.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["ADMIN" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const [voidLogs, sales] = await Promise.all([
    db.auditLog.findMany({
      where: { action: "VOID_ITEM" },
      select: { userId: true, userName: true },
    }),
    db.sale.findMany({
      select: { userId: true, _count: { select: { items: true } } },
    }),
  ])

  const userMap = new Map<string, { userName: string; voidCount: number; totalItems: number }>()

  for (const v of voidLogs) {
    const uid = v.userId || "unknown"
    const cur = userMap.get(uid) || { userName: v.userName || "—", voidCount: 0, totalItems: 0 }
    cur.voidCount++
    userMap.set(uid, cur)
  }

  for (const s of sales) {
    const uid = s.userId || "unknown"
    const cur = userMap.get(uid) || { userName: "—", voidCount: 0, totalItems: 0 }
    cur.totalItems += s._count.items
    userMap.set(uid, cur)
  }

  const rows = Array.from(userMap.entries())
    .map(([userId, v]) => {
      const voidRate = v.totalItems > 0 ? (v.voidCount / v.totalItems) * 100 : 0
      return {
        userId,
        userName: v.userName,
        voidCount: v.voidCount,
        totalItems: v.totalItems,
        voidRate: +voidRate.toFixed(2),
        suspicious: voidRate > 3,
      }
    })
    .sort((a, b) => b.voidRate - a.voidRate)

  const flaggedCount = rows.filter((r) => r.suspicious).length

  return NextResponse.json({ rows, flaggedCount, threshold: 3 })
}
