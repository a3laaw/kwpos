"use client"

/**
 * Express POS product card — extracted from `express-pos-view.tsx` (line ~784)
 * and wrapped in `React.memo` with a custom comparator so the 100+-product
 * grid doesn't re-render every card on each keystroke in the barcode input
 * or cart quantity change.
 *
 * Visual output is byte-for-byte identical to the previous inline JSX; only
 * the component boundary + memoization are new.
 *
 * Comparison note: `t` (i18n dict), `fmt` (currency formatter), `onAdd`, and
 * `onFocusBarcode` are all stable per render-of-their-owner in *semantics*
 * (the formatter never changes for a given locale/country; the focus helper
 * is a stable `useCallback`; `addToCart` is not `useCallback`-wrapped but
 * always does the same thing for a given product). They are intentionally
 * omitted from the comparator — comparing them by reference would defeat
 * the memo on the very common case where `addToCart` is recreated each
 * render of the `usePOS` hook.
 */
import * as React from "react"
import { Package, Tag } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"
import type { Product } from "@/lib/types"

export interface ExpressProductCardProps {
  p: Product
  used: number
  available: number
  out: boolean
  lowStock: boolean
  promoActive: boolean
  baseP: number
  effP: number
  t: ReturnType<typeof useT>
  fmt: ReturnType<typeof useFmt>
  onAdd: (p: Product) => void
  /** Refocus the barcode input after a tap-tap-to-add (express view only). */
  onFocusBarcode?: () => void
}

function ExpressProductCardImpl({
  p,
  used,
  available,
  out,
  lowStock,
  promoActive,
  baseP,
  effP,
  t,
  fmt,
  onAdd,
  onFocusBarcode,
}: ExpressProductCardProps) {
  return (
    <button
      onClick={() => { onAdd(p); onFocusBarcode?.() }}
      disabled={out}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border border-border/70 bg-card transition-all hover:border-primary/50 hover:shadow-md",
        out && "opacity-50 cursor-not-allowed hover:border-border",
        promoActive && "ring-1 ring-emerald-400/60"
      )}
    >
      {/* Product image — fills entire card top */}
      <div className="relative h-36 sm:h-44 w-full bg-muted/20 overflow-hidden flex items-center justify-center">
        {p.imageUrl ? (
          <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}
        {out ? (
          <span className="absolute inset-0 flex items-center justify-center bg-background/70 text-xs font-bold text-destructive">
            {t.outOfStockShort}
          </span>
        ) : null}
        {promoActive ? (
          <span className="absolute top-1 end-1 inline-flex items-center gap-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5">
            <Tag className="h-2.5 w-2.5" />
            {t.promo}
          </span>
        ) : null}
        {/* Low-stock badge — only if low/out */}
        {lowStock ? (
          <span className="absolute top-1 start-1 inline-flex items-center gap-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5">
            {t.expressLowStock}: {fmt.number(available)}
          </span>
        ) : null}
        {/* In-cart count badge */}
        {used > 0 ? (
          <span className="absolute -top-1.5 -end-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold shadow">
            {used}
          </span>
        ) : null}
      </div>
      {/* Info */}
      <div className="p-2 text-start flex-1 flex flex-col gap-0.5">
        <div className="flex items-center gap-1">
          <p className="font-medium text-xs leading-tight line-clamp-2 flex-1" title={p.name}>{p.name}</p>
          {p.isManufactured ? (
            <span className="shrink-0 rounded bg-primary/15 text-primary text-[8px] px-1 py-0.5 leading-none font-medium" title={t.manufacturedProduct || "مُصنّع"}>
              {t.manufacturedProductShort || "تركيبة"}
            </span>
          ) : null}
        </div>
        <div className="flex items-end justify-between gap-0.5 mt-auto">
          <span className="flex flex-col items-start leading-none">
            {promoActive ? (
              <span className="text-[10px] text-muted-foreground line-through tabular-nums">
                {fmt.currency(baseP)}
              </span>
            ) : null}
            <span className="font-bold tabular-nums text-base text-primary">
              {fmt.currency(effP)}
            </span>
          </span>
          {!out && !lowStock ? (
            <Badge variant="outline" className="tabular-nums text-[10px] h-5 px-1.5">
              {fmt.number(available)}
            </Badge>
          ) : null}
        </div>
      </div>
    </button>
  )
}

const areEqual = (prev: ExpressProductCardProps, next: ExpressProductCardProps): boolean => {
  return (
    prev.p.id === next.p.id &&
    prev.p.name === next.p.name &&
    prev.p.imageUrl === next.p.imageUrl &&
    prev.p.isManufactured === next.p.isManufactured &&
    prev.p.quantity === next.p.quantity &&
    prev.p.salePrice === next.p.salePrice &&
    prev.used === next.used &&
    prev.available === next.available &&
    prev.out === next.out &&
    prev.lowStock === next.lowStock &&
    prev.promoActive === next.promoActive &&
    prev.baseP === next.baseP &&
    prev.effP === next.effP
  )
}

export const ExpressProductCard = React.memo(ExpressProductCardImpl, areEqual)
