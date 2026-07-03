"use client"

import * as React from "react"
import type { Sale } from "@/lib/types"

/**
 * Print helpers — opens a dedicated print window with the right CSS @page
 * size for each print kind (thermal receipt 80mm, A4 invoice, barcode labels).
 */

export interface PrintStore {
  name: string
  address?: string
  phone?: string
  vatNo?: string
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

function openPrintWindow(html: string, title: string) {
  const w = window.open("", "_blank", "width=900,height=700")
  if (!w) {
    alert("يرجى السماح بالنوافذ المنبثقة للطباعة")
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
  w.document.title = title
  // give the browser a tick to lay out before printing
  setTimeout(() => {
    w.focus()
    w.print()
  }, 400)
}

/* ───────────────────────── 1. Thermal Receipt (80mm) ───────────────────────── */

export function printThermalReceipt(sale: Sale) {
  const store = getStore()
  const date = new Date(sale.createdAt).toLocaleString("ar")
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
<style>
  @page { size: 80mm auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Tajawal", "Cairo", sans-serif; width: 80mm; padding: 4mm 3mm; font-size: 11px; color: #000; }
  .store { text-align: center; margin-bottom: 4mm; }
  .store h1 { font-size: 16px; font-weight: 700; }
  .store p { font-size: 10px; color: #333; margin-top: 1px; }
  .sep { border-top: 1px dashed #000; margin: 3mm 0; }
  .info { font-size: 10px; line-height: 1.6; }
  .info div { display: flex; justify-content: space-between; }
  table { width: 100%; border-collapse: collapse; margin: 2mm 0; }
  th { font-size: 10px; text-align: right; border-bottom: 1px solid #000; padding: 1mm 0; }
  th.qty, th.price, th.total { text-align: center; }
  td { font-size: 10px; padding: 1mm 0; vertical-align: top; }
  td.qty, td.price, td.total { text-align: center; }
  td.name { width: 45%; }
  .totals { margin-top: 2mm; }
  .totals div { display: flex; justify-content: space-between; font-size: 11px; padding: 0.5mm 0; }
  .totals .grand { font-size: 14px; font-weight: 700; border-top: 2px solid #000; padding-top: 1mm; margin-top: 1mm; }
  .footer { text-align: center; margin-top: 4mm; font-size: 10px; }
  .barcode { text-align: center; font-family: "Libre Barcode 39", monospace; font-size: 28px; letter-spacing: 2px; margin-top: 2mm; }
  @media print { body { width: 80mm; } }
</style>
</head>
<body>
  <div class="store">
    <h1>${escapeHtml(store.name)}</h1>
    ${store.address ? `<p>${escapeHtml(store.address)}</p>` : ""}
    ${store.phone ? `<p>هاتف: ${escapeHtml(store.phone)}</p>` : ""}
  </div>
  <div class="sep"></div>
  <div class="info">
    <div><span>رقم الفاتورة:</span><strong>${sale.invoiceNo}</strong></div>
    <div><span>التاريخ:</span><span>${date}</span></div>
    <div><span>العميل:</span><span>${escapeHtml(sale.customerName || "عميل نقدي")}</span></div>
    <div><span>الدفع:</span><span>${paymentLabel(sale.paymentMethod)}</span></div>
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
    <div class="grand"><span>الإجمالي</span><span>${fmtNum(sale.total)}</span></div>
  </div>
  <div class="footer">
    <p>شكراً لزيارتكم 🌿</div>
    <div class="barcode">*${sale.invoiceNo}*</div>
  </div>
</body>
</html>`
  openPrintWindow(html, `إيصال ${sale.invoiceNo}`)
}

/* ───────────────────────── 2. A4 Invoice ───────────────────────── */

export function printA4Invoice(sale: Sale) {
  const store = getStore()
  const date = new Date(sale.createdAt).toLocaleDateString("ar")
  const time = new Date(sale.createdAt).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })
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
<style>
  @page { size: A4; margin: 14mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Tajawal", "Cairo", sans-serif; color: #1a1a1a; font-size: 12px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #10b981; padding-bottom: 8mm; margin-bottom: 6mm; }
  .store-info h1 { font-size: 22px; color: #10b981; }
  .store-info p { font-size: 11px; color: #555; margin-top: 2px; }
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
      <h1>${escapeHtml(store.name)}</h1>
      ${store.address ? `<p>${escapeHtml(store.address)}</p>` : ""}
      ${store.phone ? `<p>هاتف: ${escapeHtml(store.phone)}</p>` : ""}
      ${store.vatNo ? `<p>رقم ضريبي: ${escapeHtml(store.vatNo)}</p>` : ""}
    </div>
    <div class="invoice-meta">
      <h2>فاتورة مبيعات</h2>
      <p>رقم الفاتورة</p>
      <p class="no">${sale.invoiceNo}</p>
      <p style="margin-top:2mm">التاريخ: ${date} - ${time}</p>
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
  return new Intl.NumberFormat("ar", { maximumFractionDigits: 3 }).format(v || 0)
}

function paymentLabel(m: string): string {
  return m === "CASH" ? "نقدي" : m === "CARD" ? "بطاقة" : m === "TRANSFER" ? "تحويل" : m
}
