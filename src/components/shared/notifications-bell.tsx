"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
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
import { Bell, AlertTriangle, Clock, CreditCard, Package, ShoppingCart, TrendingDown } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  type: "LOW_STOCK" | "OVERDUE_PAYABLE" | "OPEN_SHIFT" | "HIGH_VOID_RATE" | "PENDING_PO"
  severity: "critical" | "warning" | "info"
  title: string
  message: string
  actionLabel: string
  actionType: "CREATE_PO" | "NAVIGATE"
  actionData: { productId?: string; productName?: string; supplierId?: string | null; view?: string }
  createdAt: string
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LOW_STOCK: Package,
  OVERDUE_PAYABLE: CreditCard,
  OPEN_SHIFT: Clock,
  HIGH_VOID_RATE: TrendingDown,
  PENDING_PO: ShoppingCart,
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: "text-rose-600 bg-rose-500/10",
  warning: "text-amber-600 bg-amber-500/10",
  info: "text-blue-600 bg-blue-500/10",
}

export function NotificationsBell() {
  const setView = useAppStore((s) => s.setView)
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set())

  const { data } = useQuery<{ items: Notification[]; count: number; unreadCount: number }>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications")
      if (!res.ok) return { items: [], count: 0, unreadCount: 0 }
      return res.json()
    },
    refetchInterval: 60_000, // refresh every 60s
    staleTime: 30_000,
  })

  const items = (data?.items ?? []).filter((n) => !dismissed.has(n.id))
  const unreadCount = items.length

  function handleAction(n: Notification) {
    setDismissed((prev) => new Set(prev).add(n.id))
    if (n.actionType === "NAVIGATE" && n.actionData.view) {
      setView(n.actionData.view as any)
    } else if (n.actionType === "CREATE_PO") {
      // Navigate to purchases — the PO dialog can read prefill data
      // from a global store or URL param. For now, navigate to purchases.
      setView("purchases" as any)
    }
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
          <span>التنبيهات</span>
          {unreadCount > 0 ? (
            <Badge variant="secondary" className="text-[10px]">{unreadCount} جديد</Badge>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        {items.length === 0 ? (
          <div className="py-8 text-center">
            <Bell className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">لا توجد تنبيهات</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-1 p-1">
              {items.map((n) => {
                const Icon = ICONS[n.type] ?? AlertTriangle
                return (
                  <div
                    key={n.id}
                    className="flex items-start gap-2.5 rounded-lg p-2 hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() => handleAction(n)}
                  >
                    <span className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      SEVERITY_STYLES[n.severity]
                    )}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-primary mt-1 font-medium">
                        {n.actionLabel} ←
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
