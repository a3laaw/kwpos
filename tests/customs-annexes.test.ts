/**
 * Test 10 — Customs Annex module: draft creation + posting (journal entry).
 *
 * High-risk module: financial + journal entries. The annex capitalizes
 * customs/shipping/tax/other charges into a POSTED purchase invoice and
 * creates a balanced journal entry (Debit 1100 Inventory / Credit
 * 1010|1020|2010 payment account).
 *
 * Routes covered:
 *   - POST /api/customs-annexes                  — create draft annex
 *   - GET  /api/customs-annexes                  — list annexes
 *   - POST /api/customs-annexes/[id]/post        — post annex (creates JE)
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

import { POST as annexPOST, GET as annexGET } from "@/app/api/customs-annexes/route"
import { POST as annexPostPOST } from "@/app/api/customs-annexes/[id]/post/route"

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

// ── Fixture helpers ──────────────────────────────────────────────────────

/** Create a supplier + a POSTED purchase invoice with the given subtotal. */
async function makePostedInvoice(subtotal = 1000): Promise<{
  supplierId: string
  invoiceId: string
}> {
  const supplier = await testDb.supplier.create({
    data: { name: "Customs Supplier " + Math.random().toString(36).slice(2, 6) },
  })
  const invoice = await testDb.purchaseInvoice.create({
    data: {
      invoiceNo: "PINV-" + Math.random().toString(36).slice(2, 10),
      supplierId: supplier.id,
      status: "POSTED",
      subtotal,
      taxRate: 0,
      taxAmount: 0,
      discount: 0,
      shipping: 0,
      customs: 0,
      otherCharges: 0,
      total: subtotal,
      paymentMethod: "CASH",
    },
  })
  return { supplierId: supplier.id, invoiceId: invoice.id }
}

/** Create a DRAFT purchase invoice (for the "invoice-not-posted" test). */
async function makeDraftInvoice(): Promise<string> {
  const supplier = await testDb.supplier.create({
    data: { name: "Draft Supplier " + Math.random().toString(36).slice(2, 6) },
  })
  const invoice = await testDb.purchaseInvoice.create({
    data: {
      invoiceNo: "PINV-DRAFT-" + Math.random().toString(36).slice(2, 10),
      supplierId: supplier.id,
      status: "DRAFT",
      subtotal: 500,
      total: 500,
    },
  })
  return invoice.id
}

// ── Tests: POST /api/customs-annexes (create draft) ────────────────────────
describe("POST /api/customs-annexes — create draft annex", () => {
  it("creates a DRAFT annex with valid data (201)", async () => {
    const { invoiceId } = await makePostedInvoice(1000)

    const res = await annexPOST(
      makeJsonRequest("POST", "/api/customs-annexes", {
        purchaseInvoiceId: invoiceId,
        customsRate: 10,
        taxRate: 5,
        shippingRate: 2,
        otherCharges: 50,
        billOfLading: "BL-123",
        note: "Test annex",
      }) as any
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.status).toBe("DRAFT")
    expect(body.purchaseInvoiceId).toBe(invoiceId)
    expect(body.customsRate).toBe(10)
    expect(body.taxRate).toBe(5)
    expect(body.shippingRate).toBe(2)
    expect(body.otherCharges).toBe(50)
    // Auto-calculated amounts from a 1000 subtotal:
    // customs = 1000 × 10% = 100
    // tax = 1000 × 5% = 50
    // shipping = 1000 × 2% = 20
    // total = 100 + 50 + 20 + 50 = 220
    expect(body.customsAmount).toBeCloseTo(100, 3)
    expect(body.taxAmount).toBeCloseTo(50, 3)
    expect(body.shippingAmount).toBeCloseTo(20, 3)
    expect(body.totalAnnexCost).toBeCloseTo(220, 3)
    expect(body.annexNo).toMatch(/^ANX-/)
    expect(body.billOfLading).toBe("BL-123")
    expect(body.note).toBe("Test annex")

    // Annex is persisted in DRAFT status.
    const persisted = await testDb.customsAnnex.findUnique({
      where: { id: body.id },
    })
    expect(persisted?.status).toBe("DRAFT")
  })

  it("rejects with 400 when purchaseInvoiceId is missing", async () => {
    const res = await annexPOST(
      makeJsonRequest("POST", "/api/customs-annexes", {
        customsRate: 10,
        taxRate: 5,
        shippingRate: 0,
        otherCharges: 0,
      }) as any
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("purchase-invoice-required")
  })

  it("rejects with 400 when purchaseInvoiceId does not exist (invalid-invoice)", async () => {
    const res = await annexPOST(
      makeJsonRequest("POST", "/api/customs-annexes", {
        purchaseInvoiceId: "nonexistent-id-xyz",
        customsRate: 10,
        taxRate: 5,
        shippingRate: 0,
        otherCharges: 0,
      }) as any
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("invalid-invoice")
  })

  it("rejects with 400 when linked invoice is NOT POSTED (invoice-not-posted)", async () => {
    const draftInvoiceId = await makeDraftInvoice()
    const res = await annexPOST(
      makeJsonRequest("POST", "/api/customs-annexes", {
        purchaseInvoiceId: draftInvoiceId,
        customsRate: 10,
        taxRate: 5,
      }) as any
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("invoice-not-posted")
  })

  it("rejects with 400 when ALL rates + otherCharges are 0 (empty-annex)", async () => {
    const { invoiceId } = await makePostedInvoice(1000)
    const res = await annexPOST(
      makeJsonRequest("POST", "/api/customs-annexes", {
        purchaseInvoiceId: invoiceId,
        customsRate: 0,
        taxRate: 0,
        shippingRate: 0,
        otherCharges: 0,
      }) as any
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("empty-annex")
  })

  it("clamps negative rates to 0 and treats all-zero (after clamp) as empty-annex", async () => {
    // The route silently clamps negative rates to 0 via Math.max(0, ...).
    // Sending all-negative rates + 0 otherCharges therefore results in
    // every clamped value being 0 → "empty-annex" rejection (400).
    const { invoiceId } = await makePostedInvoice(1000)
    const res = await annexPOST(
      makeJsonRequest("POST", "/api/customs-annexes", {
        purchaseInvoiceId: invoiceId,
        customsRate: -10, // negative — clamped to 0
        taxRate: -5, // negative — clamped to 0
        shippingRate: -2, // negative — clamped to 0
        otherCharges: 0,
      }) as any
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("empty-annex")
  })
})

// ── Tests: GET /api/customs-annexes (list) ─────────────────────────────────
describe("GET /api/customs-annexes — list annexes", () => {
  it("returns an empty list when no annexes exist", async () => {
    const res = await annexGET(makeJsonRequest("GET", "/api/customs-annexes") as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toEqual([])
  })

  it("returns a list with one annex after creation", async () => {
    const { invoiceId } = await makePostedInvoice(1000)
    await testDb.customsAnnex.create({
      data: {
        annexNo: "ANX-TEST0001",
        purchaseInvoiceId: invoiceId,
        customsRate: 10,
        customsAmount: 100,
        taxRate: 5,
        taxAmount: 50,
        shippingRate: 0,
        shippingAmount: 0,
        otherCharges: 0,
        totalAnnexCost: 150,
        createdById: adminId,
      },
    })

    const res = await annexGET(makeJsonRequest("GET", "/api/customs-annexes") as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toHaveLength(1)
    expect(body.items[0].annexNo).toBe("ANX-TEST0001")
    expect(body.items[0].customsAmount).toBeCloseTo(100, 3)
  })

  it("filters by purchaseInvoiceId when query param is provided", async () => {
    const { invoiceId: invA } = await makePostedInvoice(500)
    const { invoiceId: invB } = await makePostedInvoice(800)
    await testDb.customsAnnex.create({
      data: {
        annexNo: "ANX-FILTER-A",
        purchaseInvoiceId: invA,
        customsRate: 10,
        customsAmount: 50,
        totalAnnexCost: 50,
        createdById: adminId,
      },
    })
    await testDb.customsAnnex.create({
      data: {
        annexNo: "ANX-FILTER-B",
        purchaseInvoiceId: invB,
        customsRate: 10,
        customsAmount: 80,
        totalAnnexCost: 80,
        createdById: adminId,
      },
    })

    const res = await annexGET(
      makeJsonRequest("GET", "/api/customs-annexes", undefined, {
        purchaseInvoiceId: invA,
      }) as any
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toHaveLength(1)
    expect(body.items[0].annexNo).toBe("ANX-FILTER-A")
  })
})

// ── Tests: POST /api/customs-annexes/[id]/post ──────────────────────────────
describe("POST /api/customs-annexes/[id]/post — post annex + journal entry", () => {
  /** Helper: build a NextRequest with a path param for the [id] route. */
  function makePostRequest(id: string) {
    return makeJsonRequest("POST", `/api/customs-annexes/${id}/post`, {})
  }

  it("changes status from DRAFT to POSTED and updates the invoice totals", async () => {
    const { invoiceId } = await makePostedInvoice(1000)
    const annex = await testDb.customsAnnex.create({
      data: {
        annexNo: "ANX-POST0001",
        purchaseInvoiceId: invoiceId,
        customsRate: 10,
        customsAmount: 100,
        taxRate: 5,
        taxAmount: 50,
        shippingRate: 2,
        shippingAmount: 20,
        otherCharges: 50,
        totalAnnexCost: 220,
        createdById: adminId,
      },
    })

    const res = await annexPostPOST(makePostRequest(annex.id) as any, {
      params: Promise.resolve({ id: annex.id }),
    } as any)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.annex.status).toBe("POSTED")

    // Annex status persisted.
    const persisted = await testDb.customsAnnex.findUnique({
      where: { id: annex.id },
    })
    expect(persisted?.status).toBe("POSTED")

    // Invoice totals were updated (customs/shipping/otherCharges/taxAmount).
    const invoice = await testDb.purchaseInvoice.findUnique({
      where: { id: invoiceId },
    })
    expect(Number(invoice?.customs)).toBeCloseTo(100, 3)
    expect(Number(invoice?.shipping)).toBeCloseTo(20, 3)
    expect(Number(invoice?.otherCharges)).toBeCloseTo(50, 3)
    expect(Number(invoice?.taxAmount)).toBeCloseTo(50, 3)
    // newTotal = subtotal(1000) + taxAmount(50) + shipping(20) + customs(100) + otherCharges(50) - discount(0) = 1220
    expect(Number(invoice?.total)).toBeCloseTo(1220, 3)
  })

  it("creates a balanced journal entry (Debit 1100 / Credit 1010)", async () => {
    const { invoiceId } = await makePostedInvoice(1000)
    const annex = await testDb.customsAnnex.create({
      data: {
        annexNo: "ANX-JE0001",
        purchaseInvoiceId: invoiceId,
        customsRate: 10,
        customsAmount: 100,
        taxRate: 5,
        taxAmount: 50,
        shippingRate: 0,
        shippingAmount: 0,
        otherCharges: 0,
        totalAnnexCost: 150,
        createdById: adminId,
      },
    })

    const res = await annexPostPOST(makePostRequest(annex.id) as any, {
      params: Promise.resolve({ id: annex.id }),
    } as any)
    expect(res.status).toBe(200)

    // JournalEntry + JournalLines were created (balanced: debit total = credit total = 150).
    const jes = await testDb.journalEntry.findMany({
      where: { sourceType: "PURCHASE", sourceId: annex.id },
      include: { lines: true },
    })
    expect(jes.length).toBeGreaterThanOrEqual(1)
    const je = jes[0]
    expect(Number(je.totalDebit)).toBeCloseTo(150, 3)
    expect(Number(je.totalCredit)).toBeCloseTo(150, 3)
    expect(je.lines.length).toBe(2)

    // One line debits 1100 (Inventory), one credits 1010 (Cash — CASH payment method).
    const debitLine = je.lines.find((l) => Number(l.debit) > 0)
    const creditLine = je.lines.find((l) => Number(l.credit) > 0)
    expect(debitLine).toBeTruthy()
    expect(creditLine).toBeTruthy()

    // Verify the accounts by code (via accountId lookup).
    if (debitLine && creditLine) {
      const debitAcc = await testDb.account.findUnique({
        where: { id: debitLine.accountId },
      })
      const creditAcc = await testDb.account.findUnique({
        where: { id: creditLine.accountId },
      })
      expect(debitAcc?.code).toBe("1100")
      expect(creditAcc?.code).toBe("1010")
    }
  })

  it("rejects with 409 when annex is already POSTED", async () => {
    const { invoiceId } = await makePostedInvoice(1000)
    const annex = await testDb.customsAnnex.create({
      data: {
        annexNo: "ANX-ALREADY",
        purchaseInvoiceId: invoiceId,
        customsRate: 10,
        customsAmount: 100,
        totalAnnexCost: 100,
        status: "POSTED",
        createdById: adminId,
      },
    })

    const res = await annexPostPOST(makePostRequest(annex.id) as any, {
      params: Promise.resolve({ id: annex.id }),
    } as any)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe("already-posted")
  })

  it("rejects with 404 when annex id does not exist", async () => {
    const res = await annexPostPOST(makePostRequest("nonexistent-annex-id") as any, {
      params: Promise.resolve({ id: "nonexistent-annex-id" }),
    } as any)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe("not-found")
  })
})
