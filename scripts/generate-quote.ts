/**
 * KWPOS — Price Quote (عرض سعر) PDF generator
 * Generates a professional Arabic RTL quote document for clients.
 */
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { writeFileSync } from "node:fs"

// ── Colors (Terracotta theme matching the presentation) ──
const PRIMARY = [184, 80, 66]     // #B85042 terracotta
const DARK = [26, 20, 16]         // #1A1410 deep espresso
const GOLD = [201, 169, 97]       // #C9A961 warm gold
const MUTED = [138, 126, 118]     // #8A7E76
const LIGHT = [250, 247, 242]     // #FAF7F2 warm cream
const WHITE = [255, 255, 255]

// ── Helper: set fill color ──
function setFill(doc, rgb: number[]) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2])
}
function setText(doc, rgb: number[]) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2])
}
function setDraw(doc, rgb: number[]) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2])
}

// ── Quote data ──
const quote = {
  number: "Q-2026-001",
  date: "26 أغسطس 2026",
  validUntil: "26 سبتمبر 2026 (30 يوماً)",
  client: {
    name: "السيد / شركة ......................................",
    contact: ".......................................................",
    phone: ".......................................................",
    email: ".......................................................",
  },
  vendor: {
    name: "KWPOS",
    tagline: "نظام إدارة نقاط البيع والمخازن",
    email: "info@kwpos.kw",
    website: "kwpos.vercel.app",
    phone: "+965 0000 0000",
  },
}

// ── Create PDF (A4 portrait) ──
const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })

// Enable RTL for Arabic text
// jsPDF doesn't have native RTL support, but we manually right-align Arabic text

const PW = 210 // page width A4
const PH = 297 // page height A4
const M = 15   // margin

// ════════════════════════════════════════════════════════════════
// HEADER (dark band)
// ════════════════════════════════════════════════════════════════
setFill(doc, DARK)
doc.rect(0, 0, PW, 40, "F")

// Gold accent line
setFill(doc, GOLD)
doc.rect(0, 40, PW, 1.5, "F")

// Vendor name (right-aligned)
setText(doc, GOLD)
doc.setFontSize(28)
doc.setFont("helvetica", "bold")
doc.text("KWPOS", PW - M, 18, { align: "right" })

// Tagline
setText(doc, WHITE)
doc.setFontSize(11)
doc.setFont("helvetica", "normal")
doc.text("نظام إدارة نقاط البيع والمخازن", PW - M, 26, { align: "right" })

// Vendor contact (left side)
setText(doc, WHITE)
doc.setFontSize(9)
doc.text(`${quote.vendor.email}`, M, 18, { align: "left" })
doc.text(`${quote.vendor.website}`, M, 23, { align: "left" })
doc.text(`${quote.vendor.phone}`, M, 28, { align: "left" })

// ════════════════════════════════════════════════════════════════
// QUOTE TITLE + META
// ════════════════════════════════════════════════════════════════
setText(doc, DARK)
doc.setFontSize(20)
doc.setFont("helvetica", "bold")
doc.text("عرض سعر", PW - M, 55, { align: "right" })

setText(doc, MUTED)
doc.setFontSize(10)
doc.setFont("helvetica", "normal")
doc.text(`رقم العرض: ${quote.number}`, PW - M, 62, { align: "right" })
doc.text(`التاريخ: ${quote.date}`, PW - M, 67, { align: "right" })
doc.text(`صالح حتى: ${quote.validUntil}`, PW - M, 72, { align: "right" })

// ════════════════════════════════════════════════════════════════
// CLIENT BOX
// ════════════════════════════════════════════════════════════════
let y = 82

setFill(doc, LIGHT)
doc.roundedRect(M, y, PW - 2 * M, 28, 2, 2, "F")

setText(doc, PRIMARY)
doc.setFontSize(11)
doc.setFont("helvetica", "bold")
doc.text("العميل:", PW - M - 5, y + 6, { align: "right" })

setText(doc, DARK)
doc.setFont("helvetica", "normal")
doc.setFontSize(10)
doc.text(quote.client.name, PW - M - 5, y + 6, { align: "right" })
doc.text(quote.client.contact, PW - M - 5, y + 13, { align: "right" })
doc.text(`الهاتف: ${quote.client.phone}`, PW - M - 5, y + 20, { align: "right" })
doc.text(`البريد: ${quote.client.email}`, PW - M - 5, y + 25, { align: "right" })

y += 36

// ════════════════════════════════════════════════════════════════
// PACKAGES TABLE
// ════════════════════════════════════════════════════════════════
setText(doc, DARK)
doc.setFontSize(14)
doc.setFont("helvetica", "bold")
doc.text("باقات الاشتراك الشهري", PW - M, y, { align: "right" })
y += 5

// Table using autoTable
const head = [["الباقة", "الوصف", "السعر الشهري", "السعر السنوي"]]
const body = [
  ["البداية", "محل صغير — حتى 100 منتج، مخزن واحد، كاشير واحد", "15 د.ك", "150 د.ك"],
  ["النمو ⭐", "محل متوسط — منتجات غير محدودة، 3 مخازن، 5 مستخدمين + محاسبة", "35 د.ك", "350 د.ك"],
  ["المؤسسة", "محل كبير/فروع — مخازن ومستخدمون غير محدودين + Shopify", "75 د.ك", "750 د.ك"],
]

;autoTable(doc, {
  head: [head[0]],
  body,
  startY: y,
  margin: { left: M, right: M },
  tableWidth: PW - 2 * M,
  styles: {
    font: "helvetica",
    fontSize: 10,
    cellPadding: 4,
    textColor: DARK,
    lineColor: [231, 232, 209],
    lineWidth: 0.1,
  },
  headStyles: {
    fillColor: PRIMARY,
    textColor: WHITE,
    fontStyle: "bold",
    halign: "center",
  },
  bodyStyles: {
    halign: "right",
  },
  alternateRowStyles: {
    fillColor: LIGHT,
  },
  columnStyles: {
    0: { fontStyle: "bold", cellWidth: 25, textColor: PRIMARY },
    1: { cellWidth: 85 },
    2: { cellWidth: 30, halign: "center", fontStyle: "bold" },
    3: { cellWidth: 30, halign: "center", fontStyle: "bold", textColor: GOLD },
  },
})

y = (doc as any).lastAutoTable.finalY + 8

// ════════════════════════════════════════════════════════════════
// ONE-TIME SETUP
// ════════════════════════════════════════════════════════════════
setText(doc, DARK)
doc.setFontSize(14)
doc.setFont("helvetica", "bold")
doc.text("إعداد لمرة واحدة (اختياري)", PW - M, y, { align: "right" })
y += 5

const setupHead = [["الخدمة", "السعر"]]
const setupBody = [
  ["إنشاء الحساب + ربط Supabase + استيراد المنتجات + تدريب أساسي (ساعة)", "مجاني"],
  ["تخصيص شعار الشركة + قالب الفاتورة", "25 د.ك"],
  ["ترحيل بيانات من نظام سابق", "75 د.ك"],
  ["تدريب مخصص للموظفين (ساعتان)", "50 د.ك"],
];

autoTable(doc, {
  head: [setupHead[0]],
  body: setupBody,
  startY: y,
  margin: { left: M, right: M },
  tableWidth: PW - 2 * M,
  styles: {
    font: "helvetica",
    fontSize: 10,
    cellPadding: 4,
    textColor: DARK,
    lineColor: [231, 232, 209],
    lineWidth: 0.1,
  },
  headStyles: {
    fillColor: DARK,
    textColor: WHITE,
    fontStyle: "bold",
    halign: "center",
  },
  bodyStyles: { halign: "right" },
  columnStyles: {
    0: { cellWidth: 140 },
    1: { cellWidth: 30, halign: "center", fontStyle: "bold", textColor: PRIMARY },
  },
})

y = (doc as any).lastAutoTable.finalY + 8

// ════════════════════════════════════════════════════════════════
// HARDWARE (optional)
// ════════════════════════════════════════════════════════════════
setText(doc, DARK)
doc.setFontSize(14)
doc.setFont("helvetica", "bold")
doc.text("أجهزة (اختياري)", PW - M, y, { align: "right" })
y += 5

const hwHead = [["الجهاز", "السعر"]]
const hwBody = [
  ["طابعة إيصالات حرارية 80mm", "45 د.ك"],
  ["قارئ باركود USB", "15 د.ك"],
  ["درج نقود آلي", "35 د.ك"],
  ["جهاز لوحي Android للكاشير", "120 د.ك"],
  ["شاشة لمس عميلة", "180 د.ك"],
  ["حزمة كاملة (الكل معاً)", "350 د.ك"],
];

autoTable(doc, {
  head: [hwHead[0]],
  body: hwBody,
  startY: y,
  margin: { left: M, right: M },
  tableWidth: PW - 2 * M,
  styles: {
    font: "helvetica",
    fontSize: 10,
    cellPadding: 4,
    textColor: DARK,
    lineColor: [231, 232, 209],
    lineWidth: 0.1,
  },
  headStyles: {
    fillColor: DARK,
    textColor: WHITE,
    fontStyle: "bold",
    halign: "center",
  },
  bodyStyles: { halign: "right" },
  columnStyles: {
    0: { cellWidth: 140 },
    1: { cellWidth: 30, halign: "center", fontStyle: "bold", textColor: PRIMARY },
  },
})

y = (doc as any).lastAutoTable.finalY + 10

// ════════════════════════════════════════════════════════════════
// ANNUAL DISCOUNT BANNER
// ════════════════════════════════════════════════════════════════
setFill(doc, PRIMARY)
doc.roundedRect(M, y, PW - 2 * M, 18, 2, 2, "F")

setText(doc, WHITE)
doc.setFontSize(13)
doc.setFont("helvetica", "bold")
doc.text("🎁 خصم الدفع السنوي — وفّر شهرين مجاناً (≈17% خصم)", PW - M - 5, y + 8, { align: "right" })
doc.setFontSize(10)
doc.setFont("helvetica", "normal")
doc.text("ادفع سنوياً بدل شهرياً واحصل على 12 شهر بسعر 10 أشهر", PW - M - 5, y + 14, { align: "right" })

y += 26

// ════════════════════════════════════════════════════════════════
// WHAT'S INCLUDED
// ════════════════════════════════════════════════════════════════
setText(doc, DARK)
doc.setFontSize(13)
doc.setFont("helvetica", "bold")
doc.text("ما الذي تشمله جميع الباقات؟", PW - M, y, { align: "right" })
y += 6

const included = [
  "استضافة سحابية على Vercel (سرعة عالية + أمان)",
  "قاعدة بيانات Supabase PostgreSQL (نسخ احتياطي يومي تلقائي)",
  "تحديثات مجانية مدى الحياة (ميزات جديدة + إصلاحات أمنية)",
  "دعم فني عبر البريد الإلكتروني (وقت الاستجابة: 24 ساعة)",
  "إلغاء الاشتراك في أي وقت بدون رسوم",
  "تدريب أساسي مجاني (ساعة واحدة) عند البدء",
  "تصدير كامل لبياناتك في أي وقت (Excel + JSON)",
]

included.forEach((item) => {
  setText(doc, GOLD)
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("✓", PW - M - 5, y, { align: "right" })
  setText(doc, DARK)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text(item, PW - M - 11, y, { align: "right" })
  y += 6
})

y += 6

// ════════════════════════════════════════════════════════════════
// TERMS
// ════════════════════════════════════════════════════════════════
setFill(doc, LIGHT)
doc.roundedRect(M, y, PW - 2 * M, 28, 2, 2, "F")

setText(doc, PRIMARY)
doc.setFontSize(11)
doc.setFont("helvetica", "bold")
doc.text("الشروط والأحكام", PW - M - 5, y + 6, { align: "right" })

setText(doc, DARK)
doc.setFont("helvetica", "normal")
doc.setFontSize(9)
const terms = [
  "هذا العرض ساري لمدة 30 يوماً من تاريخ الإصدار.",
  "الأسعار بالدينار الكويتي (د.ك) ولا تشمل أي ضرائب مستقبلية.",
  "الاشتراك الشهري يُدفع مقدماً عبر تحويل بنكي أو K-Net.",
  "الاشتراك السنوي يُدفع مقدماً ويحصل العميل على خصم 17%.",
  "الأجهزة مشمولة بضمان سنة واحدة من تاريخ الشراء.",
  "خدمة الترحيل والتدريب المخصص تتطلب دفع 50% مقدماً.",
]
terms.forEach((t, i) => {
  doc.text(`• ${t}`, PW - M - 5, y + 12 + i * 2.8, { align: "right" })
})

y += 36

// ════════════════════════════════════════════════════════════════
// SIGNATURE AREA
// ════════════════════════════════════════════════════════════════
// Vendor signature (right side)
setText(doc, MUTED)
doc.setFontSize(9)
doc.text("توقيع المورّد:", PW - M - 5, y, { align: "right" })
setDraw(doc, MUTED)
doc.setLineWidth(0.2)
doc.line(PW - M - 50, y + 8, PW - M, y + 8)
doc.text("KWPOS — نظام إدارة نقاط البيع", PW - M - 5, y + 13, { align: "right" })

// Client signature (left side)
setText(doc, MUTED)
doc.text("توقيع العميل:", M + 50, y, { align: "left" })
doc.line(M, y + 8, M + 50, y + 8)
doc.text("الاسم: ............................", M, y + 13, { align: "left" })

// ════════════════════════════════════════════════════════════════
// FOOTER (dark band)
// ════════════════════════════════════════════════════════════════
setFill(doc, DARK)
doc.rect(0, PH - 15, PW, 15, "F")

setText(doc, WHITE)
doc.setFontSize(8)
doc.setFont("helvetica", "normal")
doc.text("KWPOS — نظام إدارة نقاط البيع والمخازن  |  kwpos.vercel.app  |  info@kwpos.kw", PW / 2, PH - 7.5, { align: "center" })

// ── Save ──
const outputPath = "/home/z/my-project/KWPOS_Quote.pdf"
writeFileSync(outputPath, doc.output("arraybuffer"))
console.log(`✓ Generated: ${outputPath}`)
console.log(`  Quote #: ${quote.number}`)
console.log(`  Date: ${quote.date}`)
console.log(`  Valid until: ${quote.validUntil}`)
