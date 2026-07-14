import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { hasRole } from "@/lib/session"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * POST /api/admin/recalc-stock
 *
 * Recalculates Product.quantity for ALL products from the actual
 * StockItem rows. This fixes any desync between the cached aggregate
 * (Product.quantity) and the source-of-truth (StockItem.quantity).
 *
 * Also returns a report of which products were corrected.
 *
 * Auth: OWNER/ADMIN only
 */
export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN"] as Role[])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  // Fetch all products with their StockItem sums
  const products = await db.product.findMany({
    select: {
      id: true,
      name: true,
      quantity: true,
      stockItems: { select: { quantity: true, warehouseId: true } },
    },
  })

  let corrected = 0
  let unchanged = 0
  const corrections: Array<{
    productId: string
    productName: string
    oldQty: number
    newQty: number
    byWarehouse: Array<{ warehouseId: string; quantity: number }>
  }> = []

  for (const p of products) {
    const stockSum = p.stockItems.reduce((sum, si) => sum + si.quantity, 0)
    if (stockSum !== p.quantity) {
      // Correct the Product.quantity
      await db.product.update({
        where: { id: p.id },
        data: { quantity: stockSum },
      })
      corrected++
      corrections.push({
        productId: p.id,
        productName: p.name,
        oldQty: p.quantity,
        newQty: stockSum,
        byWarehouse: p.stockItems.map((si) => ({
          warehouseId: si.warehouseId,
          quantity: si.quantity,
        })),
      })
    } else {
      unchanged++
    }
  }

  return NextResponse.json({
    ok: true,
    totalProducts: products.length,
    corrected,
    unchanged,
    corrections: corrections.slice(0, 50), // first 50 for display
  })
}
