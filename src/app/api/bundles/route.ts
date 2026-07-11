import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { serializeBundle } from "@/lib/serialize"
import { logAuditEvent } from "@/lib/audit"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * GET /api/bundles
 *
 * List all bundles with their items + product included so the client can
 * compute cost/profit figures without an extra round-trip.
 *
 * Query params (all optional):
 *   - q        : case-insensitive name search
 *   - active   : "true" to filter isActive=true only
 *
 * No auth required — SALES staff need to see bundles in POS.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim() || undefined
  const active = searchParams.get("active")

  // ── Auto-expire: close bundles past their endDate ──
  // Run on every GET so expired bundles are deactivated automatically
  // without needing a cron job.
  const now = new Date()
  await db.bundle.updateMany({
    where: {
      isActive: true,
      endDate: { lt: now },
    },
    data: { isActive: false },
  })

  // ── Auto-activate: start bundles whose startDate has arrived ──
  await db.bundle.updateMany({
    where: {
      isActive: false,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    data: { isActive: true },
  })

  const where: { name?: { contains: string; mode: "insensitive" }; isActive?: boolean } = {}
  if (q) where.name = { contains: q, mode: "insensitive" }
  if (active === "true") where.isActive = true
  else if (active === "false") where.isActive = false

  const bundles = await db.bundle.findMany({
    where,
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ items: bundles.map(serializeBundle) })
}

/**
 * POST /api/bundles
 *
 * Create a bundle + its items atomically inside a transaction.
 * ADMIN or WAREHOUSE only.
 *
 * Body:
 *   name:        string  (required, unique)
 *   description?: string
 *   imageUrl?:   string
 *   salePrice:   number  (>= 0)
 *   isActive?:   boolean
 *   startDate?:  ISO string
 *   endDate?:    ISO string
 *   category?:   string
 *   items:       [{ productId, quantity }]
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN", "WAREHOUSE" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({} as any))
  const name = String(body?.name || "").trim()
  if (!name) return NextResponse.json({ error: "name-required" }, { status: 400 })

  const salePrice = Math.max(0, Number(body?.salePrice) || 0)
  if (salePrice <= 0) {
    return NextResponse.json({ error: "sale-price-required" }, { status: 400 })
  }

  const rawItems = Array.isArray(body?.items) ? body.items : []
  if (rawItems.length === 0) {
    return NextResponse.json({ error: "items-required" }, { status: 400 })
  }

  // Normalize + validate item rows.
  const itemsData: { productId: string; quantity: number }[] = rawItems
    .map((it: any) => ({
      productId: String(it?.productId || ""),
      quantity: Math.max(0, Number(it?.quantity) || 0),
    }))
    .filter((it: { productId: string; quantity: number }) => it.productId && it.quantity > 0)

  if (itemsData.length === 0) {
    return NextResponse.json({ error: "items-required" }, { status: 400 })
  }

  // Verify the products exist (also prevents orphan FK rows).
  const productIds: string[] = Array.from(new Set(itemsData.map((i) => i.productId)))
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true },
  })
  if (products.length !== productIds.length) {
    return NextResponse.json({ error: "invalid-product" }, { status: 400 })
  }

  // Enforce name uniqueness before attempting create (DB @unique) so we
  // return a friendly error code instead of a raw Prisma P2002.
  const dup = await db.bundle.findUnique({ where: { name }, select: { id: true } })
  if (dup) return NextResponse.json({ error: "name-exists" }, { status: 409 })

  const description = body?.description ? String(body.description).trim() : null
  const imageUrl = body?.imageUrl ? String(body.imageUrl).trim() : null
  const category = body?.category ? String(body.category).trim() : null
  const isActive = body?.isActive !== undefined ? Boolean(body.isActive) : true
  const startDate = body?.startDate ? new Date(body.startDate) : null
  const endDate = body?.endDate ? new Date(body.endDate) : null

  // Validate dates if provided.
  if (startDate && isNaN(startDate.getTime())) {
    return NextResponse.json({ error: "invalid-start-date" }, { status: 400 })
  }
  if (endDate && isNaN(endDate.getTime())) {
    return NextResponse.json({ error: "invalid-end-date" }, { status: 400 })
  }

  try {
    const created = await db.$transaction(async (tx) => {
      const bundle = await tx.bundle.create({
        data: {
          name,
          description,
          imageUrl,
          salePrice,
          isActive,
          startDate,
          endDate,
          category,
          items: {
            create: itemsData,
          },
        },
        include: { items: { include: { product: true } } },
      })
      await logAuditEvent({
        tx,
        userId: user.id,
        userName: user.name,
        action: "BUNDLE_CREATED",
        description: `إنشاء باقة ${bundle.name}`,
      })
      return bundle
    })
    return NextResponse.json(serializeBundle(created as any), { status: 201 })
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "name-exists" }, { status: 409 })
    }
    throw err
  }
}
