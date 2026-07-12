import { NextRequest, NextResponse } from "next/server"
import { db, incrementStockItem, updateProductQuantityFromStockItems } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { serializeSale } from "@/lib/serialize"
import { createJournalEntry } from "@/lib/journal"
import { logAuditEvent } from "@/lib/audit"

export const dynamic = "force-dynamic"

const MAX_REFUND_DAYS = 14

/** Ensure a system account exists, create it if missing. */
async function ensureAccount(code: string, name: string, type: string, tx?: any) {
  const client = tx || db
  let acc = await client.account.findUnique({ where: { code } })
  if (!acc) {
    acc = await client.account.create({ data: { code, name, type, isSystem: true } })
  }
  return acc
}

/**
 * Partial refund (return) — admin only.
 *
 * Body: { items: [{ saleItemId, returnedQty }], override14Days?: boolean }
 *
 * Workflow:
 *  1. Validate 14-day rule (unless admin override).
 *  2. Validate returnedQty per line (≤ original − already returned).
 *  3. Restore inventory (returnedQty per product).
 *  4. Update SaleItem.returnedQty + Sale.refundTotal + Sale.refundStatus.
 *  5. Create journal entries:
 *     - Financial: Debit Sales Returns (4030) + Debit VAT (2010) → Credit payment account.
 *     - Inventory: Debit Inventory (1010) → Credit COGS (5060).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const returnItems: Array<{ saleItemId: string; returnedQty: number }> = body.items || []
  const override14Days = body.override14Days === true

  if (!Array.isArray(returnItems) || returnItems.length === 0) {
    return NextResponse.json({ error: "no-items" }, { status: 400 })
  }

  // Load the sale with items + products
  const sale = await db.sale.findUnique({
    where: { id },
    include: { items: { include: { product: true } }, user: true },
  })
  if (!sale) return NextResponse.json({ error: "not-found" }, { status: 404 })

  // ── 14-day rule ──
  const daysSinceSale = Math.floor((Date.now() - new Date(sale.createdAt).getTime()) / (1000 * 60 * 60 * 24))
  if (daysSinceSale > MAX_REFUND_DAYS && !override14Days) {
    return NextResponse.json(
      { error: "past-14-days", daysSinceSale },
      { status: 403 }
    )
  }

  // ── Validate + compute refund amounts ──
  let refundSubtotal = 0
  let refundTax = 0
  let refundTotal = 0
  const updates: Array<{ saleItemId: string; newReturnedQty: number; productId: string; qtyToReturn: number; unitCost: number }> = []

  for (const ri of returnItems) {
    const si = sale.items.find((s) => s.id === ri.saleItemId)
    if (!si) return NextResponse.json({ error: `item-not-found:${ri.saleItemId}` }, { status: 400 })

    const alreadyReturned = si.returnedQty || 0
    const returnable = si.quantity - alreadyReturned
    const qtyToReturn = Number(ri.returnedQty) || 0

    if (qtyToReturn <= 0) continue
    if (qtyToReturn > returnable) {
      return NextResponse.json(
        { error: `exceeds-returnable:${si.product?.name || ""}:${returnable}` },
        { status: 400 }
      )
    }

    const lineRefund = qtyToReturn * si.unitPrice
    refundSubtotal += lineRefund
    updates.push({
      saleItemId: si.id,
      newReturnedQty: alreadyReturned + qtyToReturn,
      productId: si.productId,
      qtyToReturn,
      unitCost: Number(si.product?.costPrice ?? 0),
    })
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "no-valid-returns" }, { status: 400 })
  }

  // Proportional tax
  refundTax = sale.taxRate > 0 ? +(refundSubtotal * (sale.taxRate / 100)).toFixed(3) : 0
  refundTotal = +(refundSubtotal + refundTax).toFixed(3)
  const refundCost = updates.reduce((s, u) => s + u.qtyToReturn * u.unitCost, 0)

  // ── Transaction: update inventory + sale items + sale + journal entries ──
  const paymentAccCode = sale.paymentMethod === "CASH" ? "1010" : "1020"
  // Resolve warehouseId BEFORE the transaction (user's warehouse first).
  // This is used to restock returned items to the user's assigned warehouse.
  const userWarehouseId = (user as any).warehouseId as string | undefined
  let resolvedWarehouseId: string | undefined = userWarehouseId
  if (!resolvedWarehouseId) {
    const defaultWh = await db.warehouse.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    })
    resolvedWarehouseId = defaultWh?.id
  }
  if (!resolvedWarehouseId) {
    return NextResponse.json({ error: "no-warehouse-available" }, { status: 400 })
  }
  const warehouseId = resolvedWarehouseId

  const updated = await db.$transaction(async (tx) => {
    // Restore inventory — restock the matching StockItem for this warehouse
    // and keep Product.quantity in sync as the derived aggregate.
    for (const u of updates) {
      await incrementStockItem(tx, u.productId, warehouseId, u.qtyToReturn)
      await updateProductQuantityFromStockItems(tx, u.productId)
      await tx.saleItem.update({
        where: { id: u.saleItemId },
        data: { returnedQty: u.newReturnedQty },
      })
    }

    // Determine refund status
    const allReturned = sale.items.every((si) => (si.returnedQty || 0) + (updates.find(u => u.saleItemId === si.id)?.qtyToReturn || 0) >= si.quantity)
    const newRefundTotal = Number(sale.refundTotal || 0) + refundTotal
    const newRefundStatus = allReturned ? "FULL" : "PARTIAL"

    const result = await tx.sale.update({
      where: { id },
      data: {
        refundTotal: newRefundTotal,
        refundStatus: newRefundStatus,
      },
      include: { user: true, items: { include: { product: true } } },
    })

    // ── Journal entries (inside tx — atomic) ──
    // If either journal entry fails, the entire refund rolls back.
    try {
      // Ensure accounts exist (use tx so it's part of the same atomic unit)
      await ensureAccount("4030", "مردودات المبيعات", "REVENUE", tx)
      await ensureAccount("5060", "تكلفة البضاعة المباعة", "EXPENSE", tx)

      // 1. Financial entry: Debit Sales Returns + Debit VAT → Credit payment
      const finLines: any[] = [
        { accountCode: "4030", debit: +refundSubtotal.toFixed(3), description: `مردودات مبيعات — ${sale.invoiceNo}` },
      ]
      if (refundTax > 0) {
        finLines.push({ accountCode: "2010", debit: refundTax, description: "ضريبة مستحقة (مرتجع)" })
      }
      finLines.push({ accountCode: paymentAccCode, credit: +refundTotal.toFixed(3), description: `رد لطريقة السداد — ${sale.invoiceNo}` })

      await createJournalEntry({
        sourceType: "MANUAL",
        sourceId: sale.id,
        description: `قيد مرتجع مبيعات ${sale.invoiceNo} (مالي)`,
        date: new Date(),
        lines: finLines,
        tx,
      })

      // 2. Inventory entry: Debit Inventory (cost) → Credit COGS
      if (refundCost > 0) {
        await createJournalEntry({
          sourceType: "MANUAL",
          sourceId: sale.id,
          description: `قيد مرتجع مخزون ${sale.invoiceNo} (مخزني)`,
          date: new Date(),
          lines: [
            { accountCode: "1010", debit: +refundCost.toFixed(3), description: "إعادة مخزون مرتجع" },
            { accountCode: "5060", credit: +refundCost.toFixed(3), description: "عكس تكلفة البضاعة المباعة" },
          ],
          tx,
        })
      }
    } catch (e: any) {
      throw new Error(`فشل تسجيل القيد المحاسبي / Journal entry failed: ${e?.message ?? e}`)
    }

    // ── Audit log (inside tx — atomic) ──
    await logAuditEvent({
      tx,
      userId: user.id,
      userName: user.name,
      action: "SALE_REFUNDED",
      description: `مرتجع للفاتورة ${sale.invoiceNo}`,
      saleId: sale.id,
    })

    return result
  }, {
    timeout: 10000,
    maxWait: 5000,
  }).catch((e: any) => ({ __error: e?.message || "refund-failed" }))

  if (updated && (updated as any).__error) {
    const msg = (updated as any).__error as string
    const isClientError =
      msg.startsWith("item-not-found") ||
      msg.startsWith("exceeds-returnable") ||
      msg.startsWith("no-warehouse-available")
    return NextResponse.json({ error: msg }, { status: isClientError ? 400 : 500 })
  }

  return NextResponse.json({
    ...serializeSale(updated as any),
    refundSummary: {
      refundSubtotal: +refundSubtotal.toFixed(3),
      refundTax,
      refundTotal,
      refundCost: +refundCost.toFixed(3),
      creditNoteNo: `CN-${sale.invoiceNo}`,
    },
  })
}
