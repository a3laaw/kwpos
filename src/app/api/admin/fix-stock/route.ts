import { NextRequest, NextResponse } from "next/server"
import { db, getDefaultWarehouseId } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { hasRole } from "@/lib/session"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * POST /api/admin/fix-stock
 *
 * Rebuilds StockItem for ALL products based on their actual transaction
 * history (purchase invoices − sales − purchase returns + sale returns).
 *
 * This fixes products where stock was never added due to $transaction
 * failures or missing warehouseId in old purchase invoices.
 *
 * Auth: OWNER/ADMIN only
 *
 * Body: { dryRun?: boolean }
 *   dryRun = true → only report what would change, don't actually change
 *   dryRun = false (default) → actually fix the stock
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN"] as Role[])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const dryRun = body?.dryRun === true

  // Resolve default warehouse
  const warehouseId = await getDefaultWarehouseId(db)
  if (!warehouseId) {
    return NextResponse.json({ error: "no-warehouse-available" }, { status: 400 })
  }

  // 1) Get all products
  const products = await db.product.findMany({
    select: { id: true, name: true, barcode: true, quantity: true },
    orderBy: { name: "asc" },
  })

  // 2) Get all POSTED purchase invoice items (adds stock)
  const piItems = await db.purchaseInvoiceItem.findMany({
    where: { purchaseInvoice: { status: "POSTED" } },
    select: { productId: true, quantity: true },
  })
  const piByProduct = new Map<string, number>()
  for (const it of piItems) {
    piByProduct.set(it.productId, (piByProduct.get(it.productId) || 0) + it.quantity)
  }

  // 2b) Get all RECEIVED purchase order items (also adds stock — the old
  //     'Confirm Receipt' button marked POs as RECEIVED and incremented
  //     stock inside a $transaction that may have failed on PgBouncer.
  //     We count these as stock additions.)
  const poItems = await db.purchaseOrderItem.findMany({
    where: { purchaseOrder: { status: "RECEIVED" } },
    select: { productId: true, quantity: true, returnedQty: true },
  })
  for (const it of poItems) {
    const net = it.quantity - (it.returnedQty || 0)
    piByProduct.set(it.productId, (piByProduct.get(it.productId) || 0) + net)
  }

  // 3) Get all purchase return items (removes stock)
  const prItems = await db.purchaseReturnItem.findMany({
    select: { productId: true, quantity: true },
  })
  const prByProduct = new Map<string, number>()
  for (const it of prItems) {
    prByProduct.set(it.productId, (prByProduct.get(it.productId) || 0) + it.quantity)
  }

  // 4) Get all COMPLETED sale items (removes stock, net of returns)
  const siItems = await db.saleItem.findMany({
    where: { sale: { status: "COMPLETED" } },
    select: { productId: true, quantity: true, returnedQty: true },
  })
  const siByProduct = new Map<string, number>()
  for (const it of siItems) {
    const net = it.quantity - (it.returnedQty || 0)
    siByProduct.set(it.productId, (siByProduct.get(it.productId) || 0) + net)
  }

  // 5) Get all stock transfer items (OUT only — RECEIVED transfers added
  //    to the destination warehouse's StockItem already, but OUT transfers
  //    were already deducted from source. We don't rebuild transfers —
  //    they're already reflected in StockItem.)
  //    Skip for now — transfers are complex (source vs destination).

  // 6) Get current StockItem for each product (in the default warehouse)
  const stockItems = await db.stockItem.findMany({
    where: { warehouseId },
    select: { productId: true, quantity: true },
  })
  const stockByProduct = new Map<string, number>()
  for (const si of stockItems) {
    stockByProduct.set(si.productId, si.quantity)
  }

  // 7) Compute expected stock per product
  const corrections: Array<{
    productId: string
    productName: string
    barcode: string | null
    currentStockItem: number
    currentProductQty: number
    expectedFromHistory: number
    purchased: number
    purchaseReturned: number
    sold: number
    action: "create" | "update" | "skip"
  }> = []

  let fixed = 0
  let skipped = 0

  for (const p of products) {
    const purchased = piByProduct.get(p.id) || 0
    const purchaseReturned = prByProduct.get(p.id) || 0
    const sold = siByProduct.get(p.id) || 0
    const expected = purchased - purchaseReturned - sold
    const currentSI = stockByProduct.get(p.id) || 0

    if (expected < 0) {
      // Negative expected — more sold than purchased. Skip (data inconsistency).
      corrections.push({
        productId: p.id,
        productName: p.name,
        barcode: p.barcode,
        currentStockItem: currentSI,
        currentProductQty: p.quantity,
        expectedFromHistory: expected,
        purchased,
        purchaseReturned,
        sold,
        action: "skip",
      })
      skipped++
      continue
    }

    if (currentSI !== expected) {
      corrections.push({
        productId: p.id,
        productName: p.name,
        barcode: p.barcode,
        currentStockItem: currentSI,
        currentProductQty: p.quantity,
        expectedFromHistory: expected,
        purchased,
        purchaseReturned,
        sold,
        action: currentSI === 0 ? "create" : "update",
      })

      if (!dryRun) {
        // Upsert the StockItem with the correct quantity
        await db.stockItem.upsert({
          where: {
            productId_warehouseId: { productId: p.id, warehouseId },
          },
          update: { quantity: expected },
          create: { productId: p.id, warehouseId, quantity: expected },
        })
        // Update Product.quantity to match
        await db.product.update({
          where: { id: p.id },
          data: { quantity: expected },
        })
        fixed++
      }
    }
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    totalProducts: products.length,
    fixed: dryRun ? corrections.length : fixed,
    skipped,
    corrections: corrections.slice(0, 100), // first 100 for display
  })
}
