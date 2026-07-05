import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import { serializePurchaseOrder } from "@/lib/serialize"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const po = await db.purchaseOrder.findUnique({
    where: { id },
    include: { supplier: true, items: { include: { product: true } } },
  })
  if (!po) return NextResponse.json({ error: "not-found" }, { status: 404 })
  return NextResponse.json(serializePurchaseOrder(po as any))
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["ADMIN", "WAREHOUSE" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()
  const po = await db.purchaseOrder.findUnique({ where: { id } })
  if (!po) return NextResponse.json({ error: "not-found" }, { status: 404 })

  const updated = await db.purchaseOrder.update({
    where: { id },
    data: {
      ...(body.note !== undefined ? { note: body.note ? String(body.note).trim() : null } : {}),
      ...(body.status !== undefined && po.status === "PENDING"
        ? { status: body.status === "RECEIVED" ? "RECEIVED" : body.status === "CANCELLED" ? "CANCELLED" : "PENDING" }
        : {}),
    },
    include: { supplier: true, items: { include: { product: true } } },
  })
  return NextResponse.json(serializePurchaseOrder(updated as any))
}

/**
 * PATCH — manager approval flow for auto-draft POs.
 *
 * Body shapes:
 *   - { status: "APPROVED" }                       → approve as-is (PENDING_APPROVAL → APPROVED)
 *   - { status: "APPROVED", items: ItemPatch[] }   → edit-then-approve: update item
 *                                                    quantity/unitCost, recompute the PO
 *                                                    total, then mark APPROVED.
 *   - { status: "REJECTED", rejectionReason: string } → mark REJECTED + save reason
 *
 * `ItemPatch = { id: string; quantity: number; unitCost: number }`.
 *
 * Only ADMIN may approve/reject. The existing PENDING/CANCELLED/RECEIVED
 * flows (via PUT + /receive) are untouched.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  // Only ADMIN may approve/reject auto-draft POs.
  if (!hasRole(user.role, ["ADMIN" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({} as any))
  const po = await db.purchaseOrder.findUnique({
    where: { id },
    include: { items: true },
  })
  if (!po) return NextResponse.json({ error: "not-found" }, { status: 404 })

  const target = String(body?.status ?? "").toUpperCase()

  if (target === "APPROVED") {
    // Only PENDING_APPROVAL POs can be approved.
    if (po.status !== "PENDING_APPROVAL") {
      return NextResponse.json({ error: "not-pending-approval" }, { status: 409 })
    }

    // Optional edit-then-approve: validate + apply item patches in a
    // transaction so the PO + items stay consistent.
    const itemsPatch = Array.isArray(body?.items) ? body.items : null

    if (itemsPatch && itemsPatch.length > 0) {
      // Map incoming patches by itemId for quick lookup.
      const patchById = new Map<string, { quantity: number; unitCost: number }>()
      for (const ip of itemsPatch as any[]) {
        if (!ip || typeof ip.id !== "string") continue
        const qty = Math.max(1, Math.round(Number(ip.quantity) || 0))
        const uc = Math.max(0, Number(ip.unitCost) || 0)
        patchById.set(ip.id, { quantity: qty, unitCost: uc })
      }

      await db.$transaction(async (tx) => {
        let newTotal = 0
        for (const it of po.items) {
          const patch = patchById.get(it.id)
          if (!patch) {
            newTotal += Number(it.subtotal ?? 0)
            continue
          }
          const subtotal = +(patch.quantity * patch.unitCost).toFixed(2)
          newTotal += subtotal
          await tx.purchaseOrderItem.update({
            where: { id: it.id },
            data: {
              quantity: patch.quantity,
              unitCost: patch.unitCost,
              subtotal,
            },
          })
        }
        await tx.purchaseOrder.update({
          where: { id },
          data: {
            status: "APPROVED",
            total: +newTotal.toFixed(2),
          },
        })
      })
    } else {
      // Approve as-is (no item edits).
      await db.purchaseOrder.update({
        where: { id },
        data: { status: "APPROVED" },
      })
    }

    const refreshed = await db.purchaseOrder.findUnique({
      where: { id },
      include: { supplier: true, items: { include: { product: true } } },
    })
    return NextResponse.json(serializePurchaseOrder(refreshed as any))
  }

  if (target === "REJECTED") {
    if (po.status !== "PENDING_APPROVAL") {
      return NextResponse.json({ error: "not-pending-approval" }, { status: 409 })
    }
    const reason = typeof body?.rejectionReason === "string"
      ? body.rejectionReason.trim()
      : ""
    if (!reason) {
      return NextResponse.json({ error: "rejection-reason-required" }, { status: 400 })
    }
    const updated = await db.purchaseOrder.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: reason,
      },
      include: { supplier: true, items: { include: { product: true } } },
    })
    return NextResponse.json(serializePurchaseOrder(updated as any))
  }

  return NextResponse.json({ error: "invalid-status" }, { status: 400 })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["ADMIN", "WAREHOUSE" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  const { id } = await params
  const po = await db.purchaseOrder.findUnique({ where: { id } })
  if (!po) return NextResponse.json({ error: "not-found" }, { status: 404 })
  if (po.status === "RECEIVED") {
    return NextResponse.json({ error: "cannot-delete-received" }, { status: 409 })
  }
  await db.purchaseOrder.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
