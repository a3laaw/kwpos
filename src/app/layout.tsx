import type { Metadata, Viewport } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

// ── Global error monitoring ─────────────────────────────────────────
// The lightweight error monitor (Sentry-free, see `src/lib/error-monitor.ts`)
// is installed at three layers:
//   1. `Providers` (this file) — installs window.onerror + unhandledrejection
//      listeners once on the client. All uncaught browser errors POST to
//      /api/errors, which logs to console + AuditLog (action="CLIENT_ERROR").
//   2. `src/app/error.tsx` — Next.js route error boundary; forwards render
//      errors from any route segment to the monitor and shows a fallback UI.
//   3. `src/app/global-error.tsx` — last-resort root error boundary; same
//      reporting pattern, replaces the root layout if it throws.
// API routes call `reportServerError` from `@/lib/error-monitor` inside
// their catch blocks to log server-side errors to console + AuditLog
// (action="SERVER_ERROR").

const tajawal = Tajawal({
  variable: "--font-sans",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800"],
  display: "swap",
});

const mono = Tajawal({
  variable: "--font-mono",
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "نظام إدارة المبيعات والمخازن والمشتريات",
  description:
    "نظام متكامل لإدارة المبيعات والمخازن والمشتريات للمشاريع الصغيرة — نقاط بيع، فواتير، أوامر شراء، تقارير.",
  keywords: ["ERP", "مبيعات", "مخازن", "مشتريات", "فواتير", "نقاط بيع"],
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.svg?v=2",
    apple: "/logo.svg?v=2",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KWPOS",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#2E6237",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${tajawal.variable} ${mono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
        <Toaster />
        <SonnerToaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
