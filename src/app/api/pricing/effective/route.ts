import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { computeEffectivePrice } from "@/lib/pricing"
import type { PriceTier } from "@/lib/pricing"

export const dynamic = "force-dynamic"

/**
 * GET /api/pricing/effective?productId=xxx&tier=RETAIL
 *
 *   Returns the effective sale price for a single product under the given
 *   tier, applying any active promotion.
 *
 *   Response: { effectivePrice, basePrice, promoPrice, promotion }
 *
 *   Used by the POS (and any consumer that needs the live price for one
 *   product) to fetch the active price without coupling to the promotions
 *   list client-side.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const productId = searchParams.get("productId")
  const tierRaw = (searchParams.get("tier") || "RETAIL").toUpperCase()
  const tier: PriceTier =
    tierRaw === "WHOLESALE" ? "WHOLESALE" : tierRaw === "CORPORATE" ? "CORPORATE" : "RETAIL"

  if (!productId) {
    return NextResponse.json({ error: "productId-required" }, { status: 400 })
  }

  // Load the product (without the now-scope-limited product-scoped include)
  // and ALL active promotions — computeEffectivePrice filters by scope.
  const [product, allActivePromos] = await Promise.all([
    db.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        categoryId: true,
        salePrice: true,
        wholesalePrice: true,
        corporatePrice: true,
      },
    }),
    db.promotion.findMany({
      where: { isActive: true },
      orderBy: { startAt: "asc" },
    }),
  ])
  if (!product) {
    return NextResponse.json({ error: "not-found" }, { status: 404 })
  }

  const ap = computeEffectivePrice(
    {
      id: product.id,
      categoryId: product.categoryId,
      salePrice: Number(product.salePrice),
      wholesalePrice: Number(product.wholesalePrice),
      corporatePrice: Number(product.corporatePrice),
    },
    tier,
    allActivePromos.map((p) => {
      const scope = (p.scope || "PRODUCT").toUpperCase()
      let categoryIds: string[] = []
      try {
        const arr = p.categoryIdsJson ? JSON.parse(p.categoryIdsJson) : []
        if (Array.isArray(arr)) categoryIds = arr.map(String)
      } catch {}
      return {
        id: p.id,
        productId: p.productId,
        scope,
        categoryIds,
        discountType: p.discountType,
        discountValue: Number(p.discountValue),
        startAt: p.startAt,
        endAt: p.endAt,
        isActive: p.isActive,
        note: p.note,
      }
    })
  )

  return NextResponse.json({
    effectivePrice: ap.effectivePrice,
    basePrice: ap.basePrice,
    promoPrice: ap.promoPrice,
    promotion: ap.promotion,
  })
}
