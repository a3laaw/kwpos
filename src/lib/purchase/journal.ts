import { createJournalEntry } from "@/lib/journal"
import type { JELineInput } from "@/lib/journal"
import { paymentCreditAccountCode } from "./accounts"

/**
 * Creates the journal entry for a posted purchase invoice.
 *
 * Accounting model (per the owner's decision):
 *   - All landed-cost fees (customs, shipping, otherCharges) are
 *     CAPITALIZED into the inventory value — NOT expensed separately.
 *   - Discount reduces the capitalized inventory value.
 *   - Tax is recorded as a separate liability (Tax Payable 2110), not
 *     lumped into Accounts Payable.
 *
 * Journal entry structure:
 *   Debit  1100  المخزون (Inventory)        subtotal + customs + shipping + otherCharges − discount
 *   Debit  2110  ضريبة مستحقة (Tax Payable)  taxAmount  (if tax > 0)
 *   Credit 1010/1020/2010  (Cash/Bank/AP)    total
 *
 * The entry balances because:
 *   total = subtotal + taxAmount + customs + shipping + otherCharges − discount
 *   → debit side = (subtotal + fees − discount) + taxAmount = total = credit side ✓
 *
 * Runs OUTSIDE a transaction (fire-and-forget, non-fatal). If it fails,
 * the invoice is still posted — the gap is logged for manual reconciliation.
 */
export async function createPurchaseInvoiceJournalEntry(opts: {
  invoiceNo: string
  invoiceId: string
  supplierName: string
  subtotal: number
  taxAmount: number
  discount: number
  shipping: number
  customs: number
  otherCharges: number
  total: number
  paymentMethod: string
  date: Date
}): Promise<void> {
  const inventoryValue =
    opts.subtotal + opts.customs + opts.shipping + opts.otherCharges - opts.discount
  const creditAccCode = paymentCreditAccountCode(opts.paymentMethod)

  const lines: JELineInput[] = [
    {
      accountCode: "1100",
      debit: round(inventoryValue),
      description: `مشتريات — فاتورة ${opts.invoiceNo} — ${opts.supplierName}`,
    },
  ]

  if (opts.taxAmount > 0) {
    lines.push({
      accountCode: "2110",
      debit: round(opts.taxAmount),
      description: `ضريبة مشتريات — فاتورة ${opts.invoiceNo}`,
    })
  }

  const creditLabel =
    opts.paymentMethod === "CASH" ? "نقدية"
    : opts.paymentMethod === "BANK" ? "بنك"
    : "ذمم دائنة (آجل)"

  lines.push({
    accountCode: creditAccCode,
    credit: round(opts.total),
    description: `${creditLabel} — فاتورة مشتريات ${opts.invoiceNo}`,
  })

  await createJournalEntry({
    sourceType: "PURCHASE",
    sourceId: opts.invoiceId,
    description: `قيد فاتورة مشتريات ${opts.invoiceNo} — ${opts.supplierName}`,
    date: opts.date,
    lines,
  })
}

function round(v: number, decimals = 3): number {
  return +Number(v).toFixed(decimals)
}
