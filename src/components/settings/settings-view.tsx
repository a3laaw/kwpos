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
  Pencil,
  Save,
  Search,
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

      {/* Current config */}
      <Card className="border-primary/30 bg-gradient-to-l from-primary/5 to-transparent">
        <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <ConfigCell icon={<Globe className="h-4 w-4" />} label={t.setCurrentCountryLabel} value={`${active.flag} ${getCountryName(active, locale)}`} />
          <ConfigCell icon={<Coins className="h-4 w-4" />} label={t.setCurrency} value={`${active.currencySymbol} (${active.currency})`} />
          <ConfigCell icon={<Percent className="h-4 w-4" />} label={t.setTaxRate} value={`${fmt.taxRate}%`} />
          <ConfigCell icon={<Globe className="h-4 w-4" />} label={t.setLocaleCode} value={active.locale} />
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Company info — appears on invoices */}
        <CompanyInfoCard />

        {/* Country picker */}
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

        {/* Units management */}
        <UnitsManager />
      </div>

      {/* Categories management */}
      <CategoriesManager />
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
  const [search, setSearch] = React.useState("")
  const [editing, setEditing] = React.useState<Category | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const categories = data?.items ?? []
  const filtered = categories.filter((c) => c.name.includes(search.trim()))

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    const c = code.trim().slice(0, 4)
    try {
      await createMut.mutateAsync({ name: n, code: c || null })
      setName("")
      setCode("")
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
          <Button type="submit" size="icon" disabled={createMut.isPending || !name.trim()}>
            {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </form>

        {categories.length > 4 ? (
          <div className="relative max-w-md">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.setSearchCategoriesPlaceholder} className="h-8 pr-8 text-sm" />
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-9 w-28 rounded-full bg-muted/50 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{search ? t.setNoResults : t.setNoCategories}</p>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-[260px] overflow-y-auto scrollbar-thin pr-1">
            {filtered.map((c) => (
              <span
                key={c.id}
                className="group inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm font-medium"
              >
                {c.code ? (
                  <span
                    className="inline-flex items-center justify-center rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-mono tabular-nums text-primary"
                    dir="ltr"
                    title={t.setCategoryCode}
                  >
                    {c.code}
                  </span>
                ) : null}
                <Tags className="h-3.5 w-3.5 text-primary" />
                {c.name}
                <button
                  type="button"
                  onClick={() => setEditing(c)}
                  className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-primary/15 hover:text-primary transition"
                  title={t.edit}
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(c.id, c.name)}
                  disabled={deletingId === c.id}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/15 hover:text-destructive transition disabled:opacity-50"
                  title={t.delete}
                >
                  {deletingId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                </button>
              </span>
            ))}
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
  const updateMut = useUpdateCategory(category?.id ?? "")
  const [name, setName] = React.useState("")
  const [code, setCode] = React.useState("")

  React.useEffect(() => {
    if (category) {
      setName(category.name)
      setCode(category.code ?? "")
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
      await updateMut.mutateAsync({ name: n, code: c || null })
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
