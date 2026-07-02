/** Format a number as Kuwaiti Dinar currency (3 decimals — fils). */
export function formatCurrency(value: number): string {
  const v = Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat("ar-KW", {
    style: "currency",
    currency: "KWD",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(v)
}

/** Format a plain number with Arabic (Kuwait) digits & grouping. */
export function formatNumber(value: number): string {
  const v = Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat("ar-KW").format(v)
}

/** Format an ISO date string into Arabic (Kuwait) date. */
export function formatDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso
  if (isNaN(d.getTime())) return "-"
  return new Intl.DateTimeFormat("ar-KW", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d)
}

/** Format an ISO date string into Arabic (Kuwait) date + time. */
export function formatDateTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso
  if (isNaN(d.getTime())) return "-"
  return new Intl.DateTimeFormat("ar-KW", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

/** Generate a human-friendly invoice number. */
export function makeInvoiceNo(seq: number): string {
  return `INV-${String(seq).padStart(5, "0")}`
}

/** Default tax rate for Kuwait (no VAT currently implemented). */
export const DEFAULT_TAX_RATE = 0
