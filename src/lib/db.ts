import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Database connection is configured via the DATABASE_URL environment
// variable (read by Prisma from prisma/schema.prisma). No hardcoded
// credentials live in this file. Set DATABASE_URL + DIRECT_DATABASE_URL
// in your environment (local .env, Vercel dashboard, etc.).
//
// Use the Supabase pooler (port 6543) with connection_limit=1 to
// prevent pool exhaustion on Vercel serverless.

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
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
