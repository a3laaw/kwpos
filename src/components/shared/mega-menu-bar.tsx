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
 *   - A search input to filter items (first button)
 *   - The items as clickable rows with icons
 *
 * The dropdown uses `fixed` positioning + dynamic coordinates to
 * escape any parent `overflow-hidden` containers.
 */
export function MegaMenuBar({ groups, value, onChange, className }: MegaMenuBarProps) {
  const t = useT()
  const [hoveredGroup, setHoveredGroup] = React.useState<number | null>(null)
  const [search, setSearch] = React.useState("")
  const [dropdownPos, setDropdownPos] = React.useState<{ left: number; top: number; width: number } | null>(null)
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Find which group contains the active item
  const activeGroupIndex = React.useMemo(() => {
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].items.some((it) => it.value === value)) return i
    }
    return -1
  }, [groups, value])

  function openGroup(idx: number, triggerEl?: HTMLElement) {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    if (triggerEl) {
      const rect = triggerEl.getBoundingClientRect()
      setDropdownPos({ left: rect.left, top: rect.bottom, width: idx === -1 ? 320 : Math.max(rect.width, 220) })
    }
    setHoveredGroup(idx)
    setSearch("")
  }

  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => {
      setHoveredGroup(null)
      setSearch("")
      setDropdownPos(null)
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
        setDropdownPos(null)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  function handleSelect(v: string) {
    onChange(v)
    setHoveredGroup(null)
    setSearch("")
    setDropdownPos(null)
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

  return (
    <>
      {/* The bar itself — sticky */}
      <div
        className={cn(
          "sticky top-16 z-[60] -mx-4 sm:-mx-6 px-4 sm:px-6 py-0 bg-background/90 backdrop-blur-xl border-b border-border/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
          className
        )}
        onMouseLeave={scheduleClose}
      >
        <div className="flex items-center gap-0 overflow-x-auto scrollbar-thin">
          {/* Search trigger — always visible at the start (Odoo-style) */}
          <div className="relative shrink-0">
            <button
              onMouseEnter={(e) => openGroup(-1, e.currentTarget)}
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
          </div>

          {/* Group buttons */}
          {groups.map((group, idx) => {
            const isOpen = hoveredGroup === idx
            const isActive = activeGroupIndex === idx
            return (
              <div
                key={idx}
                className="relative shrink-0"
              >
                <button
                  onMouseEnter={(e) => openGroup(idx, e.currentTarget)}
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
              </div>
            )
          })}
        </div>
      </div>

      {/* Fixed dropdown — rendered OUTSIDE the sticky bar to escape overflow */}
      {hoveredGroup !== null && dropdownPos ? (
        <div
          className="fixed z-[100]"
          style={{ left: dropdownPos.left, top: dropdownPos.top }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div
            className="rounded-b-xl border border-t-0 border-border bg-card shadow-xl overflow-hidden"
            style={{ width: dropdownPos.width }}
          >
            {hoveredGroup === -1 ? (
              /* Search panel */
              <>
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
                    searchResults.map((item) => (
                      <DropdownRow
                        key={item.value}
                        item={item}
                        active={value === item.value}
                        t={t}
                        onSelect={handleSelect}
                      />
                    ))
                  )}
                </div>
              </>
            ) : (
              /* Group items panel */
              <div className="max-h-[320px] overflow-y-auto scrollbar-thin p-1">
                {groups[hoveredGroup].items.map((item) => (
                  <DropdownRow
                    key={item.value}
                    item={item}
                    active={value === item.value}
                    t={t}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}

/* ─── Dropdown row (shared) ───────────────────────────────────────── */

function DropdownRow({
  item,
  active,
  t,
  onSelect,
}: {
  item: MegaMenuItem
  active: boolean
  t: ReturnType<typeof useT>
  onSelect: (v: string) => void
}) {
  const Icon = item.icon
  return (
    <button
      onClick={() => onSelect(item.value)}
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
}
