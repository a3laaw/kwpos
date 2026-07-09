"use client"

import * as React from "react"
import type { Sale } from "@/lib/types"
import type { ExchangeSale } from "@/hooks/use-api"

/**
 * Print helpers — opens a dedicated print window with the right CSS @page
 * size for each print kind (thermal receipt 80mm, A4 invoice, barcode labels).
 */

export interface PrintStore {
  name: string
  address?: string
  phone?: string
  vatNo?: string
  logo?: string | null // base64 data URL or remote URL
}

const DEFAULT_STORE: PrintStore = {
  name: "نظام المتجر",
  address: "",
  phone: "",
}

function getStore(): PrintStore {
  if (typeof window === "undefined") return DEFAULT_STORE
  try {
    const raw = localStorage.getItem("erp-store-info")
    return raw ? { ...DEFAULT_STORE, ...JSON.parse(raw) } : DEFAULT_STORE
  } catch {
    return DEFAULT_STORE
  }
}

function openPrintWindow(html: string, title: string, width = 900, height = 700) {
  const features = `width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no,scrollbars=yes`
  const w = window.open("", "_blank", features)
  if (!w) {
    alert("يرجى السماح بالنوافذ المنبثقة للطباعة")
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
  w.document.title = title
  // Wait for fonts (Libre Barcode 39, Tajawal) to load before printing,
  // otherwise the barcode renders as plain text on first print.
  const triggerPrint = () => {
    w.focus()
    w.print()
  }
  // Use the document.fonts API when available; fall back to a longer delay.
  if (w.document.fonts && w.document.fonts.ready) {
    w.document.fonts.ready.then(() => setTimeout(triggerPrint, 200))
  } else {
    setTimeout(triggerPrint, 1200)
  }
}

/* ───────────────────────── 1. Thermal Receipt (80mm) ───────────────────────── */

export function printThermalReceipt(sale: Sale) {
  const store = getStore()
  // Format date in Arabic explicitly (avoid locale-dependent garbled output).
  const dateStr = new Intl.DateTimeFormat("ar-KW-u-nu-latn", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(sale.createdAt))
  const itemsRows = sale.items
    .map(
      (it) => `
      <tr>
        <td class="name">${escapeHtml(it.productName)}</td>
        <td class="qty">${it.quantity}</td>
        <td class="price">${fmtNum(it.unitPrice)}</td>
        <td class="total">${fmtNum(it.subtotal)}</td>
      </tr>`
    )
    .join("")

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<title>إيصال ${sale.invoiceNo}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  @page { size: 80mm auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 80mm; max-width: 80mm; }
  body { font-family: "Tajawal", "Cairo", sans-serif; padding: 3mm 2mm; font-size: 10px; color: #000; line-height: 1.4; }
  .store { text-align: center; margin-bottom: 3mm; }
  .store h1 { font-size: 15px; font-weight: 700; }
  .store p { font-size: 9px; color: #333; margin-top: 1px; }
  .sep { border-top: 1px dashed #000; margin: 2.5mm 0; }
  .info { font-size: 9.5px; line-height: 1.7; }
  .info div { display: flex; justify-content: space-between; gap: 4px; }
  .info .val { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin: 1.5mm 0; }
  th { font-size: 9px; text-align: right; border-bottom: 1px solid #000; padding: 1mm 0; font-weight: 700; }
  th.qty, th.price, th.total { text-align: center; }
  td { font-size: 9.5px; padding: 0.8mm 0; vertical-align: top; }
  td.qty, td.price, td.total { text-align: center; white-space: nowrap; }
  td.name { width: 45%; padding-left: 1mm; }
  .totals { margin-top: 1.5mm; }
  .totals div { display: flex; justify-content: space-between; font-size: 10px; padding: 0.4mm 0; }
  .totals .grand { font-size: 13px; font-weight: 700; border-top: 2px solid #000; padding-top: 1mm; margin-top: 1mm; }
  .footer { text-align: center; margin-top: 3mm; font-size: 9px; }
  .barcode { text-align: center; font-family: "Libre Barcode 39", "Courier New", monospace; font-size: 36px; line-height: 1; margin-top: 2mm; letter-spacing: 0; }
  .barcode-code { text-align: center; font-family: "Courier New", monospace; font-size: 8px; letter-spacing: 1px; margin-top: 1mm; }
  @media print {
    body { width: 80mm; max-width: 80mm; padding: 3mm 2mm; }
    @page { size: 80mm auto; margin: 0; }
  }
</style>
</head>
<body>
  <div class="store">
    ${store.logo ? `<img src="${store.logo}" alt="logo" style="max-width:30mm;max-height:20mm;object-fit:contain;margin:0 auto 1mm;display:block" />` : ""}
    <h1>${escapeHtml(store.name)}</h1>
    ${store.address ? `<p>${escapeHtml(store.address)}</p>` : ""}
    ${store.phone ? `<p>هاتف: ${escapeHtml(store.phone)}</p>` : ""}
  </div>
  <div class="sep"></div>
  <div class="info">
    <div><span>رقم الفاتورة:</span><span class="val">${sale.invoiceNo}</span></div>
    <div><span>التاريخ:</span><span class="val">${dateStr}</span></div>
    <div><span>العميل:</span><span class="val">${escapeHtml(sale.customerName || "عميل نقدي")}</span></div>
    <div><span>طريقة الدفع:</span><span class="val">${paymentLabel(sale.paymentMethod)}</span></div>
  </div>
  <div class="sep"></div>
  <table>
    <thead>
      <tr><th>الصنف</th><th class="qty">كمية</th><th class="price">سعر</th><th class="total">إجمالي</th></tr>
    </thead>
    <tbody>${itemsRows}</tbody>
  </table>
  <div class="sep"></div>
  <div class="totals">
    <div><span>المجموع الفرعي</span><span>${fmtNum(sale.subtotal)}</span></div>
    ${sale.discount > 0 ? `<div><span>الخصم</span><span>-${fmtNum(sale.discount)}</span></div>` : ""}
    ${sale.taxAmount > 0 ? `<div><span>الضريبة (${sale.taxRate}%)</span><span>${fmtNum(sale.taxAmount)}</span></div>` : ""}
    ${sale.deliveryFee > 0 ? `<div><span>رسوم التوصيل${sale.driverName ? ` (${escapeHtml(sale.driverName)})` : ""}</span><span>${fmtNum(sale.deliveryFee)}</span></div>` : ""}
    <div class="grand"><span>الإجمالي</span><span>${fmtNum(sale.total)}</span></div>
  </div>
  <div class="footer">
    <p>شكراً لزيارتكم 🌿</p>
  </div>
  <div class="sep"></div>
  <div class="barcode">*${sale.invoiceNo}*</div>
  <div class="barcode-code">${sale.invoiceNo}</div>
</body>
</html>`
  openPrintWindow(html, `إيصال ${sale.invoiceNo}`, 360, 640)
}

/* ───────────────────────── 2. A4 Invoice ───────────────────────── */

export function printA4Invoice(sale: Sale) {
  const store = getStore()
  const dateStr = new Intl.DateTimeFormat("ar-KW-u-nu-latn", { year: "numeric", month: "long", day: "numeric" }).format(new Date(sale.createdAt))
  const timeStr = new Intl.DateTimeFormat("ar-KW-u-nu-latn", { hour: "2-digit", minute: "2-digit" }).format(new Date(sale.createdAt))
  const itemsRows = sale.items
    .map(
      (it, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td class="name">${escapeHtml(it.productName)}</td>
        <td class="qty">${it.quantity}</td>
        <td class="price">${fmtNum(it.unitPrice)}</td>
        <td class="total">${fmtNum(it.subtotal)}</td>
      </tr>`
    )
    .join("")

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<title>فاتورة ${sale.invoiceNo}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 14mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Tajawal", "Cairo", sans-serif; color: #1a1a1a; font-size: 12px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #10b981; padding-bottom: 8mm; margin-bottom: 6mm; }
  .store-info { display: flex; align-items: center; gap: 4mm; }
  .store-logo { width: 18mm; height: 18mm; object-fit: contain; border-radius: 2mm; }
  .store-text h1 { font-size: 22px; color: #10b981; }
  .store-text p { font-size: 11px; color: #555; margin-top: 2px; }
  .invoice-meta { text-align: left; }
  .invoice-meta h2 { font-size: 18px; color: #333; }
  .invoice-meta p { font-size: 11px; color: #555; margin-top: 2px; }
  .invoice-meta .no { font-size: 14px; font-weight: 700; color: #10b981; font-family: monospace; }
  .parties { display: flex; justify-content: space-between; margin-bottom: 6mm; gap: 10mm; }
  .party { flex: 1; border: 1px solid #e5e7eb; border-radius: 6px; padding: 3mm 4mm; }
  .party h3 { font-size: 10px; color: #999; text-transform: uppercase; margin-bottom: 2mm; }
  .party p { font-size: 12px; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 6mm; }
  thead th { background: #f0fdf4; color: #065f46; font-size: 11px; padding: 2.5mm; border-bottom: 2px solid #10b981; }
  thead th.num { width: 8mm; text-align: center; }
  thead th.qty, thead th.price, thead th.total { text-align: center; width: 22mm; }
  tbody td { padding: 2.5mm; border-bottom: 1px solid #f3f4f6; font-size: 11px; }
  tbody td.num, tbody td.qty, tbody td.price, tbody td.total { text-align: center; }
  .totals-wrap { display: flex; justify-content: flex-start; }
  .totals { width: 70mm; margin-right: auto; }
  .totals div { display: flex; justify-content: space-between; padding: 1.5mm 3mm; font-size: 12px; border-bottom: 1px solid #f3f4f6; }
  .totals .grand { font-size: 15px; font-weight: 700; color: #10b981; border: 2px solid #10b981; border-radius: 6px; padding: 2.5mm 3mm; margin-top: 2mm; }
  .footer { margin-top: 12mm; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #e5e7eb; padding-top: 4mm; }
  .badge { display: inline-block; background: #f0fdf4; color: #065f46; padding: 1mm 3mm; border-radius: 4px; font-size: 10px; font-weight: 600; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="header">
    <div class="store-info">
      ${store.logo ? `<img src="${store.logo}" alt="logo" class="store-logo" />` : ""}
      <div class="store-text">
        <h1>${escapeHtml(store.name)}</h1>
        ${store.address ? `<p>${escapeHtml(store.address)}</p>` : ""}
        ${store.phone ? `<p>هاتف: ${escapeHtml(store.phone)}</p>` : ""}
        ${store.vatNo ? `<p>رقم ضريبي: ${escapeHtml(store.vatNo)}</p>` : ""}
      </div>
    </div>
    <div class="invoice-meta">
      <h2>فاتورة مبيعات</h2>
      <p>رقم الفاتورة</p>
      <p class="no">${sale.invoiceNo}</p>
      <p style="margin-top:2mm">التاريخ: ${dateStr} - ${timeStr}</p>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>العميل</h3>
      <p>${escapeHtml(sale.customerName || "عميل نقدي")}</p>
      ${sale.customerPhone ? `<p style="font-weight:400;color:#666">${escapeHtml(sale.customerPhone)}</p>` : ""}
    </div>
    <div class="party">
      <h3>طريقة الدفع</h3>
      <p><span class="badge">${paymentLabel(sale.paymentMethod)}</span></p>
      <p style="font-weight:400;color:#666;margin-top:1mm">البائع: ${escapeHtml(sale.userName || "—")}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr><th class="num">#</th><th>الصنف</th><th class="qty">الكمية</th><th class="price">سعر الوحدة</th><th class="total">الإجمالي</th></tr>
    </thead>
    <tbody>${itemsRows}</tbody>
  </table>

  <div class="totals-wrap">
    <div class="totals">
      <div><span>المجموع الفرعي</span><span>${fmtNum(sale.subtotal)}</span></div>
      ${sale.discount > 0 ? `<div><span>الخصم</span><span>-${fmtNum(sale.discount)}</span></div>` : ""}
      ${sale.taxAmount > 0 ? `<div><span>الضريبة (${sale.taxRate}%)</span><span>${fmtNum(sale.taxAmount)}</span></div>` : ""}
      ${sale.deliveryFee > 0 ? `<div><span>رسوم التوصيل${sale.driverName ? ` (${escapeHtml(sale.driverName)})` : ""}</span><span>${fmtNum(sale.deliveryFee)}</span></div>` : ""}
      <div class="grand"><span>الإجمالي المستحق</span><span>${fmtNum(sale.total)}</span></div>
    </div>
  </div>

  <div class="footer">
    <p>شكراً لتعاملكم معنا — هذه الفاتورة صادرة إلكترونياً من ${escapeHtml(store.name)}</p>
  </div>
</body>
</html>`
  openPrintWindow(html, `فاتورة ${sale.invoiceNo}`)
}

/* ───────────────────────── 3. Barcode Labels ───────────────────────── */

export interface BarcodeLabelProduct {
  name: string
  barcode?: string | null
  salePrice: number
}

export function printBarcodeLabels(products: BarcodeLabelProduct[], copies = 1) {
  const store = getStore()
  const labels = products
    .flatMap((p) =>
      Array.from({ length: copies }).map(
        () => `
      <div class="label">
        <div class="store">${escapeHtml(store.name)}</div>
        <div class="name">${escapeHtml(p.name)}</div>
        <div class="price">${fmtNum(p.salePrice)}</div>
        <div class="barcode">${p.barcode ? "*" + escapeHtml(p.barcode) + "*" : "******"}</div>
        <div class="code">${escapeHtml(p.barcode || "—")}</div>
      </div>`
      )
    )
    .join("")

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<title>ملصقات باركود</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 8mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Tajawal", "Cairo", sans-serif; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }
  .label { border: 1px solid #d1d5db; border-radius: 4px; padding: 3mm; text-align: center; height: 35mm; display: flex; flex-direction: column; justify-content: space-between; page-break-inside: avoid; }
  .store { font-size: 9px; color: #6b7280; font-weight: 600; }
  .name { font-size: 11px; font-weight: 700; color: #111; line-height: 1.2; max-height: 13mm; overflow: hidden; }
  .price { font-size: 14px; font-weight: 700; color: #10b981; }
  .barcode { font-family: "Libre Barcode 39", "Courier New", monospace; font-size: 24px; letter-spacing: 1px; color: #000; }
  .code { font-size: 8px; color: #6b7280; font-family: monospace; }
  @media print { body { -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="grid">${labels}</div>
</body>
</html>`
  openPrintWindow(html, "ملصقات باركود")
}

/* ───────────────────────── helpers ───────────────────────── */

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function fmtNum(v: number): string {
  return new Intl.NumberFormat("ar-KW-u-nu-latn", { maximumFractionDigits: 3 }).format(v || 0)
}

function paymentLabel(m: string): string {
  return m === "CASH" ? "نقدي" : m === "CARD" ? "بطاقة" : m === "TRANSFER" ? "تحويل" : m
}

/* ───────────────────────── 4. Exchange Receipt (80mm) ──────────────── */

/**
 * Print a thermal 80mm receipt for an exchange transaction.
 *
 * Returned items render with "-" prefix in red; new items with "+" prefix in
 * green. The net settlement line shows "الصافي المستحق" when the customer pays
 * the difference, or "الصافي المسترد" when the store refunds the customer.
 */
export function printExchangeReceipt(exchange: ExchangeSale) {
  const store = getStore()
  const dateStr = new Intl.DateTimeFormat("ar-KW-u-nu-latn", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(exchange.createdAt))

  const itemsRows = exchange.lines
    .map((ln) => {
      const sign = ln.quantity < 0 ? "-" : "+"
      const cls = ln.quantity < 0 ? "return" : "new"
      const qtyStr = `${sign}${Math.abs(ln.quantity)}`
      const totalStr = `${ln.lineTotal < 0 ? "-" : "+"}${fmtNum(Math.abs(ln.lineTotal))}`
      return `
      <tr>
        <td class="name ${cls}">${escapeHtml(ln.productName)}</td>
        <td class="qty ${cls}">${qtyStr}</td>
        <td class="price">${fmtNum(ln.unitPrice)}</td>
        <td class="total ${cls}">${totalStr}</td>
      </tr>`
    })
    .join("")

  // Net settlement label depends on the sign of the net amount.
  const isCollect = exchange.netAmount > 0
  const isRefund = exchange.netAmount < 0
  const isEven = !isCollect && !isRefund
  const netLabel = isCollect ? "الصافي المستحق" : isRefund ? "الصافي المسترد" : "تبديل متعادل"
  const netSign = isCollect ? "+" : isRefund ? "-" : ""

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<title>فاتورة تبديل ${exchange.exchangeNo}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  @page { size: 80mm auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 80mm; max-width: 80mm; }
  body { font-family: "Tajawal", "Cairo", sans-serif; padding: 3mm 2mm; font-size: 10px; color: #000; line-height: 1.4; }
  .store { text-align: center; margin-bottom: 3mm; }
  .store h1 { font-size: 15px; font-weight: 700; }
  .store p { font-size: 9px; color: #333; margin-top: 1px; }
  .title { text-align: center; font-size: 12px; font-weight: 700; margin-bottom: 2mm; padding: 1mm; background: #f0fdf4; border-radius: 2px; }
  .sep { border-top: 1px dashed #000; margin: 2.5mm 0; }
  .info { font-size: 9.5px; line-height: 1.7; }
  .info div { display: flex; justify-content: space-between; gap: 4px; }
  .info .val { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin: 1.5mm 0; }
  th { font-size: 9px; text-align: right; border-bottom: 1px solid #000; padding: 1mm 0; font-weight: 700; }
  th.qty, th.price, th.total { text-align: center; }
  td { font-size: 9.5px; padding: 0.8mm 0; vertical-align: top; }
  td.qty, td.price, td.total { text-align: center; white-space: nowrap; }
  td.name { width: 45%; padding-left: 1mm; }
  td.return { color: #dc2626; }
  td.new { color: #16a34a; }
  .totals { margin-top: 1.5mm; }
  .totals div { display: flex; justify-content: space-between; font-size: 10px; padding: 0.4mm 0; }
  .totals .grand { font-size: 13px; font-weight: 700; border-top: 2px solid #000; padding-top: 1mm; margin-top: 1mm; }
  .grand.collect { color: #16a34a; }
  .grand.refund { color: #dc2626; }
  .footer { text-align: center; margin-top: 3mm; font-size: 9px; }
  .barcode { text-align: center; font-family: "Libre Barcode 39", "Courier New", monospace; font-size: 36px; line-height: 1; margin-top: 2mm; letter-spacing: 0; }
  .barcode-code { text-align: center; font-family: "Courier New", monospace; font-size: 8px; letter-spacing: 1px; margin-top: 1mm; }
  @media print {
    body { width: 80mm; max-width: 80mm; padding: 3mm 2mm; }
    @page { size: 80mm auto; margin: 0; }
  }
</style>
</head>
<body>
  <div class="store">
    ${store.logo ? `<img src="${store.logo}" alt="logo" style="max-width:30mm;max-height:20mm;object-fit:contain;margin:0 auto 1mm;display:block" />` : ""}
    <h1>${escapeHtml(store.name)}</h1>
    ${store.address ? `<p>${escapeHtml(store.address)}</p>` : ""}
    ${store.phone ? `<p>هاتف: ${escapeHtml(store.phone)}</p>` : ""}
  </div>
  <div class="title">فاتورة تبديل</div>
  <div class="sep"></div>
  <div class="info">
    <div><span>رقم التبديل:</span><span class="val">${exchange.exchangeNo}</span></div>
    <div><span>التاريخ:</span><span class="val">${dateStr}</span></div>
    ${exchange.customerName ? `<div><span>العميل:</span><span class="val">${escapeHtml(exchange.customerName)}</span></div>` : ""}
    ${exchange.customerPhone ? `<div><span>هاتف:</span><span class="val" dir="ltr">${escapeHtml(exchange.customerPhone)}</span></div>` : ""}
    <div><span>طريقة التسوية:</span><span class="val">${paymentLabel(exchange.paymentMethod)}</span></div>
    <div><span>عدد الأصناف:</span><span class="val">${exchange.itemCount}</span></div>
  </div>
  <div class="sep"></div>
  <table>
    <thead>
      <tr><th>الصنف</th><th class="qty">كمية</th><th class="price">سعر</th><th class="total">الإجمالي</th></tr>
    </thead>
    <tbody>${itemsRows}</tbody>
  </table>
  <div class="sep"></div>
  <div class="totals">
    <div class="grand ${isCollect ? "collect" : isRefund ? "refund" : ""}">
      <span>${netLabel}</span>
      <span>${isEven ? fmtNum(0) : `${netSign}${fmtNum(Math.abs(exchange.netAmount))}`}</span>
    </div>
  </div>
  ${exchange.note ? `<div class="sep"></div><div class="info"><div><span>ملاحظة:</span><span class="val">${escapeHtml(exchange.note)}</span></div></div>` : ""}
  <div class="footer">
    <p>شكراً لتعاملكم معنا 🌿</p>
  </div>
  <div class="sep"></div>
  <div class="barcode">*${exchange.exchangeNo}*</div>
  <div class="barcode-code">${exchange.exchangeNo}</div>
</body>
</html>`
  openPrintWindow(html, `فاتورة تبديل ${exchange.exchangeNo}`, 360, 640)
}

/* ───────────────────────── 5. Report/Table Printer ────────────────── */

/**
 * Print only the tables from a page — opens a clean print window with
 * just the report title + all <table> elements found on the page.
 *
 * This avoids printing the full page chrome (sidebar, topbar, filters,
 * buttons, cards) and focuses on the actual data tables.
 *
 * Usage:
 *   <Button onClick={() => printReportOnly("تقرير المبيعات")}>
 */
export function printReportOnly(title: string, subtitle?: string) {
  // Collect all visible tables on the page
  const tables = Array.from(document.querySelectorAll("table"))
    .filter((t) => {
      // Skip tables inside print:hidden elements
      const parent = t.closest(".print\\:hidden, [data-print='hidden']")
      return !parent
    })
    .map((t) => t.outerHTML)

  if (tables.length === 0) {
    alert("لا توجد جداول للطباعة")
    return
  }

  const dateStr = new Intl.DateTimeFormat("ar-KW-u-nu-latn", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date())

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 12mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Tajawal", "Cairo", sans-serif; color: #1a1a1a; font-size: 11px; }
  .report-header { text-align: center; margin-bottom: 6mm; border-bottom: 2px solid #10b981; padding-bottom: 3mm; }
  .report-header h1 { font-size: 20px; color: #10b981; }
  .report-header p { font-size: 11px; color: #666; margin-top: 2px; }
  .report-date { font-size: 10px; color: #999; text-align: center; margin-bottom: 4mm; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 6mm; }
  thead th { background: #f0fdf4; color: #065f46; font-size: 10px; padding: 2mm; border-bottom: 2px solid #10b981; text-align: start; }
  thead th:nth-child(n+2) { text-align: center; }
  tbody td { padding: 1.5mm 2mm; border-bottom: 1px solid #e5e7eb; font-size: 10px; }
  tbody td:nth-child(n+2) { text-align: center; }
  .report-footer { margin-top: 8mm; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #e5e7eb; padding-top: 3mm; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="report-header">
    <h1>${escapeHtml(title)}</h1>
    ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
  </div>
  <p class="report-date">تاريخ الطباعة: ${dateStr}</p>
  ${tables.join("\n")}
  <div class="report-footer">
    <p>تم إنشاء هذا التقرير إلكترونيًا — ${dateStr}</p>
  </div>
</body>
</html>`
  openPrintWindow(html, title)
}
