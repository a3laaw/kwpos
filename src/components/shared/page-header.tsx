"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  description?: string
  icon?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  icon,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/70",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
        ) : null}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-balance">
            {title}
          </h1>
          {description ? (
            <p className="text-sm text-muted-foreground mt-1 text-balance">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex items-center gap-2 flex-wrap">{actions}</div> : null}
    </div>
  )
}
