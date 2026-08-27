"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SessionProvider } from "next-auth/react"
import { I18nProvider } from "@/components/i18n-context"
import { installClientErrorMonitor } from "@/lib/error-monitor"
import { ServiceWorkerRegister } from "@/components/sw-register"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  )

  // Install the global client-side error monitor (window.onerror +
  // window.onunhandledrejection → POST /api/errors). Idempotent and
  // SSR-safe — `installClientErrorMonitor` no-ops on the server.
  React.useEffect(() => {
    installClientErrorMonitor()
  }, [])

  return (
    <SessionProvider>
      <I18nProvider>
        <NextThemesProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <QueryClientProvider client={queryClient}>
            {children}
            {/* Registers /sw.js in production only. No-op in dev. */}
            <ServiceWorkerRegister />
          </QueryClientProvider>
        </NextThemesProvider>
      </I18nProvider>
    </SessionProvider>
  )
}
