import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import type { PnLReport } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const dateFilter: any = {}
  if (from) dateFilter.gte = new Date(from)
  if (to) {
    const t = new Date(to)
    t.setHours(23, 59, 59, 999)
    dateFilter.lte = t
  }

  // Revenue: all sales within range (incl Shopify-tagged SHP-)
  const salesWhere = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}
  const sales = await db.sale.findMany({
    where: salesWhere,
    include: { items: { include: { product: true } } },
  })

  let revenue = 0
  let cogs = 0
  for (const s of sales) {
    revenue += Number(s.total)
    for (const it of s.items) {
      cogs += Number(it.quantity) * Number(it.product?.costPrice ?? 0)
    }
  }
  const grossProfit = revenue - cogs

  // Expenses: salaries + admin (filter by their respective date fields)
  const expWhere: any = {}
  if (Object.keys(dateFilter).length) {
    expWhere.OR = [
      { type: "SALARY", payDate: dateFilter },
      { type: "ADMIN", date: dateFilter },
    ]
  }
  const expenses = await db.expenseTransaction.findMany({ where: expWhere })

  let salaries = 0
  let adminExpenses = 0
  const breakdownMap = new Map<string, number>()
  for (const e of expenses) {
    const amt = Number(e.amount)
    if (e.type === "SALARY") {
      salaries += amt
      const key = "الرواتب"
      breakdownMap.set(key, (breakdownMap.get(key) || 0) + amt)
    } else {
      adminExpenses += amt
      const key = e.category || "أخرى"
      breakdownMap.set(key, (breakdownMap.get(key) || 0) + amt)
    }
  }

  const totalOperatingExpenses = salaries + adminExpenses
  const netProfit = grossProfit - totalOperatingExpenses

  const report: PnLReport = {
    revenue: +revenue.toFixed(3),
    revenueCount: sales.length,
    cogs: +cogs.toFixed(3),
    grossProfit: +grossProfit.toFixed(3),
    salaries: +salaries.toFixed(3),
    adminExpenses: +adminExpenses.toFixed(3),
    totalOperatingExpenses: +totalOperatingExpenses.toFixed(3),
    netProfit: +netProfit.toFixed(3),
    period: { from: from || null, to: to || null },
    expenseBreakdown: Array.from(breakdownMap.entries())
      .map(([category, amount]) => ({ category, amount: +amount.toFixed(3) }))
      .sort((a, b) => b.amount - a.amount),
  }

  return NextResponse.json(report)
}
