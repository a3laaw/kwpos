"use client"

/**
 * Global Root-Error Boundary — Next.js convention.
 *
 * `global-error.tsx` is the LAST-RESORT error boundary. It replaces the
 * root `<html>` and `<body>` tags when the root layout itself throws
 * during render. Because it replaces the layout, it MUST include its
 * own `<html>` and `<body>` tags. It is also responsible for installing
 * the client-side error monitor — there is no Providers tree to do it
 * here. We forward the error to /api/errors and render a minimal
 * fallback page.
 *
 * See: https://nextjs.org/docs/app/api-reference/file-conventions/global-error
 */

import * as React from "react"
import { reportClientError, installClientErrorMonitor } from "@/lib/error-monitor"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Install the monitor for any subsequent client-side errors on the
  // fallback page (it's idempotent).
  React.useEffect(() => {
    installClientErrorMonitor()
    reportClientError({
      message: `[global-error boundary] ${error.message}`,
      stack: error.stack,
      level: "error",
      context: { digest: error.digest, kind: "global-error" },
    })
  }, [error])

  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          margin: 0,
          padding: "2rem",
          background: "#fafafa",
          color: "#1a1a1a",
        }}
      >
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
            حدث خطأ في التطبيق
          </h2>
          <p style={{ color: "#666", marginBottom: "1.5rem" }}>
            تم إبلاغ فريق الدعم. يمكنك إعادة تحميل الصفحة.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "0.6rem 1.2rem",
              fontSize: "1rem",
              background: "#2E6237",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  )
}
