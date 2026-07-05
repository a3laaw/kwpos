import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Hardcoded Supabase connection — always used, ignores env vars.
// This fixes the Vercel deployment where env vars were stuck with wrong password.
const SUPABASE_URL = "postgresql://postgres.qwicxgoslxmypksytklo:71ty0CaZdTfX46dB@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"

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
