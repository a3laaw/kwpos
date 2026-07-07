/**
 * Test 6 — VAT report: PO receive with taxRate > 0 contributes input VAT;
 * posting an invoice for the same PO does not double-count.
 *
 * Business rule: input VAT is the sum of:
 *   - Σ PurchaseInvoice.taxAmount where status = POSTED   (inputVatInvoices)
 *   - Σ PurchaseOrder.receivedTaxAmount where status = RECEIVED AND the PO
 *     has NO linked POSTED PurchaseInvoice                  (inputVatPOReceives)
 *
 * This split prevents double-counting: a PO whose VAT was already counted
 * at receive time is excluded from the PO-receive bucket once a posted
 * PurchaseInvoice exists for it (the VAT moves to inputVatInvoices).
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

import { POST as receivePOST } from "@/app/api/purchase-orders/[id]/receive/route"
import { POST as purchaseInvoicePOST } from "@/app/api/purchase-invoices/route"
import { GET as vatGET } from "@/app/api/financial-reports/vat/route"

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

async function fetchVatReport(): Promise<{
  outputVat: number
  inputVatInvoices: number
  inputVatPOReceives: number
  inputVat: number
  netVat: number
}> {
  const res = await vatGET(makeJsonRequest("GET", "/api/financial-reports/vat") as any)
  expect(res.status).toBe(200)
  return res.json()
}

describe("VAT report — PO receive vs posted invoice (no double-count)", () => {
  it("counts inputVatPOReceives after receive; moves to inputVatInvoices after posting", async () => {
    // ── Setup: supplier + warehouse + product ──
    const supplier = await testDb.supplier.create({ data: { name: "VAT Supplier" } })
    const wh = await testDb.warehouse.create({ data: { name: "WH", code: "W" } })
    const product = await testDb.product.create({
      data: { name: "VAT Product", costPrice: 100, salePrice: 150, quantity: 0 },
    })

    // ── Create a PO with taxRate=5, items subtotal=1000 ──
    const po = await testDb.purchaseOrder.create({
      data: {
        supplierId: supplier.id,
        warehouseId: wh.id,
        status: "PENDING",
        taxRate: 5,
        total: 1000,
        items: {
          create: [
            {
              productId: product.id,
              quantity: 10,
              unitCost: 100,
              subtotal: 1000,
            },
          ],
        },
      },
    })

    // ── 1) Receive the PO ──
    const receiveRes = await receivePOST(
      makeJsonRequest("POST", `/api/purchase-orders/${po.id}/receive`, {}) as any,
      { params: Promise.resolve({ id: po.id }) }
    )
    expect(receiveRes.status).toBe(200)
    const received = await receiveRes.json()
    // receivedTaxAmount = subtotal × taxRate / 100 = 1000 × 5 / 100 = 50
    expect(Number(received.receivedTaxAmount)).toBeCloseTo(50, 3)

    // ── 2) VAT report: inputVatPOReceives = 50, inputVatInvoices = 0 ──
    const vat1 = await fetchVatReport()
    expect(vat1.inputVatPOReceives).toBeCloseTo(50, 3)
    expect(vat1.inputVatInvoices).toBeCloseTo(0, 3)
    expect(vat1.inputVat).toBeCloseTo(50, 3)

    // ── 3) Create + POST a PurchaseInvoice for the same PO with taxAmount=50 ──
    const invRes = await purchaseInvoicePOST(
      makeJsonRequest("POST", "/api/purchase-invoices", {
        supplierId: supplier.id,
        warehouseId: wh.id,
        purchaseOrderId: po.id,
        taxRate: 5,
        items: [{ productId: product.id, quantity: 10, unitCost: 100 }],
        post: true,
      }) as any
    )
    expect(invRes.status).toBe(201)
    const inv = await invRes.json()
    expect(Number(inv.taxAmount)).toBeCloseTo(50, 3)
    expect(inv.status).toBe("POSTED")

    // ── 4) VAT report: inputVatPOReceives = 0 (excluded), inputVatInvoices = 50 ──
    const vat2 = await fetchVatReport()
    expect(vat2.inputVatPOReceives).toBeCloseTo(0, 3)
    expect(vat2.inputVatInvoices).toBeCloseTo(50, 3)
    // Total input VAT unchanged — no double-counting.
    expect(vat2.inputVat).toBeCloseTo(50, 3)
  })
})
