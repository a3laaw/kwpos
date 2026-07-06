import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

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
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        // ── Normal DB auth (fail-closed: no fallback) ──
        // Authentication requires a live database connection. There is no
        // hardcoded fallback admin — if the DB is unreachable, login fails
        // (fail-closed) rather than granting access with a known password.
        const email = credentials.email.toLowerCase().trim()
        try {
          const user = await db.user.findUnique({
            where: { email },
          })
          if (!user) return null
          const ok = await bcrypt.compare(credentials.password, user.passwordHash)
          if (!ok) return null
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
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
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.id
        ;(session.user as any).role = token.role
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export type AppRole = "ADMIN" | "SALES" | "WAREHOUSE"
