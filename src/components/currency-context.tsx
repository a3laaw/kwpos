"use client"

import * as React from "react"
import type { CountryConfig } from "@/lib/countries"
import {
  formatCurrency,
  formatNumber,
  formatDate,
  formatDateTime,
  toFormatLocale,
} from "@/lib/format"
import { useI18n } from "@/components/i18n-context"
import type { Locale } from "@/lib/i18n"

/**
 * Provides the active country config synchronously to all client components
 * so currency/tax formatting is consistent between SSR and client (no
 * hydration mismatch — the value comes from the server-rendered prop).
 */
const CurrencyContext = React.createContext<CountryConfig | null>(null)

export function CurrencyProvider({
  country,
  children,
}: {
  country: CountryConfig
  children: React.ReactNode
}) {
  const value = React.useMemo(() => country, [country.code])
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCountry(): CountryConfig {
  const ctx = React.useContext(CurrencyContext)
  if (!ctx) {
    throw new Error("useCountry must be used within a CurrencyProvider")
  }
  return ctx
}

/**
 * Resolve the BCP-47 locale used for *date/time* formatting, based on the
 * active UI language. Currency stays bound to the country config, but dates
 * must follow the UI language so an English user always sees English month
 * names even if the active country is an Arab country.
 *
 * - Arabic UI  → `<country-locale>-u-nu-latn` (Arabic months, Latin digits).
 * - English UI → `en-GB` (English months, Latin digits).
 */
function dateLocaleFor(locale: Locale, country: CountryConfig): string {
  if (locale === "en") return "en-GB"
  const base = country.locale.includes("-u-nu-") ? country.locale : `${country.locale}-u-nu-latn`
  return base
}

/** Hook returning format functions bound to the active country's currency/locale. */
export function useFmt() {
  const country = useCountry()
  const { locale } = useI18n()
  return React.useMemo(() => {
    const fmt = toFormatLocale(country)
    const dateLocale = dateLocaleFor(locale, country)
    return {
      currency: (v: number) => formatCurrency(v, fmt),
      number: (v: number) => formatNumber(v, fmt.locale),
      date: (v: string | Date) => formatDate(v, dateLocale),
      dateTime: (v: string | Date) => formatDateTime(v, dateLocale),
      symbol: country.currencySymbol,
      taxRate: country.taxRate,
      taxLabel: country.taxLabel,
    }
  }, [country, locale])
}

