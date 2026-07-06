"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: React.ReactNode
  icon?: React.ReactNode
  hint?: React.ReactNode
  tone?: "default" | "success" | "warning" | "danger" | "info"
  className?: string
}

const toneStyles: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  danger: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  info: "bg-[#DFC196]/10 text-[#8B7355] dark:text-[#DFC196]",
}

export function StatCard({
  title,
  value,
  icon,
  hint,
  tone = "default",
  className,
}: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground truncate">{title}</p>
            <p className="text-2xl font-bold mt-1 tracking-tight tabular-nums">
              {value}
            </p>
            {hint ? (
              <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>
            ) : null}
          </div>
          {icon ? (
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                toneStyles[tone]
              )}
            >
              {icon}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
