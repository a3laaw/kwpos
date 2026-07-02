"use client"

import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { TableSkeleton } from "@/components/shared/loading-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ReceiptText,
  Search,
  Eye,
  Printer,
  CreditCard,
  Banknote,
  ArrowLeftRight,
} from "lucide-react"
import { useSales } from "@/hooks/use-api"
import { useAppStore } from "@/lib/store"
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format"
import type { Sale } from "@/lib/types"
import { Separator } from "@/components/ui/separator"

const PAYMENT_META: Record<Sale["paymentMethod"], { label: string; icon: any; className: string }> = {
  CASH: { label: "نقدي", icon: Banknote, className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  CARD: { label: "بطاقة", icon: CreditCard, className: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30" },
  TRANSFER: { label: "تحويل", icon: ArrowLeftRight, className: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30" },
}

export function InvoicesView() {
  const [q, setQ] = React.useState("")
  const [detail, setDetail] = React.useState<Sale | null>(null)
  const setView = useAppStore((s) => s.setView)
  const debouncedQ = React.useDeferredValue(q)
  const { data, isLoading, isError, refetch } = useSales(debouncedQ || undefined)

  const sales = data?.items ?? []

  return (
    <div className="space-y-5">
      <PageHeader
        title="الفواتير"
        description="سجل جميع فواتير المبيعات. ابحث وافتح أي فاتورة لعرض تفاصيلها."
        icon={<ReceiptText className="h-5 w-5" />}
        actions={
          <Button variant="outline" onClick={() => setView("sales")} className="gap-2">
            فاتورة جديدة
          </Button>
        }
      />

      <Card className="p-3 sm:p-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث برقم الفاتورة أو اسم العميل..."
            className="pr-9"
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-4"><TableSkeleton rows={6} /></div>
        ) : isError ? (
          <div className="p-4">
            <EmptyState title="تعذّر تحميل الفواتير" action={<Button onClick={() => refetch()}>إعادة المحاولة</Button>} />
          </div>
        ) : sales.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<ReceiptText className="h-7 w-7" />}
              title="لا توجد فواتير"
              description="لم يتم إنشاء أي فاتورة مبيعات بعد."
              action={<Button onClick={() => setView("sales")} className="gap-2">إنشاء فاتورة</Button>}
            />
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>رقم الفاتورة</TableHead>
                  <TableHead className="hidden sm:table-cell">العميل</TableHead>
                  <TableHead className="hidden md:table-cell">التاريخ</TableHead>
                  <TableHead className="text-center">الأصناف</TableHead>
                  <TableHead className="text-center">الدفع</TableHead>
                  <TableHead className="text-center">الإجمالي</TableHead>
                  <TableHead className="w-12 text-center"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((s) => {
                  const pm = PAYMENT_META[s.paymentMethod]
                  const Icon = pm.icon
                  return (
                    <TableRow key={s.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setDetail(s)}>
                      <TableCell>
                        <span className="font-mono font-medium" dir="ltr">{s.invoiceNo}</span>
                        <div className="text-xs text-muted-foreground sm:hidden">
                          {s.customerName || "عميل نقدي"}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {s.customerName || <span className="text-muted-foreground">عميل نقدي</span>}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {formatDateTime(s.createdAt)}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {formatNumber(s.items.length)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`gap-1 ${pm.className}`}>
                          <Icon className="h-3 w-3" />
                          {pm.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-semibold tabular-nums text-primary">
                        {formatCurrency(s.total)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setDetail(s) }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Invoice detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-primary" />
              تفاصيل الفاتورة
            </DialogTitle>
            <DialogDescription className="sr-only">
              عرض تفاصيل عناصر الفاتورة والإجماليات.
            </DialogDescription>
          </DialogHeader>
          {detail ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="font-mono font-bold text-lg" dir="ltr">{detail.invoiceNo}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(detail.createdAt)}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-muted/40 p-2.5">
                  <p className="text-xs text-muted-foreground">العميل</p>
                  <p className="font-medium">{detail.customerName || "عميل نقدي"}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2.5">
                  <p className="text-xs text-muted-foreground">طريقة الدفع</p>
                  <p className="font-medium">{PAYMENT_META[detail.paymentMethod].label}</p>
                </div>
                {detail.userName ? (
                  <div className="rounded-lg bg-muted/40 p-2.5 col-span-2">
                    <p className="text-xs text-muted-foreground">البائع</p>
                    <p className="font-medium">{detail.userName}</p>
                  </div>
                ) : null}
              </div>

              <div className="rounded-lg border border-border/60 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-right p-2 font-medium">الصنف</th>
                      <th className="text-center p-2 font-medium">كمية</th>
                      <th className="text-center p-2 font-medium">سعر</th>
                      <th className="text-center p-2 font-medium">إجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((it) => (
                      <tr key={it.id} className="border-t border-border/40">
                        <td className="p-2">{it.productName}</td>
                        <td className="p-2 text-center tabular-nums">{it.quantity}</td>
                        <td className="p-2 text-center tabular-nums">{formatCurrency(it.unitPrice)}</td>
                        <td className="p-2 text-center font-medium tabular-nums">{formatCurrency(it.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>المجموع الفرعي</span>
                  <span className="tabular-nums">{formatCurrency(detail.subtotal)}</span>
                </div>
                {detail.discount > 0 ? (
                  <div className="flex justify-between text-rose-600">
                    <span>الخصم</span>
                    <span className="tabular-nums">- {formatCurrency(detail.discount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-muted-foreground">
                  <span>الضريبة ({detail.taxRate}%)</span>
                  <span className="tabular-nums">{formatCurrency(detail.taxAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center pt-1">
                  <span className="font-semibold">الإجمالي</span>
                  <span className="text-xl font-bold tabular-nums text-primary">
                    {formatCurrency(detail.total)}
                  </span>
                </div>
              </div>

              <Button variant="outline" className="w-full gap-2" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                طباعة الفاتورة
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
