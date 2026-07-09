import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * GET /api/customers/loyalty-report
 *
 * Returns top customers by loyalty points. ADMIN/SALES only.
 *
 * Query params:
 *   - limit: number of customers to return (default 20, max 100)
 *   - tier: filter by tier (BRONZE | SILVER | GOLD)
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["ADMIN" as Role, "SALES" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 100)
  const tier = searchParams.get("tier") // BRONZE | SILVER | GOLD | null

  const where: any = {}
  if (tier) where.loyaltyTier = tier
  else where.loyaltyPoints = { gt: 0 }

  const customers = await db.customer.findMany({
    where,
    select: {
      id: true,
      name: true,
      phone: true,
      loyaltyPoints: true,
      loyaltyTier: true,
      _count: { select: { sales: true } },
    },
    orderBy: { loyaltyPoints: "desc" },
    take: limit,
  })

  // Summary stats
  const allCustomers = await db.customer.aggregate({
    _sum: { loyaltyPoints: true },
    _count: true,
  })
  const tierCounts = await db.customer.groupBy({
    by: ["loyaltyTier"],
    _count: true,
    _sum: { loyaltyPoints: true },
  })

  return NextResponse.json({
    items: customers.map((c) => ({
      ...c,
      loyaltyPoints: Number(c.loyaltyPoints),
      totalSales: c._count.sales,
    })),
    summary: {
      totalCustomers: allCustomers._count,
      totalPointsInCirculation: Number(allCustomers._sum.loyaltyPoints ?? 0),
      tierBreakdown: tierCounts.map((t) => ({
        tier: t.loyaltyTier ?? "NONE",
        count: t._count,
        points: Number(t._sum.loyaltyPoints ?? 0),
      })),
    },
  })
}
