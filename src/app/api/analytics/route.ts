import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import type { AnalyticsReport, ProductAnalytics } from "@/lib/types"

export const dynamic = "force-dynamic"

function toAnalytics(p: any): ProductAnalytics {
  const cost = Number(p.costPrice ?? 0)
  const sale = Number(p.salePrice ?? 0)
  return {
    id: String(p.id),
    name: String(p.name),
    categoryName: p.category?.name ?? null,
    costPrice: cost,
    salePrice: sale,
    margin: +(sale - cost).toFixed(3),
    marginPct: cost > 0 ? +(((sale - cost) / cost) * 100).toFixed(1) : 0,
    quantitySold: 0,
    grossVolume: 0,
    currentStock: Number(p.quantity ?? 0),
    lastSoldAt: null,
  }
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

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

  // All products with category
  const products = await db.product.findMany({ include: { category: true } })

  // Sale items within the date range (join sale for createdAt)
  const saleItemsWhere: any = {}
  if (Object.keys(dateFilter).length) {
    saleItemsWhere.sale = { createdAt: dateFilter }
  }
  const saleItems = await db.saleItem.findMany({
    where: saleItemsWhere,
    include: { sale: { select: { createdAt: true } } },
  })

  // Aggregate per product
  const agg = new Map<
    string,
    { qty: number; gross: number; lastSold: Date | null }
  >()
  for (const it of saleItems) {
    const cur = agg.get(it.productId) || { qty: 0, gross: 0, lastSold: null }
    cur.qty += Number(it.quantity)
    cur.gross += Number(it.subtotal)
    const d = it.sale?.createdAt ? new Date(it.sale.createdAt) : null
    if (d && (!cur.lastSold || d > cur.lastSold)) cur.lastSold = d
    agg.set(it.productId, cur)
  }

  // Build analytics rows
  const rows: ProductAnalytics[] = products.map((p) => {
    const a = toAnalytics(p)
    const s = agg.get(p.id)
    if (s) {
      a.quantitySold = s.qty
      a.grossVolume = +s.gross.toFixed(3)
      a.lastSoldAt = s.lastSold ? s.lastSold.toISOString() : null
    }
    return a
  })

  // a) Top-selling: by quantitySold desc, then grossVolume desc
  const topSelling = [...rows]
    .sort((a, b) => b.quantitySold - a.quantitySold || b.grossVolume - a.grossVolume)
    .filter((r) => r.quantitySold > 0)
    .slice(0, 8)

  // b) Stagnant stock: zero or low turnover (qtySold <= a small threshold) within range
  //    ranked by lowest turnover ratio = qtySold / (currentStock + qtySold)
  const stagnant = [...rows]
    .map((r) => ({
      ...r,
      // turnover ratio: 0 means never sold; otherwise qtySold/(stock+sold)
      _turnover:
        r.currentStock + r.quantitySold > 0
          ? r.quantitySold / (r.currentStock + r.quantitySold)
          : 0,
    }))
    .sort((a, b) => a._turnover - b._turnover || b.currentStock - a.currentStock)
    .slice(0, 8)
    .map(({ _turnover, ...r }) => r)

  // c) Most expensive by cost base
  const mostExpensive = [...rows]
    .sort((a, b) => b.costPrice - a.costPrice)
    .slice(0, 8)

  // d) Cheapest by cost base
  const cheapest = [...rows]
    .filter((r) => r.costPrice > 0)
    .sort((a, b) => a.costPrice - b.costPrice)
    .slice(0, 8)

  // e) Highest margin by absolute difference (sale - cost)
  const highestMargin = [...rows]
    .filter((r) => r.costPrice > 0 && r.salePrice > 0)
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 8)

  const report: AnalyticsReport = {
    topSelling,
    stagnant,
    mostExpensive,
    cheapest,
    highestMargin,
    dateRange: { from: from || null, to: to || null },
  }

  return NextResponse.json(report)
}
