"use client"

import * as React from "react"
import { ChevronLeft, Home } from "lucide-react"
import { cn } from "@/lib/utils"
import { useT } from "@/components/i18n-context"
import type { Dict } from "@/lib/i18n"

export interface BreadcrumbItem {
  /** i18n label key */
  labelKey?: keyof Dict
  /** Or a raw label (fallback) */
  label?: string
  /** Optional onClick (if clickable) */
  onClick?: () => void
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

/**
 * Breadcrumbs — shows the current location path.
 *
 * Renders as: الصفحة الرئيسية > المحاسبة > القيود المحاسبية
 * Each item with onClick is clickable (link style).
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const t = useT()

  return (
    <nav
      aria-label="breadcrumb"
      className={cn(
        "flex items-center gap-1 text-xs text-muted-foreground flex-wrap",
        className
      )}
    >
      {/* Home icon */}
      <Home className="h-3 w-3 shrink-0" />
      <ChevronLeft className="h-3 w-3 shrink-0 text-border" />

      {items.map((item, idx) => {
        const isLast = idx === items.length - 1
        const label = item.label ?? (item.labelKey ? t[item.labelKey] : "")

        return (
          <React.Fragment key={idx}>
            {idx > 0 && <ChevronLeft className="h-3 w-3 shrink-0 text-border" />}
            {item.onClick && !isLast ? (
              <button
                onClick={item.onClick}
                className="hover:text-foreground transition-colors truncate max-w-[120px]"
              >
                {label}
              </button>
            ) : (
              <span
                className={cn(
                  "truncate max-w-[160px]",
                  isLast && "font-medium text-foreground"
                )}
              >
                {label}
              </span>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}
