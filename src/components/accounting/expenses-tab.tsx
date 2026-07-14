"use client"

import * as React from "react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  UserCheck,
  Receipt,
  Loader2,
  Plus,
  Trash2,
  Banknote,
  CreditCard,
  Wallet,
} from "lucide-react"
import {
  useExpenses,
  useCreateExpense,
  useDeleteExpense,
  useAccounts,
} from "@/hooks/use-api"
import { useFmt } from "@/components/currency-context"
import { useT } from "@/components/i18n-context"
import type { ExpenseTransaction } from "@/lib/types"

type CategoryKey = "rent" | "utilities" | "subscriptions" | "marketing" | "other"

export function ExpensesTab() {
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <ExpenseForm />
      </div>
      <div className="lg:col-span-3">
        <ExpensesList />
      </div>
    </div>
  )
}

function ExpenseForm() {
  const fmt = useFmt()
  const t = useT()
  const { data: accountsData } = useAccounts()
  const createMut = useCreateExpense()
  const qc = useQueryClient()

  const [tab, setTab] = React.useState<"SALARY" | "ADMIN">("SALARY")

  // SALARY fields
  const [empName, setEmpName] = React.useState("")
  const [salaryAmount, setSalaryAmount] = React.useState("")
  const [payDate, setPayDate] = React.useState(new Date().toISOString().slice(0, 10))

  // ADMIN fields
  const [title, setTitle] = React.useState("")
  const [category, setCategory] = React.useState<CategoryKey>("rent")
  const [adminAmount, setAdminAmount] = React.useState("")
  const [adminDate, setAdminDate] = React.useState(new Date().toISOString().slice(0, 10))

  // Shared
  const [paymentAccountId, setPaymentAccountId] = React.useState("")
  const [note, setNote] = React.useState("")

  // Categories (built from i18n)
  const CATEGORIES: Array<{ key: CategoryKey; label: string; code: string }> = [
    { key: "rent", label: t.accCatRent, code: "5020" },
    { key: "utilities", label: t.accCatUtilities, code: "5030" },
    { key: "subscriptions", label: t.accCatSubscriptions, code: "5040" },
    { key: "marketing", label: t.accCatMarketing, code: "5050" },
    { key: "other", label: t.accCatOther, code: "5090" },
  ]

  // Asset accounts (Cash/Bank) for payment
  const flat = accountsData?.flat ?? []
  const assetAccounts = flat.filter((a) => a.type === "ASSET" && a.code !== "1000")
  // Salaries expense account + admin expense accounts
  const salaryAcc = flat.find((a) => a.code === "5010")
  const adminAccByCatKey: Record<CategoryKey, typeof flat[number] | undefined> = {
    rent: flat.find((a) => a.code === "5020"),
    utilities: flat.find((a) => a.code === "5030"),
    subscriptions: flat.find((a) => a.code === "5040"),
    marketing: flat.find((a) => a.code === "5050"),
    other: flat.find((a) => a.code === "5090"),
  }

  React.useEffect(() => {
    if (assetAccounts.length > 0 && !paymentAccountId) {
      setPaymentAccountId(assetAccounts[0].id)
    }
  }, [assetAccounts, paymentAccountId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const isSalary = tab === "SALARY"
    const amount = isSalary ? salaryAmount : adminAmount
    const amt = Number(amount)
    if (!amt || amt <= 0) {
      toast.error(t.accEnterValidAmount)
      return
    }
    if (isSalary && !empName.trim()) {
      toast.error(t.accEmployeeNameRequired)
      return
    }
    if (!isSalary && !title.trim()) {
      toast.error(t.accExpenseTitleRequired)
      return
    }
    if (!paymentAccountId) {
      toast.error(t.accSelectPaymentAccount)
      return
    }

    const catLabel = CATEGORIES.find((c) => c.key === category)?.label ?? category
    const accountId = isSalary ? salaryAcc?.id : adminAccByCatKey[category]?.id
    if (!accountId) {
      toast.error(t.accExpenseAccountUndefined)
      return
    }

    const payload = isSalary
      ? {
          type: "SALARY" as const,
          employeeName: empName.trim(),
          amount: amt,
          date: payDate,
          accountId,
          paymentAccountId,
          note: note.trim() || undefined,
        }
      : {
          type: "ADMIN" as const,
          title: title.trim(),
          category: catLabel,
          amount: amt,
          date: adminDate,
          accountId,
          paymentAccountId,
          note: note.trim() || undefined,
        }

    // Optimistic: cancel outgoing queries so the list updates instantly
    await qc.cancelQueries({ queryKey: ["expenses"] })
    qc.setQueryData<{ items: ExpenseTransaction[] }>(["expenses", "all"], (old) => {
      if (!old) return old
      const optimistic: ExpenseTransaction = {
        id: `opt-${Date.now()}`,
        type: payload.type,
        employeeName: payload.type === "SALARY" ? payload.employeeName : null,
        payDate: payload.type === "SALARY" ? new Date(payload.date).toISOString() : null,
        title: payload.type === "ADMIN" ? payload.title : null,
        category: payload.type === "ADMIN" ? payload.category : null,
        date: payload.type === "ADMIN" ? new Date(payload.date).toISOString() : null,
        amount: amt,
        accountId,
        accountName: isSalary ? salaryAcc?.name : adminAccByCatKey[category]?.name ?? null,
        paymentAccountId,
        paymentAccountName: assetAccounts.find((a) => a.id === paymentAccountId)?.name ?? null,
        note: payload.note ?? null,
        createdAt: new Date().toISOString(),
      }
      return { items: [optimistic, ...old.items] }
    })

    try {
      await createMut.mutateAsync(payload)
      toast.success(isSalary ? t.accSalaryRecorded : t.accExpenseRecorded)
      // reset fields
      if (isSalary) {
        setEmpName("")
        setSalaryAmount("")
      } else {
        setTitle("")
        setAdminAmount("")
      }
      setNote("")
    } catch (err: any) {
      toast.error(t.recordFailed, { description: err?.message })
      // optimistic rollback happens via invalidate on error
      qc.invalidateQueries({ queryKey: ["expenses"] })
    }
  }

  const loading = createMut.isPending
  const amount = tab === "SALARY" ? salaryAmount : adminAmount
  const amt = Number(amount) || 0

  return (
    <Card className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto scrollbar-thin">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" />
          {t.accRecordExpense}
        </CardTitle>
        <CardDescription>{t.accUpdatesBalancesImmediately2}</CardDescription>
      </CardHeader>
      <CardContent>

          {/* Expense type toggle — lets the user switch between Salary and Admin expenses */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-muted/50 rounded-lg mb-4">
            <button
              type="button"
              onClick={() => setTab("SALARY")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all",
                tab === "SALARY"
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <UserCheck className="h-3.5 w-3.5" />
              {t.accSalaries}
            </button>
            <button
              type="button"
              onClick={() => setTab("ADMIN")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all",
                tab === "ADMIN"
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Receipt className="h-3.5 w-3.5" />
              {t.accAdminExpenses}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {tab === "SALARY" && (
              <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="emp" className="text-xs">{t.accEmployeeName} *</Label>
                <Input id="emp" value={empName} onChange={(e) => setEmpName(e.target.value)} placeholder={t.accEmployeeNamePlaceholder} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="samt" className="text-xs">{t.accAmount} ({fmt.symbol}) *</Label>
                  <Input id="samt" type="number" min={0} step="0.001" value={salaryAmount} onChange={(e) => setSalaryAmount(e.target.value)} className="tabular-nums" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sdate" className="text-xs">{t.accPaymentDate}</Label>
                  <Input id="sdate" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                </div>
              </div>
              </div>
            )}

            {tab === "ADMIN" && (
              <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="ttl" className="text-xs">{t.accExpenseTitle} *</Label>
                <Input id="ttl" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.accExpenseTitlePlaceholder2} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.category}</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as CategoryKey)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="aamt" className="text-xs">{t.accAmount} ({fmt.symbol}) *</Label>
                  <Input id="aamt" type="number" min={0} step="0.001" value={adminAmount} onChange={(e) => setAdminAmount(e.target.value)} className="tabular-nums" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adate" className="text-xs">{t.date}</Label>
                <Input id="adate" type="date" value={adminDate} onChange={(e) => setAdminDate(e.target.value)} />
              </div>
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">{t.accPaymentAccount}</Label>
                <Select value={paymentAccountId} onValueChange={setPaymentAccountId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder={t.selectPlaceholder} /></SelectTrigger>
                  <SelectContent>
                    {assetAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        <span className="flex items-center gap-1.5">
                          {a.code === "1010" ? <Banknote className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                          {a.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="note" className="text-xs">{t.note}</Label>
                <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.optional} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2">
              <span className="text-xs text-muted-foreground">{t.accTotalAmount}</span>
              <span className="font-bold tabular-nums text-primary">{fmt.currency(amt)}</span>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {tab === "SALARY" ? t.accRecordSalary : t.accRecordExpense}
            </Button>
          </form>
      </CardContent>
    </Card>
  )
}

function ExpensesList() {
  const fmt = useFmt()
  const t = useT()
  const { data, isLoading } = useExpenses()
  const deleteMut = useDeleteExpense()
  const qc = useQueryClient()
  const items = data?.items ?? []

  async function handleDelete(id: string, isOpt: boolean) {
    if (isOpt) {
      toast.error(t.accCannotDeleteWhileSaving)
      return
    }
    // optimistic remove
    await qc.cancelQueries({ queryKey: ["expenses"] })
    qc.setQueryData<{ items: ExpenseTransaction[] }>(["expenses", "all"], (old) => {
      if (!old) return old
      return { items: old.items.filter((i) => i.id !== id) }
    })
    try {
      await deleteMut.mutateAsync(id)
      toast.success(t.accExpenseDeletedReversed)
    } catch (err: any) {
      toast.error(t.deleteFailed, { description: err?.message })
      qc.invalidateQueries({ queryKey: ["expenses"] })
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" />
          {t.accExpensesHistory}
          <Badge variant="secondary" className="tabular-nums">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Wallet className="h-10 w-10 mx-auto opacity-40 mb-2" />
            <p className="text-sm">{t.accNoExpensesRecorded}</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-1 scrollbar-thin">
            <div className="space-y-2">
              {items.map((e) => {
                const isOpt = e.id.startsWith("opt-")
                return (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        e.type === "SALARY"
                          ? "bg-violet-500/10 text-violet-600"
                          : "bg-amber-500/10 text-amber-600"
                      }`}
                    >
                      {e.type === "SALARY" ? <UserCheck className="h-4 w-4" /> : <Receipt className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {e.type === "SALARY" ? e.employeeName : e.title}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">
                          {e.type === "SALARY" ? t.accSalary : e.category}
                        </Badge>
                        {e.accountName ? <span>• {e.accountName}</span> : null}
                        {e.paymentAccountName ? <span>• {t.accPaidLabel}: {e.paymentAccountName}</span> : null}
                        <span>• {fmt.date(e.type === "SALARY" ? e.payDate! : e.date!)}</span>
                      </p>
                    </div>
                    <span className="font-semibold tabular-nums shrink-0">{fmt.currency(e.amount)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                      onClick={() => handleDelete(e.id, isOpt)}
                      disabled={deleteMut.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
