import { requireUser, isErrorResponse } from "@/lib/auth-helpers"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { serializeComposition } from "@/lib/serialize"
import { logAuditEvent } from "@/lib/audit"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/** GET /api/compositions/[id] — fetch one composition with full includes. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser()
  if (isErrorResponse(user)) return user
  const { id } = await params
  const composition = await db.composition.findUnique({
    where: { id },
    include: {
      outputProduct: true,
      ingredients: { include: { product: true } },
    },
  })
  if (!composition) {
    return NextResponse.json({ error: "not-found" }, { status: 404 })
  }
  return NextResponse.json(serializeComposition(composition as any))
}

/**
 * PUT /api/compositions/[id] — update a composition.
 * ADMIN or WAREHOUSE only.
 *
 * All body fields optional. If `ingredients` is provided, the existing
 * ingredient rows are deleted and recreated (within a transaction) — this
 * keeps the update semantics simple and avoids partial-state drift.
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

  const exists = await db.composition.findUnique({ where: { id } })
  if (!exists) {
    return NextResponse.json({ error: "not-found" }, { status: 404 })
  }

  // Build the scalar update payload — only fields actually present.
  const data: {
    name?: string
    description?: string | null
    imageUrl?: string | null
    outputProductId?: string
    yieldQty?: number
    yieldUnit?: string
    isActive?: boolean
    notes?: string | null
  } = {}

  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (!name) return NextResponse.json({ error: "name-required" }, { status: 400 })
    // Enforce name uniqueness (excluding the current composition).
    const dup = await db.composition.findUnique({
      where: { name },
      select: { id: true },
    })
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
  if (body.outputProductId !== undefined) {
    const outputProductId = String(body.outputProductId).trim()
    if (!outputProductId) {
      return NextResponse.json({ error: "output-product-required" }, { status: 400 })
    }
    data.outputProductId = outputProductId
  }
  if (body.yieldQty !== undefined) {
    const yieldQty = Math.max(0, Number(body.yieldQty) || 0)
    if (yieldQty <= 0) {
      return NextResponse.json({ error: "yield-required" }, { status: 400 })
    }
    data.yieldQty = yieldQty
  }
  if (body.yieldUnit !== undefined) {
    data.yieldUnit = body.yieldUnit ? String(body.yieldUnit).trim() : "قطعة"
  }
  if (body.isActive !== undefined) {
    data.isActive = Boolean(body.isActive)
  }
  if (body.notes !== undefined) {
    data.notes = body.notes ? String(body.notes).trim() : null
  }

  // Optional ingredients replacement.
  const ingredientsData:
    | {
        productId: string
        quantity: number
        unit: string
        notes: string | null
      }[]
    | undefined = (() => {
    if (body.ingredients === undefined) return undefined
    const raw = Array.isArray(body.ingredients) ? body.ingredients : []
    const parsed = raw
      .map((it: any) => ({
        productId: String(it?.productId || ""),
        quantity: Math.max(0, Number(it?.quantity) || 0),
        unit: String(it?.unit || "جرام"),
        notes: it?.notes ? String(it.notes).trim() : null,
      }))
      .filter(
        (it: { productId: string; quantity: number }) =>
          it.productId && it.quantity > 0
      )
    return parsed
  })()

  if (body.ingredients !== undefined) {
    if (!ingredientsData || ingredientsData.length === 0) {
      return NextResponse.json({ error: "ingredients-required" }, { status: 400 })
    }
    // Verify the products exist (also covers the outputProductId if changed).
    const productIds: string[] = Array.from(
      new Set([
        ...ingredientsData.map((i) => i.productId),
        ...(data.outputProductId ? [data.outputProductId] : [exists.outputProductId]),
      ])
    )
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    })
    if (products.length !== productIds.length) {
      return NextResponse.json({ error: "invalid-product" }, { status: 400 })
    }
  } else if (data.outputProductId) {
    // Output product changed but no ingredients block — still verify it exists.
    const p = await db.product.findUnique({
      where: { id: data.outputProductId },
      select: { id: true },
    })
    if (!p) {
      return NextResponse.json({ error: "invalid-product" }, { status: 400 })
    }
  }

  // Snapshot the ingredients array (or undefined) into a const so TS narrows
  // correctly inside the async transaction closure below.
  const finalIngredients = ingredientsData

  try {
    const updated = await db.$transaction(async (tx) => {
      if (finalIngredients) {
        // Delete existing ingredients, then recreate.
        await tx.compositionIngredient.deleteMany({
          where: { compositionId: id },
        })
        await tx.composition.update({
          where: { id },
          data: {
            ...data,
            ingredients: { create: finalIngredients },
          },
          include: {
            outputProduct: true,
            ingredients: { include: { product: true } },
          },
        })
      } else {
        await tx.composition.update({
          where: { id },
          data,
          include: {
            outputProduct: true,
            ingredients: { include: { product: true } },
          },
        })
      }
      // Re-fetch so we always return the canonical post-update row.
      const updated = await tx.composition.findUnique({
        where: { id },
        include: {
          outputProduct: true,
          ingredients: { include: { product: true } },
        },
      })
      await logAuditEvent({
        tx,
        userId: user.id,
        userName: user.name,
        action: "COMPOSITION_UPDATED",
        description: `تعديل تركيبة ${updated?.name}`,
      })
      return updated
    })

    return NextResponse.json(serializeComposition(updated as any))
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "name-exists" }, { status: 409 })
    }
    throw err
  }
}

/**
 * DELETE /api/compositions/[id] — delete a composition.
 * ADMIN only. CompositionIngredients are cascade-deleted automatically
 * (Prisma `onDelete: Cascade` on the CompositionIngredient.composition
 * relation).
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
  const exists = await db.composition.findUnique({
    where: { id },
    select: { id: true, name: true },
  })
  if (!exists) {
    return NextResponse.json({ error: "not-found" }, { status: 404 })
  }

  await db.composition.delete({ where: { id } })
  await logAuditEvent({
    userId: user.id,
    userName: user.name,
    action: "COMPOSITION_DELETED",
    description: `حذف تركيبة ${exists.name}`,
  })
  return NextResponse.json({ ok: true })
}
