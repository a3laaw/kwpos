/**
 * Test 7 — Bundles & Compositions: pure serializer math.
 *
 * Tests the bundle cost/profit calculation and composition production cost
 * logic that lives in `src/lib/serialize/bundles.ts` and
 * `src/lib/serialize/compositions.ts`. These functions are PURE (no DB, no
 * side effects) — they take a Prisma-shaped row and return a serialized
 * object with derived fields like `totalCost`, `profit`, `costPerUnit`.
 *
 * Also covers `stripBundleCost` (in `src/lib/permissions.ts`), which zeros
 * out cost/profit fields for roles that aren't allowed to see them.
 *
 * No DB integration — these tests run entirely in-process and don't touch
 * the SQLite test DB. They DO load the per-file setup.ts (which instantiates
 * the Prisma client) but never call it. This keeps them FAST (a few ms).
 */
import { describe, expect, it } from "vitest"
import {
  serializeBundle,
  serializeComposition,
} from "@/lib/serialize"
import { stripBundleCost } from "@/lib/permissions"
import type { Role } from "@/lib/types"

// ── Helpers ──────────────────────────────────────────────────────────────
/** Build a minimal product row that the serializer understands. */
function productRow(opts: {
  id?: string
  name?: string
  costPrice?: number
  salePrice?: number
  wholesalePrice?: number
  corporatePrice?: number
  quantity?: number
}) {
  return {
    id: opts.id ?? "p1",
    name: opts.name ?? "P",
    barcode: null,
    categoryId: null,
    supplierId: null,
    quantity: opts.quantity ?? 0,
    reorderLevel: 0,
    optimalOrderQty: 0,
    costPrice: opts.costPrice ?? 0,
    salePrice: opts.salePrice ?? 0,
    wholesalePrice: opts.wholesalePrice ?? 0,
    corporatePrice: opts.corporatePrice ?? 0,
    taxRate: 0,
    unit: "قطعة",
    unitId: null,
    imageUrl: null,
    isManufactured: false,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  }
}

/** Build a bundle row that the serializer understands. */
function bundleRow(
  items: Array<{ productId: string; quantity: number; product: any }>,
  salePrice: number,
  opts: Partial<{ name: string; isActive: boolean }> = {}
) {
  return {
    id: "b1",
    name: opts.name ?? "Bundle",
    description: null,
    imageUrl: null,
    salePrice,
    isActive: opts.isActive ?? true,
    startDate: null,
    endDate: null,
    category: null,
    createdAt: new Date("2024-01-01"),
    items: items.map((it, i) => ({
      id: `bi${i + 1}`,
      bundleId: "b1",
      productId: it.productId,
      quantity: it.quantity,
      product: it.product,
    })),
  }
}

/** Build a composition row that the serializer understands. */
function compositionRow(
  ingredients: Array<{ productId: string; quantity: number; product: any }>,
  yieldQty: number,
  opts: Partial<{ name: string; yieldUnit: string; outputProduct: any }> = {}
) {
  return {
    id: "c1",
    name: opts.name ?? "Composition",
    description: null,
    imageUrl: null,
    outputProductId: "out1",
    yieldQty,
    yieldUnit: opts.yieldUnit ?? "قطعة",
    isActive: true,
    notes: null,
    createdAt: new Date("2024-01-01"),
    outputProduct: opts.outputProduct,
    ingredients: ingredients.map((ing, i) => ({
      id: `ci${i + 1}`,
      compositionId: "c1",
      productId: ing.productId,
      quantity: ing.quantity,
      unit: "جرام",
      notes: null,
      product: ing.product,
    })),
  }
}

// ── Tests: serializeBundle cost/profit math ──────────────────────────────
describe("serializeBundle — cost/profit calculations", () => {
  it("totalCost = Σ(item.product.costPrice × item.quantity)", () => {
    const b = bundleRow(
      [
        { productId: "p1", quantity: 2, product: productRow({ id: "p1", costPrice: 5 }) },
        { productId: "p2", quantity: 3, product: productRow({ id: "p2", costPrice: 10 }) },
      ],
      /* salePrice */ 50
    )
    const out = serializeBundle(b as any)
    // 2×5 + 3×10 = 10 + 30 = 40
    expect(out.totalCost).toBeCloseTo(40, 3)
  })

  it("itemsRetailTotal = Σ(item.product.salePrice × item.quantity)", () => {
    const b = bundleRow(
      [
        { productId: "p1", quantity: 2, product: productRow({ id: "p1", salePrice: 8 }) },
        { productId: "p2", quantity: 3, product: productRow({ id: "p2", salePrice: 15 }) },
      ],
      /* salePrice */ 50
    )
    const out = serializeBundle(b as any)
    // 2×8 + 3×15 = 16 + 45 = 61
    expect(out.itemsRetailTotal).toBeCloseTo(61, 3)
  })

  it("profit = salePrice − totalCost", () => {
    const b = bundleRow(
      [
        { productId: "p1", quantity: 2, product: productRow({ id: "p1", costPrice: 5 }) },
      ],
      /* salePrice */ 30
    )
    const out = serializeBundle(b as any)
    // 30 − (2×5) = 30 − 10 = 20
    expect(out.profit).toBeCloseTo(20, 3)
  })

  it("profit is negative when salePrice < totalCost (lossy bundle)", () => {
    const b = bundleRow(
      [
        { productId: "p1", quantity: 5, product: productRow({ id: "p1", costPrice: 10 }) },
      ],
      /* salePrice */ 40 // cost = 50, profit = -10
    )
    const out = serializeBundle(b as any)
    expect(out.profit).toBeCloseTo(-10, 3)
  })

  it("discountPct = (itemsRetailTotal − salePrice) / itemsRetailTotal × 100", () => {
    const b = bundleRow(
      [
        { productId: "p1", quantity: 2, product: productRow({ id: "p1", salePrice: 10 }) },
      ],
      /* salePrice */ 15 // retail total = 20, discount = (20-15)/20 = 25%
    )
    const out = serializeBundle(b as any)
    expect(out.discountPct).toBeCloseTo(25, 3)
  })

  it("discountPct = 0 when itemsRetailTotal = 0 (avoid div-by-zero)", () => {
    const b = bundleRow(
      [
        { productId: "p1", quantity: 2, product: productRow({ id: "p1", salePrice: 0 }) },
      ],
      /* salePrice */ 15
    )
    const out = serializeBundle(b as any)
    expect(out.discountPct).toBe(0)
    expect(out.itemsRetailTotal).toBe(0)
  })

  it("handles missing items array (empty bundle)", () => {
    const b = {
      id: "b1",
      name: "Empty",
      description: null,
      imageUrl: null,
      salePrice: 10,
      isActive: true,
      startDate: null,
      endDate: null,
      category: null,
      createdAt: new Date("2024-01-01"),
      // items: undefined
    }
    const out = serializeBundle(b as any)
    expect(out.items).toEqual([])
    expect(out.totalCost).toBe(0)
    expect(out.profit).toBe(10)
    expect(out.discountPct).toBe(0)
  })

  it("handles items with missing product (treats cost/sale as 0)", () => {
    const b = bundleRow(
      [
        { productId: "p1", quantity: 2, product: undefined as any },
        { productId: "p2", quantity: 3, product: productRow({ id: "p2", costPrice: 4, salePrice: 6 }) },
      ],
      /* salePrice */ 30
    )
    const out = serializeBundle(b as any)
    // totalCost = 0 (no product) + 3×4 = 12
    expect(out.totalCost).toBeCloseTo(12, 3)
    // itemsRetailTotal = 0 + 3×6 = 18
    expect(out.itemsRetailTotal).toBeCloseTo(18, 3)
    // profit = 30 − 12 = 18
    expect(out.profit).toBeCloseTo(18, 3)
  })
})

// ── Tests: serializeComposition cost-per-batch/unit math ──────────────────
describe("serializeComposition — production cost math", () => {
  it("costPerBatch = Σ(ingredient.product.costPrice × ingredient.quantity)", () => {
    const c = compositionRow(
      [
        { productId: "ing1", quantity: 100, product: productRow({ id: "ing1", costPrice: 0.05 }) },
        { productId: "ing2", quantity: 50, product: productRow({ id: "ing2", costPrice: 0.20 }) },
      ],
      /* yieldQty */ 10
    )
    const out = serializeComposition(c as any)
    // 100×0.05 + 50×0.20 = 5 + 10 = 15
    expect(out.costPerBatch).toBeCloseTo(15, 3)
  })

  it("costPerUnit = costPerBatch / yieldQty", () => {
    const c = compositionRow(
      [
        { productId: "ing1", quantity: 100, product: productRow({ id: "ing1", costPrice: 0.05 }) },
      ],
      /* yieldQty */ 20
    )
    const out = serializeComposition(c as any)
    // costPerBatch = 5, yieldQty = 20 → 5/20 = 0.25
    expect(out.costPerUnit).toBeCloseTo(0.25, 3)
  })

  it("costPerUnit = 0 when yieldQty = 0 (avoid div-by-zero)", () => {
    const c = compositionRow(
      [
        { productId: "ing1", quantity: 100, product: productRow({ id: "ing1", costPrice: 0.05 }) },
      ],
      /* yieldQty */ 0
    )
    const out = serializeComposition(c as any)
    // costPerBatch is still computed, but costPerUnit is 0 (guarded)
    expect(out.costPerBatch).toBeCloseTo(5, 3)
    expect(out.costPerUnit).toBe(0)
  })

  it("handles missing ingredients array (empty composition)", () => {
    const c = {
      id: "c1",
      name: "Empty",
      description: null,
      imageUrl: null,
      outputProductId: "out1",
      yieldQty: 10,
      yieldUnit: "قطعة",
      isActive: true,
      notes: null,
      createdAt: new Date("2024-01-01"),
      outputProduct: undefined,
      // ingredients: undefined
    }
    const out = serializeComposition(c as any)
    expect(out.ingredients).toEqual([])
    expect(out.costPerBatch).toBe(0)
    expect(out.costPerUnit).toBe(0)
  })

  it("handles ingredients with missing product (treats cost as 0)", () => {
    const c = compositionRow(
      [
        { productId: "ing1", quantity: 100, product: undefined as any },
        { productId: "ing2", quantity: 50, product: productRow({ id: "ing2", costPrice: 0.20 }) },
      ],
      /* yieldQty */ 10
    )
    const out = serializeComposition(c as any)
    // costPerBatch = 0 (no product) + 50×0.20 = 10
    expect(out.costPerBatch).toBeCloseTo(10, 3)
    // costPerUnit = 10 / 10 = 1
    expect(out.costPerUnit).toBeCloseTo(1, 3)
  })

  it("serializes ingredient unit + notes correctly", () => {
    const c = {
      id: "c1",
      name: "Comp",
      description: null,
      imageUrl: null,
      outputProductId: "out1",
      yieldQty: 5,
      yieldUnit: "قطعة",
      isActive: true,
      notes: "batch note",
      createdAt: new Date("2024-01-01"),
      outputProduct: undefined,
      ingredients: [
        {
          id: "ci1",
          compositionId: "c1",
          productId: "ing1",
          quantity: 100,
          unit: "مل",
          notes: "stir well",
          product: productRow({ id: "ing1", costPrice: 0.05 }),
        },
      ],
    }
    const out = serializeComposition(c as any)
    expect(out.ingredients).toHaveLength(1)
    expect(out.ingredients[0].unit).toBe("مل")
    expect(out.ingredients[0].notes).toBe("stir well")
    expect(out.ingredients[0].quantity).toBe(100)
    expect(out.notes).toBe("batch note")
  })
})

// ── Tests: stripBundleCost (role-based field stripping) ──────────────────
describe("stripBundleCost — role-based cost stripping", () => {
  const bundleWithCost = {
    id: "b1",
    name: "Bundle",
    salePrice: 50,
    totalCost: 30,
    profit: 20,
    items: [
      {
        id: "bi1",
        productId: "p1",
        quantity: 2,
        product: { id: "p1", name: "P1", costPrice: 5, salePrice: 10 },
      },
      {
        id: "bi2",
        productId: "p2",
        quantity: 1,
        product: { id: "p2", name: "P2", costPrice: 20, salePrice: 40 },
      },
    ],
  }

  it("ADMIN sees cost/profit unchanged", () => {
    const out = stripBundleCost(bundleWithCost, "ADMIN" as Role)
    expect(out.totalCost).toBe(30)
    expect(out.profit).toBe(20)
    expect(out.items[0].product.costPrice).toBe(5)
    expect(out.items[1].product.costPrice).toBe(20)
  })

  it("WAREHOUSE sees cost/profit unchanged", () => {
    const out = stripBundleCost(bundleWithCost, "WAREHOUSE" as Role)
    expect(out.totalCost).toBe(30)
    expect(out.profit).toBe(20)
  })

  it("SALES gets cost/profit zeroed + per-item costPrice zeroed", () => {
    const out = stripBundleCost(bundleWithCost, "SALES" as Role)
    expect(out.totalCost).toBe(0)
    expect(out.profit).toBe(0)
    // salePrice is preserved
    expect(out.salePrice).toBe(50)
    // Each item's product costPrice is zeroed
    expect(out.items[0].product.costPrice).toBe(0)
    expect(out.items[1].product.costPrice).toBe(0)
    // Non-cost fields preserved
    expect(out.items[0].product.salePrice).toBe(10)
    expect(out.items[1].product.salePrice).toBe(40)
    expect(out.items[0].product.name).toBe("P1")
  })

  it("CASHIER gets cost/profit zeroed (same as SALES)", () => {
    const out = stripBundleCost(bundleWithCost, "CASHIER" as Role)
    expect(out.totalCost).toBe(0)
    expect(out.profit).toBe(0)
    expect(out.items[0].product.costPrice).toBe(0)
  })

  it("preserves items without a product (no crash)", () => {
    const bundleMissingProduct = {
      ...bundleWithCost,
      items: [
        { id: "bi1", productId: "p1", quantity: 2 /* no product key */ },
      ],
    }
    const out = stripBundleCost(bundleMissingProduct, "SALES" as Role)
    expect(out.totalCost).toBe(0)
    expect(out.profit).toBe(0)
    // item is passed through unchanged (no product to strip)
    expect(out.items[0]).toEqual(bundleMissingProduct.items[0])
  })
})
