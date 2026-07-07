"use client"

import * as React from "react"
import { ChevronDown, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useT } from "@/components/i18n-context"
import type { Dict } from "@/lib/i18n"

/* ─── Types ───────────────────────────────────────────────────────── */

export interface MegaMenuItem {
  value: string
  labelKey: keyof Dict
  icon?: React.ComponentType<{ className?: string }>
}

export interface MegaMenuGroup {
  /** Group label key (shown on the bar button) */
  labelKey: keyof Dict
  /** Items in this group (shown in the dropdown) */
  items: MegaMenuItem[]
}

interface MegaMenuBarProps {
  /** Groups to render in the bar */
  groups: MegaMenuGroup[]
  /** Currently active item value */
  value: string
  /** Called when user selects an item */
  onChange: (value: string) => void
  className?: string
}

/* ─── Component ────────────────────────────────────────────────────── */

/**
 * MegaMenuBar — Odoo-style horizontal menu bar with hover dropdowns.
 *
 * Renders groups as buttons in a sticky horizontal bar. On hover (or
 * focus), a dropdown panel opens below the button showing:
 *   - A search input to filter items
 *   - The items as clickable rows with icons
 *
 * The dropdown closes on mouse leave (with a small delay) or ESC.
 * On mobile, the bar is horizontally scrollable.
 */
export function MegaMenuBar({ groups, value, onChange, className }: MegaMenuBarProps) {
  const t = useT()
  const [hoveredGroup, setHoveredGroup] = React.useState<number | null>(null)
  const [search, setSearch] = React.useState("")
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Find which group contains the active item
  const activeGroupIndex = React.useMemo(() => {
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].items.some((it) => it.value === value)) return i
    }
    return -1
  }, [groups, value])

  function openGroup(idx: number) {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    setHoveredGroup(idx)
    setSearch("")
  }

  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => {
      setHoveredGroup(null)
      setSearch("")
    }, 250)
  }

  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  // ESC to close
  React.useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setHoveredGroup(null)
        setSearch("")
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  function handleSelect(v: string) {
    onChange(v)
    setHoveredGroup(null)
    setSearch("")
  }

  // Flatten all items for the search (when search is active, show all)
  const allItems = React.useMemo(
    () => groups.flatMap((g) => g.items),
    [groups]
  )
  const searchResults = search.trim()
    ? allItems.filter((it) =>
        t[it.labelKey].toLowerCase().includes(search.trim().toLowerCase())
      )
    : []

  const showSearchPanel = hoveredGroup !== null && search.trim() !== ""

  return (
    <div
      ref={containerRef}
      className={cn(
        "sticky top-16 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-0 bg-background/90 backdrop-blur-xl border-b border-border/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
        className
      )}
      onMouseLeave={scheduleClose}
    >
      <div className="flex items-center gap-0 overflow-x-auto scrollbar-thin">
        {/* Search trigger — always visible at the start (Odoo-style) */}
        <div
          className="relative shrink-0"
          onMouseEnter={() => openGroup(-1)}
        >
          <button
            className={cn(
              "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors border-b-2",
              hoveredGroup === -1
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">{t.subNavSearch}</span>
          </button>

          {/* Search dropdown — shows all items filtered */}
          {hoveredGroup === -1 ? (
            <div
              className="absolute top-full start-0 mt-0 z-50 w-80 rounded-b-xl border border-t-0 border-border bg-card shadow-lg overflow-hidden"
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
            >
              <div className="relative p-2 border-b border-border/60">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.subNavSearch}
                  className="h-9 pr-9 text-sm"
                  autoFocus
                />
                {search ? (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              <div className="max-h-[320px] overflow-y-auto scrollbar-thin p-1">
                {search.trim() === "" ? (
                  <p className="text-center text-xs text-muted-foreground py-6">
                    {t.subNavSearch}
                  </p>
                ) : searchResults.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-6">
                    {t.noData}
                  </p>
                ) : (
                  searchResults.map((item) => {
                    const Icon = item.icon
                    const active = value === item.value
                    return (
                      <button
                        key={item.value}
                        onClick={() => handleSelect(item.value)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors text-start",
                          active
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted text-foreground"
                        )}
                      >
                        {Icon ? (
                          <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                        ) : null}
                        <span className="flex-1 truncate">{t[item.labelKey]}</span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Group buttons */}
        {groups.map((group, idx) => {
          const isOpen = hoveredGroup === idx
          const isActive = activeGroupIndex === idx
          const groupItems = isOpen ? group.items : []
          return (
            <div
              key={idx}
              className="relative shrink-0"
              onMouseEnter={() => openGroup(idx)}
            >
              <button
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors border-b-2",
                  isOpen || isActive
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                )}
              >
                {t[group.labelKey]}
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              </button>

              {/* Dropdown panel */}
              {isOpen ? (
                <div
                  className="absolute top-full start-0 mt-0 z-50 min-w-[220px] rounded-b-xl border border-t-0 border-border bg-card shadow-lg overflow-hidden"
                  onMouseEnter={cancelClose}
                  onMouseLeave={scheduleClose}
                >
                  <div className="max-h-[320px] overflow-y-auto scrollbar-thin p-1">
                    {groupItems.map((item) => {
                      const Icon = item.icon
                      const active = value === item.value
                      return (
                        <button
                          key={item.value}
                          onClick={() => handleSelect(item.value)}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors text-start",
                            active
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-muted text-foreground"
                          )}
                        >
                          {Icon ? (
                            <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                          ) : null}
                          <span className="flex-1 truncate">{t[item.labelKey]}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
