"use client"

import * as React from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Calculator,
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  X,
  CheckCircle2,
  Printer,
  Loader2,
  PackageX,
  Receipt,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useProducts, useCreateSale } from "@/hooks/use-api"
import { useFmt } from "@/components/currency-context"
import type { Product, Sale } from "@/lib/types"
import { cn } from "@/lib/utils"

interface CartItem {
  product: Product
  quantity: number
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "نقدي",
  CARD: "بطاقة",
  TRANSFER: "تحويل",
}

export function SalesView() {
  const fmt = useFmt()
  const [q, setQ] = React.useState("")
  const [categoryId, setCategoryId] = React.useState("")
  const [cart, setCart] = React.useState<CartItem[]>([])
  const [discount, setDiscount] = React.useState("0")
  const [taxRate, setTaxRate] = React.useState(String(fmt.taxRate))
  const [paymentMethod, setPaymentMethod] = React.useState<"CASH" | "CARD" | "TRANSFER">("CASH")
  const [customerName, setCustomerName] = React.useState("")
  const [customerPhone, setCustomerPhone] = React.useState("")
  const [lastSale, setLastSale] = React.useState<Sale | null>(null)

  const debouncedQ = React.useDeferredValue(q)
  const { data, isLoading } = useProducts({ q: debouncedQ || undefined, categoryId: categoryId || undefined })
  const createMut = useCreateSale()

  const products = data?.items ?? []

  // Quantity already in cart per product (for optimistic availability)
  const inCart = React.useMemo(() => {
    const m = new Map<string, number>()
    for (const it of cart) m.set(it.product.id, (m.get(it.product.id) || 0) + it.quantity)
    return m
  }, [cart])

  function addToCart(p: Product) {
    const inCartQty = inCart.get(p.id) || 0
    if (inCartQty >= p.quantity) {
      toast.error("الكمية غير متوفرة", {
        description: `المتاح من ${p.name}: ${fmt.number(p.quantity)} ${p.unit}`,
      })
      return
    }
    setCart((c) => {
      const existing = c.find((it) => it.product.id === p.id)
      if (existing) {
        return c.map((it) =>
          it.product.id === p.id ? { ...it, quantity: it.quantity + 1 } : it
        )
      }
      return [...c, { product: p, quantity: 1 }]
    })
  }

  function changeQty(productId: string, delta: number) {
    setCart((c) =>
      c
        .map((it) => {
          if (it.product.id !== productId) return it
          const next = it.quantity + delta
          if (next > it.product.quantity) {
            toast.error("الكمية تجاوزت المخزون المتاح")
            return it
          }
          return { ...it, quantity: next }
        })
        .filter((it) => it.quantity > 0)
    )
  }

  function setQty(productId: string, qty: number) {
    const p = cart.find((it) => it.product.id === productId)?.product
    if (!p) return
    if (qty > p.quantity) {
      toast.error("الكمية تجاوزت المخزون المتاح")
      return
    }
    setCart((c) =>
      qty <= 0
        ? c.filter((it) => it.product.id !== productId)
        : c.map((it) => (it.product.id === productId ? { ...it, quantity: qty } : it))
    )
  }

  function removeItem(productId: string) {
    setCart((c) => c.filter((it) => it.product.id !== productId))
  }

  function clearCart() {
    setCart([])
    setDiscount("0")
    setCustomerName("")
    setCustomerPhone("")
  }

  const subtotal = cart.reduce((acc, it) => acc + it.product.salePrice * it.quantity, 0)
  const discountVal = Math.max(0, Math.min(Number(discount) || 0, subtotal))
  const afterDiscount = Math.max(0, subtotal - discountVal)
  const taxVal = +(afterDiscount * ((Number(taxRate) || 0) / 100)).toFixed(2)
  const total = +(afterDiscount + taxVal).toFixed(2)
  const itemCount = cart.reduce((a, b) => a + b.quantity, 0)

  async function handleCheckout() {
    if (cart.length === 0) {
      toast.error("السلة فارغة")
      return
    }
    try {
      const sale = await createMut.mutateAsync({
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        items: cart.map((it) => ({
          productId: it.product.id,
          quantity: it.quantity,
          unitPrice: it.product.salePrice,
        })),
        taxRate: Number(taxRate) || 0,
        discount: discountVal,
        paymentMethod,
      })
      toast.success("تمت عملية البيع بنجاح", {
        description: `رقم الفاتورة: ${sale.invoiceNo}`,
      })
      setLastSale(sale)
      clearCart()
    } catch (err: any) {
      // Handle stock-insufficient errors specifically
      if (err?.message?.startsWith("stock-insufficient")) {
        const parts = err.message.split(":")
        const name = parts[2] || "منتج"
        toast.error("كمية غير كافية في المخزون", {
          description: `الرصيد المتاح من ${name} لا يكفي. تم تحديث الكميات.`,
        })
      } else {
        toast.error("فشل إتمام البيع", { description: err?.message })
      }
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="نقاط البيع (POS)"
        description="أنشئ فاتورة مبيعات جديدة — ابحث عن المنتجات وأضفها للسلة، احسب الإجمالي والضريبة والخصم تلقائياً."
        icon={<Calculator className="h-5 w-5" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Product picker */}
        <div className="lg:col-span-3 space-y-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث عن منتج بالاسم أو الباركود..."
              className="pr-9 h-11 text-base"
              autoFocus
            />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 rounded-xl bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
              <PackageX className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="mt-2 font-medium">لا توجد منتجات مطابقة</p>
              <p className="text-sm text-muted-foreground">جرّب كلمة بحث أخرى.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {products.map((p) => {
                const used = inCart.get(p.id) || 0
                const available = p.quantity - used
                const out = available <= 0
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={out}
                    className={cn(
                      "group relative text-right rounded-xl border border-border/70 bg-card p-3 transition-all hover:border-primary/50 hover:shadow-sm",
                      out && "opacity-50 cursor-not-allowed hover:border-border"
                    )}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <p className="font-medium text-sm leading-snug line-clamp-2">{p.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.categoryName}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-bold text-primary tabular-nums">
                        {fmt.currency(p.salePrice)}
                      </span>
                      <Badge
                        variant={out ? "destructive" : available <= p.reorderLevel ? "secondary" : "outline"}
                        className="tabular-nums text-[10px]"
                      >
                        {out ? "نفد" : `${fmt.number(available)}`}
                      </Badge>
                    </div>
                    {used > 0 ? (
                      <span className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow">
                        {used}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="lg:col-span-2">
          <Card className="lg:sticky lg:top-20 flex flex-col max-h-[calc(100vh-7rem)]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  السلة
                  {itemCount > 0 ? (
                    <Badge className="tabular-nums">{itemCount}</Badge>
                  ) : null}
                </CardTitle>
                {cart.length > 0 ? (
                  <Button variant="ghost" size="sm" onClick={clearCart} className="gap-1 text-muted-foreground h-7">
                    <X className="h-3.5 w-3.5" />
                    تفريغ
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 p-0">
              {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 py-10 text-center text-muted-foreground">
                  <ShoppingCart className="h-10 w-10 opacity-40" />
                  <p className="text-sm">السلة فارغة</p>
                  <p className="text-xs">اضغط على منتج لإضافته</p>
                </div>
              ) : (
                <ScrollArea className="flex-1 max-h-[35vh] lg:max-h-none px-4 scrollbar-thin">
                  <div className="space-y-2 pb-2">
                    {cart.map((it) => (
                      <div
                        key={it.product.id}
                        className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{it.product.name}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {fmt.currency(it.product.salePrice)} × {it.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => changeQty(it.product.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            dir="ltr"
                            className="h-7 w-10 text-center px-0 tabular-nums"
                            value={it.quantity}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10)
                              if (!isNaN(v)) setQty(it.product.id, v)
                            }}
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => changeQty(it.product.id, 1)}
                            disabled={it.quantity >= it.product.quantity}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => removeItem(it.product.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {/* Summary + checkout */}
              {cart.length > 0 ? (
                <div className="border-t border-border/60 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="cust" className="text-xs">اسم العميل</Label>
                      <Input
                        id="cust"
                        className="h-8 text-sm"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="عميل نقدي"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">طريقة الدفع</Label>
                      <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">نقدي</SelectItem>
                          <SelectItem value="CARD">بطاقة</SelectItem>
                          <SelectItem value="TRANSFER">تحويل</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label htmlFor="cphone" className="text-xs">هاتف العميل (تسجيل تلقائي)</Label>
                      <Input
                        id="cphone"
                        dir="ltr"
                        className="h-8 text-sm text-left"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="+965 5xxx xxxx"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        يُسجّل العميل تلقائياً في قاعدة العملاء برقم الهاتف
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="disc" className="text-xs">الخصم ({fmt.symbol})</Label>
                      <Input
                        id="disc"
                        type="number"
                        min={0}
                        className="h-8 text-sm tabular-nums"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="tax" className="text-xs">نسبة الضريبة %</Label>
                      <Input
                        id="tax"
                        type="number"
                        min={0}
                        className="h-8 text-sm tabular-nums"
                        value={taxRate}
                        onChange={(e) => setTaxRate(e.target.value)}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>المجموع الفرعي</span>
                      <span className="tabular-nums">{fmt.currency(subtotal)}</span>
                    </div>
                    {discountVal > 0 ? (
                      <div className="flex justify-between text-rose-600">
                        <span>الخصم</span>
                        <span className="tabular-nums">- {fmt.currency(discountVal)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between text-muted-foreground">
                      <span>الضريبة ({taxRate}%)</span>
                      <span className="tabular-nums">{fmt.currency(taxVal)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1.5 border-t border-border/60">
                      <span className="font-semibold">الإجمالي</span>
                      <span className="text-xl font-bold tabular-nums text-primary">
                        {fmt.currency(total)}
                      </span>
                    </div>
                  </div>

                  <Button
                    className="w-full h-11 gap-2 text-base"
                    onClick={handleCheckout}
                    disabled={createMut.isPending}
                  >
                    {createMut.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5" />
                    )}
                    إتمام البيع — {fmt.currency(total)}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Receipt dialog */}
      <Dialog open={!!lastSale} onOpenChange={(o) => !o && setLastSale(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              تمت عملية البيع
            </DialogTitle>
            <DialogDescription className="sr-only">
              عرض ملخص الفاتورة المُنشأة حديثاً.
            </DialogDescription>
          </DialogHeader>
          {lastSale ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <Receipt className="h-8 w-8" />
                </div>
                <p className="mt-3 font-mono font-bold text-lg" dir="ltr">{lastSale.invoiceNo}</p>
                <p className="text-xs text-muted-foreground">{fmt.dateTime(lastSale.createdAt)}</p>
                {lastSale.customerPhone ? (
                  <p className="text-xs text-muted-foreground mt-1" dir="ltr">
                    هاتف العميل: {lastSale.customerPhone}
                  </p>
                ) : null}
              </div>

              <div className="rounded-lg border border-border/60 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-right p-2 font-medium">الصنف</th>
                      <th className="text-center p-2 font-medium">كمية</th>
                      <th className="text-center p-2 font-medium">إجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastSale.items.map((it) => (
                      <tr key={it.id} className="border-t border-border/40">
                        <td className="p-2">{it.productName}</td>
                        <td className="p-2 text-center tabular-nums">{it.quantity}</td>
                        <td className="p-2 text-center tabular-nums">{fmt.currency(it.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>المجموع الفرعي</span>
                  <span className="tabular-nums">{fmt.currency(lastSale.subtotal)}</span>
                </div>
                {lastSale.discount > 0 ? (
                  <div className="flex justify-between text-rose-600">
                    <span>الخصم</span>
                    <span className="tabular-nums">- {fmt.currency(lastSale.discount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-muted-foreground">
                  <span>الضريبة ({lastSale.taxRate}%)</span>
                  <span className="tabular-nums">{fmt.currency(lastSale.taxAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center pt-1">
                  <span className="font-semibold">الإجمالي المدفوع</span>
                  <span className="text-xl font-bold tabular-nums text-primary">
                    {fmt.currency(lastSale.total)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground text-center pt-1">
                  طريقة الدفع: {PAYMENT_LABELS[lastSale.paymentMethod]}
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" />
                  طباعة
                </Button>
                <Button className="flex-1" onClick={() => setLastSale(null)}>
                  بيع جديد
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
