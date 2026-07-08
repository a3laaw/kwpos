"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useAppStore } from "@/lib/store"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"
import { Package, Users, Truck, ReceiptText, ShoppingCart } from "lucide-react"
import { useT } from "@/components/i18n-context"
import { useFmt } from "@/components/currency-context"

interface SearchResult {
  products: Array<{ id: string; name: string; barcode?: string | null; salePrice: number; quantity: number; imageUrl?: string | null; type: "product" }>
  customers: Array<{ id: string; name: string; phone?: string | null; type: "customer" }>
  suppliers: Array<{ id: string; name: string; phone?: string | null; type: "supplier" }>
  sales: Array<{ id: string; invoiceNo: string; total: number; createdAt: string; customerName?: string | null; type: "sale" }>
  purchaseOrders: Array<{ id: string; status: string; total: number; note?: string | null; supplierName: string; createdAt: string; type: "po" }>
}

const RECENT_KEY = "kwpos-recent-nav"
const RECENT_MAX = 5

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveRecent(items: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, RECENT_MAX)))
  } catch {
    // ignore
  }
}

function pushRecent(label: string) {
  const items = loadRecent().filter((x) => x !== label)
  items.unshift(label)
  saveRecent(items)
}

export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter()
  const t = useT()
  const fmt = useFmt()
  const setView = useAppStore((s) => s.setView)
  const [query, setQuery] = React.useState("")

  // Debounce the search query
  const debouncedQuery = React.useDeferredValue(query)

  const { data } = useQuery<SearchResult>({
    queryKey: ["global-search", debouncedQuery],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      if (!res.ok) return { products: [], customers: [], suppliers: [], sales: [], purchaseOrders: [] }
      return res.json()
    },
    enabled: debouncedQuery.length >= 1,
    staleTime: 10_000,
  })

  const results = data ?? { products: [], customers: [], suppliers: [], sales: [], purchaseOrders: [] }
  const recent = loadRecent()
  const hasResults =
    results.products.length > 0 ||
    results.customers.length > 0 ||
    results.suppliers.length > 0 ||
    results.sales.length > 0 ||
    results.purchaseOrders.length > 0

  function navigate(view: string, label: string) {
    pushRecent(label)
    onOpenChange(false)
    setView(view as any)
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder={t.searchPlaceholder || "ابحث عن منتج، عميل، فاتورة..."}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>{t.noResults || "لا توجد نتائج"}</CommandEmpty>

        {/* Recent navigations (shown when no query) */}
        {!query && recent.length > 0 ? (
          <CommandGroup heading={t.recentPages || "حديث"}>
            {recent.map((label) => {
              const viewMap: Record<string, string> = {
                [t.navDashboard]: "dashboard",
                [t.navSales]: "sales",
                [t.navInventory]: "inventory",
                [t.navInvoices]: "invoices",
                [t.navReports]: "reports",
                [t.navAccounting]: "accounting",
                [t.navCustomers]: "customers",
              }
              const view = viewMap[label]
              if (!view) return null
              return (
                <CommandItem key={label} value={label} onSelect={() => navigate(view, label)}>
                  <ReceiptText className="h-4 w-4 text-muted-foreground" />
                  <span>{label}</span>
                </CommandItem>
              )
            })}
          </CommandGroup>
        ) : null}

        {/* Products */}
        {results.products.length > 0 ? (
          <CommandGroup heading={t.products || "المنتجات"}>
            {results.products.map((p) => (
              <CommandItem
                key={p.id}
                value={`product ${p.name} ${p.barcode ?? ""}`}
                onSelect={() => navigate("inventory", t.navInventory)}
              >
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt="" className="h-4 w-4 rounded object-contain" />
                ) : (
                  <Package className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="flex-1 truncate">{p.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{fmt.currency(p.salePrice)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {/* Customers */}
        {results.customers.length > 0 ? (
          <CommandGroup heading={t.navCustomers || "العملاء"}>
            {results.customers.map((c) => (
              <CommandItem
                key={c.id}
                value={`customer ${c.name} ${c.phone ?? ""}`}
                onSelect={() => navigate("customers", t.navCustomers)}
              >
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate">{c.name}</span>
                {c.phone ? <span className="text-xs text-muted-foreground" dir="ltr">{c.phone}</span> : null}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {/* Suppliers */}
        {results.suppliers.length > 0 ? (
          <CommandGroup heading={t.navSuppliers || "الموردين"}>
            {results.suppliers.map((s) => (
              <CommandItem
                key={s.id}
                value={`supplier ${s.name}`}
                onSelect={() => navigate("suppliers", t.navSuppliers)}
              >
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate">{s.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {/* Sales invoices */}
        {results.sales.length > 0 ? (
          <CommandGroup heading={t.navInvoices || "الفواتير"}>
            {results.sales.map((s) => (
              <CommandItem
                key={s.id}
                value={`sale ${s.invoiceNo}`}
                onSelect={() => navigate("invoices", t.navInvoices)}
              >
                <ReceiptText className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate font-mono">{s.invoiceNo}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{fmt.currency(s.total)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {/* Purchase Orders */}
        {results.purchaseOrders.length > 0 ? (
          <CommandGroup heading={t.navPurchases || "المشتريات"}>
            {results.purchaseOrders.map((po) => (
              <CommandItem
                key={po.id}
                value={`po ${po.id} ${po.note ?? ""}`}
                onSelect={() => navigate("purchases", t.navPurchases)}
              >
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate">{po.supplierName}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{fmt.currency(po.total)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>
    </CommandDialog>
  )
}

/**
 * Hook that registers the Ctrl+K / Cmd+K keyboard shortcut and manages
 * the open/close state of the GlobalSearch palette.
 */
export function useGlobalSearchShortcut() {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  return { open, setOpen }
}
