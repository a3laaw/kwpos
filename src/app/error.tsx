"use client"

/**
 * Global Error Boundary — Next.js convention.
 *
 * Catches errors that occur during the render of any route segment below
 * `app/` (including the page tree, but NOT the root layout itself — that
 * is handled by `global-error.tsx`). Forwards the error to the error
 * monitor (POST /api/errors) and shows a recoverable fallback UI with a
 * "Try again" button that resets the boundary.
 *
 * See: https://nextjs.org/docs/app/api-reference/file-conventions/error
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
      <Button onClick={() => reset()}>إعادة المحاولة</Button>
    </div>
  )
}
