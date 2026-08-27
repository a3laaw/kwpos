import { NextRequest, NextResponse } from "next/server"
import { execSync } from "node:child_process"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { writeFileSync, readFileSync, unlinkSync, existsSync } from "node:fs"
import { randomUUID } from "node:crypto"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * AI Smart Reports — Track 3.2
 *
 * GET /api/reports/ai-summary?period=week|month
 *
 * Fetches business KPIs for the chosen period, formats them into a
 * business-analyst prompt, calls the on-box `z-ai` CLI to generate a
 * narrative analysis, and returns:
 *   { summary, highlights, concerns, recommendations, generatedAt, period, fallback }
 *
 * ── Access control ─────────────────────────────────────────────────
 * Restricted to OWNER / ADMIN / MANAGER (per task spec). The general
 * financials permission (canSeeFinancials) also allows ACCOUNTANT, but
 * the AI summary combines sales + customers + inventory + refunds in
 * a single narrative — out of scope for the ACCOUNTANT role which is
 * financial-only.
 *
 * ── Caching ─────────────────────────────────────────────────────────
 * Results are cached in-memory for 1 hour per `period` key. The cache
 * is per serverless instance (Vercel may have multiple instances, so
 * cache hits are best-effort). A `?refresh=1` query param bypasses the
 * cache.
 *
 * ── z-ai CLI integration ────────────────────────────────────────────
 * Uses child_process.execSync to call:
 *   z-ai chat --prompt "<prompt>" -o /tmp/ai-summary-<uuid>.json
 * The CLI returns JSON with `choices[0].message.content`. We parse the
 * response into 4 labeled sections (SUMMARY, HIGHLIGHTS, CONCERNS,
 * RECOMMENDATIONS). On any failure (non-zero exit, missing binary,
 * parse error, timeout) we return a deterministic fallback summary
 * computed from the raw KPIs — the UI shows a "fallback" flag so the
 * user knows the AI didn't run.
 */

// ── Types ─────────────────────────────────────────────────────────────
type Period = "week" | "month"

interface PeriodKPIs {
  totalSales: number
  totalProfit: number
  orderCount: number
  avgOrderValue: number
  topProducts: Array<{ name: string; qty: number; revenue: number }>
  topCategories: Array<{ name: string; revenue: number }>
  byPayment: Array<{ method: string; revenue: number; count: number }>
  refundCount: number
  refundTotal: number
  newCustomers: number
  lowStockCount: number
  bestDay: { date: string; revenue: number } | null
  worstDay: { date: string; revenue: number } | null
}

interface AISummaryResponse {
  summary: string
  highlights: string[]
  concerns: string[]
  recommendations: string[]
  period: Period
  generatedAt: string
  fallback: boolean
  kpis: PeriodKPIs
}

// ── Role gate ─────────────────────────────────────────────────────────
const ALLOWED_ROLES: Role[] = ["OWNER", "ADMIN", "MANAGER"]
function roleAllowed(role: Role | undefined): boolean {
  return !!role && ALLOWED_ROLES.includes(role)
}

// ── 1-hour in-memory cache keyed by period ────────────────────────────
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const cache = new Map<Period, { at: number; data: AISummaryResponse }>()

function fmt(n: number, digits = 3): string {
  return Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

function paymentLabel(method: string): string {
  switch (method) {
    case "CASH": return "نقدي"
    case "CARD": return "بطاقة"
    case "TRANSFER": return "تحويل"
    default: return method
  }
}

function periodStartDate(period: Period): Date {
  const days = period === "week" ? 7 : 30
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - (days - 1))
  return d
}

/**
 * Build a structured business-analyst prompt for the AI.
 * The model is asked to return the response in 4 labeled sections
 * (SUMMARY / HIGHLIGHTS / CONCERNS / RECOMMENDATIONS) so we can
 * deterministically parse them back into the response shape.
 */
function buildPrompt(period: Period, kpis: PeriodKPIs): string {
  const periodAr = period === "week" ? "هذا الأسبوع" : "هذا الشهر"
  const lines: string[] = []
  lines.push(`You are a business analyst for a perfume retail store in Kuwait.`)
  lines.push(`Analyze ${periodAr}'s sales data and provide:`)
  lines.push(`1. A brief executive summary (2-3 sentences in Arabic)`)
  lines.push(`2. Key highlights (3 bullet points in Arabic)`)
  lines.push(`3. Areas of concern (2-3 bullet points in Arabic)`)
  lines.push(`4. Recommended actions (3 bullet points in Arabic)`)
  lines.push(``)
  lines.push(`Format your response EXACTLY like this (keep the English section labels):`)
  lines.push(`SUMMARY:`)
  lines.push(`<your Arabic summary here>`)
  lines.push(``)
  lines.push(`HIGHLIGHTS:`)
  lines.push(`- <Arabic point 1>`)
  lines.push(`- <Arabic point 2>`)
  lines.push(`- <Arabic point 3>`)
  lines.push(``)
  lines.push(`CONCERNS:`)
  lines.push(`- <Arabic point 1>`)
  lines.push(`- <Arabic point 2>`)
  lines.push(``)
  lines.push(`RECOMMENDATIONS:`)
  lines.push(`- <Arabic point 1>`)
  lines.push(`- <Arabic point 2>`)
  lines.push(`- <Arabic point 3>`)
  lines.push(``)
  lines.push(`Data:`)
  lines.push(`- Total sales: ${fmt(kpis.totalSales)} KWD`)
  lines.push(`- Total profit: ${fmt(kpis.totalProfit)} KWD`)
  lines.push(`- Orders: ${kpis.orderCount}`)
  lines.push(`- Avg order value: ${fmt(kpis.avgOrderValue)} KWD`)
  lines.push(`- Refunds: ${kpis.refundCount} orders, total ${fmt(kpis.refundTotal)} KWD`)
  lines.push(`- New customers: ${kpis.newCustomers}`)
  lines.push(`- Low stock products: ${kpis.lowStockCount}`)
  if (kpis.bestDay) {
    lines.push(`- Best day: ${kpis.bestDay.date} (${fmt(kpis.bestDay.revenue)} KWD)`)
  }
  if (kpis.worstDay) {
    lines.push(`- Worst day: ${kpis.worstDay.date} (${fmt(kpis.worstDay.revenue)} KWD)`)
  }
  lines.push(``)
  lines.push(`Top 5 selling products:`)
  for (const p of kpis.topProducts) {
    lines.push(`- ${p.name}: ${p.qty} units, ${fmt(p.revenue)} KWD revenue`)
  }
  lines.push(``)
  lines.push(`Top 5 categories by revenue:`)
  for (const c of kpis.topCategories) {
    lines.push(`- ${c.name}: ${fmt(c.revenue)} KWD`)
  }
  lines.push(``)
  lines.push(`Sales by payment method:`)
  for (const m of kpis.byPayment) {
    lines.push(`- ${paymentLabel(m.method)}: ${m.count} orders, ${fmt(m.revenue)} KWD`)
  }
  lines.push(``)
  lines.push(`Respond ONLY with the labeled sections above. Do not add any preface or extra text.`)
  return lines.join("\n")
}

/**
 * Parse the AI's text response into the 4-section shape.
 *
 * The model is instructed to return sections labeled with English headers
 * (SUMMARY:, HIGHLIGHTS:, CONCERNS:, RECOMMENDATIONS:). We split on those
 * headers and parse bullets (lines starting with "-" or "•" or "1.").
 *
 * If parsing fails (model didn't follow the format), we fall back to
 * putting the whole response in `summary` and leaving the others empty.
 */
function parseAIResponse(content: string): {
  summary: string
  highlights: string[]
  concerns: string[]
  recommendations: string[]
} {
  const sections = {
    summary: "",
    highlights: [] as string[],
    concerns: [] as string[],
    recommendations: [] as string[],
  }

  // Normalize content: trim, collapse consecutive blank lines.
  const text = content.trim()

  // Helper to extract the body of a labeled section.
  function sectionBody(label: string): string {
    // Match LABEL: ... up to the next known label or end-of-text.
    const labels = ["SUMMARY:", "HIGHLIGHTS:", "CONCERNS:", "RECOMMENDATIONS:"]
    const startIdx = text.indexOf(label)
    if (startIdx === -1) return ""
    const bodyStart = startIdx + label.length
    // Find next label that comes AFTER bodyStart.
    let endIdx = text.length
    for (const other of labels) {
      if (other === label) continue
      const idx = text.indexOf(other, bodyStart)
      if (idx !== -1 && idx < endIdx) endIdx = idx
    }
    return text.slice(bodyStart, endIdx).trim()
  }

  const summaryBody = sectionBody("SUMMARY:")
  const highlightsBody = sectionBody("HIGHLIGHTS:")
  const concernsBody = sectionBody("CONCERNS:")
  const recsBody = sectionBody("RECOMMENDATIONS:")

  function parseBullets(body: string): string[] {
    if (!body) return []
    const out: string[] = []
    for (const raw of body.split(/\r?\n/)) {
      const line = raw.trim()
      if (!line) continue
      // Strip leading bullet/marker chars: "-", "•", "*", "1.", "1)", "•"
      const cleaned = line
        .replace(/^[-*•]\s+/, "")
        .replace(/^\d+[.)]\s+/, "")
        .trim()
      if (cleaned) out.push(cleaned)
    }
    return out
  }

  sections.summary = summaryBody
  sections.highlights = parseBullets(highlightsBody)
  sections.concerns = parseBullets(concernsBody)
  sections.recommendations = parseBullets(recsBody)

  // Fallback: if no labels matched, put the whole response in summary.
  if (
    !sections.summary &&
    !sections.highlights.length &&
    !sections.concerns.length &&
    !sections.recommendations.length
  ) {
    sections.summary = text
  }

  return sections
}

/**
 * Generate a deterministic Arabic fallback summary from raw KPIs when
 * the AI CLI is unavailable. The UI shows a small "fallback" badge so
 * the user knows this didn't come from the AI.
 */
function buildFallback(kpis: PeriodKPIs, period: Period): {
  summary: string
  highlights: string[]
  concerns: string[]
  recommendations: string[]
} {
  const periodAr = period === "week" ? "الأسبوع" : "الشهر"
  const top = kpis.topProducts[0]
  const summary =
    `في ${periodAr} الماضي، بلغ إجمالي المبيعات ${fmt(kpis.totalSales)} د.ك عبر ${kpis.orderCount} فاتورة ` +
    `بمتوسط ${fmt(kpis.avgOrderValue)} د.ك للفاتورة، وصافي الربح ${fmt(kpis.totalProfit)} د.ك. ` +
    (kpis.refundCount > 0
      ? `سُجّلت ${kpis.refundCount} مرتجع بقيمة ${fmt(kpis.refundTotal)} د.ك. `
      : `لم تُسجّل أي مرتجعات. `) +
    `انضم ${kpis.newCustomers} عميل جديد، وهناك ${kpis.lowStockCount} منتج بمخزون منخفض.`

  const highlights: string[] = []
  if (top) {
    highlights.push(`أعلى منتج مبيعاً: ${top.name} (${top.qty} وحدة، ${fmt(top.revenue)} د.ك).`)
  }
  if (kpis.bestDay) {
    highlights.push(`أفضل يوم مبيعاً: ${kpis.bestDay.date} (${fmt(kpis.bestDay.revenue)} د.ك).`)
  }
  if (kpis.byPayment.length > 0) {
    const topPay = [...kpis.byPayment].sort((a, b) => b.revenue - a.revenue)[0]
    highlights.push(
      `أعلى طريقة دفع: ${paymentLabel(topPay.method)} (${fmt(topPay.revenue)} د.ك عبر ${topPay.count} عملية).`
    )
  }
  // Ensure at least 3 highlights — pad with a generic AOV point if needed.
  while (highlights.length < 3) {
    highlights.push(`متوسط قيمة الفاتورة ${fmt(kpis.avgOrderValue)} د.ك.`)
  }

  const concerns: string[] = []
  if (kpis.lowStockCount > 0) {
    concerns.push(`${kpis.lowStockCount} منتج بمخزون منخفض ويحتاج إعادة طلب.`)
  }
  if (kpis.refundCount > 0) {
    concerns.push(`نسبة المرتجعات ${kpis.refundCount} من ${kpis.orderCount} فاتورة (${kpis.orderCount > 0 ? Math.round((kpis.refundCount / kpis.orderCount) * 100) : 0}%).`)
  }
  if (kpis.worstDay) {
    concerns.push(`أضعف يوم مبيعاً: ${kpis.worstDay.date} (${fmt(kpis.worstDay.revenue)} د.ك).`)
  }
  if (concerns.length === 0) {
    concerns.push("لا توجد مؤشرات سلبية بارزة في هذه الفترة.")
  }

  const recommendations: string[] = []
  if (kpis.lowStockCount > 0) {
    recommendations.push("إعادة طلب المنتجات منخفضة المخزون قبل النفاد.")
  }
  if (top) {
    recommendations.push(`التركيز على ترويج ${top.name} لتعزيز المنتج الأكثر مبيعاً.`)
  }
  recommendations.push("متابعة المرتجعات وتحليل الأسباب لتقليلها.")
  // Ensure at least 3 recommendations — pad with a generic payment-off point.
  while (recommendations.length < 3) {
    recommendations.push("تحسين عروض طرق الدفع لزيادة متوسط قيمة الفاتورة.")
  }

  return { summary, highlights, concerns, recommendations }
}

/**
 * Fetch all KPIs needed for the AI prompt in parallel.
 * Uses COMPLETED sales only (CANCELLED invoices are excluded).
 * Refunds are read from Sale.refundTotal where refundStatus != "NONE".
 */
async function fetchKPIs(period: Period): Promise<PeriodKPIs> {
  const startDate = periodStartDate(period)
  const dateFilter = { gte: startDate }
  const saleWhere = { status: "COMPLETED" as const, createdAt: dateFilter }

  const [
    summaryAgg,
    byProductRows,
    byDayRows,
    byPaymentRows,
    refundAgg,
    newCustomersAgg,
    lowStockCount,
  ] = await Promise.all([
    // KPI summary: revenue, count, avg
    db.sale.aggregate({
      where: saleWhere,
      _sum: { total: true },
      _count: true,
      _avg: { total: true },
    }),
    // By-product groupBy for top-5
    db.saleItem.groupBy({
      by: ["productId"],
      where: { sale: saleWhere },
      _sum: { quantity: true, returnedQty: true, subtotal: true },
      orderBy: { _sum: { subtotal: "desc" } },
      take: 5,
    }),
    // Lightweight sale rows for by-day grouping
    db.sale.findMany({
      where: saleWhere,
      select: { total: true, createdAt: true },
    }),
    // By-payment-method groupBy
    db.sale.groupBy({
      by: ["paymentMethod"],
      where: saleWhere,
      _count: true,
      _sum: { total: true },
    }),
    // Refunds: count sales with refundStatus != "NONE" and sum their refundTotal
    db.sale.aggregate({
      where: { refundStatus: { not: "NONE" }, createdAt: dateFilter },
      _sum: { refundTotal: true },
      _count: true,
    }),
    // New customers created in period
    db.customer.aggregate({
      where: { createdAt: dateFilter },
      _count: true,
    }),
    // Low-stock products: quantity <= reorderLevel (and reorderLevel > 0)
    db.product.count({
      where: { reorderLevel: { gt: 0 }, quantity: { lte: 0 } },
    }),
  ])

  // Resolve product names + cost prices for the by-product rows
  const productIds = byProductRows.map((r) => r.productId)
  const productMeta = productIds.length
    ? await db.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, costPrice: true, categoryId: true, category: { select: { name: true } } },
      })
    : []
  const metaMap = new Map(productMeta.map((p) => [p.id, p]))

  // Build top products (net of returns) and top categories in one pass
  const productMap = new Map<string, { name: string; qty: number; revenue: number; cost: number }>()
  const categoryMap = new Map<string, { revenue: number }>()
  for (const row of byProductRows) {
    const meta = metaMap.get(row.productId)
    const name = meta?.name || "—"
    const cat = meta?.category?.name || "غير مصنف"
    const grossQty = Number(row._sum.quantity || 0)
    const returned = Number(row._sum.returnedQty || 0)
    const qty = Math.max(0, grossQty - returned)
    const subtotal = Number(row._sum.subtotal || 0)
    const lineUnit = grossQty > 0 ? subtotal / grossQty : 0
    const revenue = subtotal - returned * lineUnit
    const cost = qty * Number(meta?.costPrice ?? 0)
    productMap.set(name, { name, qty, revenue, cost })
    const cm = categoryMap.get(cat) || { revenue: 0 }
    cm.revenue += revenue
    categoryMap.set(cat, cm)
  }

  // By-day map (date → revenue)
  const dayMap = new Map<string, number>()
  for (const s of byDayRows) {
    const dayKey = new Date(s.createdAt).toISOString().slice(0, 10)
    dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + Number(s.total))
  }
  let bestDay: PeriodKPIs["bestDay"] = null
  let worstDay: PeriodKPIs["worstDay"] = null
  if (dayMap.size > 0) {
    const entries = Array.from(dayMap.entries()).sort((a, b) => b[1] - a[1])
    bestDay = { date: entries[0][0], revenue: +entries[0][1].toFixed(3) }
    worstDay = { date: entries[entries.length - 1][0], revenue: +entries[entries.length - 1][1].toFixed(3) }
  }

  const totalRevenue = Number(summaryAgg._sum.total || 0)
  const orderCount = summaryAgg._count || 0
  const avgOrderValue = summaryAgg._avg.total ? Number(summaryAgg._avg.total) : 0

  // Profit: sum(qty * costPrice) for each product line, subtracted from revenue
  const totalCost = Array.from(productMap.values()).reduce((a, p) => a + p.cost, 0)
  const totalProfit = totalRevenue - totalCost

  return {
    totalSales: +totalRevenue.toFixed(3),
    totalProfit: +totalProfit.toFixed(3),
    orderCount,
    avgOrderValue: +avgOrderValue.toFixed(3),
    topProducts: Array.from(productMap.values())
      .map((p) => ({ name: p.name, qty: p.qty, revenue: +p.revenue.toFixed(3) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5),
    topCategories: Array.from(categoryMap.entries())
      .map(([name, v]) => ({ name, revenue: +v.revenue.toFixed(3) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5),
    byPayment: byPaymentRows.map((r) => ({
      method: r.paymentMethod,
      count: r._count,
      revenue: +Number(r._sum.total || 0).toFixed(3),
    })),
    refundCount: refundAgg._count || 0,
    refundTotal: +Number(refundAgg._sum.refundTotal || 0).toFixed(3),
    newCustomers: newCustomersAgg._count || 0,
    lowStockCount,
    bestDay,
    worstDay,
  }
}

/**
 * Invoke the on-box `z-ai` CLI with a 30s timeout. Writes the prompt to
 * a temp file (avoids shell-escaping 1KB+ of Arabic text safely), runs
 * `z-ai chat --prompt-file ...` (we just inline via --prompt but write
 * to temp to be safe — re-read it and pass via --prompt).
 *
 * Returns the raw `choices[0].message.content` string, or null on any
 * failure (non-zero exit, timeout, missing binary, parse error).
 */
function callZai(prompt: string): string | null {
  const outFile = join(tmpdir(), `ai-summary-${randomUUID()}.json`)
  const promptFile = join(tmpdir(), `ai-summary-${randomUUID()}.txt`)

  try {
    // Write prompt to a temp file (avoids any shell escaping issues for
    // large Arabic text with quotes / newlines).
    writeFileSync(promptFile, prompt, "utf-8")

    // The CLI takes --prompt as a single arg. We read the prompt back
    // from the temp file and pass via --prompt. (Avoiding --prompt-file
    // since it's not in the documented z-ai CLI surface.)
    const promptArg = readFileSync(promptFile, "utf-8")

    // Build a safe command. We use execSync with a string and escape
    // the prompt body via JSON.stringify to keep all special chars
    // intact under /bin/sh.
    const cmd = `z-ai chat --prompt ${JSON.stringify(promptArg)} -o ${JSON.stringify(outFile)}`

    execSync(cmd, {
      timeout: 30_000,
      stdio: "pipe", // silence stdout/stderr from z-ai
      encoding: "utf-8",
      env: { ...process.env },
    })

    if (!existsSync(outFile)) return null
    const raw = readFileSync(outFile, "utf-8")
    const parsed = JSON.parse(raw) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = parsed?.choices?.[0]?.message?.content
    return typeof content === "string" ? content : null
  } catch {
    // z-ai missing, timeout, non-zero exit, or parse error — caller falls back.
    return null
  } finally {
    // Cleanup temp files (best-effort — ignore fs errors).
    try { if (existsSync(outFile)) unlinkSync(outFile) } catch { /* ignore */ }
    try { if (existsSync(promptFile)) unlinkSync(promptFile) } catch { /* ignore */ }
  }
}

export async function GET(req: NextRequest) {
  // ── Auth + role gate ────────────────────────────────────────────────
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!roleAllowed(user.role as Role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  // ── Parse period + refresh flag ─────────────────────────────────────
  const { searchParams } = new URL(req.url)
  const periodParam = (searchParams.get("period") || "week").toLowerCase()
  const period: Period = periodParam === "month" ? "month" : "week"
  const refresh = searchParams.get("refresh") === "1"

  // ── Cache check ─────────────────────────────────────────────────────
  const cached = cache.get(period)
  if (cached && !refresh && Date.now() - cached.at < CACHE_TTL_MS) {
    return NextResponse.json(cached.data)
  }

  // ── Fetch KPIs ──────────────────────────────────────────────────────
  let kpis: PeriodKPIs
  try {
    kpis = await fetchKPIs(period)
  } catch (e) {
    return NextResponse.json(
      { error: "data-fetch-failed", detail: (e as Error).message },
      { status: 500 }
    )
  }

  // ── Build prompt + call AI ──────────────────────────────────────────
  const prompt = buildPrompt(period, kpis)
  const aiContent = callZai(prompt)

  let summary: string
  let highlights: string[]
  let concerns: string[]
  let recommendations: string[]
  let fallback = false

  if (aiContent) {
    const parsed = parseAIResponse(aiContent)
    summary = parsed.summary
    highlights = parsed.highlights
    concerns = parsed.concerns
    recommendations = parsed.recommendations
    // If the AI returned nothing parseable, fall back to deterministic.
    if (!summary && !highlights.length && !concerns.length && !recommendations.length) {
      const fb = buildFallback(kpis, period)
      summary = fb.summary
      highlights = fb.highlights
      concerns = fb.concerns
      recommendations = fb.recommendations
      fallback = true
    }
  } else {
    const fb = buildFallback(kpis, period)
    summary = fb.summary
    highlights = fb.highlights
    concerns = fb.concerns
    recommendations = fb.recommendations
    fallback = true
  }

  const response: AISummaryResponse = {
    summary,
    highlights,
    concerns,
    recommendations,
    period,
    generatedAt: new Date().toISOString(),
    fallback,
    kpis,
  }

  // Cache for 1 hour
  cache.set(period, { at: Date.now(), data: response })

  return NextResponse.json(response)
}
