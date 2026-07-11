import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * GET /api/promotions
 *   List all promotions (include product + creator), newest first.
 *
 *   Response: { items: [{ id, productId, productName, barcode, discountType,
 *                          discountValue, startAt, endAt, isActive, note,
 *                          createdByName, createdAt }] }
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const [promos, categories] = await Promise.all([
    db.promotion.findMany({
      include: {
        product: { select: { id: true, name: true, barcode: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.category.findMany({ select: { id: true, name: true } }),
  ])
  const catName = new Map(categories.map((c) => [c.id, c.name]))

  const items = promos.map((p) => {
    const scope = (p.scope || "PRODUCT").toUpperCase()
    const categoryIds: string[] = (() => {
      try {
        const arr = p.categoryIdsJson ? JSON.parse(p.categoryIdsJson) : []
        return Array.isArray(arr) ? arr.map(String) : []
      } catch {
        return []
      }
    })()
    return {
      id: p.id,
      scope,
      productId: p.productId ?? null,
      productName: p.product?.name ?? null,
      barcode: p.product?.barcode ?? null,
      categoryIds,
      categoryNames: categoryIds.map((id) => catName.get(id) ?? "—"),
      discountType: p.discountType,
      discountValue: Number(p.discountValue),
      startAt: p.startAt,
      endAt: p.endAt,
      isActive: Boolean(p.isActive),
      note: p.note ?? null,
      createdByName: p.createdBy?.name ?? null,
      createdAt: p.createdAt,
    }
  })

  return NextResponse.json({ items })
}

/**
 * POST /api/promotions  (ADMIN only)
 *   Create a new promotion. Auto-sets isActive=true.
 *
 *   Body: { productId, discountType ("PERCENT"|"AMOUNT"), discountValue,
 *           startAt, endAt, note? }
 *
 *   Validates:
 *     - productId references an existing product
 *     - discountType is PERCENT or AMOUNT
 *     - discountValue is a non-negative number (≤ 100 for PERCENT)
 *     - endAt > startAt
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const discountType =
    String(body?.discountType || "").toUpperCase() === "AMOUNT" ? "AMOUNT" : "PERCENT"
  const discountValue = Number(body?.discountValue)
  const startAtRaw = body?.startAt ? String(body.startAt) : ""
  const endAtRaw = body?.endAt ? String(body.endAt) : ""
  const note = body?.note ? String(body.note) : null

  // Scope: PRODUCT | CATEGORY | ALL | ALL_EXCEPT_CATEGORIES
  const scopeRaw = String(body?.scope || "PRODUCT").toUpperCase()
  const scope =
    scopeRaw === "CATEGORY" || scopeRaw === "ALL" || scopeRaw === "ALL_EXCEPT_CATEGORIES"
      ? scopeRaw
      : "PRODUCT"
  const productId = body?.productId ? String(body.productId) : null
  const categoryIds: string[] = Array.isArray(body?.categoryIds)
    ? body.categoryIds.map(String).filter(Boolean)
    : []

  // Validate scope-specific targets.
  if (scope === "PRODUCT") {
    if (!productId) {
      return NextResponse.json({ error: "product-required" }, { status: 400 })
    }
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true },
    })
    if (!product) {
      return NextResponse.json({ error: "product-not-found" }, { status: 404 })
    }
  } else if (scope === "CATEGORY") {
    if (categoryIds.length === 0) {
      return NextResponse.json({ error: "category-ids-required" }, { status: 400 })
    }
  } else if (scope === "ALL_EXCEPT_CATEGORIES") {
    if (categoryIds.length === 0) {
      return NextResponse.json({ error: "excluded-category-ids-required" }, { status: 400 })
    }
  }
  // ALL → no target needed.

  if (!Number.isFinite(discountValue) || discountValue < 0) {
    return NextResponse.json({ error: "invalid-discount-value" }, { status: 400 })
  }
  if (discountType === "PERCENT" && discountValue > 100) {
    return NextResponse.json({ error: "percent-too-high" }, { status: 400 })
  }
  if (!startAtRaw || !endAtRaw) {
    return NextResponse.json({ error: "dates-required" }, { status: 400 })
  }
  const startAt = new Date(startAtRaw)
  const endAt = new Date(endAtRaw)
  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
    return NextResponse.json({ error: "invalid-dates" }, { status: 400 })
  }
  if (endAt.getTime() <= startAt.getTime()) {
    return NextResponse.json({ error: "end-before-start" }, { status: 400 })
  }

  const created = await db.promotion.create({
    data: {
      productId: scope === "PRODUCT" ? productId : null,
      scope,
      categoryIdsJson: categoryIds.length > 0 ? JSON.stringify(categoryIds) : null,
      discountType,
      discountValue,
      startAt,
      endAt,
      isActive: true,
      note,
      createdById: user.id,
    },
  })

  return NextResponse.json({ id: created.id, ok: true }, { status: 201 })
}

/**
 * DELETE /api/promotions?id=xxx  (ADMIN only)
 *   Soft-deactivate a promotion by setting isActive = false. We do NOT
 *   hard-delete — the historical record is preserved so the audit trail
 *   remains complete (you can see what promo was applied to a past sale).
 */
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "id-required" }, { status: 400 })
  }

  // Soft-deactivate only. If the row doesn't exist, return 404.
  const existing = await db.promotion.findUnique({ where: { id }, select: { id: true } })
  if (!existing) {
    return NextResponse.json({ error: "not-found" }, { status: 404 })
  }

  await db.promotion.update({
    where: { id },
    data: { isActive: false },
  })

  return NextResponse.json({ ok: true })
}
