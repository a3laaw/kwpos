"use client"

import * as React from "react"
import { DICTS, type Dict, type Locale } from "@/lib/i18n"

interface I18nContextValue {
  locale: Locale
  dict: Dict
  setLocale: (l: Locale) => void
  toggle: () => void
}

const I18nContext = React.createContext<I18nContextValue | null>(null)

const STORAGE_KEY = "erp-locale"

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Start with Arabic (matches server-rendered dir/lang) to avoid hydration
  // mismatch. We rehydrate from localStorage in an effect after mount.
  const [locale, setLocaleState] = React.useState<Locale>("ar")

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null
      if (saved === "ar" || saved === "en") {
        setLocaleState(saved)
      }
    } catch {}
  }, [])

  // Keep <html dir/lang> in sync with the active locale.
  React.useEffect(() => {
    const dict = DICTS[locale]
    document.documentElement.dir = dict.dir
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = React.useCallback((l: Locale) => {
    setLocaleState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {}
  }, [])

  const toggle = React.useCallback(() => {
    setLocaleState((prev) => {
      const next = prev === "ar" ? "en" : "ar"
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {}
      return next
    })
  }, [])

  const value = React.useMemo<I18nContextValue>(
    () => ({ locale, dict: DICTS[locale], setLocale, toggle }),
    [locale, setLocale, toggle]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = React.useContext(I18nContext)
  if (!ctx) {
    // Fallback (e.g. used outside provider during SSR) — return Arabic defaults.
    return { locale: "ar", dict: DICTS.ar, setLocale: () => {}, toggle: () => {} }
  }
  return ctx
}

/** Convenience hook returning just the dictionary. */
export function useT(): Dict {
  return useI18n().dict
}
