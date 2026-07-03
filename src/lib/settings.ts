import { db } from "@/lib/db"
import { getCountry, type CountryConfig } from "@/lib/countries"

/**
 * Server-side access to the active country configuration.
 * Reads from the `Setting` table (key = "active_country") and caches
 * for a few seconds to avoid hitting the DB on every format call.
 */

const CACHE_TTL_MS = 5_000
let cache: { code: string; ts: number } | null = null

export async function getActiveCountryCode(): Promise<string> {
  const now = Date.now()
  if (cache && now - cache.ts < CACHE_TTL_MS) {
    return cache.code
  }
  try {
    const row = await db.setting.findUnique({ where: { key: "active_country" } })
    const code = row?.value || "KW"
    cache = { code, ts: now }
    return code
  } catch {
    return "KW"
  }
}

export async function getActiveCountry(): Promise<CountryConfig> {
  return getCountry(await getActiveCountryCode())
}

export async function setActiveCountry(code: string): Promise<void> {
  await db.setting.upsert({
    where: { key: "active_country" },
    create: { key: "active_country", value: code },
    update: { value: code },
  })
  cache = null // invalidate
}

/** Synchronous accessor using cached value (returns default if not yet loaded). */
export function getCachedCountryCode(): string {
  return cache?.code ?? "KW"
}
