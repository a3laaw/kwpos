/**
 * Test 3 — Journal fire-and-forget: when createJournalEntry fails, the sale
 * STILL succeeds (saga pattern) but the accounting gap is logged.
 *
 * Business rule: the sale creation flow uses the SAGA pattern, not a
 * single $transaction. The sale + stock decrement are committed first,
 * then JournalEntry + AuditLog run as fire-and-forget side effects.
 * If the journal entry fails, the sale is STILL committed (the customer
 * got their product), but the accounting has a gap that must be
 * reconciled manually. This is an intentional design decision — the
 * alternative (rolling back a committed sale because of an accounting
 * glitch) is worse for customer experience.
 *
 * Implementation: we mock `@/lib/journal`'s `createJournalEntry` to throw.
 * The sale route catches it, logs the error, and returns 201 (success).
 * The Sale + SaleItem + StockItem decrement are all persisted.
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

describe("Journal fire-and-forget on sale creation", () => {
  it("returns 201 (sale succeeds) even when journal fails — saga pattern", async () => {
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

    // Sale succeeds (201) — saga pattern: stock + sale committed,
    // journal failure is non-fatal.
    expect(res.status).toBe(201)

    // Sale IS persisted (the customer got their product).
    const saleCount = await testDb.sale.count()
    expect(saleCount).toBe(1)

    // SaleItem IS persisted.
    const saleItemCount = await testDb.saleItem.count()
    expect(saleItemCount).toBe(1)

    // Stock IS decremented (the product left the warehouse).
    const si = await testDb.stockItem.findUnique({
      where: { productId_warehouseId: { productId: product.id, warehouseId: wh.id } },
    })
    expect(si?.quantity).toBe(3) // 5 - 2 = 3

    // No JournalEntry / JournalLine persisted (the mock threw).
    const jeCount = await testDb.journalEntry.count()
    expect(jeCount).toBe(0)
    const jlCount = await testDb.journalLine.count()
    expect(jlCount).toBe(0)
  })
})

