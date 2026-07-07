import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

/**
 * GET /api/inventory/movements?productId=&warehouseId=&from=&to=&type=
 *
 * Returns stock-affecting events across the system, unified into a single
 * movement stream. Each row has:
 *   { date, type, productId, productName, quantityChange, referenceNo, userName }
 *
 * Movement types:
 *   - SALE              → SaleItem (quantity sold, negative change)
 *   - REFUND            → Sale refund (returnedQty, positive change)
 *   - EXCHANGE          → ExchangeLine (signed quantity)
 *   - PURCHASE_INVOICE  → PurchaseInvoiceItem (quantity received, positive)
 *   - PURCHASE_RETURN   → PurchaseReturnItem (quantity returned to supplier, negative)
 *   - TRANSFER_OUT      → StockTransferItem from source warehouse (negative)
 *   - TRANSFER_IN       → StockTransferItem to destination warehouse (positive)
 *   - STOCK_TAKE        → StockTakeItem.variance (signed)
 *   - SPOT_CHECK        → SpotCheck.variance (signed)
 *
 * Filtering:
 *   - productId  → restrict to one product
 *   - warehouseId → restrict to a warehouse (only applies to events that
 *                   carry a warehouse: purchase invoices, purchase returns
 *                   via PO, stock transfers, stock takes. Sales, exchanges
 *                   and spot-checks have no warehouse association and are
 *                   excluded when this filter is set.)
 *   - from / to  → date range on the event's natural date field
 *   - type       → single movement type filter
 */

export type MovementType =
  | "SALE"
  | "REFUND"
  | "EXCHANGE"
  | "PURCHASE_INVOICE"
  | "PURCHASE_RETURN"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "STOCK_TAKE"
  | "SPOT_CHECK"

export interface StockMovementRow {
  date: string
  type: MovementType
  productId: string
  productName: string
  quantityChange: number
  referenceNo: string
  userName: string | null
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const productId = searchParams.get("productId") || undefined
  const warehouseId = searchParams.get("warehouseId") || undefined
  const from = searchParams.get("from") || undefined
  const to = searchParams.get("to") || undefined
  const typeFilter = searchParams.get("type") || undefined

  // Build the date filter once (used on every event's natural date field).
  const dateFilter: { gte?: Date; lte?: Date } = {}
  if (from) dateFilter.gte = new Date(from)
  if (to) {
    const t = new Date(to)
    t.setHours(23, 59, 59, 999)
    dateFilter.lte = t
  }
  const hasDate = !!from || !!to

  // Pre-load a product name lookup map (only the products we care about).
  // If productId is set we only need that one; otherwise load all products
  // so we can resolve names in O(1) per row.
  const products = await db.product.findMany({
    where: productId ? { id: productId } : undefined,
    select: { id: true, name: true },
  })
  const productNameById = new Map<string, string>()
  for (const p of products) productNameById.set(p.id, p.name)

  // User name lookup map (loaded lazily after we collect all referenced userIds).
  const userIds = new Set<string>()

  const rows: StockMovementRow[] = []

  // ── 1. SALE (SaleItem — quantity sold, negative change) ──
  // Skipped when a warehouse filter is set (Sale has no warehouseId).
  if (!warehouseId && (!typeFilter || typeFilter === "SALE")) {
    const saleWhere: any = {}
    if (hasDate) saleWhere.createdAt = dateFilter
    const saleItems = await db.saleItem.findMany({
      where: { productId: productId || undefined, sale: saleWhere },
      include: { sale: { select: { invoiceNo: true, createdAt: true, userId: true } } },
    })
    for (const si of saleItems) {
      if (si.sale?.userId) userIds.add(si.sale.userId)
      rows.push({
        date: si.sale?.createdAt?.toISOString() ?? new Date(0).toISOString(),
        type: "SALE",
        productId: si.productId,
        productName: productNameById.get(si.productId) ?? "",
        quantityChange: -Number(si.quantity || 0),
        referenceNo: si.sale?.invoiceNo ?? "",
        userName: null,
      })
    }
  }

  // ── 2. REFUND (SaleItem.returnedQty — positive change) ──
  // Skipped when a warehouse filter is set.
  if (!warehouseId && (!typeFilter || typeFilter === "REFUND")) {
    const saleWhere: any = {}
    if (hasDate) saleWhere.createdAt = dateFilter
    const refundItems = await db.saleItem.findMany({
      where: {
        productId: productId || undefined,
        returnedQty: { gt: 0 },
        sale: saleWhere,
      },
      include: { sale: { select: { invoiceNo: true, createdAt: true, userId: true } } },
    })
    for (const si of refundItems) {
      if (si.sale?.userId) userIds.add(si.sale.userId)
      rows.push({
        date: si.sale?.createdAt?.toISOString() ?? new Date(0).toISOString(),
        type: "REFUND",
        productId: si.productId,
        productName: productNameById.get(si.productId) ?? "",
        quantityChange: Number(si.returnedQty || 0),
        referenceNo: si.sale?.invoiceNo ? `${si.sale.invoiceNo}-R` : "",
        userName: null,
      })
    }
  }

  // ── 3. EXCHANGE (ExchangeLine — signed quantity) ──
  // Skipped when a warehouse filter is set (ExchangeSale has no warehouseId).
  if (!warehouseId && (!typeFilter || typeFilter === "EXCHANGE")) {
    const exWhere: any = {}
    if (hasDate) exWhere.createdAt = dateFilter
    const exLines = await db.exchangeLine.findMany({
      where: { productId: productId || undefined, exchange: exWhere },
      include: { exchange: { select: { exchangeNo: true, createdAt: true, userId: true } } },
    })
    for (const el of exLines) {
      if (el.exchange?.userId) userIds.add(el.exchange.userId)
      rows.push({
        date: el.exchange?.createdAt?.toISOString() ?? new Date(0).toISOString(),
        type: "EXCHANGE",
        productId: el.productId,
        productName: el.productName || productNameById.get(el.productId) || "",
        quantityChange: Number(el.quantity || 0),
        referenceNo: el.exchange?.exchangeNo ?? "",
        userName: null,
      })
    }
  }

  // ── 4. PURCHASE_INVOICE (PurchaseInvoiceItem — positive change) ──
  // Only POSTED invoices affect stock (draft invoices do not).
  if (!typeFilter || typeFilter === "PURCHASE_INVOICE") {
    const piWhere: any = { status: "POSTED" }
    if (hasDate) piWhere.invoiceDate = dateFilter
    if (warehouseId) piWhere.warehouseId = warehouseId
    const piItems = await db.purchaseInvoiceItem.findMany({
      where: { productId: productId || undefined, purchaseInvoice: piWhere },
      include: {
        purchaseInvoice: { select: { invoiceNo: true, invoiceDate: true, createdById: true } },
      },
    })
    for (const pii of piItems) {
      if (pii.purchaseInvoice?.createdById) userIds.add(pii.purchaseInvoice.createdById)
      rows.push({
        date: pii.purchaseInvoice?.invoiceDate?.toISOString() ?? new Date(0).toISOString(),
        type: "PURCHASE_INVOICE",
        productId: pii.productId,
        productName: productNameById.get(pii.productId) ?? "",
        quantityChange: Number(pii.quantity || 0),
        referenceNo: pii.purchaseInvoice?.invoiceNo ?? "",
        userName: null,
      })
    }
  }

  // ── 5. PURCHASE_RETURN (PurchaseReturnItem — negative change) ──
  // Warehouse comes from the linked PurchaseOrder.warehouseId.
  if (!typeFilter || typeFilter === "PURCHASE_RETURN") {
    const prWhere: any = {}
    if (hasDate) prWhere.createdAt = dateFilter
    const prItemWhere: any = {
      purchaseReturn: prWhere,
    }
    if (warehouseId) {
      prItemWhere.purchaseReturn = {
        ...prWhere,
        purchaseOrder: { warehouseId },
      }
    }
    const prItems = await db.purchaseReturnItem.findMany({
      where: {
        productId: productId || undefined,
        ...prItemWhere,
      },
      include: {
        purchaseReturn: {
          select: { returnNo: true, createdAt: true, createdById: true, purchaseOrder: { select: { warehouseId: true } } },
        },
      },
    })
    for (const pri of prItems) {
      if (pri.purchaseReturn?.createdById) userIds.add(pri.purchaseReturn.createdById)
      rows.push({
        date: pri.purchaseReturn?.createdAt?.toISOString() ?? new Date(0).toISOString(),
        type: "PURCHASE_RETURN",
        productId: pri.productId,
        productName: productNameById.get(pri.productId) ?? "",
        quantityChange: -Number(pri.quantity || 0),
        referenceNo: pri.purchaseReturn?.returnNo ?? "",
        userName: null,
      })
    }
  }

  // ── 6. TRANSFER_OUT + TRANSFER_IN (StockTransferItem) ──
  // A single transfer row produces TWO movement rows when no warehouse
  // filter is set: TRANSFER_OUT (from source) + TRANSFER_IN (to dest).
  // When a warehouse filter is set, only the matching side is emitted.
  if (!typeFilter || typeFilter === "TRANSFER_OUT" || typeFilter === "TRANSFER_IN") {
    const stWhere: any = {}
    if (hasDate) stWhere.createdAt = dateFilter
    if (warehouseId) {
      stWhere.OR = [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }]
    }
    const stItems = await db.stockTransferItem.findMany({
      where: { productId: productId || undefined, stockTransfer: stWhere },
      include: {
        stockTransfer: {
          select: { transferNo: true, createdAt: true, createdById: true, fromWarehouseId: true, toWarehouseId: true },
        },
      },
    })
    for (const sti of stItems) {
      if (sti.stockTransfer?.createdById) userIds.add(sti.stockTransfer.createdById)
      const date = sti.stockTransfer?.createdAt?.toISOString() ?? new Date(0).toISOString()
      const refNo = sti.stockTransfer?.transferNo ?? ""
      const qty = Number(sti.quantity || 0)
      const fromId = sti.stockTransfer?.fromWarehouseId
      const toId = sti.stockTransfer?.toWarehouseId

      if (!warehouseId || fromId === warehouseId) {
        if (!typeFilter || typeFilter === "TRANSFER_OUT") {
          rows.push({
            date,
            type: "TRANSFER_OUT",
            productId: sti.productId,
            productName: productNameById.get(sti.productId) ?? "",
            quantityChange: -qty,
            referenceNo: refNo,
            userName: null,
          })
        }
      }
      if (!warehouseId || toId === warehouseId) {
        if (!typeFilter || typeFilter === "TRANSFER_IN") {
          rows.push({
            date,
            type: "TRANSFER_IN",
            productId: sti.productId,
            productName: productNameById.get(sti.productId) ?? "",
            quantityChange: qty,
            referenceNo: refNo,
            userName: null,
          })
        }
      }
    }
  }

  // ── 7. STOCK_TAKE (StockTakeItem.variance — signed change) ──
  // Only APPROVED stock takes have affected inventory.
  if (!typeFilter || typeFilter === "STOCK_TAKE") {
    const stkWhere: any = { status: "APPROVED" }
    if (hasDate) stkWhere.approvedAt = dateFilter
    if (warehouseId) stkWhere.warehouseId = warehouseId
    const stkItems = await db.stockTakeItem.findMany({
      where: { productId: productId || undefined, stockTake: stkWhere },
      include: {
        stockTake: { select: { takeNo: true, approvedAt: true, approvedById: true, createdById: true } },
      },
    })
    for (const sti of stkItems) {
      if (sti.stockTake?.approvedById) userIds.add(sti.stockTake.approvedById)
      else if (sti.stockTake?.createdById) userIds.add(sti.stockTake.createdById)
      rows.push({
        date: sti.stockTake?.approvedAt?.toISOString() ?? new Date(0).toISOString(),
        type: "STOCK_TAKE",
        productId: sti.productId,
        productName: productNameById.get(sti.productId) ?? "",
        quantityChange: Number(sti.variance || 0),
        referenceNo: sti.stockTake?.takeNo ?? "",
        userName: null,
      })
    }
  }

  // ── 8. SPOT_CHECK (SpotCheck.variance — signed change) ──
  // Skipped when a warehouse filter is set (SpotCheck has no warehouseId).
  if (!warehouseId && (!typeFilter || typeFilter === "SPOT_CHECK")) {
    const scWhere: any = {}
    if (hasDate) scWhere.createdAt = dateFilter
    const spotChecks = await db.spotCheck.findMany({
      where: { productId: productId || undefined, ...scWhere },
      include: { user: { select: { id: true, name: true } } },
    })
    for (const sc of spotChecks) {
      if (sc.userId) userIds.add(sc.userId)
      rows.push({
        date: sc.createdAt?.toISOString() ?? new Date(0).toISOString(),
        type: "SPOT_CHECK",
        productId: sc.productId,
        productName: productNameById.get(sc.productId) ?? "",
        quantityChange: Number(sc.variance || 0),
        referenceNo: `SC-${sc.id.slice(-6)}`,
        userName: sc.user?.name ?? null,
      })
    }
  }

  // ── Resolve user names for all collected userIds ──
  const userMap = new Map<string, string>()
  if (userIds.size > 0) {
    const users = await db.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      select: { id: true, name: true },
    })
    for (const u of users) userMap.set(u.id, u.name)
  }

  // Backfill userName on each row by re-reading the parent record's userId
  // is not feasible without re-fetching — instead, we re-walk the rows by
  // re-mapping. The cleanest approach is to attach userId during collection
  // and resolve to name here. We did not store userId per row above, so we
  // resolve names by re-querying the parent records' user associations.
  //
  // To keep this efficient and avoid N+1 queries, we take a different
  // approach: for each parent type we already fetched the parent's userId
  // via the `include` clause. Re-run the joins here is unnecessary —
  // instead, we'll just leave userName as null when we couldn't resolve it
  // from the spotCheck.user include. For the other types, we would need
  // to thread the userId through. To minimize refactoring risk, we resolve
  // by a second lightweight pass: re-fetch each unique (type, referenceNo)
  // pair's user. But that's expensive. Instead, accept null for non-spot
  // checks. The task spec asks for "userName" but doesn't strictly require
  // it for every row; null is acceptable for events where the user is
  // unknown at the row level.
  //
  // For a cleaner solution, we re-fetch the user associations in bulk by
  // reference number per type. This is a single query per type.

  // SALE + REFUND (both use sale.invoiceNo)
  const saleRefNos = new Set(
    rows.filter((r) => r.type === "SALE" || r.type === "REFUND").map((r) => r.referenceNo.replace(/-R$/, ""))
  )
  if (saleRefNos.size > 0) {
    const sales = await db.sale.findMany({
      where: { invoiceNo: { in: Array.from(saleRefNos) } },
      select: { invoiceNo: true, userId: true, user: { select: { name: true } } },
    })
    const saleUserByInvNo = new Map<string, string | null>()
    for (const s of sales) saleUserByInvNo.set(s.invoiceNo, s.user?.name ?? null)
    for (const r of rows) {
      if (r.type === "SALE" || r.type === "REFUND") {
        const invNo = r.referenceNo.replace(/-R$/, "")
        r.userName = saleUserByInvNo.get(invNo) ?? null
      }
    }
  }

  // EXCHANGE (exchange.exchangeNo)
  const exRefNos = new Set(rows.filter((r) => r.type === "EXCHANGE").map((r) => r.referenceNo))
  if (exRefNos.size > 0) {
    const exs = await db.exchangeSale.findMany({
      where: { exchangeNo: { in: Array.from(exRefNos) } },
      select: { exchangeNo: true, user: { select: { name: true } } },
    })
    const exUserByNo = new Map<string, string | null>()
    for (const e of exs) exUserByNo.set(e.exchangeNo, e.user?.name ?? null)
    for (const r of rows) {
      if (r.type === "EXCHANGE") {
        r.userName = exUserByNo.get(r.referenceNo) ?? null
      }
    }
  }

  // PURCHASE_INVOICE (purchaseInvoice.invoiceNo)
  const piRefNos = new Set(rows.filter((r) => r.type === "PURCHASE_INVOICE").map((r) => r.referenceNo))
  if (piRefNos.size > 0) {
    const pis = await db.purchaseInvoice.findMany({
      where: { invoiceNo: { in: Array.from(piRefNos) } },
      select: { invoiceNo: true, createdBy: { select: { name: true } } },
    })
    const piUserByNo = new Map<string, string | null>()
    for (const p of pis) piUserByNo.set(p.invoiceNo, p.createdBy?.name ?? null)
    for (const r of rows) {
      if (r.type === "PURCHASE_INVOICE") {
        r.userName = piUserByNo.get(r.referenceNo) ?? null
      }
    }
  }

  // PURCHASE_RETURN (purchaseReturn.returnNo)
  const prRefNos = new Set(rows.filter((r) => r.type === "PURCHASE_RETURN").map((r) => r.referenceNo))
  if (prRefNos.size > 0) {
    const prs = await db.purchaseReturn.findMany({
      where: { returnNo: { in: Array.from(prRefNos) } },
      select: { returnNo: true, createdBy: { select: { name: true } } },
    })
    const prUserByNo = new Map<string, string | null>()
    for (const p of prs) prUserByNo.set(p.returnNo, p.createdBy?.name ?? null)
    for (const r of rows) {
      if (r.type === "PURCHASE_RETURN") {
        r.userName = prUserByNo.get(r.referenceNo) ?? null
      }
    }
  }

  // TRANSFER_OUT + TRANSFER_IN (stockTransfer.transferNo)
  const stRefNos = new Set(
    rows.filter((r) => r.type === "TRANSFER_OUT" || r.type === "TRANSFER_IN").map((r) => r.referenceNo)
  )
  if (stRefNos.size > 0) {
    const sts = await db.stockTransfer.findMany({
      where: { transferNo: { in: Array.from(stRefNos) } },
      select: { transferNo: true, createdBy: { select: { name: true } } },
    })
    const stUserByNo = new Map<string, string | null>()
    for (const s of sts) stUserByNo.set(s.transferNo, s.createdBy?.name ?? null)
    for (const r of rows) {
      if (r.type === "TRANSFER_OUT" || r.type === "TRANSFER_IN") {
        r.userName = stUserByNo.get(r.referenceNo) ?? null
      }
    }
  }

  // STOCK_TAKE (stockTake.takeNo)
  const stkRefNos = new Set(rows.filter((r) => r.type === "STOCK_TAKE").map((r) => r.referenceNo))
  if (stkRefNos.size > 0) {
    const stks = await db.stockTake.findMany({
      where: { takeNo: { in: Array.from(stkRefNos) } },
      select: {
        takeNo: true,
        approvedBy: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    })
    const stkUserByNo = new Map<string, string | null>()
    for (const s of stks) stkUserByNo.set(s.takeNo, s.approvedBy?.name ?? s.createdBy?.name ?? null)
    for (const r of rows) {
      if (r.type === "STOCK_TAKE") {
        r.userName = stkUserByNo.get(r.referenceNo) ?? null
      }
    }
  }

  // Sort by date ascending, then by type for stable order
  rows.sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type))

  return NextResponse.json({ items: rows })
}
