"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Check, Circle, Dot } from "lucide-react"
import { cn } from "@/lib/utils"

export interface WorkflowStep {
  /** Step key (e.g. "DRAFT", "APPROVED") */
  key: string
  /** Display label */
  label: string
  /** Status: completed | current | pending */
  status: "completed" | "current" | "pending"
}

export interface WorkflowAction {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  onClick: () => void
  variant?: "default" | "outline" | "destructive"
  disabled?: boolean
}

interface WorkflowBarProps {
  steps: WorkflowStep[]
  actions?: WorkflowAction[]
  className?: string
}

/**
 * WorkflowBar — visual document lifecycle / status bar.
 *
 * Shows a horizontal stepper (● ── ● ── ○) representing the document's
 * current stage, with action buttons to advance to the next step.
 *
 * Example: ● مسودة ── ● معتمد ── ○ مستلم    [اعتماد →]
 */
export function WorkflowBar({ steps, actions = [], className }: WorkflowBarProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-stretch sm:items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3",
        className
      )}
    >
      {/* Steps */}
      <div className="flex items-center gap-1 flex-1 min-w-0 flex-wrap">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1
          return (
            <React.Fragment key={step.key}>
              <div
                className={cn(
                  "flex items-center gap-1.5 shrink-0",
                  step.status === "pending" && "opacity-50"
                )}
              >
                {step.status === "completed" ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <Check className="h-3 w-3" />
                  </span>
                ) : step.status === "current" ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-primary/30">
                    <Dot className="h-3 w-3" />
                  </span>
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-muted-foreground/30">
                    <Circle className="h-2 w-2 text-transparent" />
                  </span>
                )}
                <span
                  className={cn(
                    "text-xs font-medium whitespace-nowrap",
                    step.status === "current" && "text-primary font-bold",
                    step.status === "completed" && "text-emerald-600",
                    step.status === "pending" && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast ? (
                <div
                  className={cn(
                    "h-px flex-1 min-w-[16px] mx-1",
                    step.status === "completed" ? "bg-emerald-500/40" : "bg-border"
                  )}
                />
              ) : null}
            </React.Fragment>
          )
        })}
      </div>

      {/* Actions */}
      {actions.length > 0 ? (
        <div className="flex items-center gap-2 shrink-0">
          {actions.map((a, i) => {
            const Icon = a.icon
            return (
              <Button
                key={i}
                variant={a.variant ?? "default"}
                size="sm"
                onClick={a.onClick}
                disabled={a.disabled}
                className="gap-1.5 h-8"
              >
                {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                {a.label}
              </Button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
