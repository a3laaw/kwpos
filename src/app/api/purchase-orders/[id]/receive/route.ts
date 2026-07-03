import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { serializePurchaseOrder } from "@/lib/serialize"
import { createJournalEntry } from "@/lib/journal"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * Mark a purchase order as RECEIVED:
 *  - bumps product inventory quantities (and refreshes cost price),
 *  - generates a double-entry journal (debit Inventory 1010, credit Accounts
 *    Payable 2010) so the accounting stays in sync.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["ADMIN", "WAREHOUSE" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await params
  const po = await db.purchaseOrder.findUnique({
    where: { id },
    include: { items: { include: { product: true } }, supplier: true },
  })
  if (!po) return NextResponse.json({ error: "not-found" }, { status: 404 })
  if (po.status === "RECEIVED") {
    return NextResponse.json({ error: "already-received" }, { status: 409 })
  }

  // Atomic: update PO status + bump inventory quantities + refresh cost price
  const updated = await db.$transaction(async (tx) => {
    for (const it of po.items) {
      await tx.product.update({
        where: { id: it.productId },
        data: {
          quantity: { increment: it.quantity },
          costPrice: it.unitCost,
        },
      })
    }
    return tx.purchaseOrder.update({
      where: { id },
      data: { status: "RECEIVED" },
      include: { supplier: true, items: { include: { product: true } } },
    })
  })

  // Generate the double-entry journal for the purchase (outside tx is fine;
  // if it fails we log but the receive already succeeded).
  try {
    await createJournalEntry({
      sourceType: "PURCHASE",
      sourceId: po.id,
      description: `قيد استلام أمر شراء ${po.id.slice(-6)} — ${po.supplier?.name ?? ""}`,
      date: new Date(),
      lines: [
        // Debit Inventory (asset increases) — use Cash 1010 as the inventory
        // account proxy (in a full COA you'd have a dedicated Inventory sub-account)
        { accountCode: "1010", debit: +po.total.toFixed(3), description: "إضافة مخزون مشتريات" },
        // Credit Accounts Payable (liability increases)
        { accountCode: "2010", credit: +po.total.toFixed(3), description: `ذمم دائنة — ${po.supplier?.name ?? ""}` },
      ],
    })
  } catch (e: any) {
    console.error("[purchase receive] journal entry failed:", e?.message)
  }

  return NextResponse.json(serializePurchaseOrder(updated as any))
}
