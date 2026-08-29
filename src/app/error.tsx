"use client"

/**
 * Global Error Boundary — Next.js convention.
 *
 * Catches errors that occur during the render of any route segment below
 * `app/`. Shows a recoverable fallback UI with a "Try again" button.
 */

import * as React from "react"
import { reportClientError } from "@/lib/error-monitor"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    reportClientError({
      message: `[error.tsx boundary] ${error.message}`,
      stack: error.stack,
      level: "error",
      context: { digest: error.digest, kind: "route-error" },
    })
  }, [error])

  return (
    <div
      dir="rtl"
      className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center"
    >
      <h2 className="text-xl font-semibold">حدث خطأ غير متوقع</h2>
      <p className="text-sm text-muted-foreground">
        لم نتمكن من العثور على الصفحة التي تبحث عنها.
      </p>
      <Button
        onClick={() => {
          // Reset the error boundary first
          reset()
          // Force a clean page reload to the root
          // Use window.location.replace so the broken URL doesn't
          // stay in browser history (prevents back button from
          // re-triggering the error)
          if (typeof window !== "undefined") {
            window.location.replace(window.location.origin)
          }
        }}
      >
        إعادة المحاولة
      </Button>
    </div>
  )
}
