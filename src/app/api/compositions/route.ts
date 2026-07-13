import { requireUser, isErrorResponse } from "@/lib/auth-helpers"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { serializeComposition } from "@/lib/serialize"
import { logAuditEvent } from "@/lib/audit"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * GET /api/compositions
 *
 * List all compositions with their ingredients + output product included so
 * the client can compute cost-per-batch / cost-per-unit without an extra
 * round-trip.
 *
 * Query params (all optional):
 *   - q        : case-insensitive name search
 *   - active   : "true" to filter isActive=true only
 *
 * No auth required — SALES staff may need to read compositions in POS.
 */
export async function GET(req: NextRequest) {
  const user = await requireUser()
  if (isErrorResponse(user)) return user
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim() || undefined
  const active = searchParams.get("active")

  const where: {
    name?: { contains: string; mode: "insensitive" }
    isActive?: boolean
  } = {}
  if (q) where.name = { contains: q, mode: "insensitive" }
  if (active === "true") where.isActive = true
  else if (active === "false") where.isActive = false

  const compositions = await db.composition.findMany({
    where,
    include: {
      outputProduct: true,
      ingredients: { include: { product: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ items: compositions.map(serializeComposition) })
}

/**
 * POST /api/compositions
 *
 * Create a composition + its ingredients atomically inside a transaction.
 * ADMIN or WAREHOUSE only.
 *
 * Body:
 *   name:             string  (required, unique)
 *   description?:     string
 *   imageUrl?:        string
 *   outputProductId:  string  (required, must reference an existing Product)
 *   yieldQty:         number  (> 0)
 *   yieldUnit?:       string  (default "قطعة")
 *   isActive?:        boolean (default true)
 *   notes?:           string
 *   ingredients:      [{ productId, quantity, unit?, notes? }]
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

  // Output product — either an existing productId OR a new product to create.
  // When `createNewProduct` is true, the API creates a new Product row
  // atomically inside the transaction and links it as the output.
  // The new product's price/unit are computed automatically:
  //   - unit      = yieldUnit (وحدة الإنتاج)
  //   - costPrice = (Σ ingredient cost) / yieldQty  (per unit)
  //   - salePrice = costPrice + profitAmount (fixed currency amount above cost)
  const createNewProduct = body?.createNewProduct === true
  const outputProductId = String(body?.outputProductId || "").trim()
  // profitAmount = fixed profit in currency added on top of costPrice.
  // Default 0 = no profit (salePrice = costPrice).
  const profitAmount = Math.max(0, Number(body?.profitAmount) || 0)

  if (!createNewProduct && !outputProductId) {
    return NextResponse.json({ error: "output-product-required" }, { status: 400 })
  }

  const yieldQty = Math.max(0, Number(body?.yieldQty) || 0)
  if (yieldQty <= 0) {
    return NextResponse.json({ error: "yield-required" }, { status: 400 })
  }

  const rawIngredients = Array.isArray(body?.ingredients) ? body.ingredients : []
  if (rawIngredients.length === 0) {
    return NextResponse.json({ error: "ingredients-required" }, { status: 400 })
  }

  // Normalize + validate ingredient rows.
  const ingredientsData: {
    productId: string
    quantity: number
    unit: string
    notes: string | null
  }[] = rawIngredients
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

  if (ingredientsData.length === 0) {
    return NextResponse.json({ error: "ingredients-required" }, { status: 400 })
  }

  // Verify all referenced ingredient products exist (NOT the output — it may be new).
  const ingredientProductIds: string[] = Array.from(
    new Set(ingredientsData.map((i) => i.productId))
  )
  const ingredientProducts = await db.product.findMany({
    where: { id: { in: ingredientProductIds } },
    select: { id: true, costPrice: true, name: true },
  })
  if (ingredientProducts.length !== ingredientProductIds.length) {
    return NextResponse.json({ error: "invalid-product" }, { status: 400 })
  }

  // If using an existing output product, verify it exists.
  if (!createNewProduct && outputProductId) {
    const outExists = await db.product.findUnique({
      where: { id: outputProductId },
      select: { id: true },
    })
    if (!outExists) {
      return NextResponse.json({ error: "invalid-output-product" }, { status: 400 })
    }
  }

  // Compute the cost-per-unit for the new product (if creating).
  // cost = Σ (ingredient quantity × ingredient costPrice) / yieldQty
  // This is the manufacturing cost — what it costs to produce one unit.
  const ingredientCostMap = new Map(
    ingredientProducts.map((p) => [p.id, Number(p.costPrice ?? 0)])
  )
  const totalBatchCost = ingredientsData.reduce(
    (sum, ing) => sum + (ingredientCostMap.get(ing.productId) ?? 0) * ing.quantity,
    0
  )
  const costPerUnit = yieldQty > 0 ? totalBatchCost / yieldQty : 0
  // salePrice = costPrice + fixed profit amount (not a multiplier)
  const salePricePerUnit = +(costPerUnit + profitAmount).toFixed(3)

  // Enforce name uniqueness before attempting create (DB @unique).
  const dup = await db.composition.findUnique({
    where: { name },
    select: { id: true },
  })
  if (dup) return NextResponse.json({ error: "name-exists" }, { status: 409 })

  const description = body?.description ? String(body.description).trim() : null
  const imageUrl = body?.imageUrl ? String(body.imageUrl).trim() : null
  const notes = body?.notes ? String(body.notes).trim() : null
  const yieldUnit = body?.yieldUnit ? String(body.yieldUnit).trim() : "قطعة"
  const isActive = body?.isActive !== undefined ? Boolean(body.isActive) : true

  try {
    const created = await db.$transaction(async (tx) => {
      // If creating a new output product, do it inside the transaction so
      // the composition + product are atomic (both roll back on failure).
      let finalOutputProductId = outputProductId
      if (createNewProduct) {
        // The new product name = composition name (user can rename later)
        // Unit = yieldUnit, prices computed from ingredient costs.
        const newProduct = await tx.product.create({
          data: {
            name,
            costPrice: +costPerUnit.toFixed(3),
            salePrice: salePricePerUnit,
            unit: yieldUnit,
            isManufactured: true,
            quantity: 0, // starts at 0 — produced via Composition.produce
          },
        })
        finalOutputProductId = newProduct.id
      } else if (outputProductId) {
        // Linking an existing product — mark it as manufactured.
        await tx.product.update({
          where: { id: outputProductId },
          data: { isManufactured: true },
        })
      }

      const composition = await tx.composition.create({
        data: {
          name,
          description,
          imageUrl,
          outputProductId: finalOutputProductId,
          yieldQty,
          yieldUnit,
          isActive,
          notes,
          ingredients: {
            create: ingredientsData,
          },
        },
        include: {
          outputProduct: true,
          ingredients: { include: { product: true } },
        },
      })
      await logAuditEvent({
        tx,
        userId: user.id,
        userName: user.name,
        action: "COMPOSITION_CREATED",
        description: `إنشاء تركيبة ${composition.name}`,
      })
      return composition
    }, {
      timeout: 15000,
      maxWait: 5000,
    })
    return NextResponse.json(serializeComposition(created as any), {
      status: 201,
    })
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "name-exists" }, { status: 409 })
    }
    throw err
  }
}
