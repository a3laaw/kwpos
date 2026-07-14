import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { canSeeFinancials } from "@/lib/permissions"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * GET /api/reports/product-efficiency?from=&to=
 *
 * Product Efficiency Index Report — combines 4 criteria into a single
 * score (out of 100) per product:
 *   - Net Profit (40 points) — contribution to total profits
 *   - Sales Volume (25 points) — turnover speed
 *   - Return Rate (20 points — penalty) — 0% returns = 20, 100% = 0
 *   - Purchase Cost (15 points) — lower cost = higher score
 *
 * Permissions: financial roles only (OWNER/ADMIN/MANAGER/ACCOUNTANT)
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!canSeeFinancials(user.role as Role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

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

  // ── 1) Fetch sale items in the period (COMPLETED sales only — exclude CANCELLED) ──
  const saleItems = await db.saleItem.findMany({
    where: {
      sale: {
        status: "COMPLETED",
        ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
      },
    },
    include: {
      product: { select: { id: true, name: true, barcode: true, costPrice: true, quantity: true, categoryId: true, category: { select: { name: true } } } },
    },
  })

  if (saleItems.length === 0) {
    return NextResponse.json({
      period: { from: from || null, to: to || null },
      totals: { totalNetProfit: 0, maxUnitsSold: 0, maxCostPrice: 0, productCount: 0 },
      summary: { champions: 0, hiddenGems: 0, deceptive: 0, stagnant: 0 },
      products: [],
    })
  }

  // ── 2) Aggregate per product ──
  // For returns: SaleItem.returnedQty tracks cumulative refunded units.
  // For exchanges: fetch ExchangeLine counts separately (returned side).
  const productMap = new Map<string, {
    id: string
    name: string
    barcode: string | null
    categoryName: string | null
    costPrice: number
    currentStock: number
    unitsSold: number
    unitsReturned: number
    revenue: number
  }>()

  for (const si of saleItems) {
    const p = si.product
    if (!p) continue
    const pid = p.id
    if (!productMap.has(pid)) {
      productMap.set(pid, {
        id: pid,
        name: p.name,
        barcode: p.barcode,
        categoryName: p.category?.name ?? null,
        costPrice: Number(p.costPrice ?? 0),
        currentStock: Number(p.quantity ?? 0),
        unitsSold: 0,
        unitsReturned: 0,
        revenue: 0,
      })
    }
    const row = productMap.get(pid)!
    row.unitsSold += Number(si.quantity ?? 0)
    row.unitsReturned += Number(si.returnedQty ?? 0)
    row.revenue += Number(si.subtotal ?? 0)
  }

  // ── 3) Fetch exchange lines (returned side) for the period ──
  // ExchangeLine with isReturn=true represents items returned in an exchange.
  // We count these as "returns" for the penalty because they indicate
  // dissatisfaction. The quantity is negative for returns, so we use abs().
  const exchangeLines = await db.exchangeLine.findMany({
    where: {
      isReturn: true,
      exchange: {
        ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
      },
    },
    select: { productId: true, quantity: true },
  })
  for (const el of exchangeLines) {
    const row = productMap.get(el.productId)
    if (row) {
      row.unitsReturned += Math.abs(Number(el.quantity ?? 0))
    }
  }

  // ── 4) Compute derived metrics per product ──
  const products = Array.from(productMap.values()).map((p) => {
    const netUnits = p.unitsSold - p.unitsReturned
    const refundAmount = p.unitsSold > 0
      ? p.revenue * (p.unitsReturned / p.unitsSold)
      : 0
    const netRevenue = p.revenue - refundAmount
    const netCost = netUnits * p.costPrice
    const netProfit = netRevenue - netCost
    const returnRate = p.unitsSold > 0
      ? (p.unitsReturned / p.unitsSold) * 100
      : 0
    const capitalTied = p.currentStock * p.costPrice
    const profitMargin = p.costPrice > 0
      ? ((netRevenue / (p.unitsSold || 1) - p.costPrice) / p.costPrice) * 100
      : 0
    return {
      ...p,
      netUnits,
      netRevenue,
      netCost,
      netProfit,
      returnRate,
      capitalTied,
      profitMargin,
    }
  })

  // ── 5) Compute totals + maxes for normalization ──
  const totalNetProfit = products.reduce((s, p) => s + Math.max(0, p.netProfit), 0)
  const maxNetProfit = Math.max(...products.map((p) => p.netProfit), 0.001)
  const maxUnitsSold = Math.max(...products.map((p) => p.unitsSold), 1)
  const maxCostPrice = Math.max(...products.map((p) => p.costPrice), 0.001)

  // ── 6) Compute scores per product ──
  const scored = products.map((p) => {
    // Profit score (40 max) — normalized to max net profit
    const profitScore = p.netProfit > 0
      ? (p.netProfit / maxNetProfit) * 40
      : 0

    // Sales score (25 max) — normalized to max units sold
    const salesScore = (p.unitsSold / maxUnitsSold) * 25

    // Return score (20 max — penalty) — 0% returns = 20, 100% = 0
    const returnScore = 20 * (1 - Math.min(p.returnRate, 100) / 100)

    // Cost score (15 max) — lower cost = higher score
    const costScore = (1 - p.costPrice / maxCostPrice) * 15

    const efficiencyIndex = +(profitScore + salesScore + returnScore + costScore).toFixed(2)

    // ── Decision logic ──
    // Deceptive: high return rate (>20%) — sells but comes back
    // Champion: index ≥ 70
    // Hidden Gem: index ≥ 40
    // Stagnant: index < 40
    let decision: string
    let decisionCode: "DECEPTIVE" | "CHAMPION" | "HIDDEN_GEM" | "STAGNANT"
    if (p.returnRate > 20 && p.unitsSold > 0) {
      decision = "منتج مخادع"
      decisionCode = "DECEPTIVE"
    } else if (efficiencyIndex >= 70) {
      decision = "منتج بطل"
      decisionCode = "CHAMPION"
    } else if (efficiencyIndex >= 40) {
      decision = "فرصة كامنة"
      decisionCode = "HIDDEN_GEM"
    } else {
      decision = "منتج راكد"
      decisionCode = "STAGNANT"
    }

    const profitContribution = totalNetProfit > 0
      ? (Math.max(0, p.netProfit) / totalNetProfit) * 100
      : 0

    return {
      id: p.id,
      name: p.name,
      barcode: p.barcode,
      categoryName: p.categoryName,
      unitsSold: p.unitsSold,
      unitsReturned: p.unitsReturned,
      returnRate: +p.returnRate.toFixed(2),
      revenue: +p.netRevenue.toFixed(3),
      costPrice: p.costPrice,
      netProfit: +p.netProfit.toFixed(3),
      profitContribution: +profitContribution.toFixed(2),
      currentStock: p.currentStock,
      capitalTied: p.capitalTied,
      scores: {
        profit: +profitScore.toFixed(2),
        sales: +salesScore.toFixed(2),
        return: +returnScore.toFixed(2),
        cost: +costScore.toFixed(2),
      },
      efficiencyIndex,
      decision,
      decisionCode,
    }
  })

  // Sort by efficiency index descending (best products first)
  scored.sort((a, b) => b.efficiencyIndex - a.efficiencyIndex)

  // ── 7) Summary ──
  const summary = {
    champions: scored.filter((p) => p.decisionCode === "CHAMPION").length,
    hiddenGems: scored.filter((p) => p.decisionCode === "HIDDEN_GEM").length,
    deceptive: scored.filter((p) => p.decisionCode === "DECEPTIVE").length,
    stagnant: scored.filter((p) => p.decisionCode === "STAGNANT").length,
  }

  return NextResponse.json({
    period: { from: from || null, to: to || null },
    totals: {
      totalNetProfit: +totalNetProfit.toFixed(3),
      maxUnitsSold,
      maxCostPrice,
      productCount: scored.length,
    },
    summary,
    products: scored,
  })
}
