"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SessionProvider } from "next-auth/react"
import { I18nProvider } from "@/components/i18n-context"

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

  return (
    <SessionProvider>
      <I18nProvider>
        <NextThemesProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </NextThemesProvider>
      </I18nProvider>
    </SessionProvider>
  )
}
