/**
 * In-memory rate limiter (no external dependency).
 *
 * NOTE: This is per-instance (per Vercel serverless function invocation
 * container). On Vercel, multiple container instances may exist, so an
 * attacker could in theory get slightly more attempts than the configured
 * limit by hitting different instances. For this project's threat model
 * (protecting an already-env-gated bootstrap endpoint), this is
 * acceptable. If stricter limits are needed later, switch to Upstash
 * Redis or a database-backed counter.
 *
 * The map auto-prunes entries whose window has expired, so memory won't
 * grow unboundedly.
 */

interface RateLimitEntry {
  count: number
  windowStart: number
}

interface RateLimitConfig {
  /** Max attempts allowed within the window. */
  maxAttempts: number
  /** Window duration in ms. */
  windowMs: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  /** ms until the window resets (for Retry-After header). */
  retryAfterMs: number
}

const store = new Map<string, RateLimitEntry>()

/**
 * Check (and increment) the rate limit for a key.
 * Returns whether the request is allowed.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  // No prior entry OR window expired → start fresh
  if (!entry || now - entry.windowStart >= config.windowMs) {
    store.set(key, { count: 1, windowStart: now })
    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
      retryAfterMs: 0,
    }
  }

  // Within window — increment
  entry.count += 1

  if (entry.count > config.maxAttempts) {
    const retryAfterMs = config.windowMs - (now - entry.windowStart)
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, retryAfterMs),
    }
  }

  return {
    allowed: true,
    remaining: config.maxAttempts - entry.count,
    retryAfterMs: 0,
  }
}

/**
 * Peek (without incrementing) at the remaining attempts for a key.
 * Useful for adding headers on failure responses.
 */
export function peekRateLimit(
  key: string,
  config: RateLimitConfig
): { remaining: number; retryAfterMs: number } {
  const now = Date.now()
  const entry = store.get(key)
  if (!entry || now - entry.windowStart >= config.windowMs) {
    return { remaining: config.maxAttempts, retryAfterMs: 0 }
  }
  if (entry.count > config.maxAttempts) {
    return {
      remaining: 0,
      retryAfterMs: Math.max(0, config.windowMs - (now - entry.windowStart)),
    }
  }
  return {
    remaining: Math.max(0, config.maxAttempts - entry.count),
    retryAfterMs: 0,
  }
}

/** Prune expired entries. Safe to call periodically. */
export function pruneRateLimitStore(): void {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now - entry.windowStart >= 60 * 60 * 1000) {
      // 1 hour — well beyond any typical window
      store.delete(key)
    }
  }
}

/**
 * Extract client IP from a Next.js request.
 * On Vercel, x-forwarded-for is the canonical source.
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for")
  if (xff) {
    // x-forwarded-for may be a comma-separated list; first entry is the client
    return xff.split(",")[0].trim() || "unknown"
  }
  const xreal = req.headers.get("x-real-ip")
  if (xreal) return xreal.trim()
  return "unknown"
}
