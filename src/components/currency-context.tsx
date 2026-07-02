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

/** Hook returning format functions bound to the active country's currency/locale. */
export function useFmt() {
  const country = useCountry()
  return React.useMemo(() => {
    const fmt = toFormatLocale(country)
    return {
      currency: (v: number) => formatCurrency(v, fmt),
      number: (v: number) => formatNumber(v, country.locale),
      date: (v: string | Date) => formatDate(v, country.locale),
      dateTime: (v: string | Date) => formatDateTime(v, country.locale),
      symbol: country.currencySymbol,
      taxRate: country.taxRate,
      taxLabel: country.taxLabel,
    }
  }, [country])
}
