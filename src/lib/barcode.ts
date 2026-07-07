/**
 * Generate a 13-digit product barcode from the category prefix + sequence.
 *
 * Format: [categoryPrefix 1 digit][sequence 12 digits zero-padded]
 *   - Category 1, product 1   → 1000000000001
 *   - Category 1, product 2   → 1000000000002
 *   - Category 2, product 1   → 2000000000001
 *   - Category 2, product 2   → 2000000000002
 *
 * The first digit (1–9) identifies the category. The remaining 12 digits
 * are the per-category product sequence (1-based, zero-padded to 12).
 *
 * @param categoryPrefix - single digit 1–9 identifying the category
 * @param sequence - the per-category product sequence number (1-based)
 * @returns the 13-digit barcode string
 */
export function generateProductBarcode(
  categoryPrefix: number | string | null | undefined,
  sequence: number
): string {
  // Normalise prefix to a single digit 1–9. Default to 1 if invalid.
  let prefix: number
  if (typeof categoryPrefix === "number") {
    prefix = categoryPrefix
  } else if (typeof categoryPrefix === "string" && categoryPrefix.trim() !== "") {
    prefix = parseInt(categoryPrefix.trim(), 10)
  } else {
    prefix = 1
  }
  if (isNaN(prefix) || prefix < 1) prefix = 1
  if (prefix > 9) prefix = 9

  // Normalise sequence to a positive integer, clamp to 12 digits.
  let seq = Math.max(1, Math.floor(sequence))
  if (seq > 999999999999) seq = 999999999999 // 12 nines

  // Zero-pad sequence to 12 digits
  const seqStr = String(seq).padStart(12, "0")

  // 1 digit prefix + 12 digit sequence = 13 digit barcode
  return `${prefix}${seqStr}`
}

/**
 * Extract the category prefix (first digit) from a 13-digit barcode.
 * Returns null if the barcode is not in the expected format.
 */
export function extractCategoryPrefix(barcode: string): number | null {
  if (!barcode || barcode.length < 1) return null
  const d = parseInt(barcode[0], 10)
  return isNaN(d) ? null : d
}
