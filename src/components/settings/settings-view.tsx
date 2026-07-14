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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Printer,
  ScanLine,
  Wallet,
  X,
  Pencil,
  Save,
  Search,
  ChevronRight,
  Wrench,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import { COUNTRIES, getCountryName } from "@/lib/countries"
import { useCountry, useFmt } from "@/components/currency-context"
import { useT, useI18n } from "@/components/i18n-context"
import {
  useUpdateSettings,
  useUnits,
  useCreateUnit,
  useDeleteUnit,
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "@/hooks/use-api"
import { cn } from "@/lib/utils"
import { ImageUpload } from "@/components/shared/image-upload"
import { getHardwareSettings, saveHardwareSettings, type HardwareSettings } from "@/lib/hardware"
import { openCashDrawer } from "@/lib/cash-drawer"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Category } from "@/lib/types"

export function SettingsView() {
  const active = useCountry()
  const fmt = useFmt()
  const t = useT()
  const { locale } = useI18n()
  const updateMut = useUpdateSettings()
  const [selected, setSelected] = React.useState(active.code)
  const [activeSection, setActiveSection] = React.useState<string | null>(null)

  async function handleSave() {
    if (selected === active.code) {
      toast.info(t.setNoCountryChange)
      return
    }
    try {
      await updateMut.mutateAsync({ code: selected })
      toast.success(t.setCountryUpdated, { description: t.setCountryUpdatedDesc })
      setTimeout(() => window.location.reload(), 1200)
    } catch (e: any) {
      toast.error(t.saveFailed, { description: e?.message })
    }
  }

  // Section definitions for the card-based navigation
  const sections = [
    { id: "company", icon: Tags, title: t.companyInfoTitle, desc: t.companyInfoDesc },
    { id: "country", icon: Globe, title: t.setCountryAndCurrency, desc: t.setCountryPickerDesc },
    { id: "hardware", icon: Printer, title: t.hardwareSettingsTitle || "إعدادات الأجهزة", desc: t.hardwareSettingsDesc || "الطابعة، درج النقدية، قارئ الباركود" },
    { id: "categories", icon: Tags, title: t.setCategories, desc: t.setCategoriesDesc },
    { id: "units", icon: Ruler, title: t.setUnitsTitle || "الوحدات", desc: t.setUnitsDesc || "وحدات القياس" },
    { id: "maintenance", icon: Wrench, title: "صيانة النظام", desc: "إعادة حساب المخزون + فحص النظام" },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.settingsTitle}
        description={t.setPageDesc}
        icon={<Globe className="h-5 w-5" />}
        breadcrumbItems={[
          { labelKey: "navSystem" },
          { labelKey: "navSettings" },
        ]}
      />

      {/* Current config summary */}
      <Card className="border-primary/30 bg-gradient-to-l from-primary/5 to-transparent">
        <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <ConfigCell icon={<Globe className="h-4 w-4" />} label={t.setCurrentCountryLabel} value={`${active.flag} ${getCountryName(active, locale)}`} />
          <ConfigCell icon={<Coins className="h-4 w-4" />} label={t.setCurrency} value={`${active.currencySymbol} (${active.currency})`} />
          <ConfigCell icon={<Percent className="h-4 w-4" />} label={t.setTaxRate} value={`${fmt.taxRate}%`} />
          <ConfigCell icon={<Globe className="h-4 w-4" />} label={t.setLocaleCode} value={active.locale} />
        </CardContent>
      </Card>

      {/* Card-based navigation grid */}
      {!activeSection ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((s) => {
            const Icon = s.icon
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className="group flex flex-col items-start gap-3 rounded-xl border border-border/70 bg-card p-5 text-start transition-all hover:border-primary/40 hover:shadow-md"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/15 transition">
                  <Icon className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.desc}</p>
                </div>
                <span className="text-xs text-primary font-medium mt-auto pt-2">
                  {t.edit || "فتح"} ←
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        /* Active section content */
        <div className="space-y-4">
          <button
            onClick={() => setActiveSection(null)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            {t.back || "رجوع"}
          </button>

          {activeSection === "company" && <CompanyInfoCard />}
          {activeSection === "country" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="h-4 w-4 text-primary" />
                  {t.setCountryAndCurrency}
                </CardTitle>
                <CardDescription>{t.setCountryPickerDesc}</CardDescription>
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
                          "flex items-center gap-2 rounded-lg border p-2.5 text-start transition-all",
                          isActive
                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                            : "border-border/70 hover:border-primary/40 hover:bg-accent/40"
                        )}
                      >
                        <span className="text-xl shrink-0">{c.flag}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block font-medium text-sm truncate">{getCountryName(c, locale)}</span>
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
                  {t.setSaveCountry}
                </Button>
              </CardContent>
            </Card>
          )}
          {activeSection === "hardware" && <HardwareSettingsCard />}
          {activeSection === "categories" && <CategoriesManager />}
          {activeSection === "units" && <UnitsManager />}
          {activeSection === "maintenance" && <SystemMaintenanceCard />}
        </div>
      )}
    </div>
  )
}

function CompanyInfoCard() {
  const t = useT()
  const [name, setName] = React.useState("")
  const [address, setAddress] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [vatNo, setVatNo] = React.useState("")
  const [logo, setLogo] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [loaded, setLoaded] = React.useState(false)

  // Load from localStorage on mount
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("erp-store-info")
      const data = raw ? JSON.parse(raw) : {}
      setName(data.name || "")
      setAddress(data.address || "")
      setPhone(data.phone || "")
      setVatNo(data.vatNo || "")
      setLogo(data.logo || null)
    } catch {
      // keep defaults
    }
    setLoaded(true)
  }, [])

  function handleSave() {
    setSaving(true)
    try {
      const data = { name, address, phone, vatNo, logo }
      localStorage.setItem("erp-store-info", JSON.stringify(data))
      toast.success(t.companyInfoSaved)
    } catch {
      toast.error(t.saveFailed)
    }
    setSaving(false)
  }

  if (!loaded) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Tags className="h-4 w-4 text-primary" />
          {t.companyInfoTitle}
        </CardTitle>
        <CardDescription>{t.companyInfoDesc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ImageUpload
          value={logo}
          onChange={(url) => setLogo(url)}
          label={t.companyInfoLogo}
          className="py-1"
        />
        <p className="text-xs text-muted-foreground -mt-2">{t.companyInfoLogoHint}</p>

        <div className="space-y-1.5">
          <Label htmlFor="company-name">{t.companyInfoName}</Label>
          <Input
            id="company-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.companyInfoNamePlaceholder}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="company-address">{t.companyInfoAddress}</Label>
          <Input
            id="company-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t.companyInfoAddressPlaceholder}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="company-phone">{t.companyInfoPhone}</Label>
            <Input
              id="company-phone"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t.companyInfoPhonePlaceholder}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company-vat">{t.companyInfoVatNo}</Label>
            <Input
              id="company-vat"
              dir="ltr"
              value={vatNo}
              onChange={(e) => setVatNo(e.target.value)}
              placeholder={t.companyInfoVatNoPlaceholder}
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t.companyInfoSave}
        </Button>
      </CardContent>
    </Card>
  )
}

function HardwareSettingsCard() {
  const t = useT()
  const [settings, setSettings] = React.useState<HardwareSettings | null>(null)
  const [testing, setTesting] = React.useState(false)

  React.useEffect(() => {
    setSettings(getHardwareSettings())
  }, [])

  if (!settings) return null

  function update(patch: Partial<HardwareSettings>) {
    const updated = saveHardwareSettings(patch)
    setSettings(updated)
  }

  async function testDrawer() {
    setTesting(true)
    await openCashDrawer()
    setTesting(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Printer className="h-4 w-4 text-primary" />
          إعدادات الأجهزة (Hardware)
        </CardTitle>
        <CardDescription>الطابعة، درج النقدية، قارئ الباركود</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Printer type */}
        <div className="space-y-1.5">
          <Label>نوع اتصال الطابعة</Label>
          <Select
            value={settings.printerType}
            onValueChange={(v) => update({ printerType: v as HardwareSettings["printerType"] })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">لا يوجد (بدون طابعة)</SelectItem>
              <SelectItem value="network">شبكة (Network IP)</SelectItem>
              <SelectItem value="usb">USB</SelectItem>
              <SelectItem value="serial">Serial (منفذ تسلسلي)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Network printer address (only if network) */}
        {settings.printerType === "network" ? (
          <div className="space-y-1.5">
            <Label>عنوان الطابعة (IP:Port)</Label>
            <Input
              dir="ltr"
              value={settings.printerNetworkAddress}
              onChange={(e) => update({ printerNetworkAddress: e.target.value })}
              placeholder="192.168.1.100:9100"
            />
          </div>
        ) : null}

        {/* Cash drawer kick code */}
        <div className="space-y-1.5">
          <Label>رمز فتح درج النقدية (ESC/POS)</Label>
          <Select
            value={String(settings.drawerKickCode)}
            onValueChange={(v) => update({ drawerKickCode: Number(v) })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">نبضة قصيرة (50ms)</SelectItem>
              <SelectItem value="1">نبضة طويلة (100ms)</SelectItem>
              <SelectItem value="7">افتراضي (50ms — الأكثر شيوعًا)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">يُرسل رمز ESC/POS لفتح الدرج عبر الطابعة الحرارية</p>
        </div>

        {/* Test cash drawer */}
        <Button variant="outline" onClick={testDrawer} disabled={testing} className="w-full gap-2">
          <Wallet className="h-4 w-4" />
          {testing ? "جاري الإرسال..." : "اختبار فتح الدرج"}
        </Button>

        {/* Barcode scanner settings */}
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ScanLine className="h-4 w-4 text-primary" />
            إعدادات قارئ الباركود
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>بادئة (Prefix)</Label>
              <Input
                dir="ltr"
                value={settings.scannerPrefix}
                onChange={(e) => update({ scannerPrefix: e.target.value })}
                placeholder="فارغ = بدون"
              />
            </div>
            <div className="space-y-1.5">
              <Label>لاحقة (Suffix)</Label>
              <Input
                dir="ltr"
                value={settings.scannerSuffix === "\n" ? "\\n" : settings.scannerSuffix}
                onChange={(e) => update({ scannerSuffix: e.target.value === "\\n" ? "\n" : e.target.value })}
                placeholder="\\n = Enter"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>سرعة المسح (ms بين المفاتيح)</Label>
              <Input
                type="number"
                dir="ltr"
                value={settings.scannerMinInterval}
                onChange={(e) => update({ scannerMinInterval: Number(e.target.value) || 15 })}
                placeholder="15"
              />
            </div>
            <div className="space-y-1.5">
              <Label>أقصى مدة للمسح (ms)</Label>
              <Input
                type="number"
                dir="ltr"
                value={settings.scannerMaxDuration}
                onChange={(e) => update({ scannerMaxDuration: Number(e.target.value) || 200 })}
                placeholder="200"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            القارئ يكتب بسرعة (~5-15ms بين المفاتيح). إذا لم يُكتشف، قلل القيم.
          </p>
        </div>
      </CardContent>
    </Card>
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

/* ───────────────────────── Units Manager (modern grid) ───────────────────────── */
function UnitsManager() {
  const t = useT()
  const { data, isLoading } = useUnits()
  const createMut = useCreateUnit()
  const deleteMut = useDeleteUnit()
  const [name, setName] = React.useState("")
  const [search, setSearch] = React.useState("")
  const units = data?.items ?? []
  const filtered = units.filter((u) => u.name.includes(search.trim()))

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    try {
      await createMut.mutateAsync({ name: n })
      setName("")
      toast.success(t.setUnitAdded)
    } catch (err: any) {
      toast.error(t.addFailed, { description: err?.message === "name-exists" ? t.setUnitExists : err?.message })
    }
  }

  async function handleDelete(id: string, n: string) {
    try {
      await deleteMut.mutateAsync(id)
      toast.success(t.setUnitDeletedToast.replace("{name}", n))
    } catch (err: any) {
      toast.error(t.deleteFailed, { description: err?.message })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Ruler className="h-4 w-4 text-primary" />
          {t.setUnits}
          <Badge variant="secondary" className="tabular-nums">{units.length}</Badge>
        </CardTitle>
        <CardDescription>{t.setUnitsDesc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.setAddUnitPlaceholder}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={createMut.isPending || !name.trim()}>
            {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </form>

        {units.length > 4 ? (
          <div className="relative">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.searchPlaceholder} className="h-8 pr-8 text-sm" />
          </div>
        ) : null}

        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-muted/50 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{search ? t.setNoResults : t.setNoUnits}</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[220px] overflow-y-auto scrollbar-thin pr-1">
            {filtered.map((u) => (
              <div key={u.id} className="group relative flex items-center justify-center gap-1.5 rounded-lg border border-border/70 bg-muted/30 px-2 py-2.5 text-sm hover:border-primary/40 transition-colors">
                <Ruler className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{u.name}</span>
                <button
                  onClick={() => handleDelete(u.id, u.name)}
                  className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white opacity-0 group-hover:opacity-100 transition-opacity shadow"
                  title={t.delete}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ───────────────────────── Categories Manager (modern) ───────────────────────── */
function CategoriesManager() {
  const t = useT()
  const { data, isLoading } = useCategories()
  const createMut = useCreateCategory()
  const deleteMut = useDeleteCategory()
  const [name, setName] = React.useState("")
  const [code, setCode] = React.useState("")
  const [parentId, setParentId] = React.useState<string>("")
  const [selectedParentId, setSelectedParentId] = React.useState<string | null>(null)
  const [editing, setEditing] = React.useState<Category | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const categories = data?.items ?? []
  const rootCategories = categories.filter((c) => !c.parentId)
  const childCategories = categories.filter((c) => c.parentId)
  const childrenOfSelected = selectedParentId
    ? categories.filter((c) => c.parentId === selectedParentId)
    : []

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    const c = code.trim().slice(0, 4)
    try {
      await createMut.mutateAsync({ name: n, code: c || null, parentId: parentId || null })
      setName("")
      setCode("")
      setParentId("")
      toast.success(t.setCategoryAdded)
    } catch (err: any) {
      const msg = err?.message === "code-exists" ? t.setCategoryCodeExists : err?.message
      toast.error(t.addFailed, { description: msg })
    }
  }

  async function handleDelete(id: string, n: string) {
    setDeletingId(id)
    try {
      await deleteMut.mutateAsync(id)
      toast.success(t.setCategoryDeletedToast.replace("{name}", n))
    } catch (err: any) {
      if (err?.message === "has-products") {
        toast.error(t.setCategoryInUse, { description: t.setCategoryInUseDesc })
      } else {
        toast.error(t.deleteFailed, { description: err?.message })
      }
    } finally {
      setDeletingId(null)
    }
  }

  // Auto-select first parent if none selected
  React.useEffect(() => {
    if (!selectedParentId && rootCategories.length > 0) {
      setSelectedParentId(rootCategories[0].id)
    }
  }, [rootCategories])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Tags className="h-4 w-4 text-primary" />
          {t.setCategories}
          <Badge variant="secondary" className="tabular-nums">{categories.length}</Badge>
        </CardTitle>
        <CardDescription>
          {t.setCategoriesDesc}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add form */}
        <form onSubmit={handleAdd} className="flex flex-wrap gap-2 max-w-2xl">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.slice(0, 4))}
            placeholder={t.setCodePlaceholder}
            maxLength={4}
            dir="ltr"
            className="w-28 text-center font-mono"
            title={t.setCodeTitle}
          />
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.setAddCategoryPlaceholder}
            className="flex-1 min-w-[180px]"
          />
          <Select value={parentId} onValueChange={(v) => setParentId(v === "none" ? "" : v)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="— تصنيف رئيسي —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— تصنيف رئيسي (بدون أب) —</SelectItem>
              {rootCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" size="icon" disabled={createMut.isPending || !name.trim()}>
            {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </form>

        {/* Two-panel layout: parents (left) | children (right) */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="h-48 rounded-lg bg-muted/50 animate-pulse" />
            <div className="h-48 rounded-lg bg-muted/50 animate-pulse" />
          </div>
        ) : categories.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t.setNoCategories}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* ── Left panel: Parent categories ── */}
            <div className="border border-border/70 rounded-lg overflow-hidden">
              <div className="bg-muted/40 px-3 py-2 border-b border-border/70">
                <p className="text-sm font-semibold">التصنيفات الرئيسية (الأب)</p>
              </div>
              <div className="max-h-[280px] overflow-y-auto scrollbar-thin">
                {rootCategories.map((c) => {
                  const isSelected = selectedParentId === c.id
                  const childCount = categories.filter((ch) => ch.parentId === c.id).length
                  return (
                    <div
                      key={c.id}
                      className={cn(
                        "flex items-center justify-between gap-2 px-3 py-2 border-b border-border/30 cursor-pointer transition",
                        isSelected ? "bg-primary/10 border-primary/30" : "hover:bg-muted/20"
                      )}
                      onClick={() => setSelectedParentId(c.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {c.imageUrl ? (
                          <img src={c.imageUrl} alt="" className="h-6 w-6 rounded object-cover shrink-0" />
                        ) : null}
                        {c.code ? (
                          <span className="inline-flex items-center justify-center rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-mono tabular-nums text-primary shrink-0" dir="ltr">
                            {c.code}
                          </span>
                        ) : null}
                        <span className={cn("truncate text-sm", isSelected && "font-bold text-primary")}>{c.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 tabular-nums">
                          {childCount} أبناء
                        </Badge>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setEditing(c) }}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-primary/15 hover:text-primary transition"
                          title={t.edit}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDelete(c.id, c.name) }}
                          disabled={deletingId === c.id}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition disabled:opacity-50"
                          title={t.delete}
                        >
                          {deletingId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  )
                })}
                {rootCategories.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">لا توجد تصنيفات رئيسية</p>
                ) : null}
              </div>
            </div>

            {/* ── Right panel: Children of selected parent ── */}
            <div className="border border-border/70 rounded-lg overflow-hidden">
              <div className="bg-muted/40 px-3 py-2 border-b border-border/70 flex items-center justify-between">
                <p className="text-sm font-semibold">
                  {selectedParentId
                    ? `أبناء: ${rootCategories.find((c) => c.id === selectedParentId)?.name ?? "—"}`
                    : "اختر تصنيفاً رئيسياً"}
                </p>
                {selectedParentId ? (
                  <Badge variant="secondary" className="text-[10px] tabular-nums">{childrenOfSelected.length}</Badge>
                ) : null}
              </div>
              <div className="max-h-[280px] overflow-y-auto scrollbar-thin">
                {childrenOfSelected.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    {selectedParentId ? "لا توجد تصنيفات فرعية تحت هذا القسم" : "← اختر تصنيفاً رئيسياً من اليسار"}
                  </p>
                ) : (
                  childrenOfSelected.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/30 hover:bg-muted/20 transition"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {c.code ? (
                          <span className="inline-flex items-center justify-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-mono tabular-nums text-muted-foreground shrink-0" dir="ltr">
                            {c.code}
                          </span>
                        ) : null}
                        <Tags className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate text-sm">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditing(c)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-primary/15 hover:text-primary transition"
                          title={t.edit}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id, c.name)}
                          disabled={deletingId === c.id}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition disabled:opacity-50"
                          title={t.delete}
                        >
                          {deletingId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <CategoryEditDialog category={editing} onClose={() => setEditing(null)} />
    </Card>
  )
}

/* ───────────────────────── Category edit dialog ───────────────────────── */
function CategoryEditDialog({
  category,
  onClose,
}: {
  category: Category | null
  onClose: () => void
}) {
  const t = useT()
  const { data: catsData } = useCategories()
  const updateMut = useUpdateCategory(category?.id ?? "")
  const [name, setName] = React.useState("")
  const [code, setCode] = React.useState("")
  const [parentId, setParentId] = React.useState<string>("")

  const allCategories = catsData?.items ?? []
  const rootCategories = allCategories.filter((c) => !c.parentId && c.id !== category?.id)

  React.useEffect(() => {
    if (category) {
      setName(category.name)
      setCode(category.code ?? "")
      setParentId((category as any).parentId || "")
    }
  }, [category])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!category) return
    const n = name.trim()
    if (!n) {
      toast.error(t.setCategoryNameRequired)
      return
    }
    const c = code.trim().slice(0, 4)
    try {
      await updateMut.mutateAsync({ name: n, code: c || null, parentId: parentId || null })
      toast.success(t.setCategoryUpdated)
      onClose()
    } catch (err: any) {
      const msg = err?.message === "code-exists" ? t.setCategoryCodeExists : err?.message
      toast.error(t.saveFailed, { description: msg })
    }
  }

  const open = !!category
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t.setEditCategory}</DialogTitle>
          <DialogDescription>{t.setEditCategoryDesc}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cat-code">{t.setCodeLabel}</Label>
            <Input
              id="cat-code"
              value={code}
              onChange={(e) => setCode(e.target.value.slice(0, 4))}
              maxLength={4}
              dir="ltr"
              className="text-center font-mono"
              placeholder="03"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">{t.setCategoryName}</Label>
            <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>التصنيف الأب</Label>
            <Select value={parentId} onValueChange={(v) => setParentId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="— تصنيف رئيسي (بدون أب) —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— تصنيف رئيسي (بدون أب) —</SelectItem>
                {rootCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={updateMut.isPending}>
              {t.cancel}
            </Button>
            <Button type="submit" disabled={updateMut.isPending}>
              {updateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ───────────────────────── System Maintenance Card ───────────────────────── */
function SystemMaintenanceCard() {
  const t = useT()
  const [recalcLoading, setRecalcLoading] = React.useState(false)
  const [recalcResult, setRecalcResult] = React.useState<any>(null)
  const canAccess = true // Settings is already gated by ADMIN/OWNER

  async function handleRecalcStock() {
    setRecalcLoading(true)
    setRecalcResult(null)
    try {
      const res = await fetch("/api/admin/recalc-stock", { method: "POST" })
      if (!res.ok) throw new Error(`request-failed:${res.status}`)
      const data = await res.json()
      setRecalcResult(data)
    } catch (err: any) {
      setRecalcResult({ error: err?.message || "failed" })
    } finally {
      setRecalcLoading(false)
    }
  }

  if (!canAccess) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wrench className="h-4 w-4 text-primary" />
          صيانة النظام
        </CardTitle>
        <CardDescription>أدوات صيانة وإصلاح قاعدة البيانات</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stock recalculation */}
        <div className="rounded-lg border border-border/60 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold">إعادة حساب المخزون</h4>
              <p className="text-xs text-muted-foreground mt-1">
                يُعيد حساب كمية كل منتج من مجموع الكميات الفعلية في المستودعات.
                يستخدم لإصلاح أي عدم تطابق بين المخزون المعروض والمخزون الفعلي.
              </p>
            </div>
            <Button
              onClick={handleRecalcStock}
              disabled={recalcLoading}
              className="gap-2 shrink-0"
            >
              {recalcLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
              إعادة الحساب
            </Button>
          </div>

          {recalcResult ? (
            <div className="rounded-lg bg-muted/40 p-3 space-y-2">
              {recalcResult.error ? (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  فشل: {recalcResult.error}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    تمت إعادة الحساب بنجاح
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-background p-2">
                      <p className="text-xs text-muted-foreground">إجمالي المنتجات</p>
                      <p className="text-lg font-bold tabular-nums">{recalcResult.totalProducts}</p>
                    </div>
                    <div className="rounded-lg bg-amber-500/10 p-2">
                      <p className="text-xs text-muted-foreground">تم تصحيحها</p>
                      <p className="text-lg font-bold tabular-nums text-amber-600">{recalcResult.corrected}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-500/10 p-2">
                      <p className="text-xs text-muted-foreground">سليمة</p>
                      <p className="text-lg font-bold tabular-nums text-emerald-600">{recalcResult.unchanged}</p>
                    </div>
                  </div>
                  {recalcResult.corrections?.length > 0 ? (
                    <div className="space-y-1 mt-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        أول {recalcResult.corrections.length} منتج تم تصحيحها:
                      </p>
                      <div className="max-h-40 overflow-y-auto scrollbar-thin space-y-1">
                        {recalcResult.corrections.map((c: any) => (
                          <div key={c.productId} className="flex items-center justify-between text-xs rounded bg-background px-2 py-1">
                            <span className="truncate">{c.productName}</span>
                            <span className="tabular-nums shrink-0">
                              <span className="text-rose-600 line-through">{c.oldQty}</span>
                              {" → "}
                              <span className="text-emerald-600 font-medium">{c.newQty}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>

        {/* Info */}
        <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
          <p className="text-xs text-muted-foreground">
            💡 استخدم إعادة حساب المخزون عند ملاحظة اختلاف بين الكمية المعروضة في النظام
            والكمية الفعلية. هذا يحدث أحياناً بسبب فواتير معلقة، إلغاء جزئي، أو تحويلات
            بين المستودعات.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
