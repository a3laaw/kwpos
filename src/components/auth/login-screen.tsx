"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Boxes,
  ShoppingCart,
  Warehouse,
  Loader2,
  LogIn,
  ShieldCheck,
  Sparkles,
  Calculator,
} from "lucide-react"
import { useT, useI18n } from "@/components/i18n-context"
import type { Dict } from "@/lib/i18n"
import { getCountryName } from "@/lib/countries"
import type { CountryConfig } from "@/lib/countries"

interface DemoAccount {
  role: string
  email: string
  icon: React.ComponentType<{ className?: string }>
  tone: string
}

function useDemoAccounts(t: Dict): DemoAccount[] {
  return React.useMemo(
    () => [
      {
        role: t.roleAdmin,
        email: "admin@demo.com",
        icon: ShieldCheck,
        tone: "text-primary",
      },
      {
        role: t.roleManager,
        email: "manager@demo.com",
        icon: ShieldCheck,
        tone: "text-blue-600",
      },
      {
        role: t.roleAccountant,
        email: "accountant@demo.com",
        icon: Calculator,
        tone: "text-purple-600",
      },
      {
        role: t.roleSales,
        email: "sales@demo.com",
        icon: ShoppingCart,
        tone: "text-[#2E6237] dark:text-[#DFC196]",
      },
      {
        role: t.roleWarehouse,
        email: "warehouse@demo.com",
        icon: Warehouse,
        tone: "text-amber-600 dark:text-amber-400",
      },
      {
        role: t.roleCashier,
        email: "cashier@demo.com",
        icon: ShoppingCart,
        tone: "text-rose-600",
      },
    ],
    [t]
  )
}

export function LoginScreen({ country }: { country?: CountryConfig }) {
  const t = useT()
  const { locale } = useI18n()
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  const demoAccounts = useDemoAccounts(t)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })
      if (!res || res.error) {
        toast.error(t.logInvalidCredentials, {
          description: t.logCheckEmailPassword,
        })
        setLoading(false)
        return
      }
      toast.success(t.logLoginSuccess, {
        description: t.logWelcomeDesc,
      })
      router.refresh()
    } catch (err) {
      toast.error(t.logUnexpectedError)
      setLoading(false)
    }
  }

  function quickFill(em: string) {
    setEmail(em)
    setPassword("")
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Branding panel */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-10 text-sidebar-foreground bg-sidebar overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-sidebar-primary blur-3xl" />
          <div className="absolute bottom-10 -left-10 h-72 w-72 rounded-full bg-[#DFC196] blur-3xl" />
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Boxes className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xl font-bold flex items-center gap-2">
              {t.logAppName}
              {country ? (
                <span className="text-base leading-none" title={getCountryName(country, locale)}>{country.flag}</span>
              ) : null}
            </p>
            <p className="text-sm text-sidebar-foreground/70">
              {t.appTagline}
            </p>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="text-3xl font-bold leading-tight text-balance">
            {t.logLoginHeroTitle}
          </h2>
          <p className="text-sidebar-foreground/80 leading-relaxed">
            {t.logLoginHeroDesc}
          </p>
          <ul className="space-y-3 text-sm">
            {[
              { icon: ShoppingCart, text: t.logFeature1 },
              { icon: Warehouse, text: t.logFeature2 },
              { icon: Boxes, text: t.logFeature3 },
            ].map((f, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-primary">
                  <f.icon className="h-4 w-4" />
                </span>
                <span className="text-sidebar-foreground/90">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 text-xs text-sidebar-foreground/60">
          © {new Date().getFullYear()} {t.logAppName} — {t.logCopyright}
        </div>
      </div>

      {/* Login form panel */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-10 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Boxes className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-bold">{t.logAppName}</p>
              <p className="text-xs text-muted-foreground">{t.logAppTaglineShort}</p>
            </div>
          </div>

          <Card className="border-border/70 shadow-sm">
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <Badge variant="secondary" className="font-normal">
                  {t.logDemo}
                </Badge>
              </div>
              <CardTitle className="text-2xl">{t.loginTitle}</CardTitle>
              <CardDescription>
                {t.loginDesc}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t.email}</Label>
                  <Input
                    id="email"
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className="text-end"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t.password}</Label>
                  <Input
                    id="password"
                    type="password"
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="text-end"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t.loggingIn}
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      {t.login}
                    </>
                  )}
                </Button>
              </form>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
