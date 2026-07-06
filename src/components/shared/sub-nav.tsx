"use client"

import * as React from "react"
import { ChevronDown, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useT } from "@/components/i18n-context"
import type { Dict } from "@/lib/i18n"

export interface SubNavItem {
  /** Unique key for this tab/section */
  value: string
  /** i18n label key */
  labelKey: keyof Dict
  /** Optional icon */
  icon?: React.ComponentType<{ className?: string }>
}

interface SubNavProps {
  /** Top-level items shown in the horizontal bar */
  items: SubNavItem[]
  /** Currently active value */
  value: string
  /** Called when user selects an item */
  onChange: (value: string) => void
}

/**
 * SubNav — a horizontal sticky top bar with dropdown search.
 *
 * - Renders all items as buttons in a single horizontal scrollable row.
 * - On desktop: all items visible side-by-side.
 * - On mobile: horizontally scrollable (no wrapping → no stacking).
 * - No dropdown menus (kept simple for reliability).
 * - The active item gets a bottom-border accent.
 */
export function SubNav({ items, value, onChange }: SubNavProps) {
  const t = useT()

  return (
    <div className="sticky top-16 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 bg-background/85 backdrop-blur-xl border-b border-border/60">
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin">
        {items.map((item) => {
          const Icon = item.icon
          const active = value === item.value
          return (
            <button
              key={item.value}
              onClick={() => onChange(item.value)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
              {t[item.labelKey]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
