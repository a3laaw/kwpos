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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Menu,
  Boxes,
  LogOut,
  Sun,
  Moon,
  User as UserIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Languages,
} from "lucide-react"
import { useAppStore } from "@/lib/store"
import { NAV_ENTRIES, type NavEntry } from "@/components/nav-config"
import { ROLE_PERMISSIONS } from "@/lib/session"
import type { Role } from "@/lib/types"
import type { AppView } from "@/lib/types"
import { useT, useI18n } from "@/components/i18n-context"
import { getCountryName } from "@/lib/countries"
import type { CountryConfig } from "@/lib/countries"
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

/**
 * Accordion-style nested sidebar nav.
 *
 * - Standalone leaf items render as flat buttons.
 * - Group items render as a Collapsible parent with children. Only one group
 *   is open at a time (accordion) to preserve vertical space and avoid scroll.
 * - The dropdown chevron sits at the far inner edge of the parent button
 *   (left in RTL, right in LTR). It points DOWN when the group is open and
 *   sideways (toward content) when closed.
 * - Groups are filtered by role: a parent shows only if at least one of its
 *   children is allowed; only allowed children render inside.
 */
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
  const { locale } = useI18n()
  const isRTL = locale === "ar"
  const allowed = ROLE_PERMISSIONS[user.role].views

  // Accordion: track which group label-key is open. Only one open at a time.
  // A group auto-opens if the current view belongs to it (so the active child
  // is always visible).
  const initialOpen = React.useMemo(() => {
    for (const entry of NAV_ENTRIES) {
      if (entry.type === "group" && entry.children.some((c) => c.view === view)) {
        return entry.labelKey
      }
    }
    return null
  }, [view])
  const [openGroup, setOpenGroup] = React.useState<string | null>(initialOpen)

  // Keep accordion in sync when the active view changes (e.g. via deep link or
  // role switch): auto-open the group containing the new active view.
  React.useEffect(() => {
    for (const entry of NAV_ENTRIES) {
      if (entry.type === "group" && entry.children.some((c) => c.view === view)) {
        setOpenGroup(entry.labelKey)
        return
      }
    }
  }, [view])

  const toggleGroup = (labelKey: string) => {
    setOpenGroup((prev) => (prev === labelKey ? null : labelKey))
  }

  // Closed-group chevron points toward the content area:
  // RTL → content is on the right → chevron points left (ChevronLeft)
  // LTR → content is on the left → chevron points right (ChevronRight)
  const ClosedChevron = isRTL ? ChevronLeft : ChevronRight

  const renderLeaf = (entry: NavEntry & { type: "leaf" }) => {
    if (!allowed.includes(entry.view)) return null
    const Icon = entry.icon
    const active = view === entry.view
    return (
      <button
        key={entry.view}
        onClick={() => {
          setView(entry.view)
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
            active
              ? "text-sidebar-primary"
              : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
          )}
        />
        <span className="flex-1 text-start">{t[entry.labelKey]}</span>
        {active ? (
          <ClosedChevron className="h-4 w-4 shrink-0 text-sidebar-primary" />
        ) : null}
      </button>
    )
  }

  const renderGroup = (entry: NavEntry & { type: "group" }) => {
    // Only render children the user is allowed to see.
    const visibleChildren = entry.children.filter((c) => allowed.includes(c.view))
    if (visibleChildren.length === 0) return null

    const isOpen = openGroup === entry.labelKey
    const Icon = entry.icon
    const hasActiveChild = visibleChildren.some((c) => c.view === view)

    return (
      <Collapsible
        key={entry.labelKey}
        open={isOpen}
        onOpenChange={() => toggleGroup(entry.labelKey as string)}
        className="nav-collapsible"
      >
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              hasActiveChild || isOpen
                ? "text-sidebar-foreground bg-sidebar-accent/40"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5 shrink-0",
                hasActiveChild || isOpen
                  ? "text-sidebar-primary"
                  : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
              )}
            />
            <span className="flex-1 text-start">{t[entry.labelKey]}</span>
            {/* Dropdown chevron at the far inner edge (left in RTL, right in LTR).
                Points DOWN when open, sideways (toward content) when closed. */}
            {isOpen ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-sidebar-primary" />
            ) : (
              <ClosedChevron className="h-4 w-4 shrink-0 text-sidebar-foreground/60 group-hover:text-sidebar-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="nav-collapsible-content">
          <div className="mt-1 space-y-1 ps-4">
            {visibleChildren.map((child) => {
              const ChildIcon = child.icon
              const childActive = view === child.view
              return (
                <button
                  key={child.view}
                  onClick={() => {
                    setView(child.view as AppView)
                    onNavigate?.()
                  }}
                  className={cn(
                    "group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                    childActive
                      ? "nav-active"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <ChildIcon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      childActive
                        ? "text-sidebar-primary"
                        : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
                    )}
                  />
                  <span className="flex-1 text-start">{t[child.labelKey]}</span>
                </button>
              )
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <nav className="space-y-1 px-3" dir={isRTL ? "rtl" : "ltr"}>
      {NAV_ENTRIES.map((entry) =>
        entry.type === "leaf" ? renderLeaf(entry) : renderGroup(entry)
      )}
    </nav>
  )
}

function Brand() {
  const t = useT()
  const { locale } = useI18n()
  // Explicit dir on the Brand container guarantees the logo avatar starts at
  // the leading edge (right in Arabic, left in English) regardless of any
  // inherited direction quirks.
  // Tagline is allowed to wrap (line-clamp-2) instead of truncating, so the
  // full "إدارة المبيعات والمخازن والمشتريات" is visible.
  return (
    <Link
      href="/"
      dir={locale === "ar" ? "rtl" : "ltr"}
      className="flex items-center gap-3 px-4 py-4"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
        <Boxes className="h-5 w-5" />
      </div>
      <div className="leading-tight min-w-0 flex-1">
        <p className="font-bold text-sidebar-foreground truncate">{t.appName}</p>
        <p className="text-xs text-sidebar-foreground/60 line-clamp-2 leading-tight">
          {t.appTagline}
        </p>
      </div>
    </Link>
  )
}

function UserCard({ user }: { user: SidebarProps["user"] }) {
  const t = useT()
  const { locale } = useI18n()
  const roleLabel = user.role === "ADMIN" ? t.roleAdmin : user.role === "SALES" ? t.roleSales : t.roleWarehouse
  // Explicit dir ensures the avatar sits at the leading edge (right in Arabic,
  // left in English) and the text block flows toward the trailing edge.
  // Restructured so the role badge no longer squeezes the name — name + email
  // get the full available width, badge wraps to its own line if needed.
  return (
    <div
      dir={locale === "ar" ? "rtl" : "ltr"}
      className="mx-3 mb-3 flex items-center gap-3 rounded-xl bg-sidebar-accent/50 p-3"
    >
      <Avatar className="h-10 w-10 shrink-0 border-2 border-sidebar-primary/40">
        <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm font-bold">
          {initials(user.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-sidebar-foreground" title={user.name}>
          {user.name}
        </p>
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="truncate text-xs text-sidebar-foreground/60" dir="ltr" title={user.email}>
            {user.email}
          </p>
          <Badge className="shrink-0 bg-sidebar-primary/20 text-sidebar-primary border-sidebar-primary/30 hover:bg-sidebar-primary/30 text-[10px] leading-none px-1.5 py-0.5">
            {roleLabel}
          </Badge>
        </div>
      </div>
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
  const { locale } = useI18n()
  // Avoid hydration mismatch: Radix Collapsible generates useId values that
  // differ between server and client. Render the sidebar only after mount.
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  // Explicit dir on the whole aside ensures full RTL mirroring of the sidebar
  // container (icons, text, chevrons) independent of any inherited direction.
  return (
    <aside
      dir={locale === "ar" ? "rtl" : "ltr"}
      className="hidden lg:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-s border-sidebar-border h-screen sticky top-0"
    >
      <Brand />
      <ScrollArea className="flex-1">
        {mounted ? <NavLinks user={user} /> : <div className="p-3 space-y-2">
          {/* Skeleton placeholder to prevent layout shift */}
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-sidebar-accent/30 animate-pulse" />
          ))}
        </div>}
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
  country?: CountryConfig
}) {
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)
  const t = useT()
  const { locale } = useI18n()
  // Avoid hydration mismatch from Radix DropdownMenu useId.
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
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
        <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1 text-xs" title={getCountryName(country, locale)}>
          <span className="text-base leading-none">{country.flag}</span>
          <span className="font-medium">{country.currencySymbol}</span>
        </div>
      ) : null}
      <LangToggle />
      <ThemeToggle />
      {mounted ? (
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
      ) : (
        <Button variant="ghost" className="gap-2 h-9 px-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline text-sm font-medium">{user.name}</span>
        </Button>
      )}
    </header>
  )
}
