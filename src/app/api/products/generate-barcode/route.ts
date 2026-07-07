import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { generateProductBarcode } from "@/lib/barcode"

export const dynamic = "force-dynamic"

/**
 * GET /api/products/generate-barcode?categoryId=xxx
 *
 * Returns the next suggested 13-digit barcode for a product in the given
 * category. Format: [categoryPrefix 1 digit][sequence 12 digits].
 *
 * The category prefix is the category's 1-based position among all
 * categories ordered by creation date (first category = 1, second = 2, …).
 * This gives a stable, human-readable mapping:
 *   Category 1 → 1000000000001, 1000000000002, …
 *   Category 2 → 2000000000001, 2000000000002, …
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

  // Fetch the target category + all categories ordered by creation date
  // to determine the prefix (1-based index).
  const [category, allCategories] = await Promise.all([
    db.category.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true, barcodePrefix: true },
    }),
    db.category.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }),
  ])

  if (!category) {
    return NextResponse.json({ error: "category-not-found" }, { status: 404 })
  }

  // Use explicit barcodePrefix if set, otherwise fall back to the
  // category's 1-based position in the ordered list.
  let categoryPrefix: number
  if (category.barcodePrefix && category.barcodePrefix >= 1 && category.barcodePrefix <= 9) {
    categoryPrefix = category.barcodePrefix
  } else {
    const categoryIndex = allCategories.findIndex((c) => c.id === categoryId)
    categoryPrefix = categoryIndex >= 0 ? categoryIndex + 1 : 1
  }

  // Next sequence = count of existing products in this category + 1
  const existingCount = await db.product.count({ where: { categoryId } })
  const sequence = existingCount + 1

  const barcode = generateProductBarcode(categoryPrefix, sequence)
  return NextResponse.json({ barcode, prefix: categoryPrefix, sequence })
}
