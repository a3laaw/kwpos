import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // On Vercel/production: use Turso (libSQL) if configured
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const tursoToken = process.env.TURSO_AUTH_TOKEN

  if (tursoUrl) {
    const adapter = new PrismaLibSql({
      url: tursoUrl,
      authToken: tursoToken || undefined,
    })
    return new PrismaClient({ adapter, log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query'] })
  }

  // Local dev: use SQLite file (default)
  return new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
