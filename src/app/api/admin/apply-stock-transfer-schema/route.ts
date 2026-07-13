import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/** One-time admin endpoint to create StockTransfer + StockTransferItem tables. */
export async function POST_handler_disabled(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const steps: Array<{ name: string; ok: boolean; error?: string }> = []

  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "StockTransfer" (
        "id" TEXT NOT NULL,
        "transferNo" TEXT NOT NULL,
        "fromWarehouseId" TEXT NOT NULL,
        "toWarehouseId" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'OUT',
        "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "note" TEXT,
        "createdById" TEXT,
        "receivedById" TEXT,
        "receivedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "StockTransfer_pkey" PRIMARY KEY ("id")
      )
    `)
    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "StockTransfer_transferNo_key" ON "StockTransfer"("transferNo")`)
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StockTransfer_fromWarehouseId_idx" ON "StockTransfer"("fromWarehouseId")`)
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StockTransfer_toWarehouseId_idx" ON "StockTransfer"("toWarehouseId")`)
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StockTransfer_status_idx" ON "StockTransfer"("status")`)
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StockTransfer_createdAt_idx" ON "StockTransfer"("createdAt")`)
    steps.push({ name: "create-stock-transfer-table", ok: true })
  } catch (e: any) {
    steps.push({ name: "create-stock-transfer-table", ok: false, error: String(e?.message || e).slice(0, 200) })
  }

  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "StockTransferItem" (
        "id" TEXT NOT NULL,
        "stockTransferId" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "quantity" INTEGER NOT NULL,
        "unitCost" DOUBLE PRECISION NOT NULL,
        "subtotal" DOUBLE PRECISION NOT NULL,
        CONSTRAINT "StockTransferItem_pkey" PRIMARY KEY ("id")
      )
    `)
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StockTransferItem_stockTransferId_idx" ON "StockTransferItem"("stockTransferId")`)
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StockTransferItem_productId_idx" ON "StockTransferItem"("productId")`)
    steps.push({ name: "create-stock-transfer-item-table", ok: true })
  } catch (e: any) {
    steps.push({ name: "create-stock-transfer-item-table", ok: false, error: String(e?.message || e).slice(0, 200) })
  }

  const fks: Array<[string, string]> = [
    ["StockTransfer_fromWarehouseId_fkey", `ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE`],
    ["StockTransfer_toWarehouseId_fkey", `ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE`],
    ["StockTransfer_createdById_fkey", `ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`],
    ["StockTransfer_receivedById_fkey", `ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`],
    ["StockTransferItem_stockTransferId_fkey", `ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_stockTransferId_fkey" FOREIGN KEY ("stockTransferId") REFERENCES "StockTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE`],
    ["StockTransferItem_productId_fkey", `ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE`],
  ]
  for (const [name, sql] of fks) {
    try {
      await db.$executeRawUnsafe(`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = '${name}')
          THEN ${sql}; END IF;
        END $$;
      `)
      steps.push({ name: `fk-${name}`, ok: true })
    } catch (e: any) {
      steps.push({ name: `fk-${name}`, ok: false, error: String(e?.message || e).slice(0, 200) })
    }
  }

  const failed = steps.filter((s) => !s.ok)
  return NextResponse.json({ ok: failed.length === 0, steps, failedCount: failed.length })
}

// Disabled in production — DDL should only run via Prisma migrations.
export async function POST(req: any) {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_ADMIN_DDL !== 'true') {
    return Response.json({ error: "admin-ddl-disabled-in-production" }, { status: 403 })
  }
  return POST_handler_disabled(req)
}
