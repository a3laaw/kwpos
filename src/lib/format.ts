import type { CountryConfig } from "@/lib/countries"

export interface FormatLocale {
  currency: string
  currencyDecimals: number
  locale: string
}

const DEFAULT_LOCALE: FormatLocale = {
  currency: "KWD",
  currencyDecimals: 3,
  locale: "ar-KW-u-nu-latn",
}

/**
 * Format a number as currency. Pass an optional `fmt` (from country config)
 * to render in the active country's currency; otherwise defaults to KWD.
 * Numbers always use Latin digits (0123) via the `-u-nu-latn` locale extension.
 */
export function formatCurrency(value: number, fmt?: FormatLocale): string {
  const v = Number.isFinite(value) ? value : 0
  const f = fmt ?? DEFAULT_LOCALE
  return new Intl.NumberFormat(f.locale, {
    style: "currency",
    currency: f.currency,
    minimumFractionDigits: f.currencyDecimals,
    maximumFractionDigits: f.currencyDecimals,
  }).format(v)
}

/** Format a plain number with Latin digits & grouping. */
export function formatNumber(value: number, locale: string = "ar-KW-u-nu-latn"): string {
  const v = Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat(locale).format(v)
}

/** Format an ISO date string into a localized date (Latin digits). */
export function formatDate(iso: string | Date, locale: string = "ar-KW-u-nu-latn"): string {
  const d = typeof iso === "string" ? new Date(iso) : iso
  if (isNaN(d.getTime())) return "-"
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d)
}

/** Format an ISO date string into a localized date + time (Latin digits). */
export function formatDateTime(iso: string | Date, locale: string = "ar-KW-u-nu-latn"): string {
  const d = typeof iso === "string" ? new Date(iso) : iso
  if (isNaN(d.getTime())) return "-"
  return new Intl.DateTimeFormat(locale, {
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

/** Build a FormatLocale from a CountryConfig (forces Latin digits). */
export function toFormatLocale(c: CountryConfig): FormatLocale {
  return {
    currency: c.currency,
    currencyDecimals: c.currencyDecimals,
    // Append `-u-nu-latn` to force Latin (0123) digits while keeping Arabic
    // month names and text. Falls back gracefully if the base locale lacks
    // the extension support.
    locale: c.locale.includes("-u-nu-") ? c.locale : `${c.locale}-u-nu-latn`,
  }
}
