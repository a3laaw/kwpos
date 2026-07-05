import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { computeEffectivePrice } from "@/lib/pricing"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * GET /api/pricing
 *   Returns every product with its current price tiers (RETAIL/WHOLESALE/
 *   CORPORATE), cost price, and any currently-active promotion.
 *
 *   Response: { items: [{ id, name, barcode, categoryName, costPrice,
 *                          salePrice, wholesalePrice, corporatePrice,
 *                          activePromotion: Promotion | null }] }
 *
 * GET is available to every authenticated user (SALES needs to see prices
 * in the POS; WAREHOUSE for inventory valuation).
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const now = new Date()

  const [products, allActivePromos] = await Promise.all([
    db.product.findMany({
      include: { category: true },
      orderBy: { name: "asc" },
    }),
    db.promotion.findMany({
      where: { isActive: true },
      orderBy: { startAt: "asc" },
    }),
  ])

  // Normalize promotions once (parse categoryIdsJson + scope) for scope matching.
  const promoList = allActivePromos.map((pr) => {
    const scope = (pr.scope || "PRODUCT").toUpperCase()
    let categoryIds: string[] = []
    try {
      const arr = pr.categoryIdsJson ? JSON.parse(pr.categoryIdsJson) : []
      if (Array.isArray(arr)) categoryIds = arr.map(String)
    } catch {}
    return {
      id: pr.id,
      productId: pr.productId,
      scope,
      categoryIds,
      discountType: pr.discountType,
      discountValue: Number(pr.discountValue),
      startAt: pr.startAt,
      endAt: pr.endAt,
      isActive: pr.isActive,
      note: pr.note,
    }
  })

  const items = products.map((p) => {
    // Use the helper to pick the active RETAIL promotion (the only tier that
    // surfaces a badge in the price-management table). computeEffectivePrice
    // now filters promotions by SCOPE (PRODUCT/CATEGORY/ALL/ALL_EXCEPT).
    const ap = computeEffectivePrice(
      {
        id: p.id,
        categoryId: p.categoryId,
        salePrice: Number(p.salePrice),
        wholesalePrice: Number(p.wholesalePrice),
        corporatePrice: Number(p.corporatePrice),
      },
      "RETAIL",
      promoList,
      now
    )
    return {
      id: p.id,
      name: p.name,
      barcode: p.barcode ?? null,
      categoryName: p.category?.name ?? null,
      costPrice: Number(p.costPrice),
      salePrice: Number(p.salePrice),
      wholesalePrice: Number(p.wholesalePrice),
      corporatePrice: Number(p.corporatePrice),
      activePromotion: ap.promotion
        ? {
            id: ap.promotion.id,
            productId: p.id,
            discountType: ap.promotion.discountType,
            discountValue: ap.promotion.discountValue,
            note: ap.promotion.note ?? null,
          }
        : null,
    }
  })

  return NextResponse.json({ items })
}

/**
 * POST /api/pricing  (ADMIN only)
 *   Bulk-update sale prices with a full audit trail.
 *
 *   Body: { changes: [{ productId, priceType, newPrice, note? }], confirm: boolean }
 *
 *   For each change:
 *     - Load the product, capture oldPrice (current value of the relevant tier).
 *     - Create a PriceChange audit row.
 *     - Update the product's price field.
 *
 *   Cost guard:
 *     - If `confirm === false` AND any newPrice < product.costPrice, return
 *       409 { error: "below-cost", warnings: [...] } WITHOUT applying.
 *     - If `confirm === true`, apply all changes regardless.
 *
 *   Response: { applied: number, auditEntries: number }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["ADMIN" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const changes: Array<{
    productId: string
    priceType: "RETAIL" | "WHOLESALE" | "CORPORATE"
    newPrice: number
    note?: string | null
  }> = Array.isArray(body?.changes) ? body.changes : []
  const confirm: boolean = Boolean(body?.confirm)

  if (changes.length === 0) {
    return NextResponse.json({ error: "no-changes" }, { status: 400 })
  }

  // Normalize + validate each change row up front.
  const normalized = changes
    .map((c) => ({
      productId: String(c.productId || ""),
      priceType: (String(c.priceType || "").toUpperCase() === "WHOLESALE"
        ? "WHOLESALE"
        : String(c.priceType || "").toUpperCase() === "CORPORATE"
          ? "CORPORATE"
          : "RETAIL") as "RETAIL" | "WHOLESALE" | "CORPORATE",
      newPrice: Number(c.newPrice),
      note: c.note ? String(c.note) : null,
    }))
    .filter((c) => c.productId && Number.isFinite(c.newPrice) && c.newPrice >= 0)

  if (normalized.length === 0) {
    return NextResponse.json({ error: "no-valid-changes" }, { status: 400 })
  }

  // Load all touched products in one shot.
  const productIds = Array.from(new Set(normalized.map((c) => c.productId)))
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      name: true,
      costPrice: true,
      salePrice: true,
      wholesalePrice: true,
      corporatePrice: true,
    },
  })
  const productMap = new Map(products.map((p) => [p.id, p]))

  // ── Cost guard ────────────────────────────────────────────────────────
  // If confirm is false, scan all changes for below-cost entries. If any
  // exist, return 409 with the list — DO NOT apply anything. The client must
  // re-send with confirm: true after the manager reviews the warning modal.
  if (!confirm) {
    const warnings: Array<{ productId: string; name: string; costPrice: number; newPrice: number }> = []
    for (const c of normalized) {
      const p = productMap.get(c.productId)
      if (!p) continue
      if (c.newPrice < Number(p.costPrice)) {
        warnings.push({
          productId: p.id,
          name: p.name,
          costPrice: Number(p.costPrice),
          newPrice: c.newPrice,
        })
      }
    }
    if (warnings.length > 0) {
      return NextResponse.json(
        { error: "below-cost", warnings },
        { status: 409 }
      )
    }
  }

  // ── Apply changes inside a transaction ────────────────────────────────
  // Each change: write a PriceChange audit row (old → new) AND update the
  // product's tier field. Both ops are atomic per change.
  const auditRows: Array<{
    productId: string
    priceType: "RETAIL" | "WHOLESALE" | "CORPORATE"
    oldPrice: number
    newPrice: number
    note: string | null
  }> = []

  // Snapshot old prices for the audit BEFORE applying any update.
  for (const c of normalized) {
    const p = productMap.get(c.productId)
    if (!p) continue
    const oldPrice =
      c.priceType === "WHOLESALE"
        ? Number(p.wholesalePrice)
        : c.priceType === "CORPORATE"
          ? Number(p.corporatePrice)
          : Number(p.salePrice)
    auditRows.push({
      productId: p.id,
      priceType: c.priceType,
      oldPrice,
      newPrice: c.newPrice,
      note: c.note,
    })
  }

  await db.$transaction(async (tx) => {
    // Write all audit rows first (so they're guaranteed even if a later
    // product update fails — the transaction will roll back both).
    if (auditRows.length > 0) {
      await tx.priceChange.createMany({
        data: auditRows.map((a) => ({
          productId: a.productId,
          priceType: a.priceType,
          oldPrice: a.oldPrice,
          newPrice: a.newPrice,
          changedById: user.id,
          note: a.note,
        })),
      })
    }
    // Apply each product update. Group by product to avoid issuing multiple
    // updates for the same product when several tiers change at once.
    const updatesByProduct = new Map<
      string,
      { salePrice?: number; wholesalePrice?: number; corporatePrice?: number }
    >()
    for (const c of normalized) {
      const p = productMap.get(c.productId)
      if (!p) continue
      const patch = updatesByProduct.get(c.productId) || {}
      if (c.priceType === "RETAIL") patch.salePrice = c.newPrice
      else if (c.priceType === "WHOLESALE") patch.wholesalePrice = c.newPrice
      else patch.corporatePrice = c.newPrice
      updatesByProduct.set(c.productId, patch)
    }
    for (const [productId, patch] of updatesByProduct.entries()) {
      await tx.product.update({ where: { id: productId }, data: patch })
    }
  })

  return NextResponse.json({
    applied: auditRows.length,
    auditEntries: auditRows.length,
  })
}
