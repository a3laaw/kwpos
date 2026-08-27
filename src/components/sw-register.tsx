"use client"

import * as React from "react"

/**
 * ServiceWorkerRegister — registers `/sw.js` on the client, in
 * PRODUCTION only.
 *
 * Why production-only:
 *   - In dev, Next.js hot-reloads chunks on every change; an SW
 *     caching the old chunks would break the reload, and you'd have
 *     to keep clearing the cache. The dev experience is much smoother
 *     with NO service worker.
 *   - The service worker file itself lives at `public/sw.js` and is
 *     served by Next as a static asset — both in dev and prod — but
 *     the registration call is what actually activates it. So gating
 *     the registration call (this component) on production is enough.
 *
 * This component renders nothing. It's mounted once from `Providers`
 * so the SW lifetime matches the app lifetime.
 *
 * Update flow:
 *   - On deploy, `sw.js` is updated with a new `CACHE_VERSION` (the
 *     build process should bump it manually if needed). The browser
 *     detects the byte-diff and installs the new SW in the background.
 *   - The new SW calls `self.skipWaiting()` on install, and `activate`
 *     claims all open clients → the new SW takes over immediately
 *     without requiring a reload.
 *   - Old caches from previous versions are purged in `activate`.
 */
export function ServiceWorkerRegister() {
  React.useEffect(() => {
    // ── Production-only gate ────────────────────────────────────────
    // `process.env.NODE_ENV` is inlined by the bundler at build time,
    // so the production bundle drops the entire effect body.
    if (process.env.NODE_ENV !== "production") return
    // ── Browser capability check ──────────────────────────────────
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return

    // ── Register on window load — avoids competing with first-paint
    // network requests for bandwidth.
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          // Swallow — SW failure is non-fatal. The app still works
          // online; only offline support is degraded.
          console.warn("[sw] registration failed:", err)
        })
    }
    if (document.readyState === "complete") {
      register()
    } else {
      window.addEventListener("load", register, { once: true })
      return () => window.removeEventListener("load", register)
    }
  }, [])

  return null
}
