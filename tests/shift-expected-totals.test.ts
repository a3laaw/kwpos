/**
 * Test 5 — Shift close: expected totals are filtered by userId only.
 *
 * Business rule: when closing a shift, the system recomputes expected
 * cash/knet/visa from sales created by THAT SHIFT'S USER (not all sales)
 * during the shift's time window [openedAt, now]. This prevents one
 * cashier's sales from inflating another cashier's expected totals when
 * multiple cashiers work overlapping shifts.
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

import { POST as shiftPOST, PATCH as shiftPATCH } from "@/app/api/shifts/route"

let adminId: string
let cashier1Id: string
let cashier2Id: string

beforeEach(async () => {
  await resetDatabase()
  const seed = await seedBaseFixtures()
  adminId = seed.adminId

  cashier1Id = (
    await testDb.user.create({
      data: {
        email: "cashier1@test.local",
        name: "Cashier One",
        passwordHash: "x",
        role: "SALES",
      },
    })
  ).id
  cashier2Id = (
    await testDb.user.create({
      data: {
        email: "cashier2@test.local",
        name: "Cashier Two",
        passwordHash: "x",
        role: "SALES",
      },
    })
  ).id

  mockGetCurrentUser.mockReset()
})

afterAll(async () => {
  await testDb.$disconnect()
})

describe("Shift close — expected totals filtered by userId", () => {
  it("cashier1's shift sees only cashier1's sales (500), not cashier2's (300)", async () => {
    // 1) Open shift1 as cashier1.
    mockGetCurrentUser.mockResolvedValue({
      id: cashier1Id,
      name: "Cashier One",
      email: "cashier1@test.local",
      role: "SALES",
    })
    const openRes1 = await shiftPOST(
      makeJsonRequest("POST", "/api/shifts", { openingBalance: 0 }) as any
    )
    expect(openRes1.status).toBe(201)
    const shift1 = await openRes1.json()

    // 2) Record sales for cashier1 totaling 500 (CASH).
    for (let i = 0; i < 5; i++) {
      await testDb.sale.create({
        data: {
          invoiceNo: `INV-C1-${i}`,
          userId: cashier1Id,
          subtotal: 100,
          taxRate: 0,
          taxAmount: 0,
          total: 100,
          paid: 100,
          paymentMethod: "CASH",
        },
      })
    }

    // 3) Open shift2 as cashier2.
    mockGetCurrentUser.mockResolvedValue({
      id: cashier2Id,
      name: "Cashier Two",
      email: "cashier2@test.local",
      role: "SALES",
    })
    const openRes2 = await shiftPOST(
      makeJsonRequest("POST", "/api/shifts", { openingBalance: 0 }) as any
    )
    expect(openRes2.status).toBe(201)
    const shift2 = await openRes2.json()

    // 4) Record sales for cashier2 totaling 300 (CASH).
    for (let i = 0; i < 3; i++) {
      await testDb.sale.create({
        data: {
          invoiceNo: `INV-C2-${i}`,
          userId: cashier2Id,
          subtotal: 100,
          taxRate: 0,
          taxAmount: 0,
          total: 100,
          paid: 100,
          paymentMethod: "CASH",
        },
      })
    }

    // Sanity: aggregate sales = 800 across both cashiers, but each shift
    // must only see its own user's sales.
    const allSales = await testDb.sale.count()
    expect(allSales).toBe(8)

    // 5) Close shift1 (as admin) → expectedCash should be 500, NOT 800.
    mockGetCurrentUser.mockResolvedValue({
      id: adminId,
      name: "Test Admin",
      email: "admin@test.local",
      role: "ADMIN",
    })
    const closeRes1 = await shiftPATCH(
      makeJsonRequest("PATCH", "/api/shifts", {
        id: shift1.id,
        countedCash: 500, // matches expected → variance 0
        countedKnet: 0,
        countedVisa: 0,
      }) as any
    )
    expect(closeRes1.status).toBe(200)
    const closed1 = await closeRes1.json()
    expect(closed1.expectedCash).toBeCloseTo(500, 3)
    expect(closed1.expectedKnet).toBeCloseTo(0, 3)
    expect(closed1.expectedVisa).toBeCloseTo(0, 3)
    expect(closed1.cashVariance).toBeCloseTo(0, 3)

    // 6) Close shift2 → expectedCash should be 300.
    const closeRes2 = await shiftPATCH(
      makeJsonRequest("PATCH", "/api/shifts", {
        id: shift2.id,
        countedCash: 300,
        countedKnet: 0,
        countedVisa: 0,
      }) as any
    )
    expect(closeRes2.status).toBe(200)
    const closed2 = await closeRes2.json()
    expect(closed2.expectedCash).toBeCloseTo(300, 3)
    expect(closed2.cashVariance).toBeCloseTo(0, 3)
  })
})
