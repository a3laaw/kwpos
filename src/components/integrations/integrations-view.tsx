"use client"

import * as React from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Plug,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Download,
  ArrowDownToLine,
  ArrowUpFromLine,
  ExternalLink,
  Lock,
  KeyRound,
  Store,
  Info,
} from "lucide-react"

import { useT } from "@/components/i18n-context"

interface Status {
  configured: boolean
  domain: string | null
  message: string
}

interface SyncResult {
  ok: boolean
  fetched?: number
  created?: number
  updated?: number
  imported?: number
  skipped?: number
  errors?: string[]
  error?: string
}

async function callShopify(path: string): Promise<SyncResult> {
  const res = await fetch(`/api/shopify/${path}`, {
    method: "POST",
    headers: { Accept: "application/json" },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as any)?.error || `http-${res.status}`)
  }
  return data as SyncResult
}

export function IntegrationsView() {
  const t = useT()
  const [status, setStatus] = React.useState<Status | null>(null)
  const [loadingStatus, setLoadingStatus] = React.useState(true)
  const [syncing, setSyncing] = React.useState(false)
  const [importing, setImporting] = React.useState(false)
  const [lastSync, setLastSync] = React.useState<SyncResult | null>(null)
  const [lastImport, setLastImport] = React.useState<SyncResult | null>(null)

  async function loadStatus() {
    setLoadingStatus(true)
    try {
      const res = await fetch("/api/shopify/status")
      const data = await res.json()
      setStatus(data)
    } catch {
      setStatus(null)
    } finally {
      setLoadingStatus(false)
    }
  }

  React.useEffect(() => {
    loadStatus()
  }, [])

  async function handleSyncProducts() {
    setSyncing(true)
    try {
      const r = await callShopify("sync-products")
      setLastSync(r)
      if (r.ok) {
        toast.success(t.intSynced, {
          description: `${t.intFetched}: ${r.fetched ?? 0} • ${t.intCreated}: ${r.created ?? 0} • ${t.intUpdated}: ${r.updated ?? 0}`,
        })
      }
    } catch (e: any) {
      toast.error(t.intSyncFailed, { description: e?.message })
    } finally {
      setSyncing(false)
    }
  }

  async function handleImportOrders() {
    setImporting(true)
    try {
      const r = await callShopify("import-orders")
      setLastImport(r)
      if (r.ok) {
        toast.success(t.intOrdersImported, {
          description: `${t.intFetched}: ${r.fetched ?? 0} • ${t.intImported2}: ${r.imported ?? 0} • ${t.intSkipped}: ${r.skipped ?? 0}`,
        })
      }
    } catch (e: any) {
      toast.error(t.intImportFailed2, { description: e?.message })
    } finally {
      setImporting(false)
    }
  }

  const configured = status?.configured ?? false

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.integrationsTitle}
        description={t.intPageDesc}
        icon={<Plug className="h-5 w-5" />}
      />

      {/* Shopify card */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {t.intShopify}
                {loadingStatus ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : configured ? (
                  <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3" />
                    {t.intConnected}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-amber-600 border-amber-500/30 bg-amber-500/10">
                    <AlertCircle className="h-3 w-3" />
                    {t.intNotConnected}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                {configured
                  ? t.intConnectedTo.replace("{domain}", status?.domain ?? "")
                  : t.intNotConnected}
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={loadStatus} disabled={loadingStatus} title={t.intRefreshStatus}>
            <RefreshCw className={`h-4 w-4 ${loadingStatus ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {configured ? (
            <>
              {/* Sync actions */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowDownToLine className="h-4 w-4 text-primary" />
                    <p className="font-medium text-sm">{t.intSyncProducts}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                    {t.intSyncProductsDesc}
                  </p>
                  <Button onClick={handleSyncProducts} disabled={syncing} className="w-full gap-2">
                    {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    {syncing ? t.intSyncing : t.intSyncNow}
                  </Button>
                  {lastSync?.ok ? (
                    <p className="mt-2 text-xs text-muted-foreground text-center">
                      {t.intFetched}: {lastSync.fetched} • {t.intCreated}: {lastSync.created} • {t.intUpdated}: {lastSync.updated}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Download className="h-4 w-4 text-primary" />
                    <p className="font-medium text-sm">{t.intImportOrders}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                    {t.intImportOrdersDesc}
                  </p>
                  <Button onClick={handleImportOrders} disabled={importing} variant="outline" className="w-full gap-2">
                    {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpFromLine className="h-4 w-4" />}
                    {importing ? t.intImporting : t.intImportNow}
                  </Button>
                  {lastImport?.ok ? (
                    <p className="mt-2 text-xs text-muted-foreground text-center">
                      {t.intFetched}: {lastImport.fetched} • {t.intImported2}: {lastImport.imported} • {t.intSkipped}: {lastImport.skipped}
                    </p>
                  ) : null}
                </div>
              </div>

              {(lastSync?.errors?.length || lastImport?.errors?.length) ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs space-y-1">
                  <p className="font-medium text-amber-700 dark:text-amber-400">{t.intNotes}</p>
                  {lastSync?.errors?.slice(0, 5).map((e, i) => (
                    <p key={`s${i}`} className="text-muted-foreground">• {e}</p>
                  ))}
                  {lastImport?.errors?.slice(0, 5).map((e, i) => (
                    <p key={`i${i}`} className="text-muted-foreground">• {e}</p>
                  ))}
                </div>
              ) : null}

              <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-lg bg-muted/30 p-3">
                <Info className="h-4 w-4 shrink-0" />
                <span>
                  {t.intEnvHint} <code className="font-mono bg-muted px-1 rounded">.env</code>
                </span>
              </div>
            </>
          ) : (
            /* Setup guide */
            <SetupGuide />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SetupGuide() {
  const t = useT()
  const steps = [
    {
      icon: Store,
      title: t.intStep1Title,
      desc: t.intStep1Desc,
      link: "https://www.shopify.com/admin/apps/development",
      linkText: t.intStep1Link,
    },
    {
      icon: Plug,
      title: t.intStep2Title,
      desc: t.intStep2Desc,
    },
    {
      icon: KeyRound,
      title: t.intStep3Title,
      desc: t.intStep3Desc,
    },
    {
      icon: Lock,
      title: t.intStep4Title,
      desc: t.intStep4Desc,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-start gap-2">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          {t.intSetupIntro}
        </p>
      </div>

      <ol className="space-y-3">
        {steps.map((s, i) => {
          const Icon = s.icon
          return (
            <li key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                  {i + 1}
                </span>
                {i < steps.length - 1 ? (
                  <span className="w-px flex-1 bg-border my-1" />
                ) : null}
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium text-sm">{s.title}</p>
                </div>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{s.desc}</p>
                {s.link ? (
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                  >
                    {s.linkText}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>

      <Separator />

      <div className="rounded-lg bg-muted/40 p-3">
        <p className="text-xs font-mono mb-2 text-muted-foreground">.env</p>
        <pre className="text-xs font-mono leading-relaxed overflow-x-auto scrollbar-thin" dir="ltr">{`SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxx`}</pre>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {t.intSetupFinalNote}
      </p>
    </div>
  )
}
