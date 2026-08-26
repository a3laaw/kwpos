import NextAuth from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

// ── Login rate limiting ────────────────────────────────────────────
// NextAuth's credentials callback accepts unlimited brute-force
// attempts by default. We wrap the POST handler to rate-limit the
// credentials callback endpoint specifically.
//
// Limit: 10 attempts per 15 minutes per IP. More generous than the
// bootstrap-admin limit (5/15min) because legitimate users may mistype
// their password a few times. The rate limit is keyed by IP + the
// callback path so that other NextAuth POSTs (e.g. signout) are not
// affected.
const LOGIN_RATE_LIMIT = {
  maxAttempts: 10,
  windowMs: 15 * 60 * 1000, // 15 min
}

const handler = NextAuth(authOptions)

// GET is used for session reads and provider discovery — no rate limit.
export { handler as GET }

// POST is used for sign-in (credentials callback) and sign-out. We
// rate-limit only the credentials callback path to block brute force.
//
// NOTE: we accept `Request` (not `NextRequest`) because NextAuth's
// handler expects a standard Request. Using NextRequest here caused
// a 500 error in production because NextAuth couldn't read the body
// from the NextRequest wrapper.
export async function POST(req: Request) {
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
  // Forward to NextAuth handler for all other cases.
  return handler(req)
}
