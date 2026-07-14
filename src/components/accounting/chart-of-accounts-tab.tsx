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
import { useT } from "@/components/i18n-context"
import { ExportToolbar } from "@/components/shared/export-toolbar"
import type { Account, AccountType } from "@/lib/types"
import { cn } from "@/lib/utils"

const TYPE_META: Record<AccountType, { labelKey: keyof import("@/lib/i18n").Dict; icon: any; tone: string }> = {
  ASSET: { labelKey: "accTypeAsset", icon: Wallet, tone: "text-emerald-600 bg-emerald-500/10" },
  LIABILITY: { labelKey: "accTypeLiability", icon: Landmark, tone: "text-rose-600 bg-rose-500/10" },
  EQUITY: { labelKey: "accTypeEquity", icon: Scale, tone: "text-violet-600 bg-violet-500/10" },
  REVENUE: { labelKey: "accTypeRevenue", icon: TrendingUp, tone: "text-sky-600 bg-sky-500/10" },
  EXPENSE: { labelKey: "accTypeExpense", icon: TrendingDown, tone: "text-amber-600 bg-amber-500/10" },
}

export function ChartOfAccountsTab() {
  const t = useT()
  const fmt = useFmt()
  const { data, isLoading } = useAccounts()
  const [addOpen, setAddOpen] = React.useState(false)
  const [addParent, setAddParent] = React.useState<Account | null>(null)

  const tree = data?.items ?? []
  const TYPE_LABELS: Record<AccountType, string> = {
    ASSET: t.accTypeAsset,
    LIABILITY: t.accTypeLiability,
    EQUITY: t.accTypeEquity,
    REVENUE: t.accTypeRevenue,
    EXPENSE: t.accTypeExpense,
  }

  // Flatten the account tree (recursive) into a single list for export.
  function flattenAccounts(accs: Account[]): Account[] {
    const out: Account[] = []
    const walk = (list: Account[]) => {
      for (const a of list) {
        out.push(a)
        if (a.children && a.children.length > 0) walk(a.children)
      }
    }
    walk(accs)
    return out
  }

  const flatAccounts = flattenAccounts(tree)
  const exportHeaders = [t.accCode, t.name, t.accAccountType, "الرصيد"]
  const exportRows: any[][] = flatAccounts.map((a) => [
    a.code,
    a.name,
    TYPE_LABELS[a.type],
    fmt.currency(a.balance),
  ])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4 text-primary" />
              {t.accChartOfAccounts}
            </CardTitle>
            <CardDescription>{t.accChartOfAccountsDesc}</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ExportToolbar
              title={t.accChartOfAccounts}
              headers={exportHeaders}
              rows={exportRows}
              filename={`chart-of-accounts-${new Date().toISOString().slice(0, 10)}`}
            />
            <Button size="sm" onClick={() => { setAddParent(null); setAddOpen(true) }} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              {t.accMainAccount}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : tree.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t.accNoAccountsYet}</p>
          ) : (
            <div className="space-y-1">
              {tree.map((acc) => (
                <AccountNode key={acc.id} account={acc} depth={0} onAddChild={(a) => { setAddParent(a); setAddOpen(true) }} typeLabels={TYPE_LABELS} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AccountFormDialog open={addOpen} onOpenChange={setAddOpen} parent={addParent} typeLabels={TYPE_LABELS} />
    </div>
  )
}

function AccountNode({
  account,
  depth,
  onAddChild,
  typeLabels,
}: {
  account: Account
  depth: number
  onAddChild: (a: Account) => void
  typeLabels: Record<AccountType, string>
}) {
  const fmt = useFmt()
  const t = useT()
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
        <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">{typeLabels[account.type]}</Badge>
        <span className="font-semibold tabular-nums text-sm w-28 text-end" dir="ltr">
          {fmt.currency(account.balance)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onAddChild(account)}
          title={t.accAddSubaccountTitle}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {hasChildren && expanded ? (
        <div>
          {account.children!.map((c) => (
            <AccountNode key={c.id} account={c} depth={depth + 1} onAddChild={onAddChild} typeLabels={typeLabels} />
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
  typeLabels,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  parent: Account | null
  typeLabels: Record<AccountType, string>
}) {
  const t = useT()
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
      toast.error(t.accCodeAndNameRequired)
      return
    }
    try {
      await createMut.mutateAsync({
        code: code.trim(),
        name: name.trim(),
        type,
        parentId: parentId || undefined,
      })
      toast.success(parent ? t.accSubaccountAdded : t.accAccountAdded)
      onOpenChange(false)
    } catch (err: any) {
      const msg = err?.message === "code-exists" ? t.accCodeAlreadyUsed : err?.message
      toast.error(t.accAddFailed, { description: msg })
    }
  }

  const TYPE_LABELS_LOCAL = typeLabels

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {parent ? `${t.accAddSubaccountUnder} «${parent.name}»` : t.accAddMainAccount}
          </DialogTitle>
          <DialogDescription>{t.accEnterNewAccountData}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!parent ? (
            <div className="space-y-2">
              <Label>{t.accAccountType}</Label>
              <Select value={type} onValueChange={(v) => setType(v as AccountType)} disabled={!!parent}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_META) as AccountType[]).map((ty) => (
                    <SelectItem key={ty} value={ty}>{TYPE_LABELS_LOCAL[ty]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="a-code">{t.accCode}</Label>
              <Input id="a-code" dir="ltr" value={code} onChange={(e) => setCode(e.target.value)} placeholder="1001" className="text-end" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-name">{t.name}</Label>
              <Input id="a-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="النقدية" />
            </div>
          </div>
          {parent ? (
            <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground">
              {t.accTypeInheritedFromParent}: <Badge variant="outline">{TYPE_LABELS_LOCAL[parent.type]}</Badge>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={createMut.isPending}>{t.cancel}</Button>
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t.accAdd2}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
