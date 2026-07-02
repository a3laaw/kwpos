"use client"

import * as React from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, Loader2, Globe, Coins, Percent } from "lucide-react"
import { COUNTRIES } from "@/lib/countries"
import { useCountry, useFmt } from "@/components/currency-context"
import { useUpdateSettings } from "@/hooks/use-api"
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
      // reload after a short delay so the toast shows
      setTimeout(() => window.location.reload(), 1200)
    } catch (e: any) {
      toast.error("فشل التحديث", { description: e?.message })
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="الإعدادات"
        description="اختر الدولة لتحديد العملة والضريبة وتنسيق الأرقام تلقائياً في كل النظام."
        icon={<Globe className="h-5 w-5" />}
      />

      {/* Current config */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <ConfigCell
            icon={<Globe className="h-4 w-4" />}
            label="الدولة الحالية"
            value={`${active.flag} ${active.name}`}
          />
          <ConfigCell
            icon={<Coins className="h-4 w-4" />}
            label="العملة"
            value={`${active.currencySymbol} (${active.currency})`}
          />
          <ConfigCell
            icon={<Percent className="h-4 w-4" />}
            label="نسبة الضريبة"
            value={`${fmt.taxRate}%`}
          />
          <ConfigCell
            icon={<Globe className="h-4 w-4" />}
            label="المنطقة الزمنية"
            value={active.locale}
          />
        </CardContent>
      </Card>

      {/* Country picker */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-primary" />
            اختر الدولة
          </CardTitle>
          <CardDescription>
            التنسيقات (العملة، الضريبة، اللغة) ستتحدث في كل أنحاء النظام
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {COUNTRIES.map((c) => {
              const isActive = c.code === selected
              return (
                <button
                  key={c.code}
                  onClick={() => setSelected(c.code)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 text-right transition-all",
                    isActive
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border/70 hover:border-primary/40 hover:bg-accent/40"
                  )}
                >
                  <span className="text-2xl shrink-0">{c.flag}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium text-sm">{c.name}</span>
                    <span className="block text-xs text-muted-foreground" dir="ltr">
                      {c.currency} • {c.taxRate}% VAT
                    </span>
                  </span>
                  {isActive ? (
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  ) : null}
                </button>
              )
            })}
          </div>

          <Separator className="my-4" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              ملاحظة: تغيير الدولة يحدّث العرض فقط. لا يتم تحويل أرصدة الحسابات أو الأسعار تلقائياً.
            </p>
            <Button
              onClick={handleSave}
              disabled={updateMut.isPending || selected === active.code}
              className="gap-2"
            >
              {updateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              حفظ وإعادة تحميل
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ConfigCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-sm truncate">{value}</p>
      </div>
    </div>
  )
}
