import { NextRequest, NextResponse } from "next/server"
import { db, incrementStockItem, updateProductQuantityFromStockItems, getDefaultWarehouseId } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { serializePurchaseOrder } from "@/lib/serialize"
import { createJournalEntry } from "@/lib/journal"
import { allocateLandedCost } from "@/lib/landed-cost"
import { logAuditEvent } from "@/lib/audit"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

function toNum(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.max(0, n) : null
}

/**
 * Mark a purchase order as RECEIVED:
 *  - bumps product inventory quantities,
 *  - refreshes each product's cost price (weighted average when there are
 *    landed-cost extra charges; otherwise the invoice unit cost),
 *  - persists the extra charges on the PO + flags `landedCostApplied`,
 *  - generates a double-entry journal (debit Inventory 1010, credit
 *    Accounts Payable 2010) so the accounting stays in sync.
 *
 * The body is optional. If `customsAmount` / `shippingAmount` /
 * `otherCharges` are provided, they override the saved values; otherwise
 * the PO's stored values are used (set at creation time by the dialog).
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
  const po = await db.purchaseOrder.findUnique({
    where: { id },
    include: { items: { include: { product: true } }, supplier: true },
  })
  if (!po) return NextResponse.json({ error: "not-found" }, { status: 404 })
  if (po.status === "RECEIVED") {
    return NextResponse.json({ error: "already-received" }, { status: 409 })
  }

  // Parse the optional body. The legacy client calls this endpoint with
  // no body at all, so we tolerate empty/invalid JSON gracefully.
  let body: any = {}
  try {
    const text = await req.text()
    if (text && text.trim().length > 0) {
      body = JSON.parse(text)
    }
  } catch {
    body = {}
  }

  // Resolve the final extra charges: explicit body overrides win, else
  // fall back to the values already saved on the PO.
  const customs =
    toNum(body.customsAmount) ?? Number(po.customsAmount ?? 0) ?? 0
  const shipping =
    toNum(body.shippingAmount) ?? Number(po.shippingAmount ?? 0) ?? 0
  const other =
    toNum(body.otherCharges) ?? Number(po.otherCharges ?? 0) ?? 0
  const extraTotal = customs + shipping + other

  // Snapshot the current cost prices + on-hand quantities BEFORE the
  // receipt (needed for the weighted-average computation). We re-read
  // from the DB rather than trust the include above in case the data
  // changed between the page load and the receive click.
  const productIds = po.items.map((it) => it.productId)
  const currentProducts = productIds.length
    ? await db.product.findMany({ where: { id: { in: productIds } } })
    : []

  // Compute landed-cost allocations (per unit + new weighted-average
  // cost price). When `extraTotal` is 0 the helper still returns a
  // sensible per-item newCostPrice (blending on-hand with the incoming
  // invoice unit cost), which we honour only when landed cost applies.
  const allocations = allocateLandedCost(
    po.items.map((it) => ({
      productId: it.productId,
      quantity: Number(it.quantity),
      unitCost: Number(it.unitCost),
      subtotal: Number(it.subtotal),
    })),
    { customs, shipping, other },
    currentProducts.map((p) => ({
      id: p.id,
      costPrice: Number(p.costPrice),
      quantity: Number(p.quantity),
    }))
  )
  const allocByProduct = new Map(allocations.map((a) => [a.productId, a]))

  const landedCostApplies = !po.landedCostApplied && extraTotal > 0

  // Atomic: update PO (status + extra charges + landedCostApplied) +
  // bump inventory + refresh cost price + apply any suggested sale price
  // via the pricing engine (writes a PriceChange audit row + updates the
  // product's salePrice).
  const updated = await db.$transaction(async (tx) => {
    // Resolve the destination warehouse for received stock. Prefer the PO's
    // warehouseId; fall back to the default active warehouse if missing.
    let warehouseId: string | undefined = po.warehouseId ?? undefined
    if (!warehouseId) {
      warehouseId = (await getDefaultWarehouseId(tx)) || undefined
    }
    if (!warehouseId) {
      throw new Error("no-warehouse-available")
    }

    for (const it of po.items) {
      const alloc = allocByProduct.get(it.productId)
      // Decide the new cost price to write back:
      //  - landed cost applies → weighted average (from allocator)
      //  - otherwise → keep the legacy behaviour (invoice unit cost)
      const newCostPrice = landedCostApplies
        ? alloc
          ? alloc.newCostPrice
          : Number(it.unitCost)
        : Number(it.unitCost)
      // Apply suggested sale price via the pricing engine: if the PO item
      // has a suggested sale price > 0 AND it differs from the product's
      // current salePrice, write a PriceChange audit row + update the
      // product's salePrice. The cost price is also updated alongside.
      const suggested = Number(it.suggestedSalePrice ?? 0)
      const productSnapshot = currentProducts.find((p) => p.id === it.productId)
      const currentSalePrice = Number(productSnapshot?.salePrice ?? 0)
      const shouldApplySuggested =
        suggested > 0 && Math.abs(suggested - currentSalePrice) > 0.0001

      // Increment the StockItem (upsert creates the row if missing) and
      // keep Product.quantity in sync as the derived aggregate.
      // Note: no SELECT FOR UPDATE — it's incompatible with pgbouncer
      // transaction mode on Supabase. Prisma's $transaction provides
      // sufficient isolation, and upsert/decrement are atomic.
      await incrementStockItem(tx, it.productId, warehouseId, Number(it.quantity))
      // Product.quantity sync is deferred to post-commit (see below).

      if (shouldApplySuggested) {
        await tx.priceChange.create({
          data: {
            productId: it.productId,
            priceType: "RETAIL",
            oldPrice: currentSalePrice,
            newPrice: suggested,
            changedById: user.id,
            note: `تطبيق سعر البيع المقترح من أمر الشراء ${po.id.slice(-6)}`,
          },
        })
        await tx.product.update({
          where: { id: it.productId },
          data: {
            costPrice: newCostPrice,
            salePrice: suggested,
          },
        })
      } else {
        await tx.product.update({
          where: { id: it.productId },
          data: {
            costPrice: newCostPrice,
          },
        })
      }
    }
    // Compute VAT at receive time: sum(item.subtotal × PO taxRate/100).
    // The taxRate is set on the PO at creation time (default 0).
    // receivedTaxAmount is stored on the PO so the VAT report can include
    // it even when no PurchaseInvoice is posted.
    const poTaxRate = Number(po.taxRate || 0)
    const receivedTaxAmount = po.items.reduce(
      (sum, it) => sum + (Number(it.subtotal) * poTaxRate / 100),
      0
    )

    const result = await tx.purchaseOrder.update({
      where: { id },
      data: {
        status: "RECEIVED",
        customsAmount: customs,
        shippingAmount: shipping,
        otherCharges: other,
        landedCostApplied: po.landedCostApplied || landedCostApplies,
        receivedTaxAmount: +receivedTaxAmount.toFixed(3),
      },
      include: { supplier: true, items: { include: { product: true } } },
    })

    // ── Journal entry (inside tx — atomic) ──
    // If the journal entry fails, the entire receive rolls back.
    try {
      await createJournalEntry({
        sourceType: "PURCHASE",
        sourceId: po.id,
        description: `قيد استلام أمر شراء ${po.id.slice(-6)} — ${po.supplier?.name ?? ""}`,
        date: new Date(),
        lines: [
          // Debit Inventory (asset increases) — use Cash 1010 as the inventory
          // account proxy (in a full COA you'd have a dedicated Inventory sub-account)
          { accountCode: "1010", debit: +po.total.toFixed(3), description: "إضافة مخزون مشتريات" },
          // Credit Accounts Payable (liability increases)
          { accountCode: "2010", credit: +po.total.toFixed(3), description: `ذمم دائنة — ${po.supplier?.name ?? ""}` },
        ],
        tx,
      })
    } catch (e: any) {
      throw new Error(`فشل تسجيل القيد المحاسبي / Journal entry failed: ${e?.message ?? e}`)
    }

    // ── Audit log (inside tx — atomic) ──
    await logAuditEvent({
      tx,
      userId: user.id,
      userName: user.name,
      action: "PO_RECEIVED",
      description: `استلام أمر شراء ${po.id.slice(-6)}`,
    })

    return result
  }, {
    timeout: 10000,
    maxWait: 5000,
  }).catch((e: any) => ({ __error: e?.message || "purchase-receive-failed" }))

  // Post-commit: sync Product.quantity OUTSIDE the transaction.
  if (updated && !(updated as any).__error) {
    try {
      const pids = Array.from(new Set(po.items.map((it: any) => it.productId)))
      for (const pid of pids) {
        await updateProductQuantityFromStockItems(db, pid)
      }
    } catch {
      // Non-fatal: PO is received, StockItem is correct.
    }
  }

  if (updated && (updated as any).__error) {
    const msg = (updated as any).__error as string
    const isClientError =
      msg.startsWith("already-received") ||
      msg.startsWith("no-warehouse-available")
    return NextResponse.json({ error: msg }, { status: isClientError ? 400 : 500 })
  }

  return NextResponse.json(serializePurchaseOrder(updated as any))
}
