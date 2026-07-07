/**
 * Test 1 — POS sale: insufficient stock in a specific warehouse returns 400
 * even if the aggregate Product.quantity is sufficient.
 *
 * Business rule: stock is checked per-warehouse (StockItem), not against
 * the aggregate Product.quantity. A sale against warehouse A must fail if
 * A's StockItem.quantity < requested, even if other warehouses have stock
 * that brings Product.quantity above the requested amount.
 */
import { describe, beforeAll, beforeEach, afterAll, expect, it, vi } from "vitest"
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

import { POST as salePOST } from "@/app/api/sales/route"

let adminId: string

beforeAll(async () => {
  // The shared fixtures are created once for this file. Each test below
  // calls resetDatabase() in beforeEach, which wipes them — so we recreate
  // them in beforeEach too via the per-test seeder.
})

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

describe("POS sale stock check — per-warehouse, not aggregate", () => {
  it("rejects with 400 when warehouse A has 2 but sale asks for 3 (even though Product.quantity = 2)", async () => {
    // Two warehouses
    const whA = await testDb.warehouse.create({ data: { name: "WH-A", code: "A" } })
    await testDb.warehouse.create({ data: { name: "WH-B", code: "B" } })

    // One product with stock ONLY in A (2 units). B has 0. Aggregate = 2.
    const product = await testDb.product.create({
      data: {
        name: "Test Product A",
        salePrice: 10,
        costPrice: 5,
        quantity: 2,
        stockItems: {
          create: [
            { warehouseId: whA.id, quantity: 2 },
            // B has 0 — represent it explicitly so the StockItem exists.
            // (create with quantity:0 to mirror the scenario description)
          ],
        },
      },
    })

    const res = await salePOST(
      makeJsonRequest("POST", "/api/sales", {
        warehouseId: whA.id,
        items: [{ productId: product.id, quantity: 3, unitPrice: 10 }],
        paymentMethod: "CASH",
      }) as any
    )

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/stock-insufficient/i)
  })

  it("succeeds with 201 when warehouse A has exactly the requested quantity", async () => {
    const whA = await testDb.warehouse.create({ data: { name: "WH-A", code: "A" } })
    const whB = await testDb.warehouse.create({ data: { name: "WH-B", code: "B" } })

    const product = await testDb.product.create({
      data: {
        name: "Test Product A",
        salePrice: 10,
        costPrice: 5,
        quantity: 2,
        stockItems: {
          create: [{ warehouseId: whA.id, quantity: 2 }],
        },
      },
    })
    // Explicitly create B's StockItem with 0 to mirror "B has 0 units".
    await testDb.stockItem.create({
      data: { productId: product.id, warehouseId: whB.id, quantity: 0 },
    })

    const res = await salePOST(
      makeJsonRequest("POST", "/api/sales", {
        warehouseId: whA.id,
        items: [{ productId: product.id, quantity: 2, unitPrice: 10 }],
        paymentMethod: "CASH",
      }) as any
    )

    expect(res.status).toBe(201)

    // Verify post-sale state
    const siA = await testDb.stockItem.findUnique({
      where: { productId_warehouseId: { productId: product.id, warehouseId: whA.id } },
    })
    const siB = await testDb.stockItem.findUnique({
      where: { productId_warehouseId: { productId: product.id, warehouseId: whB.id } },
    })
    const refreshed = await testDb.product.findUnique({ where: { id: product.id } })

    expect(siA?.quantity).toBe(0)
    expect(siB?.quantity).toBe(0)
    expect(refreshed?.quantity).toBe(0)
  })

  it("does not touch warehouse B's stock when selling from A", async () => {
    const whA = await testDb.warehouse.create({ data: { name: "WH-A", code: "A" } })
    const whB = await testDb.warehouse.create({ data: { name: "WH-B", code: "B" } })

    // This time A has 2, B has 5. Aggregate = 7.
    const product = await testDb.product.create({
      data: {
        name: "Test Product AB",
        salePrice: 10,
        costPrice: 5,
        quantity: 7,
        stockItems: {
          create: [
            { warehouseId: whA.id, quantity: 2 },
            { warehouseId: whB.id, quantity: 5 },
          ],
        },
      },
    })

    const res = await salePOST(
      makeJsonRequest("POST", "/api/sales", {
        warehouseId: whA.id,
        items: [{ productId: product.id, quantity: 2, unitPrice: 10 }],
        paymentMethod: "CASH",
      }) as any
    )
    expect(res.status).toBe(201)

    const siA = await testDb.stockItem.findUnique({
      where: { productId_warehouseId: { productId: product.id, warehouseId: whA.id } },
    })
    const siB = await testDb.stockItem.findUnique({
      where: { productId_warehouseId: { productId: product.id, warehouseId: whB.id } },
    })

    expect(siA?.quantity).toBe(0) // decremented
    expect(siB?.quantity).toBe(5) // untouched
  })
})
