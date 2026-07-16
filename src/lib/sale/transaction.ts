import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { serializeSale } from "@/lib/serialize"
import { makeInvoiceNo } from "@/lib/format"
import { coercePaymentMethod } from "@/lib/coercions"
import { createJournalEntry } from "@/lib/journal"
import { logAuditEvent } from "@/lib/audit"
import { ensurePurchaseAccounts } from "@/lib/purchase"
import { itemsForDb, type SaleItemDataWithTax, type SaleTotals } from "./totals"
import type { DecrementStep } from "./decrement-planner"

export interface ExecuteSaleParams {
  decrementPlan: Map<string, DecrementStep[]>
  itemsData: SaleItemDataWithTax[]
  totals: SaleTotals
  userId: string
  userName?: string | null
  warehouseId: string
  customerId: string | undefined
  customerPhone: string
  resolvedName: string | null
  cartTax: number
  paymentMethod: unknown
  discount: number
  deliveryFee: number
  driverName: string | null
  qtyByProduct: Map<string, number>
}

export type ExecuteSaleResult =
  | { ok: false; error: string; status: number }
  | { ok: true; sale: any }

/**
 * Execute the core sale WITHOUT Prisma's `$transaction` (interactive
 * transaction). This is the ROOT FIX for the "Transaction not found"
 * error on Vercel + Supabase.
 *
 * WHY NO $transaction:
 *   Prisma interactive transactions hold a single database connection
 *   open for the entire transaction. On Supabase's PgBouncer pooler
 *   (both transaction-mode AND session-mode), the pooler can reassign
 *   or close that connection mid-transaction — especially when the
 *   transaction has 40+ queries (one per cart item). When the connection
 *   closes, Prisma throws "Transaction not found" on the next query.
 *
 *   This is a KNOWN incompatibility between Prisma interactive
 *   transactions and PgBouncer. The only reliable fix is to NOT use
 *   $transaction when behind PgBouncer.
 *
 * ATOMICITY WITHOUT $transaction:
 *   Each StockItem decrement uses `updateMany` with a `gte` check, which
 *   is atomic at the database level (single SQL statement). If any item
 *   is out of stock, that update affects 0 rows and we throw before
 *   creating the sale.
 *
 *   If the sale.create() FAILS after some stock was already decremented,
 *   we COMPENSATE by re-incrementing the decremented items. This is the
 *   "saga pattern" — each step has a compensating action.
 *
 *   JournalEntry + AuditLog run post-sale (non-fatal). If they fail,
 *   the sale is still committed and logged for manual reconciliation.
 */
export async function executeSaleTransaction(
  params: ExecuteSaleParams
): Promise<ExecuteSaleResult> {
  const paymentAccCode = params.paymentMethod === "CASH" ? "1010" : "1020"

  // Track which items we've decremented so we can compensate on failure.
  const decremented: Array<{ productId: string; warehouseId: string; qty: number }> = []

  try {
    // 1) Generate invoice number (atomic via PostgreSQL sequence)
    let invoiceNo: string
    const isPostgres = !process.env.DATABASE_URL?.startsWith("file:")
    if (isPostgres) {
      const seqResult = await db.$queryRaw`SELECT nextval('sale_invoice_seq') as seq`
      const seq = Number((seqResult as any[])[0]?.seq ?? 1)
      invoiceNo = makeInvoiceNo(seq)
    } else {
      const count = await db.sale.count()
      invoiceNo = makeInvoiceNo(count + 1)
    }

    // 2) Decrement StockItem — BATCH MODE: all items in ONE SQL query.
    //    This replaces 40+ sequential queries with a single UPDATE...
    //    FROM (VALUES ...) statement. On high-latency connections
    //    (Vercel ↔ Supabase), this saves ~200ms × 40 = 8 seconds.
    //
    //    The `gte` check is built into the WHERE clause: rows with
    //    insufficient stock simply don't match (0 rows for that item).
    //    We compare the RETURNING set to the input set to detect
    //    insufficient stock, then compensate + throw if needed.
    const allSteps: Array<{ pid: string; wid: string; qty: number }> = []
    for (const [pid, stepList] of params.decrementPlan) {
      for (const step of stepList) {
        allSteps.push({ pid, wid: step.warehouseId, qty: step.qty })
      }
    }

    if (allSteps.length > 0) {
      // Build parameterized SQL: UPDATE ... FROM (VALUES ($1,$2,$3), ($4,$5,$6), ...)
      const placeholders = allSteps
        .map((_, i) => `($${i * 3 + 1}::text, $${i * 3 + 2}::text, $${i * 3 + 3}::int)`)
        .join(", ")
      const sqlParams = allSteps.flatMap((s) => [s.pid, s.wid, s.qty])

      const batchResult = await db.$queryRawUnsafe(
        `
        UPDATE "StockItem"
        SET quantity = "StockItem".quantity - v.qty
        FROM (VALUES ${placeholders}) AS v(pid, wid, qty)
        WHERE "StockItem"."productId" = v.pid
          AND "StockItem"."warehouseId" = v.wid
          AND "StockItem".quantity >= v.qty
        RETURNING "StockItem"."productId" AS pid, "StockItem"."warehouseId" AS wid
        `,
        ...sqlParams
      ) as Array<{ pid: string; wid: string }>

      // Check which steps succeeded (returned) vs failed (out of stock)
      const succeededKeys = new Set(batchResult.map((r) => `${r.pid}::${r.wid}`))
      const failedSteps = allSteps.filter((s) => !succeededKeys.has(`${s.pid}::${s.wid}`))

      if (failedSteps.length > 0) {
        // Some items were out of stock. Compensate: re-increment the items
        // that WERE decremented (the succeeded ones).
        const succeededSteps = allSteps.filter((s) => succeededKeys.has(`${s.pid}::${s.wid}`))
        for (const s of succeededSteps) {
          try {
            await db.stockItem.update({
              where: { productId_warehouseId: { productId: s.pid, warehouseId: s.wid } },
              data: { quantity: { increment: s.qty } },
            })
          } catch (compErr: any) {
            console.error(
              `[sale] COMPENSATION FAILED for ${s.pid}/${s.wid}: ${compErr?.message ?? compErr}`
            )
          }
        }
        throw new Error(`stock-insufficient:concurrent:${failedSteps[0].pid}`)
      }

      // All succeeded — track for compensation if sale.create fails later
      for (const s of allSteps) {
        decremented.push({ productId: s.pid, warehouseId: s.wid, qty: s.qty })
      }
    }

    // 3) Create the sale + items (single nested query — atomic by itself)
    const sale = await db.sale.create({
      data: {
        invoiceNo,
        customerName: params.resolvedName,
        customerPhone: params.customerPhone || null,
        customerId: params.customerId || null,
        subtotal: params.totals.subtotal,
        taxRate: params.totals.usedPerProductTax ? 0 : params.cartTax,
        taxAmount: params.totals.taxAmount,
        discount: params.discount,
        deliveryFee: params.deliveryFee,
        driverName: params.driverName,
        total: params.totals.total,
        paid: params.totals.total,
        paymentMethod: coercePaymentMethod(params.paymentMethod),
        userId: params.userId,
        items: { create: itemsForDb(params.itemsData) },
      },
      include: { user: true, items: { include: { product: true } } },
    })

    // ── POST-SALE SIDE EFFECTS ─────────────────────────────────────────
    // These run AFTER the sale is committed. They are NON-BLOCKING — we
    // fire them off WITHOUT awaiting, so the API response returns to the
    // cashier immediately. On Vercel serverless, the function may stay
    // alive briefly after the response to complete these. If it doesn't,
    // the gaps are logged.
    //
    // CRITICAL: the sale + stock decrement are ALREADY committed. These
    // side effects are for accounting/audit convenience only.

    const productIds = Array.from(params.qtyByProduct.keys())

    // 4) Sync Product.quantity — SINGLE SQL query (was 80 queries!)
    // UPDATE Product SET quantity = (SELECT SUM(StockItem.quantity) ...)
    // WHERE id IN (...)
    if (productIds.length > 0) {
      void (async () => {
        try {
          // Use Prisma.join for proper parameterization (prevents SQL injection).
          // Previously this used $executeRawUnsafe with manual string interpolation
          // of productIds (which originate from the user's cart). Even though the
          // ids were sanitized with a regex replace, that approach is fragile.
          // Prisma.join builds parameterized placeholders ($1, $2, ...) and
          // passes the values as real bound parameters.
          await db.$executeRaw`
            UPDATE "Product"
            SET quantity = COALESCE((
              SELECT SUM(quantity) FROM "StockItem"
              WHERE "StockItem"."productId" = "Product".id
            ), 0)
            WHERE id IN (${Prisma.join(productIds)})
          `
        } catch (e: any) {
          console.warn(
            `[sale] Product.quantity sync failed for sale ${invoiceNo}. ` +
            `StockItem is correct; Product.quantity will self-correct. ` +
            `Error: ${e?.message ?? e}`
          )
        }
      })()
    }

    // 5) Create JournalEntry (non-blocking, fire-and-forget)
    const revenueLines = [
      { accountCode: paymentAccCode, debit: params.totals.total, description: `تحصيل فاتورة ${invoiceNo}` },
      { accountCode: "4010", credit: params.totals.total - params.totals.taxAmount, description: "إيراد مبيعات" },
    ]
    if (params.totals.taxAmount > 0) {
      // Tax Payable (2110) — NOT Accounts Payable (2010). The tax collected
      // from customers is a liability owed to the tax authority, not to
      // suppliers. ensurePurchaseAccounts() created 2110 if missing.
      revenueLines.push({ accountCode: "2110", credit: params.totals.taxAmount, description: "ضريبة مستحقة" })
    }
    void (async () => {
      try {
        // Ensure Tax Payable (2110) account exists (for DBs seeded before it was added)
        await ensurePurchaseAccounts()
        await createJournalEntry({
          sourceType: "SALE",
          sourceId: sale.id,
          description: `قيد فاتورة مبيعات ${invoiceNo}${params.resolvedName ? ` — ${params.resolvedName}` : ""}`,
          date: new Date(),
          lines: revenueLines,
        })
      } catch (e: any) {
        console.error(
          `[sale] JournalEntry FAILED for sale ${invoiceNo} (${sale.id}). ` +
          `Sale is committed but accounting has a gap. Error: ${e?.message ?? e}`
        )
      }
    })()

    // 6) Create AuditLog (non-blocking, fire-and-forget)
    void (async () => {
      try {
        await logAuditEvent({
          userId: params.userId,
          userName: params.userName,
          action: "SALE_CREATED",
          description: `فاتورة مبيعات ${invoiceNo}`,
          saleId: sale.id,
        })
      } catch (e: any) {
        console.warn(`[sale] AuditLog failed for ${invoiceNo}: ${e?.message ?? e}`)
      }
    })()

    // Return IMMEDIATELY — the cashier sees the sale succeed fast.
    // Side effects continue in the background.
    return { ok: true, sale }
  } catch (e: any) {
    // ── COMPENSATING ACTIONS (saga rollback) ──────────────────────────
    // If the sale failed AFTER stock was decremented, re-increment the
    // stock to restore the original state. This is the compensating
    // transaction in the saga pattern.
    if (decremented.length > 0) {
      const msg = e?.message || "sale-failed"
      const shouldCompensate = !msg.startsWith("stock-insufficient:concurrent")
      // If the failure was a stock-insufficient error on item N, items
      // 1..N-1 were already decremented and need compensation. Item N
      // itself was NOT decremented (updateMany returned 0).
      if (shouldCompensate) {
        console.warn(
          `[sale] Sale failed (${msg}). Compensating: re-incrementing ` +
          `${decremented.length} stock items.`
        )
        for (const d of decremented) {
          try {
            await db.stockItem.update({
              where: {
                productId_warehouseId: {
                  productId: d.productId,
                  warehouseId: d.warehouseId,
                },
              },
              data: { quantity: { increment: d.qty } },
            })
          } catch (compErr: any) {
            // Compensation failed — stock is now WRONG. Log loudly.
            console.error(
              `[sale] COMPENSATION FAILED for product ${d.productId} ` +
              `warehouse ${d.warehouseId}. Stock is inconsistent! ` +
              `Error: ${compErr?.message ?? compErr}`
            )
          }
        }
      }
    }

    const msg = e?.message || "sale-failed"
    const status = msg.startsWith("stock-insufficient") ||
      msg.startsWith("product-not-found") ||
      msg.startsWith("invalid-item")
      ? 400
      : 500
    return { ok: false, error: msg, status }
  }
}

/**
 * Serialize the sale for the API response.
 */
export function serializeSaleResponse(sale: any) {
  return serializeSale(sale)
}

