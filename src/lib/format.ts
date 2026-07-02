/** Format a number as Saudi Riyal currency (Arabic locale). */
export function formatCurrency(value: number): string {
  const v = Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
  }).format(v)
}

/** Format a plain number with Arabic digits & grouping. */
export function formatNumber(value: number): string {
  const v = Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat("ar-SA").format(v)
}

/** Format an ISO date string into Arabic date. */
export function formatDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso
  if (isNaN(d.getTime())) return "-"
  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d)
}

/** Format an ISO date string into Arabic date + time. */
export function formatDateTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso
  if (isNaN(d.getTime())) return "-"
  return new Intl.DateTimeFormat("ar-SA", {
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
