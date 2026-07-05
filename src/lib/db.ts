import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// If the cached PrismaClient is stale (missing a model that was added to the
// schema after the dev server started — e.g. `purchaseInvoice`), drop it so a
// fresh client is instantiated from the regenerated @prisma/client. Without
// this guard, `bunx prisma generate` followed by a Next.js hot-reload would
// keep serving the old client (and `db.purchaseInvoice` would be `undefined`).
if (globalForPrisma.prisma) {
  const hasPI = typeof (globalForPrisma.prisma as any).purchaseInvoice !== "undefined"
  console.log("[db.ts] cached prisma client found; hasPurchaseInvoice=", hasPI)
  if (!hasPI) {
    try {
      void (globalForPrisma.prisma as any).$disconnect?.()
    } catch {}
    globalForPrisma.prisma = undefined
    console.log("[db.ts] dropped stale prisma client; will recreate")
  }
} else {
  console.log("[db.ts] no cached prisma client; creating fresh")
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
