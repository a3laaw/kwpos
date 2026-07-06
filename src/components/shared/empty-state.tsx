"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Inbox } from "lucide-react"
import { useT } from "@/components/i18n-context"

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  const t = useT()
  const finalTitle = title ?? t.noData
  const finalDesc = description ?? t.noDataDescription
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center",
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon ?? <Inbox className="h-7 w-7" />}
      </div>
      <div>
        <p className="font-semibold">{finalTitle}</p>
        {finalDesc ? (
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            {finalDesc}
          </p>
        ) : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
