"use client"

import * as React from "react"
import type { Product, CustomerTier } from "@/lib/types"
import { effectivePrice } from "@/lib/types"
import { computeEffectivePrice, promotionAppliesTo } from "@/lib/pricing"

export interface ActivePromo {
  id: string
  productId: string | null
  scope: string
  categoryIds: string[]
  discountType: string
  discountValue: number
  startAt: string
  endAt: string
  isActive: boolean
  note: string | null
}

/**
 * Pricing hook — computes effective prices for products under the
 * current customer tier + active promotions.
 *
 * Extracted from usePOS (Extract Hook — Fowler) so it can be tested
 * independently and reused if needed.
 */
export function usePricing(
  customerTier: CustomerTier,
  activePromos: ActivePromo[]
) {
  /** Effective unit price (with promo applied if active). */
  const priceFor = React.useCallback(
    (p: Product) => {
      if (activePromos.length === 0) {
        return effectivePrice(p, customerTier)
      }
      const ap = computeEffectivePrice(
        {
          id: p.id,
          categoryId: p.categoryId ?? null,
          salePrice: p.salePrice,
          wholesalePrice: p.wholesalePrice,
          corporatePrice: p.corporatePrice,
        },
        customerTier,
        activePromos.map((pr) => ({
          id: pr.id,
          productId: pr.productId,
          scope: pr.scope,
          categoryIds: pr.categoryIds,
          discountType: pr.discountType,
          discountValue: pr.discountValue,
          startAt: pr.startAt,
          endAt: pr.endAt,
          isActive: pr.isActive,
          note: pr.note,
        }))
      )
      return ap.effectivePrice
    },
    [customerTier, activePromos]
  )

  /** Base tier price (no promo) — for showing struck-through original price. */
  const basePriceFor = React.useCallback(
    (p: Product) => effectivePrice(p, customerTier),
    [customerTier]
  )

  /** Whether a product currently has an active promotion (drives the "عرض" badge). */
  const hasActivePromo = React.useCallback(
    (p: Product) =>
      activePromos.some(
        (pr) => pr.isActive && promotionAppliesTo(pr, p.id, p.categoryId ?? null)
      ) && priceFor(p) < basePriceFor(p),
    [activePromos, priceFor, basePriceFor]
  )

  return { priceFor, basePriceFor, hasActivePromo }
}
