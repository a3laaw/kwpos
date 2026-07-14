import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { canManagePricing } from "@/lib/permissions"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * PUT /api/promotions/[id]  (ADMIN only)
 *   Edit an existing promotion's discount, dates, scope, or active status.
 *   Mirrors the validation in POST /api/promotions.
 *
 *   Body (all optional — only provided fields are updated):
 *     { discountType, discountValue, startAt, endAt, note?, isActive,
 *       scope, productId, categoryIds }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!canManagePricing(user.role as Role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))

  const existing = await db.promotion.findUnique({ where: { id }, select: { id: true } })
  if (!existing) {
    return NextResponse.json({ error: "not-found" }, { status: 404 })
  }

  // Build the update data — only fields that are present in the body
  const data: any = {}

  // isActive (toggle activate/deactivate)
  if (body.isActive !== undefined) {
    data.isActive = Boolean(body.isActive)
  }

  // note
  if (body.note !== undefined) {
    data.note = body.note ? String(body.note) : null
  }

  // discountType
  if (body.discountType !== undefined) {
    data.discountType =
      String(body.discountType).toUpperCase() === "AMOUNT" ? "AMOUNT" : "PERCENT"
  }

  // discountValue
  if (body.discountValue !== undefined) {
    const discountValue = Number(body.discountValue)
    if (!Number.isFinite(discountValue) || discountValue < 0) {
      return NextResponse.json({ error: "invalid-discount-value" }, { status: 400 })
    }
    const dt = data.discountType || (await db.promotion.findUnique({ where: { id }, select: { discountType: true } }))?.discountType
    if (dt === "PERCENT" && discountValue > 100) {
      return NextResponse.json({ error: "percent-too-high" }, { status: 400 })
    }
    data.discountValue = discountValue
  }

  // scope + targets
  if (body.scope !== undefined) {
    const scopeRaw = String(body.scope).toUpperCase()
    const scope =
      scopeRaw === "CATEGORY" || scopeRaw === "ALL" || scopeRaw === "ALL_EXCEPT_CATEGORIES"
        ? scopeRaw
        : "PRODUCT"
    data.scope = scope

    const productId = body.productId !== undefined ? (body.productId ? String(body.productId) : null) : undefined
    const categoryIds: string[] | undefined = Array.isArray(body.categoryIds)
      ? body.categoryIds.map(String).filter(Boolean)
      : undefined

    // Validate scope-specific targets
    if (scope === "PRODUCT") {
      if (productId === null || (productId === undefined && !(await db.promotion.findUnique({ where: { id }, select: { productId: true } }))?.productId)) {
        return NextResponse.json({ error: "product-required" }, { status: 400 })
      }
      if (productId !== undefined) {
        if (productId) {
          const product = await db.product.findUnique({ where: { id: productId }, select: { id: true } })
          if (!product) return NextResponse.json({ error: "product-not-found" }, { status: 404 })
        }
        data.productId = productId
      }
    } else {
      // CATEGORY / ALL_EXCEPT_CATEGORIES / ALL → clear productId
      data.productId = null
    }

    if (categoryIds !== undefined) {
      if (scope === "CATEGORY" && categoryIds.length === 0) {
        return NextResponse.json({ error: "category-ids-required" }, { status: 400 })
      }
      if (scope === "ALL_EXCEPT_CATEGORIES" && categoryIds.length === 0) {
        return NextResponse.json({ error: "excluded-category-ids-required" }, { status: 400 })
      }
      data.categoryIdsJson = categoryIds.length > 0 ? JSON.stringify(categoryIds) : null
    }
  }

  // dates
  if (body.startAt !== undefined || body.endAt !== undefined) {
    const startAtRaw = body.startAt ? String(body.startAt) : null
    const endAtRaw = body.endAt ? String(body.endAt) : null
    if (startAtRaw === null && endAtRaw === null) {
      // both explicitly null — skip
    } else {
      const current = await db.promotion.findUnique({ where: { id }, select: { startAt: true, endAt: true } })
      const startAt = startAtRaw ? new Date(startAtRaw) : current!.startAt
      const endAt = endAtRaw ? new Date(endAtRaw) : current!.endAt
      if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
        return NextResponse.json({ error: "invalid-dates" }, { status: 400 })
      }
      if (endAt.getTime() <= startAt.getTime()) {
        return NextResponse.json({ error: "end-before-start" }, { status: 400 })
      }
      if (startAtRaw) data.startAt = startAt
      if (endAtRaw) data.endAt = endAt
    }
  }

  const updated = await db.promotion.update({ where: { id }, data })
  return NextResponse.json({ id: updated.id, ok: true })
}
