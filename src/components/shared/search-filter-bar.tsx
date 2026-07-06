"use client"

import * as React from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useT } from "@/components/i18n-context"

export interface FilterOption {
  label: string
  value: string
}

export interface FilterConfig {
  key: string
  label: string
  options: FilterOption[]
}

interface SearchFilterBarProps {
  /** Search query value */
  searchValue: string
  /** Called when search changes */
  onSearchChange: (value: string) => void
  /** Search placeholder */
  searchPlaceholder?: string
  /** Filter configurations */
  filters?: FilterConfig[]
  /** Current filter values: { [key]: string } */
  filterValues?: Record<string, string>
  /** Called when a filter changes */
  onFilterChange?: (key: string, value: string) => void
  /** Extra actions (buttons) on the end */
  actions?: React.ReactNode
  className?: string
}

/**
 * SearchFilterBar — unified search + filter bar.
 *
 * Renders a search input + dropdown filters in a single horizontal row.
 * On mobile: wraps to multiple rows (search on top, filters below).
 */
export function SearchFilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filters = [],
  filterValues = {},
  onFilterChange,
  actions,
  className,
}: SearchFilterBarProps) {
  const t = useT()
  const hasFilters = filters.length > 0
  const hasActiveFilters =
    Object.values(filterValues).some((v) => v && v !== "all") || searchValue.trim() !== ""

  function clearAll() {
    onSearchChange("")
    filters.forEach((f) => onFilterChange?.(f.key, "all"))
  }

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row gap-2 items-stretch sm:items-center",
        className
      )}
    >
      {/* Search */}
      <div className="relative flex-1 min-w-0">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder ?? t.search}
          className="pr-9 h-9"
        />
        {searchValue ? (
          <button
            onClick={() => onSearchChange("")}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {/* Filters */}
      {hasFilters ? (
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <Select
              key={f.key}
              value={filterValues[f.key] ?? "all"}
              onValueChange={(v) => onFilterChange?.(f.key, v)}
            >
              <SelectTrigger className="h-9 w-auto min-w-[120px] text-xs gap-1">
                <span className="text-muted-foreground">{f.label}:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {f.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>
      ) : null}

      {/* Clear button */}
      {hasActiveFilters ? (
        <Button variant="ghost" size="sm" onClick={clearAll} className="h-9 gap-1 text-xs shrink-0">
          <X className="h-3 w-3" />
          {t.reset}
        </Button>
      ) : null}

      {/* Actions */}
      {actions ? <div className="flex gap-2 shrink-0">{actions}</div> : null}
    </div>
  )
}
