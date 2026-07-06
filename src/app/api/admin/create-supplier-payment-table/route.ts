import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * One-time admin endpoint to create the SupplierPayment table + indexes
 * server-side (because prisma db push can't run from sandbox — rotated DB
 * password). Idempotent: uses CREATE TABLE IF NOT EXISTS. ADMIN only.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["ADMIN" as Role])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const steps: Array<{ name: string; ok: boolean; error?: string }> = []

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

  try {
    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "SupplierPayment_paymentNo_key" ON "SupplierPayment"("paymentNo")`)
    steps.push({ name: "unique-paymentNo", ok: true })
  } catch (e: any) {
    steps.push({ name: "unique-paymentNo", ok: false, error: String(e?.message || e).slice(0, 200) })
  }

  for (const [name, sql] of [
    ["fk-supplier", `ALTER TABLE "SupplierPayment" ADD CONSTRAINT IF NOT EXISTS "SupplierPayment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE`],
    ["fk-journal", `ALTER TABLE "SupplierPayment" ADD CONSTRAINT IF NOT EXISTS "SupplierPayment_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE`],
    ["fk-user", `ALTER TABLE "SupplierPayment" ADD CONSTRAINT IF NOT EXISTS "SupplierPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`],
  ] as const) {
    try {
      await db.$executeRawUnsafe(sql)
      steps.push({ name, ok: true })
    } catch (e: any) {
      steps.push({ name, ok: false, error: String(e?.message || e).slice(0, 200) })
    }
  }

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
