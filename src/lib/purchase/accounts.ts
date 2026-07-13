import { db } from "@/lib/db"

/**
 * Ensures the required accounts for purchase invoice journaling exist.
 * For databases seeded BEFORE the inventory + tax-payable accounts were
 * added, this helper creates them on-the-fly (idempotent — skips if they
 * already exist).
 *
 * Accounts:
 *   1100 — المخزون (Inventory) — ASSET
 *   2110 — ضريبة مستحقة (Tax Payable) — LIABILITY
 *
 * Call this before creating a purchase invoice journal entry.
 */
export async function ensurePurchaseAccounts(): Promise<void> {
  const required = [
    { code: "1100", name: "المخزون", type: "ASSET" as const, parentCode: "1000" },
    { code: "2110", name: "ضريبة مستحقة", type: "LIABILITY" as const, parentCode: "2000" },
  ]

  for (const acc of required) {
    const existing = await db.account.findUnique({ where: { code: acc.code } })
    if (existing) continue

    // Resolve parent
    const parent = await db.account.findUnique({ where: { code: acc.parentCode } })
    await db.account.create({
      data: {
        code: acc.code,
        name: acc.name,
        type: acc.type,
        parentId: parent?.id ?? null,
        balance: 0,
        isSystem: true,
      },
    })
  }
}

/**
 * Resolve the payment-credit account code for a purchase invoice.
 *   CASH   → 1010 (النقدية)
 *   BANK   → 1020 (البنك)
 *   CREDIT → 2010 (ذمم دائنة — آجل)
 */
export function paymentCreditAccountCode(paymentMethod: string): string {
  switch (paymentMethod) {
    case "BANK":
      return "1020"
    case "CREDIT":
      return "2010"
    case "CASH":
    default:
      return "1010"
  }
}
