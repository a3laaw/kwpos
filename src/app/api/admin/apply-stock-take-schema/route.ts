import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/** One-time admin endpoint to create StockTake + StockTakeItem tables. */
export async function POST_handler_disabled(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const steps: Array<{ name: string; ok: boolean; error?: string }> = []

  // 1. StockTake table
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "StockTake" (
        "id" TEXT NOT NULL,
        "takeNo" TEXT NOT NULL,
        "warehouseId" TEXT,
        "note" TEXT,
        "status" TEXT NOT NULL DEFAULT 'DRAFT',
        "createdById" TEXT,
        "approvedById" TEXT,
        "approvedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "StockTake_pkey" PRIMARY KEY ("id")
      )
    `)
    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "StockTake_takeNo_key" ON "StockTake"("takeNo")`)
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StockTake_warehouseId_idx" ON "StockTake"("warehouseId")`)
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StockTake_status_idx" ON "StockTake"("status")`)
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StockTake_createdAt_idx" ON "StockTake"("createdAt")`)
    steps.push({ name: "create-stock-take-table", ok: true })
  } catch (e: any) {
    steps.push({ name: "create-stock-take-table", ok: false, error: String(e?.message || e).slice(0, 200) })
  }

  // 2. StockTakeItem table
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "StockTakeItem" (
        "id" TEXT NOT NULL,
        "stockTakeId" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "systemQty" INTEGER NOT NULL DEFAULT 0,
        "actualQty" INTEGER NOT NULL DEFAULT 0,
        "variance" INTEGER NOT NULL DEFAULT 0,
        "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "varianceValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
        CONSTRAINT "StockTakeItem_pkey" PRIMARY KEY ("id")
      )
    `)
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StockTakeItem_stockTakeId_idx" ON "StockTakeItem"("stockTakeId")`)
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StockTakeItem_productId_idx" ON "StockTakeItem"("productId")`)
    steps.push({ name: "create-stock-take-item-table", ok: true })
  } catch (e: any) {
    steps.push({ name: "create-stock-take-item-table", ok: false, error: String(e?.message || e).slice(0, 200) })
  }

  // 3. FK constraints (DO block — PG doesn't support ADD CONSTRAINT IF NOT EXISTS)
  const fks: Array<[string, string]> = [
    ["StockTake_warehouseId_fkey", `ALTER TABLE "StockTake" ADD CONSTRAINT "StockTake_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE`],
    ["StockTake_createdById_fkey", `ALTER TABLE "StockTake" ADD CONSTRAINT "StockTake_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`],
    ["StockTake_approvedById_fkey", `ALTER TABLE "StockTake" ADD CONSTRAINT "StockTake_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`],
    ["StockTakeItem_stockTakeId_fkey", `ALTER TABLE "StockTakeItem" ADD CONSTRAINT "StockTakeItem_stockTakeId_fkey" FOREIGN KEY ("stockTakeId") REFERENCES "StockTake"("id") ON DELETE CASCADE ON UPDATE CASCADE`],
    ["StockTakeItem_productId_fkey", `ALTER TABLE "StockTakeItem" ADD CONSTRAINT "StockTakeItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE`],
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
