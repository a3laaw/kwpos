import { requireUser, isErrorResponse } from "@/lib/auth-helpers"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { serializeBundle } from "@/lib/serialize"
import { logAuditEvent } from "@/lib/audit"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/** GET /api/bundles/[id] — fetch one bundle with items + product. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser()
  if (isErrorResponse(user)) return user
  const { id } = await params
  const bundle = await db.bundle.findUnique({
    where: { id },
    include: { items: { include: { product: true } } },
  })
  if (!bundle) return NextResponse.json({ error: "not-found" }, { status: 404 })
  return NextResponse.json(serializeBundle(bundle as any))
}

/**
 * PUT /api/bundles/[id] — update a bundle.
 * ADMIN or WAREHOUSE only.
 *
 * All body fields optional. If `items` is provided, the existing items are
 * deleted and recreated (within a transaction) — this keeps the update
 * semantics simple and avoids partial-state drift.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN", "WAREHOUSE" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({} as any))

  const exists = await db.bundle.findUnique({ where: { id } })
  if (!exists) return NextResponse.json({ error: "not-found" }, { status: 404 })

  // Build the scalar update payload — only fields actually present.
  const data: {
    name?: string
    description?: string | null
    imageUrl?: string | null
    salePrice?: number
    isActive?: boolean
    startDate?: Date | null
    endDate?: Date | null
    category?: string | null
  } = {}

  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (!name) return NextResponse.json({ error: "name-required" }, { status: 400 })
    // Enforce name uniqueness (excluding the current bundle).
    const dup = await db.bundle.findUnique({ where: { name }, select: { id: true } })
    if (dup && dup.id !== id) {
      return NextResponse.json({ error: "name-exists" }, { status: 409 })
    }
    data.name = name
  }
  if (body.description !== undefined) {
    data.description = body.description ? String(body.description).trim() : null
  }
  if (body.imageUrl !== undefined) {
    data.imageUrl = body.imageUrl ? String(body.imageUrl).trim() : null
  }
  if (body.salePrice !== undefined) {
    const salePrice = Math.max(0, Number(body.salePrice) || 0)
    if (salePrice <= 0) {
      return NextResponse.json({ error: "sale-price-required" }, { status: 400 })
    }
    data.salePrice = salePrice
  }
  if (body.isActive !== undefined) {
    data.isActive = Boolean(body.isActive)
  }
  if (body.category !== undefined) {
    data.category = body.category ? String(body.category).trim() : null
  }
  if (body.startDate !== undefined) {
    if (body.startDate === null || body.startDate === "") {
      data.startDate = null
    } else {
      const d = new Date(body.startDate)
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: "invalid-start-date" }, { status: 400 })
      }
      data.startDate = d
    }
  }
  if (body.endDate !== undefined) {
    if (body.endDate === null || body.endDate === "") {
      data.endDate = null
    } else {
      const d = new Date(body.endDate)
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: "invalid-end-date" }, { status: 400 })
      }
      data.endDate = d
    }
  }

  // Optional items replacement.
  const itemsData: { productId: string; quantity: number }[] | undefined = (() => {
    if (body.items === undefined) return undefined
    const rawItems = Array.isArray(body.items) ? body.items : []
    const parsed = rawItems
      .map((it: any) => ({
        productId: String(it?.productId || ""),
        quantity: Math.max(0, Number(it?.quantity) || 0),
      }))
      .filter((it: { productId: string; quantity: number }) => it.productId && it.quantity > 0)
    return parsed
  })()

  if (body.items !== undefined) {
    if (!itemsData || itemsData.length === 0) {
      return NextResponse.json({ error: "items-required" }, { status: 400 })
    }

    // Verify the products exist.
    const productIds: string[] = Array.from(new Set(itemsData.map((i) => i.productId)))
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    })
    if (products.length !== productIds.length) {
      return NextResponse.json({ error: "invalid-product" }, { status: 400 })
    }
  }

  // Snapshot the items array (or undefined) into a const so TS narrows
  // correctly inside the async transaction closure below.
  const finalItems = itemsData

  try {
    const updated = await db.$transaction(async (tx) => {
      if (finalItems) {
        // Delete existing items, then recreate.
        await tx.bundleItem.deleteMany({ where: { bundleId: id } })
        await tx.bundle.update({
          where: { id },
          data: {
            ...data,
            items: { create: finalItems },
          },
          include: { items: { include: { product: true } } },
        })
      } else {
        await tx.bundle.update({
          where: { id },
          data,
          include: { items: { include: { product: true } } },
        })
      }
      // Re-fetch so we always return the canonical post-update row.
      const updated = await tx.bundle.findUnique({
        where: { id },
        include: { items: { include: { product: true } } },
      })
      await logAuditEvent({
        tx,
        userId: user.id,
        userName: user.name,
        action: "BUNDLE_UPDATED",
        description: `تعديل باقة ${updated?.name}`,
      })
      return updated
    })

    return NextResponse.json(serializeBundle(updated as any))
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "name-exists" }, { status: 409 })
    }
    throw err
  }
}

/**
 * DELETE /api/bundles/[id] — delete a bundle.
 * ADMIN only. BundleItems are cascade-deleted automatically (Prisma
 * `onDelete: Cascade` on the BundleItem.bundle relation).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await params
  const exists = await db.bundle.findUnique({
    where: { id },
    select: { id: true, name: true },
  })
  if (!exists) return NextResponse.json({ error: "not-found" }, { status: 404 })

  await db.bundle.delete({ where: { id } })
  await logAuditEvent({
    userId: user.id,
    userName: user.name,
    action: "BUNDLE_DELETED",
    description: `حذف باقة ${exists.name}`,
  })
  return NextResponse.json({ ok: true })
}
