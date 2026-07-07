"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
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
  labelKey: keyof Dict
  items: MegaMenuItem[]
}

interface MegaMenuBarProps {
  groups: MegaMenuGroup[]
  value: string
  onChange: (value: string) => void
  className?: string
}

/* ─── Component ────────────────────────────────────────────────────── */

export function MegaMenuBar({ groups, value, onChange, className }: MegaMenuBarProps) {
  const t = useT()
  const [hoveredGroup, setHoveredGroup] = React.useState<number | null>(null)
  const [dropdownPos, setDropdownPos] = React.useState<{ left: number; top: number; width: number } | null>(null)
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

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
      // Add 8px horizontal offset so the dropdown doesn't visually touch
      // the sidebar or feel cramped. Also ensure it doesn't overflow
      // the right edge of the viewport.
      const dropdownWidth = Math.max(rect.width, 240)
      let left = rect.left
      // Prevent overflow on the right
      if (left + dropdownWidth > window.innerWidth - 16) {
        left = window.innerWidth - dropdownWidth - 16
      }
      setDropdownPos({ left, top: rect.bottom + 4, width: dropdownWidth })
    }
    setHoveredGroup(idx)
  }

  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => {
      setHoveredGroup(null)
      setDropdownPos(null)
    }, 250)
  }

  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  React.useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setHoveredGroup(null)
        setDropdownPos(null)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  function handleSelect(v: string) {
    onChange(v)
    setHoveredGroup(null)
    setDropdownPos(null)
  }

  return (
    <>
      <div
        className={cn(
          "sticky top-16 z-[60] -mx-4 sm:-mx-6 px-4 sm:px-6 py-0 bg-background/90 backdrop-blur-xl border-b border-border/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
          className
        )}
        onMouseLeave={scheduleClose}
      >
        <div className="flex items-center gap-0 overflow-x-auto scrollbar-thin">
          {groups.map((group, idx) => {
            const isOpen = hoveredGroup === idx
            const isActive = activeGroupIndex === idx
            return (
              <div key={idx} className="relative shrink-0">
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
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Fixed dropdown — rendered OUTSIDE the bar to escape overflow */}
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
          </div>
        </div>
      ) : null}
    </>
  )
}

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
