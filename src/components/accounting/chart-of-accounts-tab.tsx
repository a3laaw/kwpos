"use client"

import * as React from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Wallet,
  Landmark,
  Scale,
  TrendingUp,
  TrendingDown,
  Plus,
  ChevronDown,
  ChevronLeft,
  Loader2,
  Banknote,
  CreditCard,
} from "lucide-react"
import { useAccounts, useCreateAccount, useDeleteAccount } from "@/hooks/use-api"
import { useFmt } from "@/components/currency-context"
import type { Account, AccountType } from "@/lib/types"
import { cn } from "@/lib/utils"

const TYPE_META: Record<AccountType, { label: string; icon: any; tone: string }> = {
  ASSET: { label: "الأصول", icon: Wallet, tone: "text-emerald-600 bg-emerald-500/10" },
  LIABILITY: { label: "الخصوم", icon: Landmark, tone: "text-rose-600 bg-rose-500/10" },
  EQUITY: { label: "حقوق الملكية", icon: Scale, tone: "text-violet-600 bg-violet-500/10" },
  REVENUE: { label: "الإيرادات", icon: TrendingUp, tone: "text-sky-600 bg-sky-500/10" },
  EXPENSE: { label: "المصروفات", icon: TrendingDown, tone: "text-amber-600 bg-amber-500/10" },
}

export function ChartOfAccountsTab() {
  const { data, isLoading } = useAccounts()
  const [addOpen, setAddOpen] = React.useState(false)
  const [addParent, setAddParent] = React.useState<Account | null>(null)

  const tree = data?.items ?? []

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4 text-primary" />
              شجرة الحسابات
            </CardTitle>
            <CardDescription>هيكل الحسابات الهرمي مع الأرصدة الحية</CardDescription>
          </div>
          <Button size="sm" onClick={() => { setAddParent(null); setAddOpen(true) }} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            حساب رئيسي
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : tree.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">لا توجد حسابات بعد</p>
          ) : (
            <div className="space-y-1">
              {tree.map((acc) => (
                <AccountNode key={acc.id} account={acc} depth={0} onAddChild={(a) => { setAddParent(a); setAddOpen(true) }} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AccountFormDialog open={addOpen} onOpenChange={setAddOpen} parent={addParent} />
    </div>
  )
}

function AccountNode({
  account,
  depth,
  onAddChild,
}: {
  account: Account
  depth: number
  onAddChild: (a: Account) => void
}) {
  const fmt = useFmt()
  const [expanded, setExpanded] = React.useState(true)
  const hasChildren = (account.children?.length ?? 0) > 0
  const meta = TYPE_META[account.type]
  const Icon = meta.icon
  const isLeaf = !hasChildren && depth > 0

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-lg hover:bg-muted/40 px-2 py-1.5 group"
        style={{ paddingRight: `${depth * 20 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted text-muted-foreground"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        ) : (
          <span className="w-6" />
        )}
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", meta.tone)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="font-mono text-xs text-muted-foreground tabular-nums" dir="ltr">{account.code}</span>
        <span className="font-medium text-sm flex-1 truncate">{account.name}</span>
        <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">{meta.label}</Badge>
        <span className="font-semibold tabular-nums text-sm w-28 text-left" dir="ltr">
          {fmt.currency(account.balance)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onAddChild(account)}
          title="إضافة حساب فرعي"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {hasChildren && expanded ? (
        <div>
          {account.children!.map((c) => (
            <AccountNode key={c.id} account={c} depth={depth + 1} onAddChild={onAddChild} />
          ))}
        </div>
      ) : null}
      {isLeaf ? null : null}
    </div>
  )
}

function AccountFormDialog({
  open,
  onOpenChange,
  parent,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  parent: Account | null
}) {
  const { data } = useAccounts()
  const createMut = useCreateAccount()
  const [code, setCode] = React.useState("")
  const [name, setName] = React.useState("")
  const [type, setType] = React.useState<AccountType>("ASSET")
  const [parentId, setParentId] = React.useState<string>("")

  React.useEffect(() => {
    if (open) {
      setCode("")
      setName("")
      setParentId(parent?.id ?? "")
      setType(parent?.type ?? "ASSET")
    }
  }, [open, parent])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim() || !name.trim()) {
      toast.error("الرمز والاسم مطلوبان")
      return
    }
    try {
      await createMut.mutateAsync({
        code: code.trim(),
        name: name.trim(),
        type,
        parentId: parentId || undefined,
      })
      toast.success(parent ? "تمت إضافة الحساب الفرعي" : "تمت إضافة الحساب")
      onOpenChange(false)
    } catch (err: any) {
      const msg = err?.message === "code-exists" ? "الرمز مستخدم بالفعل" : err?.message
      toast.error("فشل الإضافة", { description: msg })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {parent ? `إضافة حساب فرعي تحت «${parent.name}»` : "إضافة حساب رئيسي"}
          </DialogTitle>
          <DialogDescription>أدخل بيانات الحساب الجديد.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!parent ? (
            <div className="space-y-2">
              <Label>نوع الحساب</Label>
              <Select value={type} onValueChange={(v) => setType(v as AccountType)} disabled={!!parent}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_META) as AccountType[]).map((t) => (
                    <SelectItem key={t} value={t}>{TYPE_META[t].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="a-code">الرمز</Label>
              <Input id="a-code" dir="ltr" value={code} onChange={(e) => setCode(e.target.value)} placeholder="1001" className="text-left" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-name">الاسم</Label>
              <Input id="a-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="النقدية" />
            </div>
          </div>
          {parent ? (
            <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground">
              النوع موروث من الحساب الأب: <Badge variant="outline">{TYPE_META[parent.type].label}</Badge>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={createMut.isPending}>إلغاء</Button>
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              إضافة
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
