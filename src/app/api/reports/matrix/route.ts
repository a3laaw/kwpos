import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { canSeeFinancials } from "@/lib/permissions"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * Category & Product Performance Matrix — a hybrid report that groups
 * performance by category (parent) and expands to per-product detail (child).
 *
 * Filters: from, to, warehouseId, supplierId
 *
 * Per product (and aggregated per category):
 *   - netQty       : (quantity sold) − (returnedQty)
 *   - revenue      : sum of sale item subtotals (the sale-line value)
 *   - cost         : netQty × product.costPrice (COGS)
 *   - grossProfit  : revenue − cost
 *   - marginPct    : grossProfit / revenue × 100
 *   - turnoverRate : cost / avgInventory  (inventory turns over the period)
 *   - avgDaysInInv : periodDays / turnoverRate (days a unit sits before sale)
 *
 * `avgInventory` is approximated as the current on-hand quantity
 * (across filtered warehouses if any) — a snapshot of the average stock
 * holding for the period. This keeps the query light while still useful.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!canSeeFinancials(user.role as Role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from") || undefined
  const to = searchParams.get("to") || undefined
  const warehouseId = searchParams.get("warehouseId") || undefined
  const supplierId = searchParams.get("supplierId") || undefined

  // Resolve the period window + length in days (for days-in-inventory calc).
  const now = new Date()
  const endDate = to ? new Date(to) : now
  endDate.setHours(23, 59, 59, 999)
  const startDate = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1)
  startDate.setHours(0, 0, 0, 0)
  const periodDays = Math.max(
    1,
    Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
  )

  // Sale filter: date range + (optionally) warehouse — note: Sale doesn't have
  // a direct warehouseId in schema, but Shopify/POS source is encoded in invoiceNo.
  // For warehouse filtering we filter SaleItems via their product's StockItem.
  // Only COMPLETED sales count — CANCELLED invoices are excluded. Returns are
  // already handled per-line below (netQty = soldQty − returned).
  const saleWhere: any = {
    status: "COMPLETED",
    createdAt: { gte: startDate, lte: endDate },
  }

  // Product filter (for supplierId + warehouseId via stockItems).
  const productWhere: any = {}
  if (supplierId) productWhere.supplierId = supplierId
  if (warehouseId) productWhere.stockItems = { some: { warehouseId } }

  const [saleItems, products, categories, warehouses, suppliers] = await Promise.all([
    db.saleItem.findMany({
      where: {
        sale: saleWhere,
        ...(Object.keys(productWhere).length ? { product: productWhere } : {}),
      },
      include: {
        product: { include: { category: true, supplier: true } },
      },
    }),
    db.product.findMany({
      where: productWhere,
      include: {
        category: true,
        supplier: true,
        stockItems: warehouseId ? { where: { warehouseId } } : true,
      },
    }),
    db.category.findMany({ orderBy: { name: "asc" } }),
    db.warehouse.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.supplier.findMany({ orderBy: { name: "asc" } }),
  ])

  // Build a per-product snapshot of current on-hand quantity (filtered by
  // warehouse if requested). Used as the avgInventory proxy.
  const onHandByProduct = new Map<string, number>()
  for (const p of products) {
    const qty = p.stockItems.reduce((s, si) => s + Number(si.quantity || 0), 0)
    onHandByProduct.set(p.id, qty)
  }

  // Per-product aggregation.
  interface ProductAgg {
    productId: string
    productName: string
    barcode: string | null
    categoryId: string | null
    categoryName: string
    supplierName: string | null
    netQty: number
    revenue: number
    cost: number
    avgInventory: number
  }
  const productAgg = new Map<string, ProductAgg>()

  for (const si of saleItems) {
    const p = si.product
    if (!p) continue
    const returned = Number(si.returnedQty || 0)
    const soldQty = Number(si.quantity || 0)
    const netQty = Math.max(0, soldQty - returned)
    // Revenue: the line subtotal represents gross line value. For returns we
    // subtract the proportional value of returned units.
    const lineUnit = soldQty > 0 ? Number(si.subtotal) / soldQty : 0
    const revenue = Number(si.subtotal) - returned * lineUnit
    const cost = netQty * Number(p.costPrice || 0)

    const cur =
      productAgg.get(p.id) ||
      {
        productId: p.id,
        productName: p.name,
        barcode: p.barcode,
        categoryId: p.categoryId,
        categoryName: p.category?.name || "غير مصنف",
        supplierName: p.supplier?.name || null,
        netQty: 0,
        revenue: 0,
        cost: 0,
        avgInventory: onHandByProduct.get(p.id) || 0,
      }
    cur.netQty += netQty
    cur.revenue += revenue
    cur.cost += cost
    productAgg.set(p.id, cur)
  }

  // Include products with zero sales in the period (so the matrix covers the
  // whole catalog) — they show 0 sales but still have inventory/days metrics.
  for (const p of products) {
    if (productAgg.has(p.id)) continue
    productAgg.set(p.id, {
      productId: p.id,
      productName: p.name,
      barcode: p.barcode,
      categoryId: p.categoryId,
      categoryName: p.category?.name || "غير مصنف",
      supplierName: p.supplier?.name || null,
      netQty: 0,
      revenue: 0,
      cost: 0,
      avgInventory: onHandByProduct.get(p.id) || 0,
    })
  }

  // Compute per-product derived metrics.
  const productRows = Array.from(productAgg.values()).map((p) => {
    const grossProfit = p.revenue - p.cost
    const marginPct = p.revenue > 0 ? (grossProfit / p.revenue) * 100 : 0
    // Turnover = COGS / avgInventory. Guard against divide-by-zero.
    const turnoverRate = p.avgInventory > 0 ? p.cost / p.avgInventory : 0
    // Days in inventory = periodDays / turnoverRate. If no turnover, full period.
    const avgDaysInInv = turnoverRate > 0 ? periodDays / turnoverRate : periodDays
    return {
      productId: p.productId,
      name: p.productName,
      barcode: p.barcode,
      categoryId: p.categoryId,
      categoryName: p.categoryName,
      supplierName: p.supplierName,
      netQty: p.netQty,
      revenue: +p.revenue.toFixed(3),
      cost: +p.cost.toFixed(3),
      grossProfit: +grossProfit.toFixed(3),
      marginPct: +marginPct.toFixed(1),
      avgInventory: p.avgInventory,
      turnoverRate: +turnoverRate.toFixed(2),
      avgDaysInInv: +avgDaysInInv.toFixed(1),
    }
  })

  // Group by category → parent rows with aggregated children.
  const byCategory = new Map<
    string,
    {
      categoryId: string | null
      categoryName: string
      children: typeof productRows
      netQty: number
      revenue: number
      cost: number
      grossProfit: number
      avgInventory: number
    }
  >()
  for (const pr of productRows) {
    const key = pr.categoryId || "__uncategorized__"
    const catName = pr.categoryName
    const cur =
      byCategory.get(key) ||
      {
        categoryId: pr.categoryId,
        categoryName: catName,
        children: [],
        netQty: 0,
        revenue: 0,
        cost: 0,
        grossProfit: 0,
        avgInventory: 0,
      }
    cur.children.push(pr)
    cur.netQty += pr.netQty
    cur.revenue += pr.revenue
    cur.cost += pr.cost
    cur.grossProfit += pr.grossProfit
    cur.avgInventory += pr.avgInventory
    byCategory.set(key, cur)
  }

  const categoryRows = Array.from(byCategory.values()).map((c) => {
    const marginPct = c.revenue > 0 ? (c.grossProfit / c.revenue) * 100 : 0
    const turnoverRate = c.avgInventory > 0 ? c.cost / c.avgInventory : 0
    const avgDaysInInv = turnoverRate > 0 ? periodDays / turnoverRate : periodDays
    return {
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      productCount: c.children.length,
      netQty: c.netQty,
      revenue: +c.revenue.toFixed(3),
      cost: +c.cost.toFixed(3),
      grossProfit: +c.grossProfit.toFixed(3),
      marginPct: +marginPct.toFixed(1),
      avgInventory: c.avgInventory,
      turnoverRate: +turnoverRate.toFixed(2),
      avgDaysInInv: +avgDaysInInv.toFixed(1),
      children: c.children,
    }
  })

  return NextResponse.json({
    periodDays,
    filters: { from: from || null, to: to || null, warehouseId: warehouseId || null, supplierId: supplierId || null },
    categories: categoryRows,
    // Catalogs for filter dropdowns.
    warehouses: warehouses.map((w) => ({ id: w.id, name: w.name, code: w.code })),
    suppliers: suppliers.map((s) => ({ id: s.id, name: s.name })),
  })
}
