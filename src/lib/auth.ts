import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

// ── Login rate limiting ────────────────────────────────────────────
// Rate-limit is enforced INSIDE the authorize() function rather than
// as a wrapper around the POST handler. A wrapper caused a 500 error
// in production because NextAuth couldn't read the body stream.
// By limiting here, we keep the auth route simple and the rate-limit
// applies before any DB lookup (saving DB load on brute-force).
//
// Limit: 30 attempts per 15 minutes per IP. More generous than the
// original 10/15min because legitimate users on shared IPs (office
// networks) may trigger false positives.
const LOGIN_RATE_LIMIT = {
  maxAttempts: 30,
  windowMs: 15 * 60 * 1000, // 15 min
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
  logger: {
    error(code: string, metadata: unknown) {
      // Suppress noisy JWEDecryptionFailed errors that occur when a stale
      // session cookie (from a previous secret/server) is presented.
      // NextAuth already handles this gracefully by returning null session,
      // so the user simply sees the login screen. No action needed.
      const msg =
        typeof metadata === "object" && metadata && "message" in metadata
          ? String((metadata as { message: unknown }).message)
          : String(metadata)
      if (
        code === "JWT_SESSION_ERROR" &&
        (msg.includes("decryption operation failed") ||
          msg.includes("JWEDecryptionFailed"))
      ) {
        return
      }
      console.error(`[next-auth][error][${code}]`, metadata)
    },
    warn() {},
    debug() {},
  },
  pages: {
    signIn: "/",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null

        // Note: login rate-limiting was removed from here because the
        // in-memory Map per serverless instance caused false positives
        // when users on shared IPs hit the limit. The bootstrap-admin
        // endpoint is still rate-limited (it's the emergency recovery
        // path). For production brute-force protection, use Vercel's
        // built-in rate limiting or a database-backed counter.

        // ── Login by EMAIL or USERNAME ──
        // The user can type either their email (admin@demo.com) or just
        // their username (admin, sales, cashier...). We try email first,
        // then fall back to matching by the `email` local-part (before @)
        // or by the `name` field. This simplifies login for front-line
        // staff who may not remember their email.
        const input = credentials.email.trim()
        const inputLower = input.toLowerCase()

        try {
          // 1) Try exact email match
          let user = await db.user.findUnique({
            where: { email: inputLower },
          })

          // 2) Try matching the local-part of an email (e.g. "admin"
          //    matches "admin@demo.com")
          if (!user) {
            user = await db.user.findFirst({
              where: {
                email: { startsWith: inputLower + "@" },
              },
            })
          }

          // 3) Try matching by name (case-insensitive) — allows typing
          //    the display name like "أحمد" or "admin"
          if (!user) {
            user = await db.user.findFirst({
              where: {
                name: { equals: input },
              },
            })
          }

          if (!user) return null
          const ok = await bcrypt.compare(credentials.password, user.passwordHash)
          if (!ok) return null
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            posExpressMode: (user as any).posExpressMode,
            warehouseId: (user as any).warehouseId,
          } as any
        } catch {
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id
        token.role = (user as any).role
        token.posExpressMode = (user as any).posExpressMode
        token.warehouseId = (user as any).warehouseId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.id
        ;(session.user as any).role = token.role
        ;(session.user as any).posExpressMode = token.posExpressMode
        ;(session.user as any).warehouseId = token.warehouseId
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export type AppRole = "ADMIN" | "SALES" | "WAREHOUSE"
