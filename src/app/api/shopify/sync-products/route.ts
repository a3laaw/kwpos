import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { fetchShopifyProducts, getShopifyConfig } from "@/lib/shopify"

export const dynamic = "force-dynamic"

/**
 * Pull products from Shopify and upsert them into local inventory.
 * Matching rule: SKU (= barcode) if present, otherwise product title.
 */
export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const cfg = getShopifyConfig()
  if (!cfg.configured) {
    return NextResponse.json({ error: "shopify-not-configured" }, { status: 400 })
  }

  let fetched = 0
  let created = 0
  let updated = 0
  const errors: string[] = []

  try {
    const products = await fetchShopifyProducts(100)
    fetched = products.length

    // Ensure a default "Shopify" category for synced items
    let category = await db.category.findFirst({ where: { name: "Shopify" } })
    if (!category) {
      category = await db.category.create({ data: { name: "Shopify" } })
    }

    for (const sp of products) {
      try {
        const variant = sp.variants?.[0]
        const sku = variant?.sku?.trim() || null
        const barcode = variant?.barcode?.trim() || sku
        const price = variant ? parseFloat(variant.price) || 0 : 0
        const qty = variant?.inventory_quantity ?? 0

        // Try matching by barcode/SKU first, then by name
        let existing = sku
          ? await db.product.findFirst({ where: { barcode: sku } })
          : null
        if (!existing) {
          existing = await db.product.findFirst({ where: { name: sp.title } })
        }

        if (existing) {
          await db.product.update({
            where: { id: existing.id },
            data: {
              barcode: barcode ?? existing.barcode,
              salePrice: price > 0 ? price : existing.salePrice,
              quantity: qty > 0 ? qty : existing.quantity,
              categoryId: existing.categoryId ?? category.id,
            },
          })
          updated++
        } else {
          await db.product.create({
            data: {
              name: sp.title,
              barcode: barcode || null,
              categoryId: category.id,
              quantity: qty || 0,
              reorderLevel: 5,
              costPrice: 0,
              salePrice: price || 0,
              unit: "قطعة",
            },
          })
          created++
        }
      } catch (e: any) {
        errors.push(`${sp.title}: ${e?.message || "unknown"}`)
      }
    }

    return NextResponse.json({
      ok: true,
      fetched,
      created,
      updated,
      errors: errors.slice(0, 10),
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "sync-failed" },
      { status: 500 }
    )
  }
}
