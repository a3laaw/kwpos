/**
 * Test 11 — Sale refund + cancel flows (high-risk: financial + stock reversal).
 *
 * Routes covered:
 *   - POST /api/sales/[id]/refund  — partial refund (single-item return)
 *   - POST /api/sales/[id]/cancel  — full cancellation (status → CANCELLED)
 *
 * Both routes mutate stock (increment StockItem), update sale state, and
 * create journal entries. The cancel route is fire-and-forget for the JE
 * + audit log + Product.quantity sync; the refund route runs the JE
 * INSIDE its $transaction (atomic).
 *
 * Pattern: same as sale-stock-warehouses.test.ts — hoisted mock for
 * `getCurrentUser`, `testDb`, `resetDatabase`, `seedBaseFixtures`,
 * `makeJsonRequest`. Routes are called directly (no HTTP server).
 */
import { describe, beforeEach, afterAll, expect, it, vi } from "vitest"
import { testDb, resetDatabase, seedBaseFixtures, makeJsonRequest } from "./setup"

// ── Hoisted mock for getCurrentUser (vitest hoists vi.mock before imports) ──
const { mockGetCurrentUser } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
}))

vi.mock("@/lib/session", async (orig) => {
  const actual = await orig<typeof import("@/lib/session")>()
  return {
    ...actual,
    getCurrentUser: mockGetCurrentUser,
  }
})

import { POST as refundPOST } from "@/app/api/sales/[id]/refund/route"
import { POST as cancelPOST } from "@/app/api/sales/[id]/cancel/route"

let adminId: string
let warehouseId: string

beforeEach(async () => {
  await resetDatabase()
  const seed = await seedBaseFixtures()
  adminId = seed.adminId
  // The warehouse is resolved via resolveWarehouseId(user, null) → first
  // active warehouse. Create one so the routes don't 400.
  const wh = await testDb.warehouse.create({ data: { name: "Main", code: "M" } })
  warehouseId = wh.id
  mockGetCurrentUser.mockReset()
  mockGetCurrentUser.mockResolvedValue({
    id: adminId,
    name: "Test Admin",
    email: "admin@test.local",
    role: "ADMIN",
  })
})

afterAll(async () => {
  await testDb.$disconnect()
})

// ── Fixture helpers ──────────────────────────────────────────────────────

/**
 * Create a COMPLETED sale with one SaleItem (qty=quantity, unitPrice=unitPrice)
 * against `product` in `warehouse`. The SaleItem has returnedQty=0.
 *
 * The stock is pre-decremented (we create the StockItem with the post-sale
 * quantity, simulating a sale that already happened).
 */
async function makeCompletedSale(
  product: { id: string; costPrice: number; salePrice: number },
  quantity: number,
  unitPrice: number,
  opts: {
    taxRate?: number
    paymentMethod?: "CASH" | "BANK"
    refundStatus?: string
    status?: string
    returnedQty?: number
  } = {}
): Promise<{ saleId: string; saleItemId: string; invoiceNo: string }> {
  const taxRate = opts.taxRate ?? 0
  const paymentMethod = opts.paymentMethod ?? "CASH"
  const refundStatus = opts.refundStatus ?? "NONE"
  const status = opts.status ?? "COMPLETED"
  const returnedQty = opts.returnedQty ?? 0

  const subtotal = quantity * unitPrice
  const taxAmount = +(subtotal * (taxRate / 100)).toFixed(3)
  const total = +(subtotal + taxAmount).toFixed(3)

  const invoiceNo = "INV-" + Math.random().toString(36).slice(2, 10)
  const sale = await testDb.sale.create({
    data: {
      invoiceNo,
      subtotal,
      taxRate,
      taxAmount,
      discount: 0,
      total,
      paid: total,
      refundTotal: 0,
      refundStatus,
      paymentMethod,
      userId: adminId,
      status,
      items: {
        create: [
          {
            productId: product.id,
            quantity,
            returnedQty,
            unitPrice,
            subtotal,
          },
        ],
      },
    },
    include: { items: true },
  })

  return {
    saleId: sale.id,
    saleItemId: (sale.items as any)[0].id,
    invoiceNo,
  }
}

/** Create a product + a StockItem in the warehouse with `quantity` units. */
async function makeProduct(opts: {
  name: string
  costPrice: number
  salePrice: number
  quantity: number
}): Promise<{ id: string; costPrice: number; salePrice: number }> {
  const p = await testDb.product.create({
    data: {
      name: opts.name,
      salePrice: opts.salePrice,
      costPrice: opts.costPrice,
      quantity: opts.quantity,
      stockItems: {
        create: [{ warehouseId, quantity: opts.quantity }],
      },
    },
  })
  return { id: p.id, costPrice: opts.costPrice, salePrice: opts.salePrice }
}

/**
 * Poll for `maxMs` until at least one JournalEntry with the SPECIFIC saleId
 * exists. The cancel route creates the JE fire-and-forget (after returning),
 * so tests need to wait. We filter by saleId + sourceType="MANUAL" so orphan
 * JEs from a previous test's slow fire-and-forget IIFE don't cause a false
 * positive (the previous test's IIFE may write to the freshly-reset DB after
 * this test's beforeEach wipe).
 */
async function waitForSaleJournalEntry(
  saleId: string,
  maxMs = 3000
): Promise<number> {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    const count = await testDb.journalEntry.count({
      where: { sourceId: saleId, sourceType: "MANUAL" },
    })
    if (count > 0) return count
    await new Promise((r) => setTimeout(r, 50))
  }
  return await testDb.journalEntry.count({
    where: { sourceId: saleId, sourceType: "MANUAL" },
  })
}

/** Helper: build a NextRequest with a path param for the [id] route. */
function makeRouteRequest(id: string, body: unknown) {
  return makeJsonRequest("POST", `/api/sales/${id}/cancel`, body)
}

// ── Tests: POST /api/sales/[id]/cancel ────────────────────────────────────
describe("POST /api/sales/[id]/cancel — full cancellation", () => {
  it("cancels a COMPLETED sale and flips status to CANCELLED", async () => {
    const product = await makeProduct({ name: "Cancel Product", costPrice: 5, salePrice: 10, quantity: 10 })
    const { saleId } = await makeCompletedSale(product, 2, 10)

    const res = await cancelPOST(
      makeJsonRequest("POST", `/api/sales/${saleId}/cancel`, {
        reason: "Customer changed mind",
      }) as any,
      { params: Promise.resolve({ id: saleId }) } as any
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.sale.status).toBe("CANCELLED")
    expect(body.sale.cancelledAt).toBeTruthy()
    expect(body.sale.cancellationReason).toContain("Customer changed mind")
    expect(body.refundSummary.refundTotal).toBeCloseTo(20, 3) // 2 × 10

    // Persisted status.
    const persisted = await testDb.sale.findUnique({ where: { id: saleId } })
    expect(persisted?.status).toBe("CANCELLED")
    expect(persisted?.refundStatus).toBe("FULL")
    expect(persisted?.cancelledById).toBe(adminId)
  })

  it("rejects with 400 when reason is missing or shorter than 3 chars", async () => {
    const product = await makeProduct({ name: "Reason Product", costPrice: 5, salePrice: 10, quantity: 10 })
    const { saleId } = await makeCompletedSale(product, 1, 10)

    // Missing reason entirely.
    const res1 = await cancelPOST(
      makeJsonRequest("POST", `/api/sales/${saleId}/cancel`, {}) as any,
      { params: Promise.resolve({ id: saleId }) } as any
    )
    expect(res1.status).toBe(400)
    expect((await res1.json()).error).toBe("reason-required")

    // 2-char reason — also rejected.
    const res2 = await cancelPOST(
      makeJsonRequest("POST", `/api/sales/${saleId}/cancel`, { reason: "ab" }) as any,
      { params: Promise.resolve({ id: saleId }) } as any
    )
    expect(res2.status).toBe(400)
    expect((await res2.json()).error).toBe("reason-required")

    // Sale should still be COMPLETED (no mutation).
    const persisted = await testDb.sale.findUnique({ where: { id: saleId } })
    expect(persisted?.status).toBe("COMPLETED")
  })

  it("rejects with 409 when sale is already CANCELLED", async () => {
    const product = await makeProduct({ name: "Double-Cancel", costPrice: 5, salePrice: 10, quantity: 10 })
    const { saleId } = await makeCompletedSale(product, 1, 10, { status: "CANCELLED" })

    const res = await cancelPOST(
      makeJsonRequest("POST", `/api/sales/${saleId}/cancel`, { reason: "Second attempt" }) as any,
      { params: Promise.resolve({ id: saleId }) } as any
    )
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe("already-cancelled")
  })

  it("returns stock to the warehouse (StockItem increments by sold quantity)", async () => {
    // Simulate a post-sale state: warehouse has 8 units left (started with 10, sold 2).
    const product = await makeProduct({ name: "Stock-Return", costPrice: 5, salePrice: 10, quantity: 8 })
    const { saleId } = await makeCompletedSale(product, 2, 10)

    const res = await cancelPOST(
      makeJsonRequest("POST", `/api/sales/${saleId}/cancel`, { reason: "Restock needed" }) as any,
      { params: Promise.resolve({ id: saleId }) } as any
    )
    expect(res.status).toBe(200)

    // Give the fire-and-forget stock return a moment to complete.
    // The cancel route's stock return is NOT inside the fire-and-forget block —
    // it's awaited BEFORE the response. So stock should be back immediately.
    const si = await testDb.stockItem.findUnique({
      where: { productId_warehouseId: { productId: product.id, warehouseId } },
    })
    expect(si?.quantity).toBe(10) // 8 + 2 returned
  })

  it("creates a reversing journal entry (fire-and-forget, eventually consistent)", async () => {
    const product = await makeProduct({ name: "JE-Cancel", costPrice: 5, salePrice: 10, quantity: 10 })
    const { saleId, invoiceNo } = await makeCompletedSale(product, 2, 10)

    const res = await cancelPOST(
      makeJsonRequest("POST", `/api/sales/${saleId}/cancel`, { reason: "Journal test cancel" }) as any,
      { params: Promise.resolve({ id: saleId }) } as any
    )
    expect(res.status).toBe(200)

    // The cancel route runs the JE + audit log fire-and-forget. Poll for the
    // SPECIFIC JE for this saleId (filter by sourceId + sourceType="MANUAL").
    const jeCount = await waitForSaleJournalEntry(saleId, 3000)
    expect(jeCount).toBeGreaterThanOrEqual(1)

    // Verify the reversing JE is balanced and references the sale.
    const jes = await testDb.journalEntry.findMany({
      where: { sourceId: saleId, sourceType: "MANUAL" },
      include: { lines: true },
    })
    expect(jes.length).toBeGreaterThanOrEqual(1)
    const je = jes[0]
    // Total sale was 20 (2 × 10, taxRate 0). Reversing JE should be balanced at 20.
    expect(Number(je.totalDebit)).toBeCloseTo(20, 3)
    expect(Number(je.totalCredit)).toBeCloseTo(20, 3)
    expect(je.description).toContain(invoiceNo)
    expect(je.lines.length).toBe(2) // credit Cash (1010) + debit Sales Revenue (4010)
  })

  it("rejects with 404 when sale id does not exist", async () => {
    const res = await cancelPOST(
      makeJsonRequest("POST", `/api/sales/nonexistent-sale-id/cancel`, { reason: "Test 404" }) as any,
      { params: Promise.resolve({ id: "nonexistent-sale-id" }) } as any
    )
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe("not-found")
  })

  it("rejects with 403 when user role is not OWNER/ADMIN/MANAGER", async () => {
    // Downgrade to SALES — cancel is admin-only.
    mockGetCurrentUser.mockResolvedValue({
      id: adminId,
      name: "Cashier User",
      email: "cashier@test.local",
      role: "CASHIER",
    })

    const product = await makeProduct({ name: "Forbidden-Cancel", costPrice: 5, salePrice: 10, quantity: 10 })
    const { saleId } = await makeCompletedSale(product, 1, 10)

    const res = await cancelPOST(
      makeJsonRequest("POST", `/api/sales/${saleId}/cancel`, { reason: "Cashier tries cancel" }) as any,
      { params: Promise.resolve({ id: saleId }) } as any
    )
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe("forbidden")
  })
})

// ── Tests: POST /api/sales/[id]/refund ─────────────────────────────────────
describe("POST /api/sales/[id]/refund — partial refund", () => {
  it("refunds a single item from a sale (200)", async () => {
    const product = await makeProduct({ name: "Refund Product", costPrice: 5, salePrice: 10, quantity: 10 })
    const { saleId, saleItemId } = await makeCompletedSale(product, 2, 10)

    const res = await refundPOST(
      makeJsonRequest("POST", `/api/sales/${saleId}/refund`, {
        items: [{ saleItemId, returnedQty: 1 }],
      }) as any,
      { params: Promise.resolve({ id: saleId }) } as any
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.refundStatus).toBe("PARTIAL") // 1 of 2 returned
    expect(body.refundSummary.refundSubtotal).toBeCloseTo(10, 3) // 1 × 10
    expect(body.refundSummary.creditNoteNo).toBe(`CN-${body.invoiceNo}`)
  })

  it("restocks returned item and updates Sale.refundTotal", async () => {
    const product = await makeProduct({ name: "Refund Restock", costPrice: 5, salePrice: 10, quantity: 8 })
    const { saleId, saleItemId } = await makeCompletedSale(product, 2, 10)

    const res = await refundPOST(
      makeJsonRequest("POST", `/api/sales/${saleId}/refund`, {
        items: [{ saleItemId, returnedQty: 1 }],
      }) as any,
      { params: Promise.resolve({ id: saleId }) } as any
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.refundTotal).toBeCloseTo(10, 3) // 1 × 10 + 0 tax
    expect(body.refundStatus).toBe("PARTIAL")

    // StockItem incremented by 1 (from 8 → 9).
    const si = await testDb.stockItem.findUnique({
      where: { productId_warehouseId: { productId: product.id, warehouseId } },
    })
    expect(si?.quantity).toBe(9)

    // SaleItem.returnedQty updated to 1.
    const si2 = await testDb.saleItem.findUnique({ where: { id: saleItemId } })
    expect(si2?.returnedQty).toBe(1)

    // Sale.refundTotal + refundStatus persisted.
    const persisted = await testDb.sale.findUnique({ where: { id: saleId } })
    expect(Number(persisted?.refundTotal)).toBeCloseTo(10, 3)
    expect(persisted?.refundStatus).toBe("PARTIAL")
  })

  it("rejects with 400 when returnedQty exceeds the returnable quantity", async () => {
    const product = await makeProduct({ name: "Exceed-Refund", costPrice: 5, salePrice: 10, quantity: 10 })
    const { saleId, saleItemId } = await makeCompletedSale(product, 2, 10)

    // Try to return 5 when only 2 were sold.
    const res = await refundPOST(
      makeJsonRequest("POST", `/api/sales/${saleId}/refund`, {
        items: [{ saleItemId, returnedQty: 5 }],
      }) as any,
      { params: Promise.resolve({ id: saleId }) } as any
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain("exceeds-returnable")
    // No mutation occurred.
    const persisted = await testDb.sale.findUnique({ where: { id: saleId } })
    expect(persisted?.refundStatus).toBe("NONE")
  })

  it("rejects a second refund attempt after the sale is already FULLY refunded (exceeds-returnable)", async () => {
    const product = await makeProduct({ name: "Full-Refund", costPrice: 5, salePrice: 10, quantity: 10 })
    const { saleId, saleItemId } = await makeCompletedSale(product, 1, 10)

    // First refund: return the only item → refundStatus becomes FULL.
    const r1 = await refundPOST(
      makeJsonRequest("POST", `/api/sales/${saleId}/refund`, {
        items: [{ saleItemId, returnedQty: 1 }],
      }) as any,
      { params: Promise.resolve({ id: saleId }) } as any
    )
    expect(r1.status).toBe(200)
    expect((await r1.json()).refundStatus).toBe("FULL")

    // Second refund: nothing left to return → exceeds-returnable (returnable = 0).
    const r2 = await refundPOST(
      makeJsonRequest("POST", `/api/sales/${saleId}/refund`, {
        items: [{ saleItemId, returnedQty: 1 }],
      }) as any,
      { params: Promise.resolve({ id: saleId }) } as any
    )
    expect(r2.status).toBe(400)
    expect((await r2.json()).error).toContain("exceeds-returnable")
  })

  it("rejects with 404 when sale id does not exist", async () => {
    const res = await refundPOST(
      makeJsonRequest("POST", `/api/sales/nonexistent-refund-id/refund`, {
        items: [{ saleItemId: "fake-id", returnedQty: 1 }],
      }) as any,
      { params: Promise.resolve({ id: "nonexistent-refund-id" }) } as any
    )
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe("not-found")
  })

  it("rejects with 400 when items array is missing or empty (no-items)", async () => {
    const product = await makeProduct({ name: "No-Items", costPrice: 5, salePrice: 10, quantity: 10 })
    const { saleId } = await makeCompletedSale(product, 1, 10)

    const res = await refundPOST(
      makeJsonRequest("POST", `/api/sales/${saleId}/refund`, {}) as any,
      { params: Promise.resolve({ id: saleId }) } as any
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe("no-items")
  })

  it("rejects with 400 when saleItemId does not belong to the sale (item-not-found)", async () => {
    const product = await makeProduct({ name: "Bad-Item-Id", costPrice: 5, salePrice: 10, quantity: 10 })
    const { saleId } = await makeCompletedSale(product, 1, 10)

    const res = await refundPOST(
      makeJsonRequest("POST", `/api/sales/${saleId}/refund`, {
        items: [{ saleItemId: "wrong-item-id", returnedQty: 1 }],
      }) as any,
      { params: Promise.resolve({ id: saleId }) } as any
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain("item-not-found")
  })

  it("creates balanced journal entries for the refund (financial + inventory)", async () => {
    const product = await makeProduct({ name: "JE-Refund", costPrice: 6, salePrice: 10, quantity: 10 })
    const { saleId, saleItemId } = await makeCompletedSale(product, 2, 10, { taxRate: 15 })

    // subtotal = 20, taxAmount = 20 × 0.15 = 3, total = 23
    const res = await refundPOST(
      makeJsonRequest("POST", `/api/sales/${saleId}/refund`, {
        items: [{ saleItemId, returnedQty: 1 }],
      }) as any,
      { params: Promise.resolve({ id: saleId }) } as any
    )
    expect(res.status).toBe(200)

    // Refund route creates JEs inside the $transaction — committed by response time.
    // Expect TWO JEs (financial + inventory) for this refund.
    const jes = await testDb.journalEntry.findMany({
      where: { sourceId: saleId, sourceType: "MANUAL" },
      include: { lines: true },
    })
    expect(jes.length).toBeGreaterThanOrEqual(2)

    // All JEs should be balanced (totalDebit ≈ totalCredit).
    for (const je of jes) {
      expect(Number(je.totalDebit)).toBeCloseTo(Number(je.totalCredit), 3)
    }
  })

  it("rejects with 403 when user role is not OWNER/ADMIN (refund is admin-only)", async () => {
    // Downgrade to MANAGER — refund requires OWNER/ADMIN specifically.
    mockGetCurrentUser.mockResolvedValue({
      id: adminId,
      name: "Manager User",
      email: "manager@test.local",
      role: "MANAGER",
    })

    const product = await makeProduct({ name: "Forbidden-Refund", costPrice: 5, salePrice: 10, quantity: 10 })
    const { saleId, saleItemId } = await makeCompletedSale(product, 1, 10)

    const res = await refundPOST(
      makeJsonRequest("POST", `/api/sales/${saleId}/refund`, {
        items: [{ saleItemId, returnedQty: 1 }],
      }) as any,
      { params: Promise.resolve({ id: saleId }) } as any
    )
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe("forbidden")
  })
})
