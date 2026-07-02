import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { fetchShopifyOrders, getShopifyConfig } from "@/lib/shopify"
import { makeInvoiceNo } from "@/lib/format"

export const dynamic = "force-dynamic"

/**
 * Import recent Shopify orders as local sales.
 * For each order we:
 *  - match line items to local products by barcode/SKU or name,
 *  - skip out-of-stock / unmatched items but still record the sale with matched items,
 *  - skip orders already imported (tracked via invoiceNo = "SHP-<order id>").
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
  let imported = 0
  let skipped = 0
  const errors: string[] = []

  try {
    const orders = await fetchShopifyOrders(50)
    fetched = orders.length

    for (const so of orders) {
      const invoiceNo = `SHP-${so.id}`
      // Skip already-imported orders
      const existing = await db.sale.findUnique({ where: { invoiceNo } })
      if (existing) {
        skipped++
        continue
      }

      const itemsData: Array<{
        productId: string
        quantity: number
        unitPrice: number
        subtotal: number
      }> = []
      let subtotal = 0

      for (const li of so.line_items || []) {
        const qty = Number(li.quantity) || 0
        const unitPrice = Number(li.price) || 0
        if (qty <= 0) continue

        // Match by SKU/barcode, then by title
        let product = li.sku
          ? await db.product.findFirst({ where: { barcode: li.sku } })
          : null
        if (!product) {
          product = await db.product.findFirst({ where: { name: li.title } })
        }
        if (!product) {
          errors.push(`${so.name}: منتج غير موجود — ${li.title}`)
          continue
        }

        itemsData.push({
          productId: product.id,
          quantity: qty,
          unitPrice,
          subtotal: +(qty * unitPrice).toFixed(3),
        })
        subtotal += qty * unitPrice
      }

      // If no items matched, still create a sale record with the order total (no items)
      // so the merchant sees the Shopify order in their list.
      const total = Number(so.total_price) || subtotal
      const sale = await db.sale.create({
        data: {
          invoiceNo,
          customerName: so.customer?.display_name || "عميل شوبيفاي",
          subtotal: +subtotal.toFixed(3),
          taxRate: 0,
          taxAmount: 0,
          discount: 0,
          total: +total.toFixed(3),
          paid: +total.toFixed(3),
          paymentMethod: "TRANSFER",
          userId: user.id,
          items: itemsData.length
            ? { create: itemsData }
            : undefined,
        },
      })

      imported++
      void sale
    }

    return NextResponse.json({
      ok: true,
      fetched,
      imported,
      skipped,
      errors: errors.slice(0, 10),
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "import-failed" },
      { status: 500 }
    )
  }
}
