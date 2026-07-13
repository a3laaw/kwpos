import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * One-time admin endpoint to create the SupplierPayment table + indexes
 * server-side (because prisma db push can't run from sandbox — rotated DB
 * password). Idempotent. ADMIN only.
 *
 * NOTE: PostgreSQL does NOT support `ADD CONSTRAINT IF NOT EXISTS`, so we use
 * a DO block with information_schema check for FK constraints.
 */
export async function POST_handler_disabled(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const steps: Array<{ name: string; ok: boolean; error?: string }> = []

  // 1. Create the table
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SupplierPayment" (
        "id" TEXT NOT NULL,
        "paymentNo" TEXT NOT NULL,
        "supplierId" TEXT NOT NULL,
        "amount" DOUBLE PRECISION NOT NULL,
        "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
        "referenceNo" TEXT,
        "note" TEXT,
        "journalEntryId" TEXT,
        "createdById" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "SupplierPayment_pkey" PRIMARY KEY ("id")
      )
    `)
    steps.push({ name: "create-table", ok: true })
  } catch (e: any) {
    steps.push({ name: "create-table", ok: false, error: String(e?.message || e).slice(0, 200) })
  }

  // 2. Unique constraint on paymentNo (CREATE UNIQUE INDEX IF NOT EXISTS works)
  try {
    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "SupplierPayment_paymentNo_key" ON "SupplierPayment"("paymentNo")`)
    steps.push({ name: "unique-paymentNo", ok: true })
  } catch (e: any) {
    steps.push({ name: "unique-paymentNo", ok: false, error: String(e?.message || e).slice(0, 200) })
  }

  // 3. FK constraints — PostgreSQL doesn't support ADD CONSTRAINT IF NOT EXISTS,
  // so use a DO block that checks information_schema.table_constraints.
  const fks: Array<[string, string]> = [
    ["SupplierPayment_supplierId_fkey", `ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE`],
    ["SupplierPayment_journalEntryId_fkey", `ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE`],
    ["SupplierPayment_createdById_fkey", `ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`],
  ]

  for (const [name, sql] of fks) {
    try {
      // DO block: only ADD if the constraint doesn't already exist
      await db.$executeRawUnsafe(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = '${name}'
          ) THEN
            ${sql};
          END IF;
        END $$;
      `)
      steps.push({ name: `fk-${name}`, ok: true })
    } catch (e: any) {
      steps.push({ name: `fk-${name}`, ok: false, error: String(e?.message || e).slice(0, 200) })
    }
  }

  // 4. Indexes (CREATE INDEX IF NOT EXISTS works)
  try {
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SupplierPayment_supplierId_idx" ON "SupplierPayment"("supplierId")`)
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SupplierPayment_paymentDate_idx" ON "SupplierPayment"("paymentDate")`)
    steps.push({ name: "indexes", ok: true })
  } catch (e: any) {
    steps.push({ name: "indexes", ok: false, error: String(e?.message || e).slice(0, 200) })
  }

  const failed = steps.filter((s) => !s.ok)
  return NextResponse.json({
    ok: failed.length === 0,
    steps,
    failedCount: failed.length,
  })
}

// Disabled in production — DDL should only run via Prisma migrations.
export async function POST(req: any) {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_ADMIN_DDL !== 'true') {
    return Response.json({ error: "admin-ddl-disabled-in-production" }, { status: 403 })
  }
  return POST_handler_disabled(req)
}
