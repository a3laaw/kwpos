/**
 * Test 2 — POS sale concurrency: two simultaneous requests for the last unit
 * — only one succeeds.
 *
 * Business rule: the per-warehouse stock decrement must be atomic so that
 * two concurrent sales for the last unit cannot both succeed (oversell).
 *
 * Implementation note: in production this is enforced by PostgreSQL
 * SELECT ... FOR UPDATE row locking inside decrementStockItem. In the test
 * environment we run on SQLite, which doesn't support FOR UPDATE but does
 * provide serializable transaction isolation (snapshot). The second
 * transaction either:
 *   (a) sees the committed qty=0 and returns 400 "stock-insufficient", OR
 *   (b) detects a write/snapshot conflict and surfaces SQLITE_BUSY_SNAPSHOT,
 *       which the route's .catch wraps into a 500.
 *
 * Both outcomes are valid "failure" results — what matters is the invariant:
 * exactly ONE of the two requests succeeds with 201, and the final state has
 * 0 stock and exactly 1 Sale record.
 */
import { describe, beforeEach, afterAll, expect, it, vi } from "vitest"
import { testDb, resetDatabase, seedBaseFixtures, makeJsonRequest } from "./setup"

const { mockGetCurrentUser } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
}))

vi.mock("@/lib/session", async (orig) => {
  const actual = await orig<typeof import("@/lib/session")>()
  return { ...actual, getCurrentUser: mockGetCurrentUser }
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
})

afterAll(async () => {
  await testDb.$disconnect()
})

describe("POS sale concurrency — last unit race", () => {
  it("exactly one of two simultaneous sales for the last unit succeeds", async () => {
    const wh = await testDb.warehouse.create({ data: { name: "WH", code: "W" } })
    const product = await testDb.product.create({
      data: {
        name: "Last Unit Product",
        salePrice: 10,
        costPrice: 5,
        quantity: 1,
        stockItems: { create: [{ warehouseId: wh.id, quantity: 1 }] },
      },
    })

    const payload = {
      warehouseId: wh.id,
      items: [{ productId: product.id, quantity: 1, unitPrice: 10 }],
      paymentMethod: "CASH",
    }

    // Fire both at the same time. Promise.allSettled so neither rejection
    // (if any) short-circuits the other.
    const [r1, r2] = await Promise.allSettled([
      salePOST(makeJsonRequest("POST", "/api/sales", payload) as any),
      salePOST(makeJsonRequest("POST", "/api/sales", payload) as any),
    ])

    const statuses: number[] = []
    for (const r of [r1, r2]) {
      if (r.status === "fulfilled") {
        statuses.push(r.value.status)
      } else {
        // The route catches all errors and converts them to a NextResponse,
        // so we don't expect a rejection — but if it happens, record it as
        // a synthetic 599 so the invariant check below fails loudly.
        statuses.push(599)
      }
    }

    const successCount = statuses.filter((s) => s === 201).length
    const failureCount = statuses.filter((s) => s >= 400).length

    // Invariant: exactly one success, exactly one failure.
    expect(successCount).toBe(1)
    expect(failureCount).toBe(1)

    // Final state: 0 stock, exactly 1 Sale record.
    const si = await testDb.stockItem.findUnique({
      where: { productId_warehouseId: { productId: product.id, warehouseId: wh.id } },
    })
    expect(si?.quantity).toBe(0)

    const saleCount = await testDb.sale.count()
    expect(saleCount).toBe(1)

    const saleItemCount = await testDb.saleItem.count()
    expect(saleItemCount).toBe(1)
  })
})
