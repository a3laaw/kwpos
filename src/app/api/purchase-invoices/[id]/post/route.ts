import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { createJournalEntry } from "@/lib/journal"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * POST /api/purchase-invoices/[id]/post
 * Post a DRAFT invoice:
 *  - set status to POSTED,
 *  - bump stock per item (StockItem + Product.quantity aggregate),
 *  - if linked to a PurchaseOrder, mark it RECEIVED,
 *  - create a balanced journal entry (Debit Inventory 1010 / Credit AP 2010).
 *
 * Same logic as `post: true` in the create route, isolated here so a saved
 * draft can be posted later in a single click.
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
  const inv = await db.purchaseInvoice.findUnique({
    where: { id },
    include: {
      supplier: true,
      warehouse: true,
      items: { include: { product: true } },
      createdBy: true,
    },
  })
  if (!inv) return NextResponse.json({ error: "not-found" }, { status: 404 })
  if (inv.status === "POSTED") {
    return NextResponse.json({ error: "already-posted" }, { status: 409 })
  }
  if (inv.status === "CANCELLED") {
    return NextResponse.json({ error: "cannot-post-cancelled" }, { status: 409 })
  }

  await db.$transaction(async (tx) => {
    // Bump stock per item
    for (const it of inv.items) {
      if (inv.warehouseId) {
        await tx.stockItem.upsert({
          where: {
            productId_warehouseId: {
              productId: it.productId,
              warehouseId: inv.warehouseId,
            },
          },
          update: { quantity: { increment: it.quantity } },
          create: {
            productId: it.productId,
            warehouseId: inv.warehouseId,
            quantity: it.quantity,
          },
        })
      }
      await tx.product.update({
        where: { id: it.productId },
        data: {
          quantity: { increment: it.quantity },
          costPrice: it.unitCost > 0 ? it.unitCost : undefined,
        },
      })
    }

    // Mark linked PO as RECEIVED
    if (inv.purchaseOrderId) {
      await tx.purchaseOrder.update({
        where: { id: inv.purchaseOrderId },
        data: { status: "RECEIVED" },
      })
    }

    return tx.purchaseInvoice.update({
      where: { id },
      data: { status: "POSTED" },
    })
  })

  // Journal entry — outside the transaction (matches PO receive pattern).
  let journalEntryId: string | null = null
  try {
    journalEntryId = await createJournalEntry({
      sourceType: "PURCHASE",
      sourceId: inv.id,
      description: `قيد فاتورة مشتريات ${inv.invoiceNo} — ${inv.supplier?.name ?? ""}`,
      date: inv.invoiceDate,
      lines: [
        { accountCode: "1010", debit: +Number(inv.total).toFixed(3), description: `فاتورة مشتريات ${inv.invoiceNo}` },
        { accountCode: "2010", credit: +Number(inv.total).toFixed(3), description: `ذمم دائنة — ${inv.supplier?.name ?? ""}` },
      ],
    })
    if (journalEntryId) {
      await db.purchaseInvoice.update({
        where: { id: inv.id },
        data: { journalEntryId },
      })
    }
  } catch (e: any) {
    console.error("[purchase-invoice post] journal entry failed:", e?.message)
  }

  const refreshed = await db.purchaseInvoice.findUnique({
    where: { id },
    include: {
      supplier: true,
      warehouse: true,
      items: { include: { product: true } },
      createdBy: true,
    },
  })

  return NextResponse.json({
    id: String(refreshed!.id),
    invoiceNo: String(refreshed!.invoiceNo),
    status: refreshed!.status,
    journalEntryId,
  })
}
