/**
 * Test 3 — Journal rollback: when createJournalEntry fails inside a sale's
 * $transaction, the sale is NOT persisted (transaction rolls back).
 *
 * Business rule: the sale creation flow wraps stock decrement + sale create
 * + journal entry + audit log in a single db.$transaction. If the journal
 * entry fails, the whole transaction rolls back — no Sale record, no
 * SaleItem, and the StockItem is NOT decremented.
 *
 * Implementation: we mock `@/lib/journal`'s `createJournalEntry` to throw.
 * The sale route catches it, wraps the message, and the outer .catch
 * returns `{ __error }` → route returns HTTP 500. The transaction has
 * already rolled back by that point.
 */
import { describe, beforeEach, afterAll, expect, it, vi } from "vitest"
import { testDb, resetDatabase, seedBaseFixtures, makeJsonRequest } from "./setup"

const { mockGetCurrentUser } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
}))

const { mockCreateJournalEntry } = vi.hoisted(() => ({
  mockCreateJournalEntry: vi.fn(),
}))

vi.mock("@/lib/session", async (orig) => {
  const actual = await orig<typeof import("@/lib/session")>()
  return { ...actual, getCurrentUser: mockGetCurrentUser }
})

vi.mock("@/lib/journal", async (orig) => {
  const actual = await orig<typeof import("@/lib/journal")>()
  return {
    ...actual,
    createJournalEntry: mockCreateJournalEntry,
  }
})

import { POST as salePOST } from "@/app/api/sales/route"

let adminId: string

beforeEach(async () => {
  await resetDatabase()
  const seed = await seedBaseFixtures()
  adminId = seed.adminId
  mockGetCurrentUser.mockReset()
  mockGetCurrentUser.mockResolvedValue({
    id: adminId,
    name: "Test Admin",
    email: "admin@test.local",
    role: "ADMIN",
  })
  // Make EVERY journal entry fail during this test.
  mockCreateJournalEntry.mockReset()
  mockCreateJournalEntry.mockImplementation(async () => {
    throw new Error("simulated-journal-failure")
  })
})

afterAll(async () => {
  await testDb.$disconnect()
})

describe("Journal rollback on sale creation", () => {
  it("returns 500 and leaves NO sale, NO saleItem, NO stock decrement", async () => {
    const wh = await testDb.warehouse.create({ data: { name: "WH", code: "W" } })
    const product = await testDb.product.create({
      data: {
        name: "Rollback Product",
        salePrice: 10,
        costPrice: 5,
        quantity: 5,
        stockItems: { create: [{ warehouseId: wh.id, quantity: 5 }] },
      },
    })

    const res = await salePOST(
      makeJsonRequest("POST", "/api/sales", {
        warehouseId: wh.id,
        items: [{ productId: product.id, quantity: 2, unitPrice: 10 }],
        paymentMethod: "CASH",
      }) as any
    )

    // Route returns 500 when the journal entry fails (transaction rolls back).
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(String(body.error)).toMatch(/journal|قيد/i)

    // No Sale persisted.
    const saleCount = await testDb.sale.count()
    expect(saleCount).toBe(0)

    // No SaleItem persisted.
    const saleItemCount = await testDb.saleItem.count()
    expect(saleItemCount).toBe(0)

    // Stock NOT decremented.
    const si = await testDb.stockItem.findUnique({
      where: { productId_warehouseId: { productId: product.id, warehouseId: wh.id } },
    })
    expect(si?.quantity).toBe(5)

    // Product.quantity (aggregate) also unchanged.
    const refreshed = await testDb.product.findUnique({ where: { id: product.id } })
    expect(refreshed?.quantity).toBe(5)

    // No JournalEntry / JournalLine persisted.
    const jeCount = await testDb.journalEntry.count()
    expect(jeCount).toBe(0)
    const jlCount = await testDb.journalLine.count()
    expect(jlCount).toBe(0)
  })
})
