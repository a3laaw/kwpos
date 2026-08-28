"use client"

/**
 * Global Error Boundary — Next.js convention.
 *
 * Catches errors that occur during the render of any route segment below
 * `app/`. Shows a recoverable fallback UI with a "Try again" button that
 * resets the boundary.
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
  // Report the error to /api/errors (server-side audit log).
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
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center"
    >
      <h2 className="text-xl font-semibold">حدث خطأ غير متوقع</h2>
      <p className="text-sm text-muted-foreground">
        تم إبلاغ فريق الدعم بالخطأ. يمكنك المحاولة مرة أخرى.
      </p>
      {/* Show error message in dev for debugging */}
      {process.env.NODE_ENV !== "production" && (
        <pre className="mt-4 max-w-lg overflow-auto rounded-lg bg-muted p-3 text-xs text-left text-muted-foreground">
          {error.message}
          {error.stack && "\n\n" + error.stack.slice(0, 500)}
        </pre>
      )}
      <Button
        onClick={() => {
          // Clear the error boundary AND redirect to dashboard
          reset()
          if (typeof window !== "undefined") {
            window.location.href = "/"
          }
        }}
      >
        إعادة المحاولة
      </Button>
    </div>
  )
}
