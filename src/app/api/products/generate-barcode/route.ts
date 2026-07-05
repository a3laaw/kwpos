import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { generateProductBarcode } from "@/lib/barcode"

export const dynamic = "force-dynamic"

/**
 * GET /api/products/generate-barcode?categoryId=xxx
 * Returns the next suggested barcode for a product in the given category,
 * based on the category's short `code` + a per-category sequence (1-based).
 *
 * Auth: requires login.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get("categoryId")?.trim() || ""

  if (!categoryId) {
    return NextResponse.json({ error: "categoryId-required" }, { status: 400 })
  }

  const category = await db.category.findUnique({
    where: { id: categoryId },
    select: { id: true, code: true },
  })
  if (!category) {
    return NextResponse.json({ error: "category-not-found" }, { status: 404 })
  }

  // Count existing products in this category → next sequence = count + 1
  const count = await db.product.count({ where: { categoryId } })
  const sequence = count + 1

  const barcode = generateProductBarcode(category.code, sequence)
  return NextResponse.json({ barcode })
}
