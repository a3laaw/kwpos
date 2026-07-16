/**
 * Test 8 — Pricing engine & promotions: pure pricing math.
 *
 * Tests the pricing helpers in `src/lib/pricing.ts`:
 *   - `tierBasePrice` — tier (RETAIL/WHOLESALE/CORPORATE) → base price, with
 *     fallback to salePrice when the tier's price is 0.
 *   - `promotionAppliesTo` — scope-based promotion matching (PRODUCT /
 *     CATEGORY / ALL / ALL_EXCEPT_CATEGORIES).
 *   - `computeEffectivePrice` — applies the FIRST active (in-window) promo
 *     to a base price, supporting PERCENT and AMOUNT discount types.
 *
 * These are PURE functions (no DB, no side effects) — tests run in-process
 * and don't touch the SQLite test DB.
 */
import { describe, expect, it } from "vitest"
import {
  tierBasePrice,
  promotionAppliesTo,
  computeEffectivePrice,
  type PriceTier,
  type PromotionLike,
} from "@/lib/pricing"

// ── Tests: tierBasePrice ─────────────────────────────────────────────────
describe("tierBasePrice — tier base price resolution", () => {
  const product = {
    salePrice: 100,
    wholesalePrice: 80,
    corporatePrice: 70,
  }

  it("RETAIL → salePrice", () => {
    expect(tierBasePrice(product, "RETAIL")).toBe(100)
  })

  it("WHOLESALE with wholesalePrice > 0 → wholesalePrice", () => {
    expect(tierBasePrice(product, "WHOLESALE")).toBe(80)
  })

  it("CORPORATE with corporatePrice > 0 → corporatePrice", () => {
    expect(tierBasePrice(product, "CORPORATE")).toBe(70)
  })

  it("WHOLESALE falls back to salePrice when wholesalePrice = 0", () => {
    expect(
      tierBasePrice({ ...product, wholesalePrice: 0 }, "WHOLESALE")
    ).toBe(100)
  })

  it("CORPORATE falls back to salePrice when corporatePrice = 0", () => {
    expect(
      tierBasePrice({ ...product, corporatePrice: 0 }, "CORPORATE")
    ).toBe(100)
  })

  it("RETAIL ignores wholesale/corporate prices", () => {
    expect(
      tierBasePrice(
        { salePrice: 50, wholesalePrice: 30, corporatePrice: 20 },
        "RETAIL"
      )
    ).toBe(50)
  })

  it("RETAIL returns salePrice even if wholesalePrice is higher", () => {
    expect(
      tierBasePrice(
        { salePrice: 50, wholesalePrice: 999, corporatePrice: 999 },
        "RETAIL"
      )
    ).toBe(50)
  })
})

// ── Tests: promotionAppliesTo (scope matching) ──────────────────────────
describe("promotionAppliesTo — scope-based matching", () => {
  it("scope=ALL → always true (regardless of productId/categoryId)", () => {
    const promo: PromotionLike = makePromo({ scope: "ALL" })
    expect(promotionAppliesTo(promo, "p1", "c1")).toBe(true)
    expect(promotionAppliesTo(promo, "p2", "c2")).toBe(true)
    expect(promotionAppliesTo(promo, "p3", null)).toBe(true)
  })

  it("scope=PRODUCT → true only when productId matches", () => {
    const promo: PromotionLike = makePromo({ scope: "PRODUCT", productId: "p1" })
    expect(promotionAppliesTo(promo, "p1", "c1")).toBe(true)
    expect(promotionAppliesTo(promo, "p2", "c1")).toBe(false)
  })

  it("scope=PRODUCT with no productId → false (backward-compat: nothing matches)", () => {
    const promo: PromotionLike = makePromo({ scope: "PRODUCT", productId: null })
    expect(promotionAppliesTo(promo, "p1", "c1")).toBe(false)
  })

  it("scope=CATEGORY → true when product's categoryId is in promo.categoryIds", () => {
    const promo: PromotionLike = makePromo({
      scope: "CATEGORY",
      categoryIds: ["c1", "c2"],
    })
    expect(promotionAppliesTo(promo, "p1", "c1")).toBe(true)
    expect(promotionAppliesTo(promo, "p2", "c2")).toBe(true)
    expect(promotionAppliesTo(promo, "p3", "c3")).toBe(false)
  })

  it("scope=CATEGORY with empty categoryIds → false (no categories to match)", () => {
    const promo: PromotionLike = makePromo({ scope: "CATEGORY", categoryIds: [] })
    expect(promotionAppliesTo(promo, "p1", "c1")).toBe(false)
  })

  it("scope=CATEGORY with null categoryId on product → false", () => {
    const promo: PromotionLike = makePromo({
      scope: "CATEGORY",
      categoryIds: ["c1"],
    })
    expect(promotionAppliesTo(promo, "p1", null)).toBe(false)
    expect(promotionAppliesTo(promo, "p1", undefined)).toBe(false)
  })

  it("scope=ALL_EXCEPT_CATEGORIES → true when product's category NOT in excluded list", () => {
    const promo: PromotionLike = makePromo({
      scope: "ALL_EXCEPT_CATEGORIES",
      categoryIds: ["c1"],
    })
    expect(promotionAppliesTo(promo, "p1", "c1")).toBe(false) // excluded
    expect(promotionAppliesTo(promo, "p2", "c2")).toBe(true) // not excluded
  })

  it("scope=ALL_EXCEPT_CATEGORIES → product with no category still applies", () => {
    const promo: PromotionLike = makePromo({
      scope: "ALL_EXCEPT_CATEGORIES",
      categoryIds: ["c1"],
    })
    expect(promotionAppliesTo(promo, "p1", null)).toBe(true)
    expect(promotionAppliesTo(promo, "p1", undefined)).toBe(true)
  })

  it("missing/unknown scope defaults to PRODUCT behavior", () => {
    // Construct manually (bypassing makePromo) so we can pass scope: null
    // — makePromo would coerce null to "ALL" via `??`.
    const promo: PromotionLike = {
      id: "promo1",
      productId: "p1",
      scope: null,
      categoryIds: null,
      discountType: "PERCENT",
      discountValue: 10,
      startAt: daysAgo(1),
      endAt: daysAhead(1),
      isActive: true,
      note: null,
    }
    // null scope → defaults to "PRODUCT"
    expect(promotionAppliesTo(promo, "p1", "c1")).toBe(true)
    expect(promotionAppliesTo(promo, "p2", "c1")).toBe(false)
  })

  it("scope is case-insensitive (lowercase works)", () => {
    const promo: PromotionLike = makePromo({ scope: "all" })
    expect(promotionAppliesTo(promo, "p1", "c1")).toBe(true)
  })
})

// ── Tests: computeEffectivePrice ─────────────────────────────────────────
describe("computeEffectivePrice — promotion application", () => {
  const product = {
    id: "p1",
    categoryId: "c1" as string | null,
    salePrice: 100,
    wholesalePrice: 80,
    corporatePrice: 70,
  }

  it("no promotions → effectivePrice = basePrice (RETAIL)", () => {
    const out = computeEffectivePrice(product, "RETAIL", [])
    expect(out.basePrice).toBe(100)
    expect(out.promoPrice).toBeNull()
    expect(out.effectivePrice).toBe(100)
    expect(out.promotion).toBeNull()
  })

  it("no promotions → effectivePrice respects tier (WHOLESALE)", () => {
    const out = computeEffectivePrice(product, "WHOLESALE", [])
    expect(out.basePrice).toBe(80)
    expect(out.effectivePrice).toBe(80)
  })

  it("PERCENT discount → effective = base × (1 − pct/100)", () => {
    const promo = makePromo({
      scope: "ALL",
      discountType: "PERCENT",
      discountValue: 25, // 25% off
      isActive: true,
      startAt: daysAgo(1),
      endAt: daysAhead(1),
    })
    const out = computeEffectivePrice(product, "RETAIL", [promo])
    // 100 × (1 − 0.25) = 75
    expect(out.effectivePrice).toBeCloseTo(75, 3)
    expect(out.promoPrice).toBeCloseTo(75, 3)
    expect(out.basePrice).toBe(100)
    expect(out.promotion).not.toBeNull()
    expect(out.promotion!.discountType).toBe("PERCENT")
    expect(out.promotion!.discountValue).toBe(25)
  })

  it("AMOUNT discount → effective = max(0, base − amt)", () => {
    const promo = makePromo({
      scope: "ALL",
      discountType: "AMOUNT",
      discountValue: 30,
      isActive: true,
      startAt: daysAgo(1),
      endAt: daysAhead(1),
    })
    const out = computeEffectivePrice(product, "RETAIL", [promo])
    // 100 − 30 = 70
    expect(out.effectivePrice).toBeCloseTo(70, 3)
  })

  it("AMOUNT discount > base → clamped to 0 (no negative prices)", () => {
    const promo = makePromo({
      scope: "ALL",
      discountType: "AMOUNT",
      discountValue: 250, // > 100 base
      isActive: true,
      startAt: daysAgo(1),
      endAt: daysAhead(1),
    })
    const out = computeEffectivePrice(product, "RETAIL", [promo])
    expect(out.effectivePrice).toBe(0)
  })

  it("PERCENT discount clamped to [0, 100]", () => {
    const promo = makePromo({
      scope: "ALL",
      discountType: "PERCENT",
      discountValue: 150, // > 100 → clamped to 100 → 100% off → 0
      isActive: true,
      startAt: daysAgo(1),
      endAt: daysAhead(1),
    })
    const out = computeEffectivePrice(product, "RETAIL", [promo])
    expect(out.effectivePrice).toBe(0)
  })

  it("PERCENT discount of 0% → effective = base (no discount applied)", () => {
    const promo = makePromo({
      scope: "ALL",
      discountType: "PERCENT",
      discountValue: 0,
      isActive: true,
      startAt: daysAgo(1),
      endAt: daysAhead(1),
    })
    const out = computeEffectivePrice(product, "RETAIL", [promo])
    expect(out.effectivePrice).toBe(100)
    expect(out.promotion).not.toBeNull() // promo is "active", just 0% off
  })

  it("expired promotion (endAt < now) → ignored", () => {
    const promo = makePromo({
      scope: "ALL",
      discountType: "PERCENT",
      discountValue: 50,
      isActive: true,
      startAt: daysAgo(10),
      endAt: daysAgo(1), // ended yesterday
    })
    const out = computeEffectivePrice(product, "RETAIL", [promo], new Date())
    expect(out.effectivePrice).toBe(100)
    expect(out.promotion).toBeNull()
  })

  it("future promotion (startAt > now) → ignored", () => {
    const promo = makePromo({
      scope: "ALL",
      discountType: "PERCENT",
      discountValue: 50,
      isActive: true,
      startAt: daysAhead(1), // starts tomorrow
      endAt: daysAhead(10),
    })
    const out = computeEffectivePrice(product, "RETAIL", [promo], new Date())
    expect(out.effectivePrice).toBe(100)
    expect(out.promotion).toBeNull()
  })

  it("inactive promotion (isActive=false) → ignored even if in date window", () => {
    const promo = makePromo({
      scope: "ALL",
      discountType: "PERCENT",
      discountValue: 50,
      isActive: false,
      startAt: daysAgo(1),
      endAt: daysAhead(1),
    })
    const out = computeEffectivePrice(product, "RETAIL", [promo], new Date())
    expect(out.effectivePrice).toBe(100)
    expect(out.promotion).toBeNull()
  })

  it("promotion boundary: now === startAt → applies (inclusive)", () => {
    const t = new Date("2025-06-15T12:00:00Z")
    const dayMs = 24 * 60 * 60 * 1000
    // Build endAt relative to t (not "today") for a deterministic window.
    const promo = makePromo({
      scope: "ALL",
      discountType: "PERCENT",
      discountValue: 50,
      isActive: true,
      startAt: t,
      endAt: new Date(t.getTime() + dayMs),
    })
    const out = computeEffectivePrice(product, "RETAIL", [promo], t)
    expect(out.effectivePrice).toBeCloseTo(50, 3)
  })

  it("promotion boundary: now === endAt → applies (inclusive)", () => {
    const t = new Date("2025-06-15T12:00:00Z")
    const dayMs = 24 * 60 * 60 * 1000
    // Build startAt relative to t (not "today") so the promo is in-window at t.
    const promo = makePromo({
      scope: "ALL",
      discountType: "PERCENT",
      discountValue: 50,
      isActive: true,
      startAt: new Date(t.getTime() - dayMs),
      endAt: t,
    })
    const out = computeEffectivePrice(product, "RETAIL", [promo], t)
    expect(out.effectivePrice).toBeCloseTo(50, 3)
  })

  it("multiple active promotions → earliest startAt wins", () => {
    const earlier = makePromo({
      id: "earlier",
      scope: "ALL",
      discountType: "PERCENT",
      discountValue: 10, // 10% off → 90
      isActive: true,
      startAt: daysAgo(5),
      endAt: daysAhead(5),
    })
    const later = makePromo({
      id: "later",
      scope: "ALL",
      discountType: "PERCENT",
      discountValue: 50, // 50% off → 50
      isActive: true,
      startAt: daysAgo(1), // starts later than `earlier`
      endAt: daysAhead(1),
    })
    const out = computeEffectivePrice(product, "RETAIL", [later, earlier])
    // earlier (startAt = -5d) wins → 10% off → 90
    expect(out.effectivePrice).toBeCloseTo(90, 3)
    expect(out.promotion!.id).toBe("earlier")
  })

  it("promotion that doesn't match the product's scope is ignored", () => {
    const promoForOtherProduct = makePromo({
      scope: "PRODUCT",
      productId: "p-other",
      discountType: "PERCENT",
      discountValue: 50,
      isActive: true,
      startAt: daysAgo(1),
      endAt: daysAhead(1),
    })
    const out = computeEffectivePrice(product, "RETAIL", [promoForOtherProduct])
    expect(out.effectivePrice).toBe(100)
    expect(out.promotion).toBeNull()
  })

  it("promotion that matches by CATEGORY scope is applied", () => {
    const catPromo = makePromo({
      scope: "CATEGORY",
      categoryIds: ["c1"],
      discountType: "PERCENT",
      discountValue: 20,
      isActive: true,
      startAt: daysAgo(1),
      endAt: daysAhead(1),
    })
    const out = computeEffectivePrice(product, "RETAIL", [catPromo])
    expect(out.effectivePrice).toBeCloseTo(80, 3)
  })

  it("rounds promo price to 3 decimals (KWD)", () => {
    // 100 × (1 − 33.333/100) = 100 × 0.666667 = 66.6667 → 66.667
    const promo = makePromo({
      scope: "ALL",
      discountType: "PERCENT",
      discountValue: 33.333,
      isActive: true,
      startAt: daysAgo(1),
      endAt: daysAhead(1),
    })
    const out = computeEffectivePrice(product, "RETAIL", [promo])
    // toFixed(3) → 66.667 (the engine rounds to 3 decimals)
    expect(out.effectivePrice).toBe(66.667)
  })

  it("preserves the promo note in the returned promotion object", () => {
    const promo = makePromo({
      scope: "ALL",
      discountType: "PERCENT",
      discountValue: 10,
      isActive: true,
      startAt: daysAgo(1),
      endAt: daysAhead(1),
      note: "Summer sale",
    })
    const out = computeEffectivePrice(product, "RETAIL", [promo])
    expect(out.promotion!.note).toBe("Summer sale")
  })
})

// ── Helpers ──────────────────────────────────────────────────────────────
function makePromo(opts: Partial<PromotionLike> & { scope?: string }): PromotionLike {
  return {
    id: opts.id ?? "promo1",
    productId: opts.productId ?? null,
    scope: opts.scope ?? "ALL",
    categoryIds: opts.categoryIds ?? null,
    discountType: opts.discountType ?? "PERCENT",
    discountValue: opts.discountValue ?? 0,
    startAt: opts.startAt ?? daysAgo(1),
    endAt: opts.endAt ?? daysAhead(1),
    isActive: opts.isActive ?? true,
    note: opts.note ?? null,
  }
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function daysAhead(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

// Suppress "unused" warnings for the type import (used only as a type).
export type _Tier = PriceTier
