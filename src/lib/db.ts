import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Fallback: if DATABASE_URL env var is not set or invalid, use the hardcoded
// Supabase connection string. This ensures the app ALWAYS connects to the
// database, even if Vercel env vars are misconfigured.
const SUPABASE_URL = "postgresql://postgres.qwicxgoslxmypksytklo:71ty0CaZdTfX46dB@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"

const dbUrl = process.env.DATABASE_URL || SUPABASE_URL

if (globalForPrisma.prisma) {
  const hasPI = typeof (globalForPrisma.prisma as any).purchaseInvoice !== "undefined"
  if (!hasPI) {
    try {
      void (globalForPrisma.prisma as any).$disconnect?.()
    } catch {}
    globalForPrisma.prisma = undefined
  }
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: dbUrl } },
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
