/**
 * Run a non-critical background operation after a primary operation
 * has already succeeded.
 *
 * Catches any error and logs it as a warning so the caller never throws.
 * This is used for post-transaction side effects (journal entries, audit
 * logs, loyalty points, product.quantity sync) that should NOT fail the
 * primary business operation (e.g. a sale) if they themselves fail.
 *
 * @param label  - short label for the warning prefix (e.g. "Journal entry")
 * @param context - optional context string appended to the warning (e.g. invoice no)
 * @param fn     - the async operation to run
 */
export async function runInBackground(
  label: string,
  context: string | undefined,
  fn: () => Promise<void>
): Promise<void> {
  try {
    await fn()
  } catch (e: any) {
    const ctx = context ? ` for ${context}` : ""
    console.warn(`[sales] ${label} failed${ctx}: ${e?.message ?? e}`)
  }
}
