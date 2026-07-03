"use client"

import * as React from "react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Menu,
  Boxes,
  LogOut,
  Sun,
  Moon,
  User as UserIcon,
  ChevronsLeft,
  Languages,
} from "lucide-react"
import { useAppStore } from "@/lib/store"
import { NAV_ITEMS } from "@/components/nav-config"
import { ROLE_PERMISSIONS } from "@/lib/session"
import type { Role } from "@/lib/types"
import { useT, useI18n } from "@/components/i18n-context"
import { cn } from "@/lib/utils"

interface SidebarProps {
  user: { id: string; name: string; email: string; role: Role }
  mobileOnly?: boolean
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return "؟"
  if (parts.length === 1) return parts[0].slice(0, 2)
  return (parts[0][0] || "") + (parts[1][0] || "")
}

function NavLinks({
  user,
  onNavigate,
}: {
  user: SidebarProps["user"]
  onNavigate?: () => void
}) {
  const view = useAppStore((s) => s.view)
  const setView = useAppStore((s) => s.setView)
  const t = useT()
  const allowed = ROLE_PERMISSIONS[user.role].views

  return (
    <nav className="space-y-1 px-3">
      {NAV_ITEMS.filter((item) => allowed.includes(item.view)).map((item) => {
        const Icon = item.icon
        const active = view === item.view
        return (
          <button
            key={item.view}
            onClick={() => {
              setView(item.view)
              onNavigate?.()
            }}
            className={cn(
              "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "nav-active"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5 shrink-0",
                active ? "text-sidebar-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
              )}
            />
            <span className="flex-1 text-start">{t[item.labelKey]}</span>
            {active ? (
              <ChevronsLeft className="h-4 w-4 text-sidebar-primary rtl:rotate-0 ltr:rotate-180" />
            ) : null}
          </button>
        )
      })}
    </nav>
  )
}

function Brand() {
  const t = useT()
  return (
    <Link href="/" className="flex items-center gap-3 px-5 py-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
        <Boxes className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <p className="font-bold text-sidebar-foreground">{t.appName}</p>
        <p className="text-xs text-sidebar-foreground/60">{t.appTagline}</p>
      </div>
    </Link>
  )
}

function UserCard({ user }: { user: SidebarProps["user"] }) {
  const t = useT()
  const roleLabel = user.role === "ADMIN" ? t.roleAdmin : user.role === "SALES" ? t.roleSales : t.roleWarehouse
  return (
    <div className="mx-3 mb-3 flex items-center gap-3 rounded-xl bg-sidebar-accent/50 p-3">
      <Avatar className="h-10 w-10 border-2 border-sidebar-primary/40">
        <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm font-bold">
          {initials(user.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-sidebar-foreground">
          {user.name}
        </p>
        <p className="truncate text-xs text-sidebar-foreground/60" dir="ltr">
          {user.email}
        </p>
      </div>
      <Badge className="bg-sidebar-primary/20 text-sidebar-primary border-sidebar-primary/30 hover:bg-sidebar-primary/30">
        {roleLabel}
      </Badge>
    </div>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const t = useT()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="h-9 w-9" />
  const isDark = theme === "dark"
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? t.lightMode : t.darkMode}
      className="h-9 w-9"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}

function LangToggle() {
  const { toggle, dict } = useI18n()
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      title={dict.switchLang}
      className="h-9 w-9"
    >
      <Languages className="h-4 w-4" />
    </Button>
  )
}

export function AppSidebar({ user }: SidebarProps) {
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-s border-sidebar-border h-screen sticky top-0">
      <Brand />
      <ScrollArea className="flex-1">
        <NavLinks user={user} />
      </ScrollArea>
      <UserCard user={user} />
    </aside>
  )
}

export function MobileSidebar({ user }: SidebarProps) {
  const open = useAppStore((s) => s.sidebarOpen)
  const { locale } = useI18n()
  // In RTL (Arabic) the sidebar lives on the right → slide from right.
  // In LTR (English) the sidebar lives on the left → slide from left.
  const side = locale === "ar" ? "right" : "left"
  const setOpen = useAppStore((s) => s.setSidebarOpen)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side={side}
        className="w-72 bg-sidebar text-sidebar-foreground border-sidebar-border p-0"
      >
        <SheetHeader className="text-start">
          <SheetTitle className="text-sidebar-foreground">
            <Brand />
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 h-[calc(100vh-140px)]">
          <NavLinks user={user} onNavigate={() => setOpen(false)} />
        </ScrollArea>
        <UserCard user={user} />
      </SheetContent>
    </Sheet>
  )
}

export function Topbar({
  user,
  title,
  country,
}: {
  user: SidebarProps["user"]
  title: string
  country?: { code: string; name: string; flag: string; currencySymbol: string }
}) {
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)
  const t = useT()
  const roleLabel = user.role === "ADMIN" ? t.roleAdmin : user.role === "SALES" ? t.roleSales : t.roleWarehouse
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 bg-background/80 backdrop-blur px-4 sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex-1 min-w-0">
        <h2 className="truncate text-base sm:text-lg font-semibold">{title}</h2>
      </div>
      {country ? (
        <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1 text-xs" title={country.name}>
          <span className="text-base leading-none">{country.flag}</span>
          <span className="font-medium">{country.currencySymbol}</span>
        </div>
      ) : null}
      <LangToggle />
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 h-9 px-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline text-sm font-medium">{user.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span>{user.name}</span>
              <span className="text-xs text-muted-foreground font-normal" dir="ltr">
                {user.email}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2" disabled>
            <UserIcon className="h-4 w-4" />
            {roleLabel}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 text-destructive focus:text-destructive"
            onClick={async () => {
              await signOut({ redirect: false })
              toast.success(t.logout)
              window.location.reload()
            }}
          >
            <LogOut className="h-4 w-4" />
            {t.logout}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
