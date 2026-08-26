"use client"

/**
 * Standard POS product card — extracted from `sales-view.tsx` (line ~291)
 * and wrapped in `React.memo` with a custom comparator so the 100+-product
 * grid doesn't re-render every card on each keystroke in the search bar or
 * cart quantity change.
 *
 * Visual output is byte-for-byte identical to the previous inline JSX; only
 * the component boundary + memoization are new.
 *
 * Comparison note: `t` (i18n dict) and `fmt` (currency formatter) are stable
 * per-locale/per-country from their contexts, so they are intentionally
 * omitted from the comparator. `onAdd` is a non-memoized closure over the
 * `usePOS` hook state, but its *semantics* never change for a given product
 * (it always adds `p` to the cart), so it is also omitted — comparing it by
 * reference would defeat the memo.
 */
import * as React from "react"
import { Package } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"
import type { Product } from "@/lib/types"

export interface StandardProductCardProps {
  p: Product
  used: number
  available: number
  out: boolean
  promoActive: boolean
  baseP: number
  effP: number
  t: ReturnType<typeof useT>
  fmt: ReturnType<typeof useFmt>
  onAdd: (p: Product) => void
}

function StandardProductCardImpl({
  p,
  used,
  available,
  out,
  promoActive,
  baseP,
  effP,
  t,
  fmt,
  onAdd,
}: StandardProductCardProps) {
  return (
    <button
      onClick={() => onAdd(p)}
      disabled={out}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border border-border/70 bg-card transition-all hover:border-primary/50 hover:shadow-sm",
        out && "opacity-50 cursor-not-allowed hover:border-border",
        promoActive && "ring-1 ring-emerald-400/60"
      )}
    >
      {/* Product image — fills entire card top */}
      <div className="relative h-32 sm:h-40 w-full bg-muted/20 overflow-hidden flex items-center justify-center">
        {p.imageUrl ? (
          <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-8 w-8 text-muted-foreground/40" />
          </div>
        )}
        {out ? (
          <span className="absolute inset-0 flex items-center justify-center bg-background/70 text-[10px] font-bold text-destructive">{t.outOfStockShort}</span>
        ) : null}
        {promoActive ? (
          <span className="absolute top-0.5 right-0.5 inline-flex items-center gap-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold px-1 py-0.5">

            {t.promo}
          </span>
        ) : null}
      </div>
      {/* Info — compact single layout */}
      <div className="p-1.5 text-start flex-1 flex flex-col gap-0.5">
        <p className="font-medium text-xs leading-tight line-clamp-2" title={p.name}>{p.name}</p>
        <div className="flex items-center justify-between gap-0.5 mt-auto">
          <span className="flex flex-col items-start leading-none">
            {promoActive ? (
              <span className="text-[10px] text-muted-foreground line-through tabular-nums">
                {fmt.currency(baseP)}
              </span>
            ) : null}
            <span className="font-bold tabular-nums text-xs text-primary">
              {fmt.currency(effP)}
            </span>
          </span>
          {!out ? (
            <Badge variant={available <= p.reorderLevel ? "secondary" : "outline"} className="tabular-nums text-[10px] h-4 px-1">
              {fmt.number(available)}
            </Badge>
          ) : null}
        </div>
      </div>
      {used > 0 ? (
        <span className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold shadow">
          {used}
        </span>
      ) : null}
    </button>
  )
}

const areEqual = (prev: StandardProductCardProps, next: StandardProductCardProps): boolean => {
  return (
    prev.p.id === next.p.id &&
    prev.p.name === next.p.name &&
    prev.p.imageUrl === next.p.imageUrl &&
    prev.p.reorderLevel === next.p.reorderLevel &&
    prev.p.quantity === next.p.quantity &&
    prev.p.salePrice === next.p.salePrice &&
    prev.used === next.used &&
    prev.available === next.available &&
    prev.out === next.out &&
    prev.promoActive === next.promoActive &&
    prev.baseP === next.baseP &&
    prev.effP === next.effP
  )
}

export const StandardProductCard = React.memo(StandardProductCardImpl, areEqual)
