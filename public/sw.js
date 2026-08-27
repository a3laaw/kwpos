/**
 * KWPOS service worker — intentionally SIMPLE.
 *
 * Strategies:
 *   1. App-shell (HTML navigations + the main CSS chunk):
 *      stale-while-revalidate. Serves the cached shell instantly, then
 *      refreshes in the background so the next navigation has a fresh copy.
 *   2. Static assets (Same-origin /_next/static/, /icons, /manifest.json,
 *      /logo.svg): cache-first. These are immutable content-hashed files;
 *      no point hitting the network.
 *   3. API calls (same-origin /api/*): network-first, fall back to cache
 *      only when the network is down. API responses are NEVER cached when
 *      the request method is not GET (POST/PATCH/DELETE always go to the
 *      network).
 *
 * What this SW deliberately does NOT do:
 *   - Cache the entire app at install time (precache). With Next.js's
 *     content-hashed chunks the manifest would have to be regenerated
 *     on every deploy — keep it simple, let the runtime cache fill
 *     itself as the user navigates.
 *   - Offline analytics / queue writes. POS sales MUST go to the
 *     server; offline-queueing would let cashiers think a sale went
 *     through when it didn't.
 *   - Background sync / periodic sync. Avoids surprises on the server.
 *
 * Bump CACHE_VERSION on every deploy to invalidate the previous cache.
 */
const CACHE_VERSION = "kwpos-v1";
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Maximum number of entries in the API cache. Without a cap, a long
// session could cache dozens of MB of /api/* responses.
const API_CACHE_MAX = 50;

// ── Install — activate immediately (no waiting). Old caches are purged
// in the `activate` handler below.
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_SHELL_CACHE);
      // Pre-cache the app shell so the very first offline load works.
      // We don't pre-cache every route — just `/` (which 200s with HTML).
      await cache.addAll(["/"]).catch(() => {
        // If the pre-cache fails (e.g. the server is down at install
        // time), don't fail the install — the runtime cache will
        // fill in later.
      });
      await self.skipWaiting();
    })()
  );
});

// ── Activate — purge caches from previous versions, claim all open
// clients so the new SW takes effect immediately (no reload needed).
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// ── Helper: trim the API cache to API_CACHE_MAX entries (LRU-ish).
async function trimApiCache() {
  const cache = await caches.open(API_CACHE);
  const keys = await cache.keys();
  if (keys.length > API_CACHE_MAX) {
    // Delete the oldest entries until we're under the cap.
    const toDelete = keys.slice(0, keys.length - API_CACHE_MAX);
    await Promise.all(toDelete.map((k) => cache.delete(k)));
  }
}

// ── Fetch handler — routes each request to the right strategy.
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET. POST/PUT/PATCH/DELETE go straight to the network
  // (we never write to the cache from a mutation request).
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Don't touch cross-origin requests (CDNs, Google Fonts, etc.) — let
  // the browser handle them with its default caching.
  if (url.origin !== self.location.origin) return;

  // ── Strategy 3: API calls — network-first, fall back to cache. ──
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          // Only cache successful, basic (CORS-same-origin) responses.
          if (fresh && fresh.ok && fresh.type === "basic") {
            const cache = await caches.open(API_CACHE);
            cache.put(req, fresh.clone()).then(trimApiCache);
          }
          return fresh;
        } catch (err) {
          // Network failed (offline or DNS error). Try the cache.
          const cached = await caches.match(req);
          if (cached) return cached
          // No cache either — return a minimal offline response.
          return new Response(
            JSON.stringify({ error: "offline", message: "API unavailable while offline." }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" },
            }
          )
        }
      })()
    );
    return;
  }

  // ── Strategy 2: Static assets — cache-first. ─────────────────────
  // Next.js serves content-hashed chunks from /_next/static/. We also
  // treat /icons/*, /icon-*.png, /manifest.json, /logo.svg, /robots.txt
  // as immutable static assets.
  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /^\/icon-\d+\.(png|svg)$/.test(url.pathname) ||
    url.pathname === "/manifest.json" ||
    url.pathname === "/logo.svg" ||
    url.pathname === "/robots.txt"
  if (isStaticAsset) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(req);
        if (cached) return cached
        try {
          const fresh = await fetch(req)
          if (fresh && fresh.ok && fresh.type === "basic") {
            await cache.put(req, fresh.clone())
          }
          return fresh
        } catch (err) {
          // Static asset + offline + no cache → 404 response.
          return new Response("Offline", { status: 503 })
        }
      })()
    );
    return;
  }

  // ── Strategy 1: HTML navigations — stale-while-revalidate. ──────
  // Only handle navigation requests (document loads), not images /
  // stylesheets loaded by <link> (those fall through to the default
  // browser cache).
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(APP_SHELL_CACHE);
        const cached = await cache.match(req)
        // Always kick off a network fetch in the background so the
        // next navigation has a fresh copy. Don't await it here.
        const networkPromise = fetch(req)
          .then((fresh) => {
            if (fresh && fresh.ok && fresh.type === "basic") {
              cache.put(req, fresh.clone())
            }
            return fresh
          })
          .catch(() => null)
        if (cached) {
          return cached
        }
        // No cache — wait for the network.
        const fresh = await networkPromise
        if (fresh) return fresh
        // Network failed AND no cache — serve the generic app shell
        // (`/`) so the user sees the app instead of a browser error.
        const fallback = await cache.match("/")
        return (
          fallback ||
          new Response(
            "<html><body><h1>Offline</h1><p>The KWPOS app is not available while offline on first load.</p></body></html>",
            {
              status: 503,
              headers: { "Content-Type": "text/html; charset=utf-8" },
            }
          )
        )
      })()
    );
    return;
  }

  // Anything else: default browser behavior. No `event.respondWith`.
});

// ── Message handler — lets the page ask the SW to skip waiting (used
// by the registration code to activate a new SW immediately on update).
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting()
  }
})
