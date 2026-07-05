import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Hardcoded Supabase connection — always used, ignores env vars.
// Use pooler (port 6543) with connection_limit=1 to prevent pool exhaustion
// on Vercel serverless (each function invocation = 1 connection max).
const SUPABASE_URL = "***REMOVED***:***REMOVED***@***REMOVED***:6543/postgres?pgbouncer=true&connection_limit=1"

if (globalForPrisma.prisma) {
  const hasPI = typeof (globalForPrisma.prisma as any).purchaseInvoice !== "undefined"
  if (!hasPI) {
    try {
      void (globalForPrisma.prisma as any).$disconnect?.()
    } catch {}
    globalForPrisma.prisma = undefined
  }
}

// Force Prisma to use this URL via datasources override.
// This takes precedence over both env vars AND schema.prisma url.
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: SUPABASE_URL,
      },
    },
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
