// Pricing engine helpers — shared by the API routes and the POS client.
//
// A product has three base sale-price tiers (RETAIL, WHOLESALE, CORPORATE)
// stored directly on the Product row. A temporary Promotion (PERCENT or
// AMOUNT discount within a date window) can override the base price for the
// duration of the promo. The "effective price" is the base tier price with
// the active promotion applied (if any).
//
// A promotion has a SCOPE that determines which products it applies to:
//   PRODUCT               — a single product (productId)
//   CATEGORY              — all products in one or more categories (categoryIds)
//   ALL                   — every product
//   ALL_EXCEPT_CATEGORIES — every product EXCEPT those in categoryIds

export type PriceTier = "RETAIL" | "WHOLESALE" | "CORPORATE"

export type PromotionScope = "PRODUCT" | "CATEGORY" | "ALL" | "ALL_EXCEPT_CATEGORIES"

export interface ActivePrice {
  /** The tier's base price from the product (RETAIL=salePrice, WHOLESALE=wholesalePrice, CORPORATE=corporatePrice). 0-tier falls back to salePrice. */
  basePrice: number
  /** The active promotion price (if a promo is active), else null. */
  promoPrice: number | null
  /** basePrice, or promoPrice if a promo is active. */
  effectivePrice: number
  /** The active promotion record (trimmed to the fields the UI needs), or null. */
  promotion: {
    id: string
    discountType: string
    discountValue: number
    note?: string | null
  } | null
}

/** Resolve the base tier price for a product (0-valued wholesale/corporate falls back to retail). */
export function tierBasePrice(
  product: { salePrice: number; wholesalePrice: number; corporatePrice: number },
  tier: PriceTier
): number {
  if (tier === "WHOLESALE" && product.wholesalePrice > 0) return product.wholesalePrice
  if (tier === "CORPORATE" && product.corporatePrice > 0) return product.corporatePrice
  return product.salePrice
}

/** Minimal promotion shape used by the matcher. */
export interface PromotionLike {
  id: string
  productId?: string | null
  scope?: string | null
  categoryIds?: string[] | null
  discountType: string
  discountValue: number
  startAt: Date | string
  endAt: Date | string
  isActive: boolean
  note?: string | null
}

/**
 * Does `promo` apply to the product identified by (productId, categoryId)?
 * Considers the promotion's scope:
 *   PRODUCT               → productId must match
 *   CATEGORY              → product's categoryId must be in promo.categoryIds
 *   ALL                   → always true
 *   ALL_EXCEPT_CATEGORIES → product's categoryId must NOT be in promo.categoryIds
 * A missing/unknown scope is treated as PRODUCT (backward compat).
 */
export function promotionAppliesTo(
  promo: PromotionLike,
  productId: string,
  categoryId?: string | null
): boolean {
  const scope = (promo.scope || "PRODUCT").toUpperCase()
  if (scope === "ALL") return true
  if (scope === "PRODUCT") return !!promo.productId && promo.productId === productId
  if (scope === "CATEGORY") {
    const cats = promo.categoryIds || []
    return !!categoryId && cats.includes(categoryId)
  }
  if (scope === "ALL_EXCEPT_CATEGORIES") {
    const cats = promo.categoryIds || []
    // Applies when the product's category is NOT in the excluded list.
    // Products with no category are not excluded (apply).
    if (!categoryId) return true
    return !cats.includes(categoryId)
  }
  return false
}

/**
 * Compute the effective sale price for a product under a given tier,
 * applying any active promotion (within startAt..endAt window, isActive=true)
 * whose scope includes this product.
 *
 * - Promotion PERCENT: effective = base × (1 − discountValue/100)
 * - Promotion AMOUNT:  effective = max(0, base − discountValue)
 *
 * If multiple promotions are active for the product, the FIRST active one
 * (by startAt ascending) is applied.
 *
 * @param product  the product (must include id + categoryId for scope matching)
 * @param tier     the customer price tier
 * @param promotions  all promotions (the matcher filters by scope + window)
 * @param now      the reference datetime (default: new Date())
 */
export function computeEffectivePrice(
  product: { id: string; categoryId?: string | null; salePrice: number; wholesalePrice: number; corporatePrice: number },
  tier: PriceTier,
  promotions: PromotionLike[],
  now: Date = new Date()
): ActivePrice {
  const basePrice = tierBasePrice(product, tier)

  // Filter to promotions that (a) apply to this product by scope AND
  // (b) are active within their [startAt, endAt] window at `now`.
  // Sort by startAt asc so the earliest-starting promo wins (deterministic).
  const candidates = promotions
    .filter((p) => p.isActive && promotionAppliesTo(p, product.id, product.categoryId))
    .filter((p) => {
      const start = new Date(p.startAt).getTime()
      const end = new Date(p.endAt).getTime()
      const t = now.getTime()
      return t >= start && t <= end
    })
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())

  const active = candidates[0]

  if (!active) {
    return {
      basePrice,
      promoPrice: null,
      effectivePrice: basePrice,
      promotion: null,
    }
  }

  let promoPrice: number
  if (active.discountType === "PERCENT") {
    const pct = Math.max(0, Math.min(100, Number(active.discountValue) || 0))
    promoPrice = basePrice * (1 - pct / 100)
  } else {
    // AMOUNT
    const amt = Math.max(0, Number(active.discountValue) || 0)
    promoPrice = Math.max(0, basePrice - amt)
  }
  // Round to 3 decimals (KWD) to avoid floating dust.
  promoPrice = +promoPrice.toFixed(3)

  return {
    basePrice,
    promoPrice,
    effectivePrice: promoPrice,
    promotion: {
      id: active.id,
      discountType: active.discountType,
      discountValue: Number(active.discountValue) || 0,
      note: active.note ?? null,
    },
  }
}
