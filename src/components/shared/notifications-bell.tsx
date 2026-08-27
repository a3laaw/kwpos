"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bell, AlertTriangle, Clock, CreditCard, Package, TrendingUp, Info } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { useT } from "@/components/i18n-context"
import type { AppView } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * Central Notification System bell (Track 4.3).
 *
 * Fetches REAL notifications for the current user from
 * `GET /api/notifications` (DB-backed, not computed on each request).
 *
 * Polling: refetchInterval = 30s (the task spec). The query is also
 * invalidated manually after a mark-as-read so the badge updates
 * immediately rather than waiting for the next poll.
 *
 * Click handling: clicking a notification marks it as read via
 * `POST /api/notifications { id }` and (if the notification has a
 * `link`) navigates the user to that AppView via `setView`. Marking
 * is non-blocking — we don't await the mutation before navigating,
 * so the user lands on the target view instantly.
 */

interface Notification {
  id: string
  type: "STOCK_LOW" | "SALES_SPIKE" | "PAYMENT_DUE" | "SHIFT_REMINDER" | "SYSTEM"
  title: string
  message: string
  read: boolean
  link: string | null
  createdAt: string
}

const ICONS: Record<Notification["type"], React.ComponentType<{ className?: string }>> = {
  STOCK_LOW: Package,
  SALES_SPIKE: TrendingUp,
  PAYMENT_DUE: CreditCard,
  SHIFT_REMINDER: Clock,
  SYSTEM: Info,
}

// Derived severity (the DB model doesn't store severity; we derive from
// type so the bell still shows colour-coded icons).
const SEVERITY_STYLES: Record<Notification["type"], string> = {
  STOCK_LOW: "text-amber-600 bg-amber-500/10",
  SALES_SPIKE: "text-emerald-600 bg-emerald-500/10",
  PAYMENT_DUE: "text-rose-600 bg-rose-500/10",
  SHIFT_REMINDER: "text-blue-600 bg-blue-500/10",
  SYSTEM: "text-slate-600 bg-slate-500/10",
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return `${sec}ث`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}د`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}س`
  const day = Math.floor(hr / 24)
  return `${day}ي`
}

export function NotificationsBell() {
  const t = useT()
  const setView = useAppStore((s) => s.setView)
  const queryClient = useQueryClient()

  const { data } = useQuery<{ items: Notification[]; unreadCount: number }>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications")
      if (!res.ok) return { items: [], unreadCount: 0 }
      return res.json() as Promise<{ items: Notification[]; unreadCount: number }>
    },
    refetchInterval: 30_000, // refresh every 30s per the Track 4.3 spec
    staleTime: 15_000,
  })

  const markAsReadMutation = useMutation({
    mutationFn: async (payload: { id?: string; all?: boolean }) => {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        throw new Error(`mark-as-read failed: ${res.status}`)
      }
      return res.json()
    },
    // Invalidate on success so the bell updates immediately (don't
    // wait for the next 30s poll).
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  const items = data?.items ?? []
  const unreadCount = items.length

  function handleAction(n: Notification) {
    // Mark as read — non-blocking; the invalidation refreshes the badge.
    if (!n.read) {
      markAsReadMutation.mutate({ id: n.id })
    }
    // Navigate to the linked view (if any).
    if (n.link) {
      setView(n.link as AppView)
    }
  }

  function handleMarkAllRead() {
    if (unreadCount === 0) return
    markAsReadMutation.mutate({ all: true })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative shrink-0 h-9 w-9">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-3 py-2">
          <span>{t.nbNotifications}</span>
          <div className="flex items-center gap-2">
            {unreadCount > 0 ? (
              <Badge variant="secondary" className="text-[10px]">
                {t.nbNewCount.replace("{count}", String(unreadCount))}
              </Badge>
            ) : null}
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[10px] text-primary hover:underline"
              >
                {t.nbMarkAll}
              </button>
            ) : null}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        {items.length === 0 ? (
          <div className="py-8 text-center">
            <Bell className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">{t.nbNoNotifications}</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-1 p-1">
              {items.map((n) => {
                const Icon = ICONS[n.type] ?? AlertTriangle
                return (
                  <DropdownMenuItem
                    key={n.id}
                    className="flex items-start gap-2.5 rounded-lg p-2 cursor-pointer"
                    onClick={() => handleAction(n)}
                    onSelect={(e) => {
                      // Prevent the dropdown from closing on click so
                      // the user can see the read-state update happen.
                      if (n.link) e.preventDefault()
                    }}
                  >
                    <span className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      SEVERITY_STYLES[n.type]
                    )}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground/70">
                          {formatRelative(n.createdAt)}
                        </span>
                        {n.link ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-primary font-medium">
                            {t.nbOpen} {t.nbActionArrow}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </DropdownMenuItem>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
