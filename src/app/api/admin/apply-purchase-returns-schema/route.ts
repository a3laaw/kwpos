import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * One-time admin endpoint to apply the purchase-returns schema changes
 * server-side (prisma db push can't run from sandbox — rotated DB password).
 * Idempotent. ADMIN only.
 *
 * Changes:
 * 1. Add `returnedQty` column to PurchaseOrderItem (default 0).
 * 2. Create PurchaseReturn table + indexes + FK.
 * 3. Create PurchaseReturnItem table + indexes + FK.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["ADMIN" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const steps: Array<{ name: string; ok: boolean; error?: string }> = []

  // 1. Add returnedQty column to PurchaseOrderItem
  try {
    await db.$executeRawUnsafe(`
      ALTER TABLE "PurchaseOrderItem"
      ADD COLUMN IF NOT EXISTS "returnedQty" INTEGER NOT NULL DEFAULT 0
    `)
    steps.push({ name: "add-returnedQty-column", ok: true })
  } catch (e: any) {
    steps.push({ name: "add-returnedQty-column", ok: false, error: String(e?.message || e).slice(0, 200) })
  }

  // 2. Create PurchaseReturn table
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PurchaseReturn" (
        "id" TEXT NOT NULL,
        "returnNo" TEXT NOT NULL,
        "purchaseOrderId" TEXT NOT NULL,
        "supplierId" TEXT NOT NULL,
        "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "note" TEXT,
        "status" TEXT NOT NULL DEFAULT 'APPROVED',
        "createdById" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "PurchaseReturn_pkey" PRIMARY KEY ("id")
      )
    `)
    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseReturn_returnNo_key" ON "PurchaseReturn"("returnNo")`)
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PurchaseReturn_purchaseOrderId_idx" ON "PurchaseReturn"("purchaseOrderId")`)
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PurchaseReturn_supplierId_idx" ON "PurchaseReturn"("supplierId")`)
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PurchaseReturn_createdAt_idx" ON "PurchaseReturn"("createdAt")`)
    steps.push({ name: "create-purchase-return-table", ok: true })
  } catch (e: any) {
    steps.push({ name: "create-purchase-return-table", ok: false, error: String(e?.message || e).slice(0, 200) })
  }

  // 3. Create PurchaseReturnItem table
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PurchaseReturnItem" (
        "id" TEXT NOT NULL,
        "purchaseReturnId" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "quantity" INTEGER NOT NULL,
        "unitCost" DOUBLE PRECISION NOT NULL,
        "subtotal" DOUBLE PRECISION NOT NULL,
        CONSTRAINT "PurchaseReturnItem_pkey" PRIMARY KEY ("id")
      )
    `)
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PurchaseReturnItem_purchaseReturnId_idx" ON "PurchaseReturnItem"("purchaseReturnId")`)
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PurchaseReturnItem_productId_idx" ON "PurchaseReturnItem"("productId")`)
    steps.push({ name: "create-purchase-return-item-table", ok: true })
  } catch (e: any) {
    steps.push({ name: "create-purchase-return-item-table", ok: false, error: String(e?.message || e).slice(0, 200) })
  }

  // 4. FK constraints (PostgreSQL doesn't support ADD CONSTRAINT IF NOT EXISTS — use DO block)
  const fks: Array<[string, string]> = [
    ["PurchaseReturn_purchaseOrderId_fkey", `ALTER TABLE "PurchaseReturn" ADD CONSTRAINT "PurchaseReturn_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE`],
    ["PurchaseReturn_supplierId_fkey", `ALTER TABLE "PurchaseReturn" ADD CONSTRAINT "PurchaseReturn_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE`],
    ["PurchaseReturn_createdById_fkey", `ALTER TABLE "PurchaseReturn" ADD CONSTRAINT "PurchaseReturn_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`],
    ["PurchaseReturnItem_purchaseReturnId_fkey", `ALTER TABLE "PurchaseReturnItem" ADD CONSTRAINT "PurchaseReturnItem_purchaseReturnId_fkey" FOREIGN KEY ("purchaseReturnId") REFERENCES "PurchaseReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE`],
    ["PurchaseReturnItem_productId_fkey", `ALTER TABLE "PurchaseReturnItem" ADD CONSTRAINT "PurchaseReturnItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE`],
  ]
  for (const [name, sql] of fks) {
    try {
      await db.$executeRawUnsafe(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = '${name}'
          ) THEN ${sql}; END IF;
        END $$;
      `)
      steps.push({ name: `fk-${name}`, ok: true })
    } catch (e: any) {
      steps.push({ name: `fk-${name}`, ok: false, error: String(e?.message || e).slice(0, 200) })
    }
  }

  const failed = steps.filter((s) => !s.ok)
  return NextResponse.json({
    ok: failed.length === 0,
    steps,
    failedCount: failed.length,
  })
}
