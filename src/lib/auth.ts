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
        email: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

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
                email: { startsWith: inputLower + "@", mode: "insensitive" },
              },
            })
          }

          // 3) Try matching by name (case-insensitive) — allows typing
          //    the display name like "أحمد" or "admin"
          if (!user) {
            user = await db.user.findFirst({
              where: {
                name: { equals: input, mode: "insensitive" },
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
