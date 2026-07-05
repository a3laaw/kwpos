import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { serializeExchange } from "@/lib/serialize"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

const MAX_EXCHANGE_DAYS = 14

/**
 * Exchange / Swap workflow (anti-fraud lockdown).
 *
 * GET  /api/exchanges          — list all exchanges (newest first)
 * POST /api/exchanges          — create a new exchange transaction
 *
 * ANTI-FRAUD RULES (enforced server-side, mirrored in the UI):
 *
 *  1. `originalSaleId` is REQUIRED. POSTs without it are rejected with
 *     400 `original-invoice-required`. There is no free entry — every
 *     exchange MUST reference an existing sale.
 *
 *  2. The original sale must exist (404 `original-not-found`) and must
 *     be ≤ 14 days old (409 `invoice-too-old` with the sale date).
 *
 *  3. RETURN lines (isReturn=true, quantity < 0):
 *       - The `productId` MUST appear on the original sale. Otherwise
 *         409 `product-not-in-invoice` (with productId).
 *       - The total returned quantity for that product across this
 *         exchange must not exceed `saleItem.quantity - saleItem.returnedQty`.
 *         Otherwise 409 `return-exceeds-remaining` (with product name +
 *         remaining + requested).
 *       - On success, the matching `SaleItem.returnedQty` is incremented
 *         inside the same transaction so future exchanges/refunds see
 *         the reduced remaining.
 *
 *  4. NEW lines (isReturn=false, quantity > 0): existing stock validation
 *     — `stock-insufficient:{name}:{qty}` if not enough.
 *
 * Stock side-effects (unchanged):
 *   - RETURN lines restock the product (increment).
 *   - NEW lines deplete the product (decrement, with validation).
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const items = await db.exchangeSale.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true, lines: { include: { product: true } } },
    take: 200,
  })

  return NextResponse.json({ items: items.map(serializeExchange) })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  // Admin & Sales can create exchanges; Warehouse cannot
  if (!hasRole(user.role, ["ADMIN", "SALES" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  // Defensive session check — the JWT may hold a stale user id after a re-seed.
  const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { id: true } })
  if (!dbUser) {
    return NextResponse.json({ error: "session-expired" }, { status: 401 })
  }

  const body = await req.json()
  const {
    originalSaleId,
    customerName,
    customerPhone,
    paymentMethod,
    note,
    lines,
  } = body || {}

  // ── 1. originalSaleId is REQUIRED ──
  if (!originalSaleId || typeof originalSaleId !== "string") {
    return NextResponse.json(
      { error: "original-invoice-required" },
      { status: 400 }
    )
  }

  if (!Array.isArray(lines) || lines.length === 0) {
    return NextResponse.json({ error: "lines-required" }, { status: 400 })
  }

  // Per-line shape validation (before opening a transaction).
  for (const ln of lines) {
    const qty = Number(ln.quantity)
    const isReturn = !!ln.isReturn
    if (!ln.productId || !Number.isFinite(qty) || qty === 0) {
      return NextResponse.json({ error: "invalid-line" }, { status: 400 })
    }
    if (isReturn && qty > 0) {
      return NextResponse.json({ error: "return-must-be-negative" }, { status: 400 })
    }
    if (!isReturn && qty < 0) {
      return NextResponse.json({ error: "new-must-be-positive" }, { status: 400 })
    }
    const up = Number(ln.unitPrice)
    if (Number.isFinite(up) && up < 0) {
      return NextResponse.json({ error: "invalid-price" }, { status: 400 })
    }
  }

  // ── 2. Load the original sale (with items + products) ──
  const originalSale = await db.sale.findUnique({
    where: { id: originalSaleId },
    include: { items: { include: { product: true } } },
  })
  if (!originalSale) {
    return NextResponse.json(
      { error: "original-not-found" },
      { status: 404 }
    )
  }

  // ── 3. 14-day rule ──
  const createdAt = new Date(originalSale.createdAt)
  const daysOld = Math.floor(
    (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysOld > MAX_EXCHANGE_DAYS) {
    return NextResponse.json(
      {
        error: "invoice-too-old",
        saleDate: createdAt.toISOString(),
        daysOld,
        maxDays: MAX_EXCHANGE_DAYS,
      },
      { status: 409 }
    )
  }

  // ── 4. Validate RETURN lines against the original invoice ──
  // Build a lookup of { productId → saleItem } for the original sale.
  const saleItemByProductId = new Map<string, (typeof originalSale.items)[number]>()
  for (const si of originalSale.items) {
    // If the same product appears on multiple lines, merge them by summing
    // quantity + returnedQty so the remaining-qty check reflects the whole
    // invoice, not a single line.
    const existing = saleItemByProductId.get(si.productId)
    if (existing) {
      // Same product on multiple sale lines — combine into the first entry.
      // We can't actually mutate the SaleItem row (it has its own id), so we
      // track an array of affected saleItemIds + a combined remaining budget.
      ;(existing as any).__extraIds = (existing as any).__extraIds || []
      ;(existing as any).__extraIds.push(si.id)
      ;(existing as any).__combinedQuantity =
        ((existing as any).__combinedQuantity ?? existing.quantity) + si.quantity
      ;(existing as any).__combinedReturned =
        ((existing as any).__combinedReturned ?? existing.returnedQty) + si.returnedQty
    } else {
      saleItemByProductId.set(si.productId, si)
    }
  }

  // Aggregate requested return quantities per productId (across this exchange).
  const requestedReturnByProduct = new Map<string, number>()
  for (const ln of lines) {
    if (!ln.isReturn) continue
    const qty = Math.abs(Number(ln.quantity))
    const prev = requestedReturnByProduct.get(String(ln.productId)) ?? 0
    requestedReturnByProduct.set(String(ln.productId), prev + qty)
  }

  // Validate each requested return product against the original sale.
  for (const [productId, requestedQty] of requestedReturnByProduct) {
    const si = saleItemByProductId.get(productId)
    if (!si) {
      return NextResponse.json(
        { error: "product-not-in-invoice", productId },
        { status: 409 }
      )
    }
    const originalQty =
      (si as any).__combinedQuantity ?? Number(si.quantity ?? 0)
    const alreadyReturned =
      (si as any).__combinedReturned ?? Number(si.returnedQty ?? 0)
    const remaining = Math.max(0, originalQty - alreadyReturned)
    if (requestedQty > remaining) {
      return NextResponse.json(
        {
          error: "return-exceeds-remaining",
          productName: si.product?.name ?? "—",
          remaining,
          requested: requestedQty,
        },
        { status: 409 }
      )
    }
  }

  const PAY = ["CASH", "CARD", "TRANSFER"].includes(paymentMethod) ? paymentMethod : "CASH"

  // ── 5. Run creation + stock mutation + returnedQty increment atomically ──
  const result = await db.$transaction(async (tx) => {
    // Generate the next exchangeNo (EXC-00001, EXC-00002, ...).
    const count = await tx.exchangeSale.count()
    const exchangeNo = `EXC-${String(count + 1).padStart(5, "0")}`

    // Resolve each line's product, mutate inventory, build the line payload,
    // and (for returns) increment the matching SaleItem.returnedQty.
    const linesData: Array<{
      productId: string
      productName: string
      quantity: number
      unitPrice: number
      lineTotal: number
      isReturn: boolean
    }> = []

    // Track per-saleItemId increments (in case the same sale item is touched
    // by multiple return lines — unlikely but possible if the UI sent them).
    const returnedQtyBySaleItemId = new Map<string, number>()

    for (const ln of lines) {
      const productId = String(ln.productId)
      const qty = Number(ln.quantity)
      const unitPrice = Number(ln.unitPrice) || 0
      const isReturn = !!ln.isReturn

      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true, quantity: true },
      })
      if (!product) throw new Error("product-not-found:" + productId)

      if (isReturn) {
        // Restock — increment product.quantity by |qty|
        await tx.product.update({
          where: { id: productId },
          data: { quantity: { increment: Math.abs(qty) } },
        })

        // Increment the matching SaleItem.returnedQty.
        const si = saleItemByProductId.get(productId)
        if (si) {
          // Distribute the returned units across the original sale items
          // (in case the same product appears on multiple sale lines).
          let unitsToDistribute = Math.abs(qty)
          const targetIds: string[] = [si.id, ...(((si as any).__extraIds as string[]) || [])]
          for (const targetId of targetIds) {
            if (unitsToDistribute <= 0) break
            // Look up the original sale item to find its per-line remaining.
            const origLine = originalSale.items.find((x) => x.id === targetId)
            if (!origLine) continue
            const lineRemaining = Math.max(
              0,
              Number(origLine.quantity ?? 0) - Number(origLine.returnedQty ?? 0)
            )
            const applied = Math.min(unitsToDistribute, lineRemaining)
            if (applied <= 0) continue
            const prev = returnedQtyBySaleItemId.get(targetId) ?? 0
            returnedQtyBySaleItemId.set(targetId, prev + applied)
            unitsToDistribute -= applied
          }
          // Fallback: if for any reason we still have units to distribute
          // (e.g. remaining budgets were already consumed by a previous
          // exchange), apply them all to the primary sale item id.
          if (unitsToDistribute > 0) {
            const prev = returnedQtyBySaleItemId.get(si.id) ?? 0
            returnedQtyBySaleItemId.set(si.id, prev + unitsToDistribute)
          }
        }
      } else {
        // Validate stock before depleting
        if (product.quantity < qty) {
          throw new Error(`stock-insufficient:${product.name}:${product.quantity}`)
        }
        await tx.product.update({
          where: { id: productId },
          data: { quantity: { decrement: qty } },
        })
      }

      linesData.push({
        productId,
        productName: product.name,
        quantity: qty,
        unitPrice,
        lineTotal: +(qty * unitPrice).toFixed(3),
        isReturn,
      })
    }

    // Apply the per-sale-item returnedQty increments.
    for (const [saleItemId, inc] of returnedQtyBySaleItemId) {
      if (inc <= 0) continue
      // Use a guarded increment so we never push returnedQty above quantity.
      // (The validation above already guarantees this, but the clamp is a
      // final safety net.)
      const origLine = originalSale.items.find((x) => x.id === saleItemId)
      if (!origLine) continue
      const currentReturned = Number(origLine.returnedQty ?? 0)
      const maxAllowed = Number(origLine.quantity ?? 0)
      const newReturned = Math.min(maxAllowed, currentReturned + inc)
      await tx.saleItem.update({
        where: { id: saleItemId },
        data: { returnedQty: newReturned },
      })
    }

    // Aggregate totals (signed). itemCount = sum of |qty| across all lines.
    const itemCount = linesData.reduce((s, l) => s + Math.abs(l.quantity), 0)
    const netAmount = +linesData.reduce((s, l) => s + l.lineTotal, 0).toFixed(3)

    const created = await tx.exchangeSale.create({
      data: {
        exchangeNo,
        originalSaleId,
        customerName: customerName?.trim() || originalSale.customerName || null,
        customerPhone: customerPhone?.trim() || originalSale.customerPhone || null,
        netAmount,
        paymentMethod: PAY,
        itemCount,
        note: note?.trim() || null,
        userId: user.id,
        lines: { create: linesData },
      },
      include: { user: true, lines: { include: { product: true } } },
    })

    return created
  }).catch((e: any) => ({ __error: e?.message || "exchange-failed" }))

  if (result && (result as any).__error) {
    const msg = (result as any).__error as string
    // Classify the thrown error so the client gets the right HTTP status.
    const isClientError =
      msg.startsWith("stock-insufficient") ||
      msg.startsWith("product-not-found") ||
      msg.startsWith("invalid") ||
      msg.startsWith("return-") ||
      msg.startsWith("new-")
    return NextResponse.json({ error: msg }, { status: isClientError ? 400 : 500 })
  }

  return NextResponse.json(serializeExchange(result as any), { status: 201 })
}
