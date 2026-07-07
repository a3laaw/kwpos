"use client"

import * as React from "react"
import { ChevronDown, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useT } from "@/components/i18n-context"
import type { Dict } from "@/lib/i18n"

export interface ContextNavItem {
  value: string
  labelKey: keyof Dict
  icon?: React.ComponentType<{ className?: string }>
}

interface ContextDropdownProps {
  /** Section label (e.g. "المحاسبة") */
  sectionLabel: string
  /** Sub-items */
  items: ContextNavItem[]
  /** Active value */
  value: string
  /** Called on select */
  onChange: (value: string) => void
}

/**
 * ContextDropdown — a button that shows the current section + opens a
 * searchable dropdown of sub-pages. Replaces SubNav when there are many
 * items (> 5) to avoid horizontal scrolling.
 *
 * Example: [محاسبة ▾] → dropdown with search + 9 items
 */
export function ContextDropdown({
  sectionLabel,
  items,
  value,
  onChange,
}: ContextDropdownProps) {
  const t = useT()
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const ref = React.useRef<HTMLDivElement>(null)

  // Close on outside click
  React.useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  // Close on ESC
  React.useEffect(() => {
    if (!open) return
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open])

  const activeItem = items.find((i) => i.value === value)
  const activeLabel = activeItem ? t[activeItem.labelKey] : sectionLabel
  const ActiveIcon = activeItem?.icon

  const filtered = search.trim()
    ? items.filter((i) =>
        t[i.labelKey].toLowerCase().includes(search.trim().toLowerCase())
      )
    : items

  function handleSelect(v: string) {
    onChange(v)
    setOpen(false)
    setSearch("")
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium transition-all hover:border-primary/40 hover:shadow-sm",
          open && "border-primary/40 ring-2 ring-primary/15"
        )}
      >
        {ActiveIcon ? (
          <ActiveIcon className="h-4 w-4 text-primary" />
        ) : null}
        <span className="truncate max-w-[160px]">{activeLabel}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform shrink-0",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {open ? (
        <div className="absolute top-full mt-1 z-50 w-72 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
          {/* Search */}
          <div className="relative p-2 border-b border-border/60">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.subNavSearch}
              className="h-8 pr-9 text-sm"
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

          {/* Items */}
          <div className="max-h-[320px] overflow-y-auto scrollbar-thin p-1">
            {filtered.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-6">
                {t.noData}
              </p>
            ) : (
              filtered.map((item) => {
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
                    {active ? <Badge variant="secondary" className="text-[10px] shrink-0">●</Badge> : null}
                  </button>
                )
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
