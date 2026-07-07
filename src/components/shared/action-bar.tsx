"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useT } from "@/components/i18n-context"

export interface ActionButtonItem {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  onClick: () => void
  variant?: "default" | "outline" | "ghost" | "destructive"
  disabled?: boolean
  /** If true, puts this in the overflow "more" menu instead of the bar */
  overflow?: boolean
}

interface ActionBarProps {
  /** Primary actions shown as buttons in the bar */
  actions?: ActionButtonItem[]
  /** Overflow actions (shown in the ⋮ dropdown) */
  overflowActions?: ActionButtonItem[]
  className?: string
}

/**
 * ActionBar — unified action toolbar.
 *
 * Renders primary action buttons + an overflow dropdown for secondary
 * actions (export, import, print, etc.).
 */
export function ActionBar({ actions = [], overflowActions = [], className }: ActionBarProps) {
  const t = useT()
  const hasOverflow = overflowActions.length > 0

  if (actions.length === 0 && !hasOverflow) return null

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {actions.map((a, i) => {
        const Icon = a.icon
        return (
          <Button
            key={i}
            variant={a.variant ?? "outline"}
            size="sm"
            onClick={a.onClick}
            disabled={a.disabled}
            className="gap-1.5 h-9"
          >
            {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
            {a.label}
          </Button>
        )
      })}

      {hasOverflow ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 w-9 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {overflowActions.map((a, i) => {
              const Icon = a.icon
              return (
                <DropdownMenuItem
                  key={i}
                  onClick={a.onClick}
                  disabled={a.disabled}
                  className={cn(
                    "gap-2 cursor-pointer",
                    a.variant === "destructive" && "text-destructive focus:text-destructive"
                  )}
                >
                  {Icon ? <Icon className="h-4 w-4" /> : null}
                  {a.label}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}
