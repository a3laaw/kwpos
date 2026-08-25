/**
 * Test 12 — Composition production: create composition + produce a batch.
 *
 * High-risk module: stock consumption + creation. Producing a batch must
 * atomically (a) decrement each ingredient's StockItem, (b) increment the
 * output product's StockItem, and (c) sync the derived Product.quantity
 * aggregate. Insufficient ingredients must roll back the entire batch.
 *
 * Routes covered:
 *   - POST /api/compositions             — create composition (validates ingredients)
 *   - POST /api/compositions/[id]/produce — produce a batch (decrement/increment stock)
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

import { POST as compositionPOST } from "@/app/api/compositions/route"
import { POST as producePOST } from "@/app/api/compositions/[id]/produce/route"

let adminId: string
let warehouseId: string

beforeEach(async () => {
  await resetDatabase()
  const seed = await seedBaseFixtures()
  adminId = seed.adminId
  // Produce route uses getDefaultWarehouseId(tx) — needs an active warehouse.
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

/** Create a product + a StockItem in the warehouse with `quantity` units. */
async function makeProduct(opts: {
  name: string
  costPrice?: number
  salePrice?: number
  quantity?: number
}): Promise<{ id: string; costPrice: number; salePrice: number }> {
  const p = await testDb.product.create({
    data: {
      name: opts.name,
      salePrice: opts.salePrice ?? 0,
      costPrice: opts.costPrice ?? 0,
      quantity: opts.quantity ?? 0,
      stockItems:
        opts.quantity !== undefined
          ? { create: [{ warehouseId, quantity: opts.quantity }] }
          : undefined,
    },
  })
  return { id: p.id, costPrice: opts.costPrice ?? 0, salePrice: opts.salePrice ?? 0 }
}

/** Build a NextRequest with a path param for the [id] route. */
function makeProduceRequest(id: string, body: unknown = {}) {
  return makeJsonRequest("POST", `/api/compositions/${id}/produce`, body)
}

// ── Tests: POST /api/compositions — create ─────────────────────────────────
describe("POST /api/compositions — create composition", () => {
  it("creates a composition with valid ingredients (201)", async () => {
    const ingredient = await makeProduct({ name: "Flour", costPrice: 0.05, salePrice: 0.10 })
    const output = await makeProduct({ name: "Bread", costPrice: 0.50, salePrice: 1.00 })

    const res = await compositionPOST(
      makeJsonRequest("POST", "/api/compositions", {
        name: "Bread Recipe " + Math.random().toString(36).slice(2, 6),
        outputProductId: output.id,
        yieldQty: 10,
        yieldUnit: "قطعة",
        isActive: true,
        ingredients: [{ productId: ingredient.id, quantity: 500, unit: "جرام" }],
      }) as any
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.name).toContain("Bread Recipe")
    expect(body.yieldQty).toBe(10)
    expect(body.ingredients).toHaveLength(1)
    expect(body.ingredients[0].quantity).toBe(500)

    // Persisted with the ingredient link.
    const persisted = await testDb.composition.findUnique({
      where: { id: body.id },
      include: { ingredients: true },
    })
    expect(persisted?.ingredients).toHaveLength(1)
    expect(persisted?.isActive).toBe(true)
  })

  it("rejects with 400 when ingredients array is empty (ingredients-required)", async () => {
    const output = await makeProduct({ name: "Empty Comp Output", costPrice: 0.50, salePrice: 1.00 })

    const res = await compositionPOST(
      makeJsonRequest("POST", "/api/compositions", {
        name: "Empty Comp " + Math.random().toString(36).slice(2, 6),
        outputProductId: output.id,
        yieldQty: 5,
        ingredients: [],
      }) as any
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe("ingredients-required")
  })

  it("rejects with 400 when an ingredient productId does not exist (invalid-product)", async () => {
    const output = await makeProduct({ name: "Invalid Ing Output", costPrice: 0.50, salePrice: 1.00 })

    const res = await compositionPOST(
      makeJsonRequest("POST", "/api/compositions", {
        name: "Invalid Ing Comp " + Math.random().toString(36).slice(2, 6),
        outputProductId: output.id,
        yieldQty: 5,
        ingredients: [{ productId: "nonexistent-product-id", quantity: 100, unit: "جرام" }],
      }) as any
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe("invalid-product")
  })

  it("rejects with 400 when outputProductId is missing (output-product-required)", async () => {
    const ingredient = await makeProduct({ name: "Sugar", costPrice: 0.04, salePrice: 0.08 })

    const res = await compositionPOST(
      makeJsonRequest("POST", "/api/compositions", {
        name: "Missing Output Comp " + Math.random().toString(36).slice(2, 6),
        yieldQty: 5,
        ingredients: [{ productId: ingredient.id, quantity: 100, unit: "جرام" }],
      }) as any
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe("output-product-required")
  })

  it("rejects with 400 when name is missing (name-required)", async () => {
    const ingredient = await makeProduct({ name: "Salt", costPrice: 0.01, salePrice: 0.02 })
    const output = await makeProduct({ name: "Salted Output", costPrice: 0.50, salePrice: 1.00 })

    const res = await compositionPOST(
      makeJsonRequest("POST", "/api/compositions", {
        outputProductId: output.id,
        yieldQty: 5,
        ingredients: [{ productId: ingredient.id, quantity: 10, unit: "جرام" }],
      }) as any
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe("name-required")
  })

  it("rejects with 409 when a composition with the same name already exists", async () => {
    const ingredient = await makeProduct({ name: "Egg", costPrice: 0.10, salePrice: 0.20 })
    const output = await makeProduct({ name: "Omelette", costPrice: 0.50, salePrice: 1.00 })

    const firstRes = await compositionPOST(
      makeJsonRequest("POST", "/api/compositions", {
        name: "Unique Comp Name",
        outputProductId: output.id,
        yieldQty: 5,
        ingredients: [{ productId: ingredient.id, quantity: 2, unit: "قطعة" }],
      }) as any
    )
    expect(firstRes.status).toBe(201)

    const secondRes = await compositionPOST(
      makeJsonRequest("POST", "/api/compositions", {
        name: "Unique Comp Name", // same name — should reject
        outputProductId: output.id,
        yieldQty: 5,
        ingredients: [{ productId: ingredient.id, quantity: 2, unit: "قطعة" }],
      }) as any
    )
    expect(secondRes.status).toBe(409)
    expect((await secondRes.json()).error).toBe("name-exists")
  })
})

// ── Tests: POST /api/compositions/[id]/produce ─────────────────────────────
describe("POST /api/compositions/[id]/produce — produce a batch", () => {
  /** Build a composition with the given ingredient stocks. */
  async function makeComposition(opts: {
    name: string
    output: { id: string }
    ingredients: Array<{ product: { id: string }; quantity: number }>
    yieldQty?: number
    isActive?: boolean
  }): Promise<string> {
    const comp = await testDb.composition.create({
      data: {
        name: opts.name,
        outputProductId: opts.output.id,
        yieldQty: opts.yieldQty ?? 1,
        isActive: opts.isActive ?? true,
        ingredients: {
          create: opts.ingredients.map((ing) => ({
            productId: ing.product.id,
            quantity: ing.quantity,
            unit: "جرام",
          })),
        },
      },
    })
    return comp.id
  }

  it("produces the output product (StockItem is incremented by `batches`)", async () => {
    const ingredient = await makeProduct({ name: "Ing-A", costPrice: 0.05, quantity: 1000 })
    const output = await makeProduct({ name: "Out-A", costPrice: 0.50, quantity: 0 })
    const compId = await makeComposition({
      name: "Comp Produce 1",
      output,
      ingredients: [{ product: ingredient, quantity: 100 }],
      yieldQty: 1,
    })

    // Output starts at 0 stock; produce 3 batches.
    const res = await producePOST(
      makeProduceRequest(compId, { batches: 3 }) as any,
      { params: Promise.resolve({ id: compId }) } as any
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.produced).toBe(3)

    // Output StockItem was incremented by 3.
    const outSi = await testDb.stockItem.findUnique({
      where: { productId_warehouseId: { productId: output.id, warehouseId } },
    })
    expect(outSi?.quantity).toBe(3)
  })

  it("consumes the input ingredients (each StockItem decremented by quantity × batches)", async () => {
    const ingredient = await makeProduct({ name: "Ing-B", costPrice: 0.05, quantity: 1000 })
    const output = await makeProduct({ name: "Out-B", costPrice: 0.50, quantity: 0 })
    const compId = await makeComposition({
      name: "Comp Produce 2",
      output,
      ingredients: [{ product: ingredient, quantity: 50 }],
      yieldQty: 1,
    })

    const res = await producePOST(
      makeProduceRequest(compId, { batches: 4 }) as any,
      { params: Promise.resolve({ id: compId }) } as any
    )
    expect(res.status).toBe(200)

    // Ingredient StockItem = 1000 - (50 × 4) = 800.
    const ingSi = await testDb.stockItem.findUnique({
      where: { productId_warehouseId: { productId: ingredient.id, warehouseId } },
    })
    expect(ingSi?.quantity).toBe(800)
  })

  it("rejects with 400 when ingredients are insufficient (insufficient-stock)", async () => {
    // Ingredient has only 100 units; recipe needs 50 × 3 = 150 → insufficient.
    const ingredient = await makeProduct({ name: "Ing-C", costPrice: 0.05, quantity: 100 })
    const output = await makeProduct({ name: "Out-C", costPrice: 0.50, quantity: 0 })
    const compId = await makeComposition({
      name: "Comp Produce 3",
      output,
      ingredients: [{ product: ingredient, quantity: 50 }],
      yieldQty: 1,
    })

    const res = await producePOST(
      makeProduceRequest(compId, { batches: 3 }) as any,
      { params: Promise.resolve({ id: compId }) } as any
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("insufficient-stock")
    expect(body.ingredients).toHaveLength(1)
    expect(body.ingredients[0].required).toBe(150)
    expect(body.ingredients[0].available).toBe(100)

    // No mutation: ingredient stock unchanged, output stock still 0.
    const ingSi = await testDb.stockItem.findUnique({
      where: { productId_warehouseId: { productId: ingredient.id, warehouseId } },
    })
    expect(ingSi?.quantity).toBe(100)
    const outSi = await testDb.stockItem.findUnique({
      where: { productId_warehouseId: { productId: output.id, warehouseId } },
    })
    expect(outSi?.quantity).toBe(0)
  })

  it("rejects with 404 when composition id does not exist", async () => {
    const res = await producePOST(
      makeProduceRequest("nonexistent-comp-id", { batches: 1 }) as any,
      { params: Promise.resolve({ id: "nonexistent-comp-id" }) } as any
    )
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe("not-found")
  })

  it("accepts the request when composition is inactive (route does not gate on isActive)", async () => {
    // The produce route does NOT check isActive — it only checks the
    // composition exists. Inactive compositions can still be produced
    // (admin override). Verify the route accepts the call when isActive=false.
    const ingredient = await makeProduct({ name: "Ing-D", costPrice: 0.05, quantity: 1000 })
    const output = await makeProduct({ name: "Out-D", costPrice: 0.50, quantity: 0 })
    const compId = await makeComposition({
      name: "Comp Produce 4",
      output,
      ingredients: [{ product: ingredient, quantity: 100 }],
      yieldQty: 1,
      isActive: false, // INACTIVE — but route still produces
    })

    const res = await producePOST(
      makeProduceRequest(compId, { batches: 1 }) as any,
      { params: Promise.resolve({ id: compId }) } as any
    )
    expect(res.status).toBe(200)
    expect((await res.json()).produced).toBe(1)
  })

  it("rejects with 403 when user role is not OWNER/ADMIN/WAREHOUSE", async () => {
    // Downgrade to SALES — produce is admin/warehouse only.
    mockGetCurrentUser.mockResolvedValue({
      id: adminId,
      name: "Sales User",
      email: "sales@test.local",
      role: "SALES",
    })

    const ingredient = await makeProduct({ name: "Ing-E", costPrice: 0.05, quantity: 1000 })
    const output = await makeProduct({ name: "Out-E", costPrice: 0.50, quantity: 0 })
    const compId = await makeComposition({
      name: "Comp Produce 5",
      output,
      ingredients: [{ product: ingredient, quantity: 100 }],
      yieldQty: 1,
    })

    const res = await producePOST(
      makeProduceRequest(compId, { batches: 1 }) as any,
      { params: Promise.resolve({ id: compId }) } as any
    )
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe("forbidden")
  })

  it("produces multiple ingredients in one batch (each decremented atomically)", async () => {
    const ing1 = await makeProduct({ name: "Multi-Ing-1", costPrice: 0.05, quantity: 500 })
    const ing2 = await makeProduct({ name: "Multi-Ing-2", costPrice: 0.10, quantity: 500 })
    const output = await makeProduct({ name: "Multi-Out", costPrice: 1.00, quantity: 0 })
    const compId = await makeComposition({
      name: "Comp Produce Multi",
      output,
      ingredients: [
        { product: ing1, quantity: 100 },
        { product: ing2, quantity: 50 },
      ],
      yieldQty: 1,
    })

    // Produce 2 batches: ing1 consumed = 200, ing2 consumed = 100.
    const res = await producePOST(
      makeProduceRequest(compId, { batches: 2 }) as any,
      { params: Promise.resolve({ id: compId }) } as any
    )
    expect(res.status).toBe(200)

    const si1 = await testDb.stockItem.findUnique({
      where: { productId_warehouseId: { productId: ing1.id, warehouseId } },
    })
    const si2 = await testDb.stockItem.findUnique({
      where: { productId_warehouseId: { productId: ing2.id, warehouseId } },
    })
    const outSi = await testDb.stockItem.findUnique({
      where: { productId_warehouseId: { productId: output.id, warehouseId } },
    })
    expect(si1?.quantity).toBe(300) // 500 - 200
    expect(si2?.quantity).toBe(400) // 500 - 100
    expect(outSi?.quantity).toBe(2) // 0 + 2
  })
})
