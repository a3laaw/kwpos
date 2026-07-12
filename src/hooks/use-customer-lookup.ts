"use client"

import * as React from "react"
import type { CustomerTier } from "@/lib/types"

export interface CustomerFound {
  name: string
  address: string
  type?: CustomerTier
}

/**
 * Customer lookup hook — debounces a phone number and auto-searches
 * the customer database. Returns the matched customer (if any).
 *
 * Extracted from usePOS (Extract Hook — Fowler) so it can be tested
 * independently and reused if needed.
 */
export function useCustomerLookup(phone: string) {
  const [customerFound, setCustomerFound] = React.useState<CustomerFound | null>(null)
  const debouncedPhone = React.useDeferredValue(phone)

  React.useEffect(() => {
    const trimmed = debouncedPhone.trim()
    if (!trimmed || trimmed.length < 4) {
      setCustomerFound(null)
      return
    }
    let cancelled = false
    fetch(`/api/customers?q=${encodeURIComponent(trimmed)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const match = (data.items as any[])?.find((c) => c.phone === trimmed)
        if (match) {
          setCustomerFound({
            name: match.name,
            address: match.address,
            type: (match.type as CustomerTier) || "RETAIL",
          })
        } else {
          setCustomerFound(null)
        }
      })
      .catch(() => setCustomerFound(null))
    return () => { cancelled = true }
  }, [debouncedPhone])

  return { customerFound, setCustomerFound }
}
