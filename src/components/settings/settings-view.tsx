"use client"

import * as React from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  CheckCircle2,
  Loader2,
  Globe,
  Coins,
  Percent,
  Plus,
  Trash2,
  Ruler,
  Tags,
  X,
} from "lucide-react"
import { COUNTRIES } from "@/lib/countries"
import { useCountry, useFmt } from "@/components/currency-context"
import {
  useUpdateSettings,
  useUnits,
  useCreateUnit,
  useDeleteUnit,
  useCategories,
  useCreateCategory,
} from "@/hooks/use-api"
import { cn } from "@/lib/utils"

export function SettingsView() {
  const active = useCountry()
  const fmt = useFmt()
  const updateMut = useUpdateSettings()
  const [selected, setSelected] = React.useState(active.code)

  async function handleSave() {
    if (selected === active.code) {
      toast.info("لم تقم بتغيير الدولة")
      return
    }
    try {
      await updateMut.mutateAsync({ code: selected })
      toast.success("تم تحديث الدولة", {
        description: "أعد تحميل الصفحة لتحديث كل التنسيقات.",
      })
      setTimeout(() => window.location.reload(), 1200)
    } catch (e: any) {
      toast.error("فشل التحديث", { description: e?.message })
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="الإعدادات"
        description="إدارة الدولة والعملة والوحدات والتصنيفات."
        icon={<Globe className="h-5 w-5" />}
      />

      {/* Current config */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <ConfigCell icon={<Globe className="h-4 w-4" />} label="الدولة الحالية" value={`${active.flag} ${active.name}`} />
          <ConfigCell icon={<Coins className="h-4 w-4" />} label="العملة" value={`${active.currencySymbol} (${active.currency})`} />
          <ConfigCell icon={<Percent className="h-4 w-4" />} label="نسبة الضريبة" value={`${fmt.taxRate}%`} />
          <ConfigCell icon={<Globe className="h-4 w-4" />} label="المنطقة الزمنية" value={active.locale} />
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Country picker */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4 text-primary" />
              الدولة والعملة
            </CardTitle>
            <CardDescription>اختر الدولة لتحديث العملة والضريبة تلقائياً</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
              {COUNTRIES.map((c) => {
                const isActive = c.code === selected
                return (
                  <button
                    key={c.code}
                    onClick={() => setSelected(c.code)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border p-2.5 text-right transition-all",
                      isActive
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border/70 hover:border-primary/40 hover:bg-accent/40"
                    )}
                  >
                    <span className="text-xl shrink-0">{c.flag}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium text-sm truncate">{c.name}</span>
                      <span className="block text-[10px] text-muted-foreground" dir="ltr">{c.currency} • {c.taxRate}%</span>
                    </span>
                    {isActive ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> : null}
                  </button>
                )
              })}
            </div>
            <Separator className="my-3" />
            <Button onClick={handleSave} disabled={updateMut.isPending || selected === active.code} className="w-full gap-2">
              {updateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              حفظ الدولة
            </Button>
          </CardContent>
        </Card>

        {/* Units management */}
        <UnitsManager />
      </div>

      {/* Categories management */}
      <CategoriesManager />
    </div>
  )
}

function ConfigCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-sm truncate">{value}</p>
      </div>
    </div>
  )
}

/* ───────────────────────── Units Manager ───────────────────────── */
function UnitsManager() {
  const { data, isLoading } = useUnits()
  const createMut = useCreateUnit()
  const deleteMut = useDeleteUnit()
  const [name, setName] = React.useState("")
  const units = data?.items ?? []

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    try {
      await createMut.mutateAsync({ name: n })
      setName("")
      toast.success("تمت إضافة الوحدة")
    } catch (err: any) {
      toast.error("فشل الإضافة", { description: err?.message === "name-exists" ? "الوحدة موجودة" : err?.message })
    }
  }

  async function handleDelete(id: string, n: string) {
    try {
      await deleteMut.mutateAsync(id)
      toast.success(`تم حذف وحدة «${n}»`)
    } catch (err: any) {
      toast.error("فشل الحذف", { description: err?.message })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Ruler className="h-4 w-4 text-primary" />
          وحدات القياس
          <Badge variant="secondary" className="tabular-nums">{units.length}</Badge>
        </CardTitle>
        <CardDescription>وحدات القياس المتاحة عند إضافة المنتجات (كيلو، جرام، حبة...)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="أضف وحدة جديدة (مثال: علبة)"
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={createMut.isPending || !name.trim()}>
            {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </form>
        {isLoading ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 w-16 rounded-full bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : units.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">لا توجد وحدات بعد</p>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto scrollbar-thin">
            {units.map((u) => (
              <span
                key={u.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-sm"
              >
                {u.name}
                <button
                  onClick={() => handleDelete(u.id, u.name)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  title="حذف"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ───────────────────────── Categories Manager ───────────────────────── */
function CategoriesManager() {
  const { data, isLoading } = useCategories()
  const createMut = useCreateCategory()
  const [name, setName] = React.useState("")
  const categories = data?.items ?? []

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    try {
      await createMut.mutateAsync({ name: n })
      setName("")
      toast.success("تمت إضافة التصنيف")
    } catch (err: any) {
      toast.error("فشل الإضافة", { description: err?.message })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Tags className="h-4 w-4 text-primary" />
          التصنيفات
          <Badge variant="secondary" className="tabular-nums">{categories.length}</Badge>
        </CardTitle>
        <CardDescription>فئات المنتجات المتاحة في المخازن</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={handleAdd} className="flex gap-2 max-w-md">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="أضف تصنيف جديد (مثال: إلكترونيات)"
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={createMut.isPending || !name.trim()}>
            {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </form>
        {isLoading ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 w-24 rounded-full bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">لا توجد تصنيفات بعد</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-sm"
              >
                <Tags className="h-3 w-3 text-primary" />
                {c.name}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
