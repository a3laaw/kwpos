import NextAuth from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

// ── Login rate limiting ────────────────────────────────────────────
// NextAuth's credentials callback accepts unlimited brute-force
// attempts by default. We wrap the POST handler to rate-limit the
// credentials callback endpoint specifically.
//
// Limit: 10 attempts per 15 minutes per IP. More generous than the
// bootstrap-admin limit (5/15min) because legitimate users may mistype
// their password a few times.
//
// ── IMPORTANT: how we wrap without breaking NextAuth ──────────────
// NextAuth's handler is a generic function that accepts `Request` and
// returns `Response`. If we wrap it with a NextRequest-typed handler,
// NextAuth may fail to read the body (500 error in production).
//
// The fix: rate-limit BEFORE calling handler, but pass the ORIGINAL
// request object untouched (not a clone, not a NextRequest cast).
// We use `req` directly — NextAuth receives exactly what Next.js
// passed to us.
const LOGIN_RATE_LIMIT = {
  maxAttempts: 10,
  windowMs: 15 * 60 * 1000, // 15 min
}

const handler = NextAuth(authOptions)

// GET is used for session reads and provider discovery — no rate limit.
export { handler as GET }

// POST is used for sign-in (credentials callback) and sign-out. We
// rate-limit only the credentials callback path to block brute force.
export async function POST(req: NextRequest) {
  const url = new URL(req.url)
  // The credentials provider callback is the actual login attempt.
  // Other POST endpoints (signout, csrf token) are not rate-limited.
  if (url.pathname.endsWith("/callback/credentials")) {
    const ip = getClientIp(req)
    const rateLimitKey = `login:${ip}`
    const rl = checkRateLimit(rateLimitKey, LOGIN_RATE_LIMIT)
    if (!rl.allowed) {
      const retryAfterSec = Math.ceil(rl.retryAfterMs / 1000)
      return NextResponse.json(
        {
          error: "too-many-login-attempts",
          message: "تم تجاوز عدد محاولات تسجيل الدخول. حاول مرة أخرى بعد قليل.",
          retryAfterSeconds: retryAfterSec,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSec),
            "X-RateLimit-Remaining": "0",
          },
        }
      )
    }
  }
  // Forward the ORIGINAL request to NextAuth. Do NOT clone or cast.
  // NextAuth reads the body stream; if we clone, the stream is
  // consumed and NextAuth gets an empty body → 500.
  return handler(req)
}
