import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  decrementStockItem,
  incrementStockItem,
  updateProductQuantityFromStockItems,
  getDefaultWarehouseId,
} from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { logAuditEvent } from "@/lib/audit"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * POST /api/compositions/[id]/produce
 *
 * Produce `batches` number of batches of the composition's output product.
 * ADMIN or WAREHOUSE only.
 *
 * Body:
 *   batches: number  (default 1, min 1)
 *
 * Atomic logic (all inside a `$transaction`):
 *   1. Load composition + ingredients + products.
 *   2. Resolve default warehouse via `getDefaultWarehouseId(tx)`.
 *      If none exists, return 500.
 *   3. For each ingredient, check the warehouse stock level for
 *      `requiredQty = ingredient.quantity * batches`. Build a list of ALL
 *      insufficient ingredients BEFORE decrementing anything — return 400
 *      with that list if any are short.
 *   4. Decrement each ingredient via `decrementStockItem`.
 *   5. Increment the output product's stock via `incrementStockItem`
 *      by `yieldQty * batches`.
 *   6. Sync the aggregate Product.quantity via
 *      `updateProductQuantityFromStockItems`.
 *   7. Return `{ ok: true, produced, unit }`.
 *
 * Either all ingredients are consumed AND output produced, or nothing
 * changes.
 */
export async function POST(
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
  const batches = Math.max(1, Math.floor(Number(body?.batches) || 1))
  if (batches < 1) {
    return NextResponse.json({ error: "invalid-batches" }, { status: 400 })
  }

  try {
    const result = await db.$transaction(async (tx) => {
      // 1. Load composition with ingredients + their products.
      const composition = await tx.composition.findUnique({
        where: { id },
        include: {
          ingredients: { include: { product: true } },
          outputProduct: true,
        },
      })
      if (!composition) {
        throw { httpStatus: 404, body: { error: "not-found" } }
      }
      if (composition.ingredients.length === 0) {
        throw { httpStatus: 400, body: { error: "ingredients-required" } }
      }

      // 2. Resolve default warehouse.
      const warehouseId = await getDefaultWarehouseId(tx)
      if (!warehouseId) {
        throw {
          httpStatus: 500,
          body: { error: "no-warehouse" },
        }
      }

      const yieldQty = Number(composition.yieldQty ?? 0)
      const producedQty = yieldQty * batches

      // 3. Pre-check ALL ingredients before decrementing any. Build a list
      //    of every short ingredient so the user can fix them all at once.
      const insufficient: {
        productId: string
        name: string
        required: number
        available: number
        unit: string
      }[] = []

      for (const ing of composition.ingredients) {
        const requiredQty = Number(ing.quantity ?? 0) * batches
        const stockRow = await tx.stockItem.findUnique({
          where: {
            productId_warehouseId: {
              productId: ing.productId,
              warehouseId,
            },
          },
          select: { quantity: true },
        })
        const availableQty = Number(stockRow?.quantity ?? 0)
        if (availableQty < requiredQty) {
          insufficient.push({
            productId: ing.productId,
            name: ing.product?.name ?? ing.productId,
            required: requiredQty,
            available: availableQty,
            unit: String(ing.unit ?? "جرام"),
          })
        }
      }

      if (insufficient.length > 0) {
        throw {
          httpStatus: 400,
          body: {
            error: "insufficient-stock",
            ingredients: insufficient,
          },
        }
      }

      // 4. Decrement each ingredient (guaranteed to succeed now).
      // After each decrement, sync the ingredient's Product.quantity so it
      // stays the derived aggregate (SUM of StockItem.quantity).
      for (const ing of composition.ingredients) {
        const requiredQty = Number(ing.quantity ?? 0) * batches
        const ok = await decrementStockItem(
          tx,
          ing.productId,
          warehouseId,
          requiredQty
        )
        if (!ok) {
          // Defensive — the pre-check above should prevent this, but races
          // are possible. Roll back and report.
          throw {
            httpStatus: 400,
            body: {
              error: "insufficient-stock",
              ingredients: [
                {
                  productId: ing.productId,
                  name: ing.product?.name ?? ing.productId,
                  required: requiredQty,
                  available: 0,
                  unit: String(ing.unit ?? "جرام"),
                },
              ],
            },
          }
        }
        // Sync the ingredient's Product.quantity (derived aggregate).
        await updateProductQuantityFromStockItems(tx, ing.productId)
      }

      // 5. Increment the output product's stock.
      await incrementStockItem(
        tx,
        composition.outputProductId,
        warehouseId,
        producedQty
      )

      // 6. Sync the aggregate Product.quantity for the output product.
      await updateProductQuantityFromStockItems(tx, composition.outputProductId)

      // 7. Audit log (inside tx — atomic).
      await logAuditEvent({
        tx,
        userId: user.id,
        userName: user.name,
        action: "COMPOSITION_PRODUCED",
        description: `إنتاج تركيبة ${composition.name} — ${producedQty} ${composition.yieldUnit}`,
      })

      return {
        produced: producedQty,
        unit: composition.yieldUnit,
      }
    }, {
      timeout: 15000,
      maxWait: 5000,
    })

    return NextResponse.json({
      ok: true,
      produced: result.produced,
      unit: result.unit,
    })
  } catch (err: any) {
    // Custom thrown error shape → return the structured body.
    if (err && typeof err === "object" && "httpStatus" in err && "body" in err) {
      return NextResponse.json(err.body, { status: err.httpStatus })
    }
    throw err
  }
}
