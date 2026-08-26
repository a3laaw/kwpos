// KWPOS Presentation with Pricing — Arabic RTL
// Style: Warm Terracotta (suits perfume/retail theme)
const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.3 × 7.5
pres.author = "KWPOS";
pres.title = "KWPOS — نظام نقاط البيع والمخازن";
pres.rtlMode = true;

// ── Design tokens ──
const PAL = {
  bgDark: "1A1410",       // deep espresso
  bgLight: "FAF7F2",      // warm cream
  primary: "B85042",      // terracotta
  secondary: "E7E8D1",    // sand
  accent: "A7BEAE",       // sage
  textDark: "2F2A26",
  textMuted: "8A7E76",
  white: "FFFFFF",
  gold: "C9A961",         // warm gold accent
};

const FONT_H = "Calibri"; // body (Latin-safe, renders Arabic via fallback)
const FONT_B = "Calibri";

// ── Helpers ──
const SHOTS = "/home/z/my-project/ppt-output/real-screenshots";

function addBg(slide, color) {
  slide.background = { color };
}

function titleBox(slide, text, opts = {}) {
  slide.addText(text, {
    x: opts.x ?? 0.6,
    y: opts.y ?? 0.4,
    w: opts.w ?? 12,
    h: opts.h ?? 0.8,
    fontSize: opts.fontSize ?? 32,
    fontFace: FONT_H,
    color: opts.color ?? PAL.white,
    bold: true,
    align: opts.align ?? "left",
    valign: "middle",
    rtlMode: true,
  });
}

function bodyText(slide, text, opts = {}) {
  slide.addText(text, {
    x: opts.x ?? 0.6,
    y: opts.y ?? 1.5,
    w: opts.w ?? 12,
    h: opts.h ?? 0.5,
    fontSize: opts.fontSize ?? 14,
    fontFace: FONT_B,
    color: opts.color ?? PAL.textDark,
    bold: opts.bold ?? false,
    align: opts.align ?? "left",
    valign: opts.valign ?? "top",
    rtlMode: true,
    margin: 0,
  });
}

function card(slide, x, y, w, h, fill, shadow = true) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h,
    fill: { color: fill },
    line: { color: fill, width: 0 },
    rectRadius: 0.08,
    shadow: shadow ? { type: "outer", color: "000000", blur: 8, offset: 2, angle: 45, opacity: 0.12 } : undefined,
  });
}

// ════════════════════════════════════════════════════════════════
// S1 — Title slide (dark background)
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s, PAL.bgDark);

  // Top accent line
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 13.3, h: 0.08, fill: { color: PAL.gold }, line: { color: PAL.gold, width: 0 },
  });

  // Brand badge
  card(s, 0.6, 0.6, 2.2, 0.6, PAL.primary, false);
  s.addText("KWPOS", {
    x: 0.6, y: 0.6, w: 2.2, h: 0.6,
    fontSize: 20, fontFace: FONT_H, color: PAL.white, bold: true, align: "center", valign: "middle",
  });

  // Main title
  s.addText("نظام نقاط البيع والمخازن", {
    x: 0.6, y: 2.2, w: 12, h: 1.1,
    fontSize: 48, fontFace: FONT_H, color: PAL.white, bold: true, align: "left", valign: "middle",
    rtlMode: true,
  });

  // Subtitle
  s.addText("حلٌّ متكامل لعطور وتجزئة الكويت", {
    x: 0.6, y: 3.4, w: 12, h: 0.7,
    fontSize: 24, fontFace: FONT_H, color: PAL.gold, bold: false, align: "left", valign: "middle",
    rtlMode: true,
  });

  // Tagline
  s.addText("نقاط بيع • مخازن متعددة • محاسبة ذات قيد مزدوج • تقارير ذكية • 7 أدوار وظيفية", {
    x: 0.6, y: 4.4, w: 12, h: 0.5,
    fontSize: 16, fontFace: FONT_B, color: PAL.accent, align: "left", valign: "middle",
    rtlMode: true,
  });

  // Footer
  s.addText("عرض تنفيذي مع التسعير  •  2026", {
    x: 0.6, y: 6.8, w: 12, h: 0.4,
    fontSize: 12, fontFace: FONT_B, color: PAL.textMuted, align: "left", valign: "middle",
    rtlMode: true,
  });
}

// ════════════════════════════════════════════════════════════════
// S2 — The Problem (light bg)
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s, PAL.bgLight);
  titleBox(s, "التحديات التي تواجه تجزئة العطور", { color: PAL.textDark });

  const problems = [
    { icon: "📉", title: "مبيعات مفقودة", desc: "بطء الكاشير وطوابير العملاء → فقدان 5-12% من الإيراد" },
    { icon: "📦", title: "مخزون غير دقيق", desc: "بيع بضاعة غير موجودة، نفاد غير متوقع بين الفروع" },
    { icon: "🧾", title: "فواتير ضائعة", desc: "فواتير مكررة ورقياً، نزاعات مع العملاء" },
    { icon: "🔀", title: "تعدد الفروع", desc: "لا مزامنة فورية، ذمم غير متوازنة، قرارات خاطئة" },
    { icon: "📊", title: "نقص تقارير", desc: "عمى إداري، شراء غير مدروس، رأس مال مجمد" },
    { icon: "💰", title: "التخليص الجمركي", desc: "تكاليف استيراد غير محتسبة → هامش ربح وهمي" },
  ];

  const cw = 3.85, ch = 1.7, gap = 0.25;
  const startX = (13.3 - (3 * cw + 2 * gap)) / 2;
  const startY = 1.6;

  problems.forEach((p, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = startX + col * (cw + gap);
    const y = startY + row * (ch + gap);

    card(s, x, y, cw, ch, PAL.white);
    s.addText(p.icon, { x: x + 0.2, y: y + 0.15, w: 0.6, h: 0.6, fontSize: 28, align: "center", valign: "middle" });
    s.addText(p.title, { x: x + 0.85, y: y + 0.2, w: cw - 1, h: 0.45, fontSize: 16, fontFace: FONT_H, color: PAL.primary, bold: true, align: "left", valign: "middle", rtlMode: true });
    s.addText(p.desc, { x: x + 0.2, y: y + 0.85, w: cw - 0.4, h: 0.75, fontSize: 12, fontFace: FONT_B, color: PAL.textDark, align: "left", valign: "top", rtlMode: true });
  });
}

// ════════════════════════════════════════════════════════════════
// S3 — The Solution (dark)
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s, PAL.bgDark);
  titleBox(s, "KWPOS — الحل المتكامل", { color: PAL.white });

  s.addText("منصة واحدة مدمجة تغطي رحلة المنتج كاملة: من الشراء إلى التخليص إلى البيع إلى المحاسبة", {
    x: 0.6, y: 1.4, w: 12, h: 0.6, fontSize: 18, fontFace: FONT_H, color: PAL.gold, align: "left", valign: "middle", rtlMode: true,
  });

  const modules = [
    { n: "01", t: "نقاط البيع", d: "وضع قياسي + سريع + باركود عالمي" },
    { n: "02", t: "الفواتير", d: "مرتجع جزئي + إلغاء + طباعة حرارية" },
    { n: "03", t: "المخزون", d: "مخازن متعددة + 9 أنواع حركة" },
    { n: "04", t: "المشتريات", d: "أوامر شراء + ملاحق جمركية" },
    { n: "05", t: "التركيبات", d: "مصنع صغير + إنتاج دفعات" },
    { n: "06", t: "المحاسبة", d: "قيد مزدوج + ميزان + قائمة دخل" },
    { n: "07", t: "الورديات", d: "فتح/إغلاق + فروقات + اعتماد" },
    { n: "08", t: "التقارير", d: "10 تقارير + تصدير Excel" },
  ];

  const cw = 2.9, ch = 1.5, gap = 0.2;
  const startX = (13.3 - (4 * cw + 3 * gap)) / 2;
  const startY = 2.3;

  modules.forEach((m, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = startX + col * (cw + gap);
    const y = startY + row * (ch + gap);

    card(s, x, y, cw, ch, "2A2018", false);
    s.addText(m.n, { x: x + 0.2, y: y + 0.15, w: 1, h: 0.5, fontSize: 22, fontFace: FONT_H, color: PAL.gold, bold: true, align: "left", valign: "middle" });
    s.addText(m.t, { x: x + 0.2, y: y + 0.65, w: cw - 0.4, h: 0.4, fontSize: 16, fontFace: FONT_H, color: PAL.white, bold: true, align: "left", valign: "middle", rtlMode: true });
    s.addText(m.d, { x: x + 0.2, y: y + 1.05, w: cw - 0.4, h: 0.4, fontSize: 11, fontFace: FONT_B, color: PAL.accent, align: "left", valign: "top", rtlMode: true });
  });
}

// ════════════════════════════════════════════════════════════════
// S3.5 — Real System Preview (login screen)
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s, PAL.bgDark);
  titleBox(s, "نظرة على النظام الفعلي", { color: PAL.white });
  s.addText("شاشة الدخول الحقيقية من النظام المنشور", {
    x: 0.6, y: 1.3, w: 12, h: 0.4, fontSize: 15, fontFace: FONT_H, color: PAL.gold, align: "left", valign: "middle", rtlMode: true,
  });

  // Real screenshot from Vercel deployment
  s.addImage({
    path: `${SHOTS}/00-login.png`,
    x: 2.65, y: 1.95, w: 8, h: 4.5,
    sizing: { type: "contain", w: 8, h: 4.5 },
  });

  // Frame around the screenshot
  s.addShape(pres.shapes.RECTANGLE, {
    x: 2.6, y: 1.9, w: 8.1, h: 4.6,
    fill: { color: PAL.gold, transparency: 100 },
    line: { color: PAL.gold, width: 2 },
  });

  // URL badge
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 4.65, y: 6.6, w: 4, h: 0.45, fill: { color: PAL.primary }, line: { color: PAL.primary, width: 0 }, rectRadius: 0.06,
  });
  s.addText("🌐 kwpos.vercel.app", { x: 4.65, y: 6.6, w: 4, h: 0.45, fontSize: 13, fontFace: FONT_H, color: PAL.white, bold: true, align: "center", valign: "middle", rtlMode: true });
}

// ════════════════════════════════════════════════════════════════
// S4 — Seven Roles
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s, PAL.bgLight);
  titleBox(s, "الأدوار السبعة — صلاحيات دقيقة", { color: PAL.textDark });


  const roles = [
    { r: "OWNER", a: "المالك", p: "صلاحيات كاملة + لوحة المالك الحصرية", pages: "22 صفحة", c: PAL.primary },
    { r: "ADMIN", a: "مدير النظام", p: "إدارة كاملة + الإعدادات + المستخدمون", pages: "21 صفحة", c: "8B5A3C" },
    { r: "MANAGER", a: "المدير", p: "مبيعات + تقارير + ورديات + اعتمادات", pages: "11 صفحة", c: "A7BEAE" },
    { r: "ACCOUNTANT", a: "محاسب", p: "محاسبة + تقارير + موردين", pages: "7 صفحات", c: "C9A961" },
    { r: "WAREHOUSE", a: "أمين مخزن", p: "مخزون + مشتريات + تركيبات", pages: "7 صفحات", c: "6B7F6E" },
    { r: "SALES", a: "موظف مبيعات", p: "POS + فواتير + عملاء + تبديل", pages: "11 صفحة", c: "B89B7A" },
    { r: "CASHIER", a: "كاشير", p: "POS فقط + الورديات", pages: "3 صفحات", c: "9E7B5A" },
  ];

  // Table-style layout
  const startY = 1.7;
  const rowH = 0.62;
  const cols = [
    { x: 0.6, w: 1.8, label: "الدور" },
    { x: 2.5, w: 2.0, label: "الاسم العربي" },
    { x: 4.6, w: 6.0, label: "الصلاحيات" },
    { x: 10.7, w: 2.0, label: "الصفحات" },
  ];

  // Header row
  card(s, 0.5, startY - 0.5, 12.3, 0.5, PAL.primary, false);
  cols.forEach(c => {
    s.addText(c.label, { x: c.x, y: startY - 0.5, w: c.w, h: 0.5, fontSize: 13, fontFace: FONT_H, color: PAL.white, bold: true, align: "center", valign: "middle", rtlMode: true });
  });

  // Role rows
  roles.forEach((r, i) => {
    const y = startY + i * rowH;
    const bg = i % 2 === 0 ? PAL.white : PAL.secondary;
    card(s, 0.5, y, 12.3, rowH - 0.05, bg, false);

    s.addText(r.r, { x: cols[0].x, y, w: cols[0].w, h: rowH - 0.05, fontSize: 12, fontFace: FONT_H, color: r.c, bold: true, align: "center", valign: "middle" });
    s.addText(r.a, { x: cols[1].x, y, w: cols[1].w, h: rowH - 0.05, fontSize: 13, fontFace: FONT_H, color: PAL.textDark, bold: true, align: "center", valign: "middle", rtlMode: true });
    s.addText(r.p, { x: cols[2].x, y, w: cols[2].w, h: rowH - 0.05, fontSize: 12, fontFace: FONT_B, color: PAL.textDark, align: "center", valign: "middle", rtlMode: true });
    s.addText(r.pages, { x: cols[3].x, y, w: cols[3].w, h: rowH - 0.05, fontSize: 12, fontFace: FONT_B, color: PAL.textMuted, align: "center", valign: "middle", rtlMode: true });
  });
}

// ════════════════════════════════════════════════════════════════
// S5 — POS Features (dark)
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s, PAL.bgDark);
  titleBox(s, "نقاط البيع — سرعة + دقة", { color: PAL.white });

  const features = [
    { t: "الوضع القياسي", d: "شريط جانبي كامل + بحث + بطاقات منتجات + سلة كاملة + دفع متعدد", icon: "🛒" },
    { t: "الوضع السريع", d: "شاشة كاملة + باركود كبير + بطاقات كبيرة + أزرار دفع ضخمة", icon: "⚡" },
    { t: "قارئ باركود عالمي", d: "USB HID + كشف المسح السريع 5-15ms + focus دائم", icon: "📷" },
    { t: "ربط عميل بالهاتف", d: "بحث بالهاتف + نقاط ولاء + تاريخ المشتريات", icon: "👤" },
    { t: "فواتير معلّقة", d: "تعليق + استئناف + استبدال السلة + حذف", icon: "⏸️" },
    { t: "طباعة حرارية", d: "إيصال 80mm + فاتورة A4 + شعار الشركة", icon: "🖨️" },
  ];

  const cw = 3.85, ch = 1.5, gap = 0.25;
  const startX = (13.3 - (3 * cw + 2 * gap)) / 2;
  const startY = 1.7;

  features.forEach((f, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = startX + col * (cw + gap);
    const y = startY + row * (ch + gap);

    card(s, x, y, cw, ch, "2A2018", false);
    s.addText(f.icon, { x: x + 0.15, y: y + 0.15, w: 0.5, h: 0.5, fontSize: 24, align: "center", valign: "middle" });
    s.addText(f.t, { x: x + 0.7, y: y + 0.2, w: cw - 0.9, h: 0.45, fontSize: 15, fontFace: FONT_H, color: PAL.gold, bold: true, align: "left", valign: "middle", rtlMode: true });
    s.addText(f.d, { x: x + 0.2, y: y + 0.75, w: cw - 0.4, h: 0.7, fontSize: 11, fontFace: FONT_B, color: PAL.accent, align: "left", valign: "top", rtlMode: true });
  });

  // Shortcuts bar
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 6.5, w: 12.1, h: 0.7, fill: { color: PAL.primary }, line: { color: PAL.primary, width: 0 }, rectRadius: 0.06,
  });
  s.addText("اختصارات: F2 = دفع  •  Ctrl+Enter = تأكيد  •  Esc = تفريغ  •  Ctrl+K = بحث شامل", {
    x: 0.6, y: 6.5, w: 12.1, h: 0.7, fontSize: 14, fontFace: FONT_H, color: PAL.white, bold: true, align: "center", valign: "middle", rtlMode: true,
  });
}

// ════════════════════════════════════════════════════════════════
// S5.5 — POS Screen Preview
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s, PAL.bgDark);
  titleBox(s, "شاشة نقاط البيع — معاينة", { color: PAL.white });
  s.addText("الوضع القياسي: شريط جانبي + بحث + بطاقات منتجات + سلة كاملة + دفع", {
    x: 0.6, y: 1.3, w: 12, h: 0.4, fontSize: 14, fontFace: FONT_H, color: PAL.gold, align: "left", valign: "middle", rtlMode: true,
  });

  // POS screenshot
  s.addImage({
    path: `${SHOTS}/02-pos.png`,
    x: 0.6, y: 1.95, w: 12.1, h: 5.1,
  });

  // Frame
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.55, y: 1.9, w: 12.2, h: 5.2,
    fill: { color: PAL.gold, transparency: 100 },
    line: { color: PAL.gold, width: 2 },
  });
}

// ════════════════════════════════════════════════════════════════
// S6 — Inventory & Multi-warehouse
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s, PAL.bgLight);
  titleBox(s, "المخزون والفروع المتعددة", { color: PAL.textDark });

  // Left: features list
  const feats = [
    "مخازن متعددة بكميات مستقلة لكل منتج",
    "9 أنواع حركة مخزون (بيع/مرتجع/تبديل/شراء/...)",
    "خصم atomic يمنع race conditions في البيع المتزامن",
    "تحويلات بين المخازن (شحنة صادرة + واردة)",
    "جرد كامل + جرد أعمى (بدون رصيد دفتري)",
    "حذف ناعم + استعادة للمنتجات",
    "تقرير حركة المخزون لكل صنف",
    "تتبع التكلفة الفعلية مع رسملة الجمارك",
  ];

  feats.forEach((f, i) => {
    const y = 1.7 + i * 0.55;
    s.addShape(pres.shapes.OVAL, { x: 0.6, y: y + 0.08, w: 0.25, h: 0.25, fill: { color: PAL.primary }, line: { color: PAL.primary, width: 0 } });
    s.addText(f, { x: 1.0, y, w: 6, h: 0.5, fontSize: 13, fontFace: FONT_B, color: PAL.textDark, align: "left", valign: "middle", rtlMode: true });
  });

  // Right: movement types card
  card(s, 7.5, 1.7, 5.2, 4.5, PAL.white);
  s.addText("أنواع حركة المخزون", { x: 7.7, y: 1.9, w: 4.8, h: 0.5, fontSize: 17, fontFace: FONT_H, color: PAL.primary, bold: true, align: "center", valign: "middle", rtlMode: true });

  const moves = [
    { t: "SALE", d: "بيع → خصم" },
    { t: "REFUND", d: "مرتجع مبيعات → إضافة" },
    { t: "EXCHANGE", d: "تبديل → ±" },
    { t: "PURCHASE_INVOICE", d: "فاتورة مشتريات → إضافة" },
    { t: "PURCHASE_RETURN", d: "مرتجع مشتريات → خصم" },
    { t: "TRANSFER_OUT/IN", d: "تحويل بين المخازن" },
    { t: "STOCK_TAKE", d: "جرد → تسوية" },
    { t: "SPOT_CHECK", d: "جرد أعمى مفاجئ" },
  ];

  moves.forEach((m, i) => {
    const y = 2.5 + i * 0.45;
    s.addText(m.t, { x: 7.8, y, w: 2.3, h: 0.4, fontSize: 11, fontFace: FONT_H, color: PAL.gold, bold: true, align: "left", valign: "middle" });
    s.addText(m.d, { x: 10.1, y, w: 2.5, h: 0.4, fontSize: 11, fontFace: FONT_B, color: PAL.textDark, align: "left", valign: "middle", rtlMode: true });
  });
}

// ════════════════════════════════════════════════════════════════
// S6.5 — Inventory Screen Preview
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s, PAL.bgDark);
  titleBox(s, "شاشة المخزون — معاينة", { color: PAL.white });
  s.addText("جدول المنتجات مع الفلترة + الأسعار + الكميات لكل مخزن + حالات المخزون", {
    x: 0.6, y: 1.3, w: 12, h: 0.4, fontSize: 14, fontFace: FONT_H, color: PAL.gold, align: "left", valign: "middle", rtlMode: true,
  });

  s.addImage({
    path: `${SHOTS}/03-inventory.png`,
    x: 0.6, y: 1.95, w: 12.1, h: 5.1,
  });

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.55, y: 1.9, w: 12.2, h: 5.2,
    fill: { color: PAL.gold, transparency: 100 },
    line: { color: PAL.gold, width: 2 },
  });
}

// ════════════════════════════════════════════════════════════════
// S7 — Accounting
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s, PAL.bgDark);
  titleBox(s, "محاسبة ذات قيد مزدوج", { color: PAL.white });

  s.addText("17 حساب جاهز + قيود تلقائية على كل عملية + تقارير مالية كاملة", {
    x: 0.6, y: 1.4, w: 12, h: 0.5, fontSize: 16, fontFace: FONT_H, color: PAL.gold, align: "left", valign: "middle", rtlMode: true,
  });

  // Account codes grid
  const accounts = [
    { code: "1010", n: "النقدية", t: "أصل" },
    { code: "1020", n: "البنك", t: "أصل" },
    { code: "1100", n: "المخزون", t: "أصل" },
    { code: "2010", n: "ذمم دائنة", t: "خصم" },
    { code: "2020", n: "عجز وردية", t: "خصم" },
    { code: "2110", n: "ضريبة مستحقة", t: "خصم" },
    { code: "3010", n: "رأس المال", t: "حقوق ملكية" },
    { code: "4010", n: "إيراد مبيعات", t: "إيراد" },
    { code: "4060", n: "فائض تسوية", t: "إيراد" },
    { code: "5070", n: "تكلفة البضاعة", t: "مصروف" },
  ];

  const cw = 2.4, ch = 1.0, gap = 0.15;
  const startX = (13.3 - (5 * cw + 4 * gap)) / 2;
  const startY = 2.2;

  accounts.forEach((a, i) => {
    const col = i % 5, row = Math.floor(i / 5);
    const x = startX + col * (cw + gap);
    const y = startY + row * (ch + gap);

    card(s, x, y, cw, ch, "2A2018", false);
    s.addText(a.code, { x: x + 0.1, y: y + 0.1, w: cw - 0.2, h: 0.4, fontSize: 18, fontFace: FONT_H, color: PAL.gold, bold: true, align: "center", valign: "middle" });
    s.addText(a.n, { x: x + 0.1, y: y + 0.5, w: cw - 0.2, h: 0.3, fontSize: 11, fontFace: FONT_B, color: PAL.white, align: "center", valign: "middle", rtlMode: true });
    s.addText(a.t, { x: x + 0.1, y: y + 0.78, w: cw - 0.2, h: 0.2, fontSize: 9, fontFace: FONT_B, color: PAL.accent, align: "center", valign: "middle", rtlMode: true });
  });

  // Reports list
  s.addText("التقارير المالية", { x: 0.6, y: 4.7, w: 12, h: 0.4, fontSize: 17, fontFace: FONT_H, color: PAL.white, bold: true, align: "left", valign: "middle", rtlMode: true });

  const reports = ["ميزان المراجعة", "قائمة الدخل", "الميزانية العمومية", "التدفقات النقدية", "الأستاذ العام", "تقرير VAT", "كشف حساب عميل", "كشف حساب مورد"];
  reports.forEach((r, i) => {
    const x = 0.6 + (i % 4) * 3.1;
    const y = 5.3 + Math.floor(i / 4) * 0.6;
    card(s, x, y, 2.9, 0.5, PAL.primary, false);
    s.addText(r, { x, y, w: 2.9, h: 0.5, fontSize: 12, fontFace: FONT_B, color: PAL.white, align: "center", valign: "middle", rtlMode: true });
  });
}

// ════════════════════════════════════════════════════════════════
// S7.5 — Accounting Screen Preview
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s, PAL.bgDark);
  titleBox(s, "شاشة المحاسبة — معاينة", { color: PAL.white });
  s.addText("ميزان المراجعة + القيود اليومية + قائمة الدخل — كل القيود تلقائية", {
    x: 0.6, y: 1.3, w: 12, h: 0.4, fontSize: 14, fontFace: FONT_H, color: PAL.gold, align: "left", valign: "middle", rtlMode: true,
  });

  s.addImage({
    path: `${SHOTS}/06-accounting.png`,
    x: 0.6, y: 1.95, w: 12.1, h: 5.1,
  });

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.55, y: 1.9, w: 12.2, h: 5.2,
    fill: { color: PAL.gold, transparency: 100 },
    line: { color: PAL.gold, width: 2 },
  });
}

// ════════════════════════════════════════════════════════════════
// S8 — Reports & Analytics
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s, PAL.bgLight);
  titleBox(s, "التقارير والتحليلات", { color: PAL.textDark });

  // Left: report types
  s.addText("10 تقارير قابلة للتصدير Excel", { x: 0.6, y: 1.5, w: 6, h: 0.5, fontSize: 17, fontFace: FONT_H, color: PAL.primary, bold: true, align: "left", valign: "middle", rtlMode: true });

  const reports = [
    "تقرير المبيعات (فلاتر متعددة)",
    "تحليلات المبيعات (5 أنواع)",
    "مصفوفة الأداء (أقسام + منتجات)",
    "تقرير مؤشر كفاءة المنتج (100 نقطة)",
    "تقرير المخزون وحركاته",
    "تقرير المشتريات والموردون",
    "تقرير الولاء والعملاء",
    "تقرير الورديات والفروقات",
    "تقرير المرتجعات",
    "تقرير سجل التدقيق",
  ];

  reports.forEach((r, i) => {
    const y = 2.1 + i * 0.42;
    s.addShape(pres.shapes.OVAL, { x: 0.6, y: y + 0.08, w: 0.2, h: 0.2, fill: { color: PAL.gold }, line: { color: PAL.gold, width: 0 } });
    s.addText(r, { x: 0.9, y, w: 5.5, h: 0.4, fontSize: 12, fontFace: FONT_B, color: PAL.textDark, align: "left", valign: "middle", rtlMode: true });
  });

  // Right: product efficiency report card
  card(s, 7.0, 1.7, 5.7, 5.0, PAL.white);
  s.addText("مؤشر كفاءة المنتج", { x: 7.2, y: 1.9, w: 5.3, h: 0.5, fontSize: 17, fontFace: FONT_H, color: PAL.primary, bold: true, align: "center", valign: "middle", rtlMode: true });
  s.addText("100 نقطة", { x: 7.2, y: 2.4, w: 5.3, h: 0.6, fontSize: 32, fontFace: FONT_H, color: PAL.gold, bold: true, align: "center", valign: "middle" });

  const factors = [
    { n: "40", l: "الربحية", c: PAL.primary },
    { n: "25", l: "المبيعات", c: "8B5A3C" },
    { n: "20", l: "مرتجع عقابي", c: "C9A961" },
    { n: "15", l: "التكلفة", c: "A7BEAE" },
  ];

  factors.forEach((f, i) => {
    const x = 7.3 + i * 1.35;
    s.addShape(pres.shapes.OVAL, { x: x + 0.3, y: 3.3, w: 0.7, h: 0.7, fill: { color: f.c }, line: { color: f.c, width: 0 } });
    s.addText(f.n, { x: x + 0.3, y: 3.3, w: 0.7, h: 0.7, fontSize: 22, fontFace: FONT_H, color: PAL.white, bold: true, align: "center", valign: "middle" });
    s.addText(f.l, { x, y: 4.1, w: 1.3, h: 0.4, fontSize: 11, fontFace: FONT_B, color: PAL.textDark, align: "center", valign: "middle", rtlMode: true });
  });

  s.addText("التصنيف التلقائي", { x: 7.2, y: 4.8, w: 5.3, h: 0.4, fontSize: 14, fontFace: FONT_H, color: PAL.textDark, bold: true, align: "center", valign: "middle", rtlMode: true });

  const classes = [
    { t: "بطل", d: "أعلى من 80", c: PAL.primary },
    { t: "فرصة كامنة", d: "50-80", c: "C9A961" },
    { t: "مخادع", d: "30-50", c: "8B5A3C" },
    { t: "راكد", d: "أقل من 30", c: PAL.textMuted },
  ];
  classes.forEach((cl, i) => {
    const x = 7.3 + i * 1.35;
    card(s, x, 5.3, 1.25, 1.2, cl.c, false);
    s.addText(cl.t, { x, y: 5.4, w: 1.25, h: 0.5, fontSize: 13, fontFace: FONT_H, color: PAL.white, bold: true, align: "center", valign: "middle", rtlMode: true });
    s.addText(cl.d, { x, y: 5.9, w: 1.25, h: 0.5, fontSize: 10, fontFace: FONT_B, color: PAL.white, align: "center", valign: "middle", rtlMode: true });
  });
}

// ════════════════════════════════════════════════════════════════
// S8.5 — Reports Screen Preview
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s, PAL.bgDark);
  titleBox(s, "شاشة التقارير — معاينة", { color: PAL.white });
  s.addText("الأكثر مبيعاً + مؤشر كفاءة المنتج + توزيع الأقسام + مؤشرات الأداء", {
    x: 0.6, y: 1.3, w: 12, h: 0.4, fontSize: 14, fontFace: FONT_H, color: PAL.gold, align: "left", valign: "middle", rtlMode: true,
  });

  s.addImage({
    path: `${SHOTS}/07-reports.png`,
    x: 0.6, y: 1.95, w: 12.1, h: 5.1,
  });

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.55, y: 1.9, w: 12.2, h: 5.2,
    fill: { color: PAL.gold, transparency: 100 },
    line: { color: PAL.gold, width: 2 },
  });
}

// ════════════════════════════════════════════════════════════════
// S8.6 — Dashboard Preview
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s, PAL.bgDark);
  titleBox(s, "لوحة التحكم — معاينة", { color: PAL.white });
  s.addText("مؤشرات الأداء + مبيعات الأسبوع + آخر الفواتير + تنبيهات المخزون", {
    x: 0.6, y: 1.3, w: 12, h: 0.4, fontSize: 14, fontFace: FONT_H, color: PAL.gold, align: "left", valign: "middle", rtlMode: true,
  });

  s.addImage({
    path: `${SHOTS}/01-dashboard.png`,
    x: 0.6, y: 1.95, w: 12.1, h: 5.1,
  });

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.55, y: 1.9, w: 12.2, h: 5.2,
    fill: { color: PAL.gold, transparency: 100 },
    line: { color: PAL.gold, width: 2 },
  });
}

// ════════════════════════════════════════════════════════════════
// S9 — PRICING (the main slide!)
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s, PAL.bgDark);
  titleBox(s, "باقات التسعير", { color: PAL.white });
  s.addText("اختر الباقة المناسبة لحجم متجرك", { x: 0.6, y: 1.25, w: 12, h: 0.4, fontSize: 15, fontFace: FONT_H, color: PAL.gold, align: "left", valign: "middle", rtlMode: true });

  const plans = [
    {
      name: "البداية",
      nameEn: "Starter",
      price: "15",
      currency: "د.ك",
      period: "/ شهرياً",
      tagline: "لمحلات العطور الصغيرة",
      features: [
        "نقاط بيع قياسي + سريع",
        "حتى 100 منتج",
        "مخزن واحد",
        "مستخدم واحد (كاشير)",
        "فواتير + طباعة حرارية",
        "ورديات + إغلاق يومي",
        "دعم بريدي",
      ],
      c: "2A2018",
      badge: null,
      highlighted: false,
    },
    {
      name: "النمو",
      nameEn: "Growth",
      price: "35",
      currency: "د.ك",
      period: "/ شهرياً",
      tagline: "لمحلات العطور المتوسطة",
      features: [
        "كل ميزات البداية",
        "منتجات غير محدودة",
        "حتى 3 مخازن",
        "حتى 5 مستخدمين",
        "محاسبة قيد مزدوج",
        "ملاحق جمركية",
        "تركيبات + باقات",
        "تقارير + Excel",
        "دعم بالواتساب",
      ],
      c: PAL.primary,
      badge: "الأكثر شعبية",
      highlighted: true,
    },
    {
      name: "المؤسسة",
      nameEn: "Enterprise",
      price: "75",
      currency: "د.ك",
      period: "/ شهرياً",
      tagline: "للمحلات الكبيرة والفروع",
      features: [
        "كل ميزات النمو",
        "مخازن غير محدودة",
        "مستخدمون غير محدودين",
        "تكامل Shopify",
        "مؤشر كفاءة المنتج",
        "سجل تدقيق كامل",
        "أدوات صيانة النظام",
        "أولوية الدعم + هاتفي",
        "تدريب مخصص (2 ساعة)",
      ],
      c: "2A2018",
      badge: null,
      highlighted: false,
    },
  ];

  const cw = 3.95, ch = 5.0, gap = 0.25;
  const startX = (13.3 - (3 * cw + 2 * gap)) / 2;
  const startY = 1.85;

  plans.forEach((p, i) => {
    const x = startX + i * (cw + gap);
    const y = startY;

    // Card
    card(s, x, y, cw, ch, p.c, p.highlighted);

    // Badge (inside the card, top-right, NOT floating above)
    if (p.badge) {
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: x + cw - 1.7, y: y + 0.15, w: 1.5, h: 0.35, fill: { color: PAL.gold }, line: { color: PAL.gold, width: 0 }, rectRadius: 0.04,
      });
      s.addText(p.badge, { x: x + cw - 1.7, y: y + 0.15, w: 1.5, h: 0.35, fontSize: 10, fontFace: FONT_H, color: PAL.bgDark, bold: true, align: "center", valign: "middle", rtlMode: true });
    }

    // Plan name
    s.addText(p.name, { x: x + 0.2, y: y + 0.2, w: cw - 0.4, h: 0.45, fontSize: 20, fontFace: FONT_H, color: PAL.white, bold: true, align: "center", valign: "middle", rtlMode: true });
    s.addText(p.nameEn, { x: x + 0.2, y: y + 0.65, w: cw - 0.4, h: 0.25, fontSize: 11, fontFace: FONT_B, color: PAL.accent, align: "center", valign: "middle" });
    s.addText(p.tagline, { x: x + 0.2, y: y + 0.9, w: cw - 0.4, h: 0.25, fontSize: 10, fontFace: FONT_B, color: PAL.gold, align: "center", valign: "middle", rtlMode: true });

    // Price
    s.addText(p.price, { x: x + 0.2, y: y + 1.25, w: cw - 0.4, h: 0.7, fontSize: 40, fontFace: FONT_H, color: p.highlighted ? PAL.gold : PAL.white, bold: true, align: "center", valign: "middle" });
    s.addText(`${p.currency} ${p.period}`, { x: x + 0.2, y: y + 2.0, w: cw - 0.4, h: 0.25, fontSize: 12, fontFace: FONT_B, color: PAL.accent, align: "center", valign: "middle", rtlMode: true });

    // Divider
    s.addShape(pres.shapes.LINE, { x: x + 0.5, y: y + 2.35, w: cw - 1, h: 0, line: { color: PAL.accent, width: 1, transparency: 50 } });

    // Features (tighter spacing)
    p.features.forEach((f, fi) => {
      const fy = y + 2.5 + fi * 0.27;
      s.addText("✓", { x: x + 0.3, y: fy, w: 0.25, h: 0.22, fontSize: 11, fontFace: FONT_H, color: PAL.gold, bold: true, align: "center", valign: "middle" });
      s.addText(f, { x: x + 0.55, y: fy, w: cw - 0.75, h: 0.22, fontSize: 9.5, fontFace: FONT_B, color: PAL.white, align: "left", valign: "middle", rtlMode: true });
    });
  });

  // Footer note (clearly below the cards)
  s.addText("جميع البقات تشمل: استضافة سحابية + نسخ احتياطي يومي + تحديثات مجانية + إلغاء في أي وقت", {
    x: 0.6, y: 7.05, w: 12.1, h: 0.3, fontSize: 10, fontFace: FONT_B, color: PAL.accent, align: "center", valign: "middle", rtlMode: true,
  });
}

// ════════════════════════════════════════════════════════════════
// S10 — One-time setup & add-ons
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s, PAL.bgLight);
  titleBox(s, "إعداد لمرة واحدة + خدمات إضافية", { color: PAL.textDark });

  // Left: one-time setup
  card(s, 0.6, 1.6, 5.8, 2.8, PAL.white);
  s.addText("🔧 الإعداد لمرة واحدة", { x: 0.8, y: 1.8, w: 5.4, h: 0.5, fontSize: 18, fontFace: FONT_H, color: PAL.primary, bold: true, align: "center", valign: "middle", rtlMode: true });

  const setup = [
    { i: "إنشاء الحساب + ربط Supabase", p: "مجاني" },
    { i: "استيراد المنتجات (Excel)", p: "مجاني" },
    { i: "تدريب أساسي (ساعة)", p: "مجاني" },
    { i: "تخصيص شعار + فاتورة", p: "25 د.ك" },
    { i: "ترحيل بيانات من نظام سابق", p: "75 د.ك" },
    { i: "تدريب مخصص (2 ساعة)", p: "50 د.ك" },
  ];

  setup.forEach((it, i) => {
    const y = 2.4 + i * 0.32;
    s.addText(it.i, { x: 0.9, y, w: 3.8, h: 0.3, fontSize: 12, fontFace: FONT_B, color: PAL.textDark, align: "left", valign: "middle", rtlMode: true });
    s.addText(it.p, { x: 4.7, y, w: 1.5, h: 0.3, fontSize: 12, fontFace: FONT_H, color: PAL.primary, bold: true, align: "center", valign: "middle", rtlMode: true });
  });

  // Right: hardware add-ons
  card(s, 6.9, 1.6, 5.8, 2.8, PAL.white);
  s.addText("🖨️ أجهزة (اختياري)", { x: 7.1, y: 1.8, w: 5.4, h: 0.5, fontSize: 18, fontFace: FONT_H, color: PAL.primary, bold: true, align: "center", valign: "middle", rtlMode: true });

  const hw = [
    { i: "طابعة إيصالات حرارية 80mm", p: "45 د.ك" },
    { i: "قارئ باركود USB", p: "15 د.ك" },
    { i: "درج نقود آلي", p: "35 د.ك" },
    { i: "جهاز لوحي Android للكاشير", p: "120 د.ك" },
    { i: "شاشة لمس عميلة", p: "180 د.ك" },
    { i: "حزمة كاملة (الكل)", p: "350 د.ك" },
  ];

  hw.forEach((it, i) => {
    const y = 2.4 + i * 0.32;
    s.addText(it.i, { x: 7.2, y, w: 3.8, h: 0.3, fontSize: 12, fontFace: FONT_B, color: PAL.textDark, align: "left", valign: "middle", rtlMode: true });
    s.addText(it.p, { x: 11.0, y, w: 1.5, h: 0.3, fontSize: 12, fontFace: FONT_H, color: PAL.primary, bold: true, align: "center", valign: "middle", rtlMode: true });
  });

  // Bottom: annual discount
  card(s, 0.6, 4.7, 12.1, 2.3, PAL.primary);
  s.addText("🎁 خصم الدفع السنوي", { x: 0.8, y: 4.9, w: 11.7, h: 0.6, fontSize: 22, fontFace: FONT_H, color: PAL.white, bold: true, align: "center", valign: "middle", rtlMode: true });
  s.addText("ادفع سنوياً بدل شهرياً ووفّر شهرين مجاناً (≈17% خصم)", { x: 0.8, y: 5.5, w: 11.7, h: 0.5, fontSize: 16, fontFace: FONT_B, color: PAL.gold, align: "center", valign: "middle", rtlMode: true });

  const annuals = [
    { p: "البداية", m: "15", a: "150", save: "30" },
    { p: "النمو", m: "35", a: "350", save: "70" },
    { p: "المؤسسة", m: "75", a: "750", save: "150" },
  ];
  annuals.forEach((a, i) => {
    const x = 0.9 + i * 4.0;
    s.addText(`${a.p}: ${a.m} د.ك/شهر → ${a.a} د.ك/سنة`, { x, y: 6.1, w: 3.8, h: 0.4, fontSize: 13, fontFace: FONT_H, color: PAL.white, align: "center", valign: "middle", rtlMode: true });
    s.addText(`وفّر ${a.save} د.ك`, { x, y: 6.5, w: 3.8, h: 0.35, fontSize: 14, fontFace: FONT_H, color: PAL.gold, bold: true, align: "center", valign: "middle", rtlMode: true });
  });
}

// ════════════════════════════════════════════════════════════════
// S11 — Why KWPOS
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s, PAL.bgDark);
  titleBox(s, "لماذا KWPOS؟", { color: PAL.white });

  const reasons = [
    { icon: "🇰🇼", t: "مصمم للكويت", d: "دينار كويتي + ضريبة كيات + متعدد الفروع + عربي RTL" },
    { icon: "⚡", t: "سريع جداً", d: "Batch SQL + React.memo + 100ms استجابة POS" },
    { icon: "🔒", t: "آمن وقابل للتدقيق", d: "Rate limiting + audit log + صلاحيات دقيقة + timingSafeEqual" },
    { icon: "📊", t: "ذكي", d: "تقارير + تحليلات + مؤشر كفاءة المنتج (100 نقطة)" },
    { icon: "💰", t: "اقتصادي", d: "Serverless = لا خوادم لإدارتها، تبدأ من 15 د.ك شهرياً" },
    { icon: "🧪", t: "موثوق", d: "142 اختبار آلي + lint + TypeScript صارم" },
    { icon: "🌍", t: "يعمل في أي مكان", d: "PWA + سحابي + الوصول من الجوال + الكمبيوتر" },
    { icon: "🔧", t: "قابل للتخصيص", d: "ملاحق جمركية + تركيبات + باقات + عروض" },
  ];

  const cw = 5.95, ch = 1.25, gap = 0.2;
  const startX = (13.3 - (2 * cw + gap)) / 2;
  const startY = 1.7;

  reasons.forEach((r, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = startX + col * (cw + gap);
    const y = startY + row * (ch + gap);

    card(s, x, y, cw, ch, "2A2018", false);
    s.addText(r.icon, { x: x + 0.2, y: y + 0.3, w: 0.7, h: 0.7, fontSize: 30, align: "center", valign: "middle" });
    s.addText(r.t, { x: x + 1.0, y: y + 0.2, w: cw - 1.2, h: 0.4, fontSize: 16, fontFace: FONT_H, color: PAL.gold, bold: true, align: "left", valign: "middle", rtlMode: true });
    s.addText(r.d, { x: x + 1.0, y: y + 0.65, w: cw - 1.2, h: 0.5, fontSize: 11, fontFace: FONT_B, color: PAL.accent, align: "left", valign: "top", rtlMode: true });
  });
}

// ════════════════════════════════════════════════════════════════
// S12 — Thank you + contact (dark closing)
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s, PAL.bgDark);

  // Top accent
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 13.3, h: 0.08, fill: { color: PAL.gold }, line: { color: PAL.gold, width: 0 } });

  // Big thank you
  s.addText("شكراً لكم", { x: 0.6, y: 1.8, w: 12, h: 1.2, fontSize: 56, fontFace: FONT_H, color: PAL.white, bold: true, align: "center", valign: "middle", rtlMode: true });
  s.addText("نحن هنا لإدارة أعمالكم بكفاءة", { x: 0.6, y: 3.1, w: 12, h: 0.6, fontSize: 20, fontFace: FONT_H, color: PAL.gold, align: "center", valign: "middle", rtlMode: true });

  // Contact card
  card(s, 3.65, 4.2, 6, 2.2, "2A2018", false);
  s.addText("للبدء أو الاستفسار", { x: 3.85, y: 4.4, w: 5.6, h: 0.5, fontSize: 16, fontFace: FONT_H, color: PAL.white, bold: true, align: "center", valign: "middle", rtlMode: true });

  const contacts = [
    { i: "📧", l: "البريد", v: "info@kwpos.kw" },
    { i: "🌐", l: "الموقع", v: "kwpos.vercel.app" },
    { i: "📱", l: "الواتساب", v: "+965 0000 0000" },
  ];

  contacts.forEach((c, i) => {
    const y = 4.95 + i * 0.42;
    s.addText(c.i, { x: 4.2, y, w: 0.4, h: 0.4, fontSize: 16, align: "center", valign: "middle" });
    s.addText(c.l, { x: 4.6, y, w: 1.5, h: 0.4, fontSize: 12, fontFace: FONT_B, color: PAL.accent, align: "left", valign: "middle", rtlMode: true });
    s.addText(c.v, { x: 6.1, y, w: 3.2, h: 0.4, fontSize: 12, fontFace: FONT_H, color: PAL.gold, bold: true, align: "left", valign: "middle", rtlMode: true });
  });

  // CTA bar
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 3.65, y: 6.7, w: 6, h: 0.6, fill: { color: PAL.primary }, line: { color: PAL.primary, width: 0 }, rectRadius: 0.06 });
  s.addText("جرّب مجاناً لمدة 14 يوماً", { x: 3.65, y: 6.7, w: 6, h: 0.6, fontSize: 16, fontFace: FONT_H, color: PAL.white, bold: true, align: "center", valign: "middle", rtlMode: true });
}

// ── Write file ──
pres.writeFile({ fileName: "/home/z/my-project/ppt-output/KWPOS_Presentation.pptx" })
  .then(() => console.log("✓ Generated: ppt-output/KWPOS_Presentation.pptx"))
  .catch(e => console.error("✗ Failed:", e));
