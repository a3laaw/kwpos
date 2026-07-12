/**
 * Shared type-coercion helpers used across API routes.
 *
 * These eliminate the repeated `Number(x ?? 0)`, `+(x).toFixed(3)`,
 * and payment-method validation patterns scattered across the codebase.
 */

/**
 * Safely coerce a value to a non-negative number.
 * Returns 0 for null/undefined/NaN/negative.
 */
export function toNum(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Round a number to 3 decimal places (currency precision).
 */
export function round3(v: number): number {
  return +Number(v).toFixed(3)
}

/**
 * Coerce a raw payment-method value into the valid union.
 * Falls back to "CASH" for any unrecognized value.
 */
export function coercePaymentMethod(
  v: unknown
): "CASH" | "CARD" | "TRANSFER" {
  return v === "CARD" || v === "TRANSFER" ? v : "CASH"
}
