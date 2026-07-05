/**
 * Generate a product barcode from the category code + a zero-padded sequence.
 * Format: [categoryCode 2-4 chars] + [sequence 4 digits]
 * Example: category "منظفات" code="03" + sequence 42 → "030042"
 *
 * @param categoryCode - the Category.code (e.g. "03"). If null/empty, uses "00".
 * @param sequence - the per-category sequence number (1-based)
 * @returns the barcode string
 */
export function generateProductBarcode(
  categoryCode: string | null | undefined,
  sequence: number
): string {
  const prefix = (categoryCode || "00").trim().padStart(2, "0").slice(0, 4)
  const seq = String(Math.max(1, Math.floor(sequence))).padStart(4, "0")
  return `${prefix}${seq}`
}
