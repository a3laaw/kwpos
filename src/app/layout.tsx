import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

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
  icons: {
    icon: "/logo.svg?v=2",
    apple: "/logo.svg?v=2",
  },
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
