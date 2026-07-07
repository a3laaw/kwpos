/**
 * Test 4 — Supplier payment limit: payment exceeding outstanding balance is
 * rejected (400); admin override is accepted (201); payment within balance
 * is accepted (201).
 *
 * Business rule: outstanding = Σ POSTED PurchaseInvoices.total
 *                                 − Σ SupplierPayments.amount
 *                                 − Σ PurchaseReturns.total
 * A payment with amount > outstanding + 0.001 is rejected with 400
 * "exceeds-balance" UNLESS the caller is ADMIN AND body.override === true.
 *
 * Each sub-scenario uses a FRESH supplier with outstanding = 100 so the
 * scenarios are independent.
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

import { POST as supplierPaymentPOST } from "@/app/api/supplier-payments/route"

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

/**
 * Create a supplier with outstanding balance = `amount` by inserting a
 * POSTED PurchaseInvoice for that amount. Returns the supplier id.
 */
async function makeSupplierWithBalance(amount: number): Promise<string> {
  const supplier = await testDb.supplier.create({
    data: { name: "Supplier " + Math.random().toString(36).slice(2, 8) },
  })
  await testDb.purchaseInvoice.create({
    data: {
      invoiceNo: "PINV-" + Math.random().toString(36).slice(2, 8),
      supplierId: supplier.id,
      status: "POSTED",
      subtotal: amount,
      taxRate: 0,
      taxAmount: 0,
      discount: 0,
      shipping: 0,
      customs: 0,
      otherCharges: 0,
      total: amount,
    },
  })
  return supplier.id
}

describe("Supplier payment limit", () => {
  it("rejects payment that exceeds outstanding balance (400 exceeds-balance)", async () => {
    const supplierId = await makeSupplierWithBalance(100)

    const res = await supplierPaymentPOST(
      makeJsonRequest("POST", "/api/supplier-payments", {
        supplierId,
        amount: 150,
        paymentMethod: "CASH",
      }) as any
    )

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("exceeds-balance")
    expect(body.outstandingBalance).toBeCloseTo(100, 3)

    // No payment was recorded.
    const payments = await testDb.supplierPayment.count({ where: { supplierId } })
    expect(payments).toBe(0)
  })

  it("accepts over-balance payment when ADMIN + override=true (201)", async () => {
    const supplierId = await makeSupplierWithBalance(100)

    const res = await supplierPaymentPOST(
      makeJsonRequest("POST", "/api/supplier-payments", {
        supplierId,
        amount: 150,
        paymentMethod: "CASH",
        override: true,
      }) as any
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.amount).toBeCloseTo(150, 3)

    // Payment recorded + linked journal entry created.
    const payments = await testDb.supplierPayment.findMany({
      where: { supplierId },
    })
    expect(payments).toHaveLength(1)
    expect(payments[0].amount).toBeCloseTo(150, 3)
    expect(payments[0].journalEntryId).toBeTruthy()

    // Outstanding balance is now negative (over-paid): 100 − 150 = −50.
    const invoices = await testDb.purchaseInvoice.aggregate({
      where: { supplierId, status: "POSTED" },
      _sum: { total: true },
    })
    const pays = await testDb.supplierPayment.aggregate({
      where: { supplierId },
      _sum: { amount: true },
    })
    const outstanding =
      Number(invoices._sum.total || 0) - Number(pays._sum.amount || 0)
    expect(outstanding).toBeCloseTo(-50, 3)
  })

  it("accepts payment within outstanding balance without override (201)", async () => {
    const supplierId = await makeSupplierWithBalance(100)

    const res = await supplierPaymentPOST(
      makeJsonRequest("POST", "/api/supplier-payments", {
        supplierId,
        amount: 50,
        paymentMethod: "CASH",
      }) as any
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.amount).toBeCloseTo(50, 3)

    // Outstanding balance is now 100 − 50 = 50.
    const pays = await testDb.supplierPayment.aggregate({
      where: { supplierId },
      _sum: { amount: true },
    })
    expect(Number(pays._sum.amount || 0)).toBeCloseTo(50, 3)
  })

  it("rejects over-balance payment when override=true but user is NOT admin (403)", async () => {
    const supplierId = await makeSupplierWithBalance(100)

    // Downgrade the mocked user to WAREHOUSE — override requires ADMIN.
    mockGetCurrentUser.mockResolvedValue({
      id: adminId,
      name: "Warehouse User",
      email: "wh@test.local",
      role: "WAREHOUSE",
    })

    const res = await supplierPaymentPOST(
      makeJsonRequest("POST", "/api/supplier-payments", {
        supplierId,
        amount: 150,
        paymentMethod: "CASH",
        override: true,
      }) as any
    )

    // WAREHOUSE can call the route (allowed roles: ADMIN + WAREHOUSE) but
    // override has no effect → exceeds-balance.
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("exceeds-balance")
  })
})
