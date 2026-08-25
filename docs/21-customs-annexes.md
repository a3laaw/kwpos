<div dir="rtl">

# 21 — ملاحق التخليص الجمركي (Customs Annexes)

> دليل وحدة «ملحق التخليص» في KWPOS. يشرح متى يُنشأ الملحق، حقوله، حساباته
> التلقائية، رحيله إلى القيد المحاسبي، ودعمه لتعدّد الملاحق لكل فاتورة.

---

## 1. ما هو ملحق التخليص؟

**ملحق التخليص = مستند منفصل يُنشأ بعد ترحيل فاتورة شراء (PurchaseInvoice)
ووصول البضاعة، لتسجيل النسب الفعلية للجمارك والضريبة والشحن وتكاليف أخرى.**
تُضاف هذه التكاليف إلى الفاتورة وتُرسمل (capitalize) داخل قيمة المخزون،
فيعكس «متوسط التكلفة المرجّح» للمنتج تكلفته الكاملة.

### متى يُستخدم؟

| الحالة | مثال |
|---|---|
| استيراد من خارج البلد | فاتورة مورد صيني بقيمة 1000 د.ك + بوليصة شحن 80 د.ك + ضريبة 5% |
| تكاليف تصل متأخرة | الفاتورة رُحّلت قبل معرفة قيمة التخليص النهائية |
| شحنات متعددة لفاتورة واحدة | فاتورة واحدة تُفرَّغ على دفعتين → ملاحق متعددة |

> الملحق **لا** يحلّ محل فاتورة الشراء. هو ملحق عليها يُعدّل تكاليفها بعد الترحيل.

النموذج: `CustomsAnnex` في `prisma/schema.prisma` (السطر ~804).

---

## 2. النموذج (Schema)

```
model CustomsAnnex {
  id                String   @id @default(cuid())
  annexNo           String   @unique            // ANX-XXXXXXXX
  purchaseInvoiceId String                      // الفاتورة المُرحّلة
  annexDate         DateTime @default(now())
  status            String   @default("DRAFT") // DRAFT | POSTED
  customsRate       Float    @default(0)        // % من subtotal
  customsAmount     Float    @default(0)        // subtotal × rate / 100
  taxRate           Float    @default(0)
  taxAmount         Float    @default(0)
  shippingRate      Float    @default(0)
  shippingAmount    Float    @default(0)
  otherCharges      Float    @default(0)        // مبلغ ثابت (لا نسبة)
  totalAnnexCost    Float    @default(0)        // مجموع كل المبالغ
  billOfLading      String?                     // رقم بوليصة الشحن
  arrivalDate       DateTime?                   // تاريخ الوصول
  note              String?
  purchaseInvoice   PurchaseInvoice @relation(...)
  createdBy         User?          @relation("CustomsAnnexCreator", ...)
  @@index([purchaseInvoiceId])
  @@index([status])
}
```

| الحقل | المعنى | المصدر |
|---|---|---|
| `annexNo` | رقم تسلسلي فريد | يُولّد آلياً `ANX-XXXXXXXX` |
| `purchaseInvoiceId` | الفاتورة المرتبطة (إلزامي) | يختاره المستخدم — يجب أن تكون POSTED |
| `status` | حالة الملحق | يبدأ DRAFT، يصبح POSTED بعد `/post` |
| `customsRate`/`taxRate`/`shippingRate` | نسب مئوية من subtotal | يُدخلها المستخدم |
| `customsAmount`/`taxAmount`/`shippingAmount` | مبالغ محسوبة | يُحسب آلياً = subtotal × rate / 100 |
| `otherCharges` | مبلغ ثابت إضافي | يُدخله المستخدم مباشرة |
| `totalAnnexCost` | إجمالي تكلفة الملحق | مجموع كل المبالغ (يُحسب آلياً) |
| `billOfLading` | رقم بوليصة الشحن | نص حر اختياري |
| `arrivalDate` | تاريخ وصول البضاعة | يُستخدم كتاريخ للقيد إن وُجد، وإلا `annexDate` |

---

## 3. واجهات API

| المسار | الطريقة | الوظيفة |
|---|---|---|
| `/api/customs-annexes` | GET | قائمة كل الملاحق (الأحدث أولاً) + فلترة `?purchaseInvoiceId=...` |
| `/api/customs-annexes` | POST | إنشاء ملحق DRAFT على فاتورة مُرحّلة + حساب المبالغ آلياً |
| `/api/customs-annexes/[id]` | GET | تفاصيل ملحق واحد |
| `/api/customs-annexes/[id]` | DELETE | حذف ملحق DRAFT (لا يمكن حذف POSTED) |
| `/api/customs-annexes/[id]/post` | POST | ترحيل الملحق → تحديث الفاتورة + قيد محاسبي + سجل تدقيق |

المصادر: `src/app/api/customs-annexes/route.ts` (GET + POST)، `[id]/route.ts`
(GET + DELETE)، `[id]/post/route.ts` (POST الترحيل).

### الصلاحيات

كل المسارات تستدعي `requireSeeFinancials()` من `@/lib/auth-helpers`، الذي
يسمح لأدوار: **OWNER, ADMIN, MANAGER, ACCOUNTANT**. SALES و CASHIER و
WAREHOUSE لا يمكنهم رؤية أو إنشاء أو ترحيل الملاحق.

### التحقق عند الإنشاء

| الشرط | الخطأ |
|---|---|
| `purchaseInvoiceId` غير مُرسَل | `400 purchase-invoice-required` |
| الفاتورة غير موجودة | `400 invalid-invoice` |
| الفاتورة ليست POSTED | `400 invoice-not-posted` |
| كل النسب + otherCharges = 0 | `400 empty-annex` |
| `arrivalDate` غير صالح | `400 invalid-arrival-date` |

الحساب التلقائي للمبالغ: `customsAmount = subtotal × customsRate / 100`
(وكذلك taxAmount و shippingAmount)، و `totalAnnexCost = customsAmount +
taxAmount + shippingAmount + otherCharges`. تُقرّب القيم إلى 3 خانات عشرية.

---

## 4. ترحيل الملحق (POST /api/customs-annexes/[id]/post)

### الخطوات (متسلسلة، لا `db.$transaction` لتوافق PgBouncer)

1. تحميل الملحق + الفاتورة المرتبطة + المورد.
2. التحقق: `404` إن لم يوجد، `409` إن كان POSTED مسبقاً.
3. تحديث حالة الملحق إلى `POSTED`.
4. **إضافة** مبالغ الملحق إلى الفاتورة (تتراكم ملاحق متعددة):
   `customs` += `annex.customsAmount`، `shipping` += `annex.shippingAmount`،
   `otherCharges` += `annex.otherCharges`، `taxAmount` += `annex.taxAmount`،
   ثم `total` = subtotal + taxAmount + shipping + customs + otherCharges − discount.
5. **القيد المحاسبي** (fire-and-forget):
   - **مدين** `1100` (المخزون) بمقدار `totalAnnexCost`
   - **دائن** حسب طريقة الدفع: `1010` نقدية / `1020` بنك / `2010` ذمم دائنة (آجل)
   - التاريخ: `arrivalDate` إن وُجد، وإلا `annexDate`.
6. **سجل التدقيق** بإجراء `CUSTOMS_ANNEX_POSTED` (fire-and-forget).

> إن فشل تحديث الفاتورة (الخطوة 4)، يُعاد الملحق إلى `DRAFT` (تعويض) وتُرجَع
> `500 invoice-update-failed`. فشل القيد أو سجل التدقيق لا يُلغي الترحيل —
> يُسجَّل الخطأ لمطابقة يدوية.

---

## 5. تعدّد الملاحق لكل فاتورة

يمكن إنشاء **عدة ملاحق لفاتورة واحدة**. كل ترحيل يُضيف مبالغه إلى الفاتورة
(لا يستبدلها)، فيتراكم إجمالي التكاليف الإضافية عبر الملاحق.

### مثال

فاتورة شراء بقيمة `subtotal = 1000 د.ك` (POSTED):

| الملحق | customsAmount | taxAmount | shippingAmount | otherCharges | totalAnnexCost |
|---|---|---|---|---|---|
| ANX-1 | 50 | 75 | 30 | 10 | 165 |
| ANX-2 | 25 | 37.5 | 15 | 5 | 82.5 |
| **المجموع** | **75** | **112.5** | **45** | **15** | **247.5** |

بعد ترحيل الملاحقين يصبح إجمالي الفاتورة `1247.5 د.ك`. هذا التراكم ينعكس
على تكلفة الوصول (Landed Cost) للمنتجات عبر محرك `src/lib/landed-cost.ts`
بالمتوسط المرجّح.

---

## 6. واجهة المستخدم (UI)

الملف: `src/components/purchases/customs-annex-dialog.tsx`. تُفتح النافذة من
شاشة فاتورة الشراء (`purchase-invoices-view.tsx`) للفاتورة المُرحّلة.

| العنصر | الوصف |
|---|---|
| عنوان النافذة | «ملحق تخليص جمركي» + رقم الفاتورة + اسم المورد |
| شارة الحالة | DRAFT (كهرمانية) / POSTED (خضراء) |
| قائمة الملاحق السابقة | كل ملاحق الفاتورة الحالية مع رقمها وحالتها وإجمالي تكلفتها |
| نموذج الإدخال | نسبة الجمارك، نسبة الضريبة، نسبة الشحن، تكاليف أخرى، رقم البوليصة، تاريخ الوصول |
| حسابات حيّة | تُحسب المبالغ والإجمالي آلياً عند الكتابة |
| زر «ترحيل» | يؤكد نافذة تأكيد قبل الترحيل (لأنه لا رجعة فيه) |
| زر «إضافة ملحق» | يحفظ الملحق DRAFT دون ترحيل |

> يستخدم المكوّن `<ConfirmDialog>` من `@/components/shared/confirm-dialog`
> للتأكيد قبل الترحيل — يمنع الترحيل العرضي.

---

## 7. تأثير رأس المال على المخزون (Capitalization)

تُضاف تكاليف الملحق إلى الفاتورة وتُرسمل في تكلفة المنتجات عبر محرك
تكلفة الوصول (Landed Cost):

| المعالجة | الأثر |
|---|---|
| تكلفة الفاتورة | تزيد بقيمة `totalAnnexCost` |
| تكلفة المنتج | يُعاد حساب متوسط التكلفة المرجّح لكل منتج في الفاتورة |
| القيد المحاسبي | مدين 1100 (المخزون) — يُرسمل في الأصول |
| الدائن | حسب طريقة دفع الفاتورة الأصلية (نقدي/بنك/آجل) |

> لذلك تظهر تكلفة البضاعة المستوردة في تقارير الربح بشكلها الكامل، لا
> قيمة الشراء وحدها.

---

## 8. ملفات مرجعية

| الملف | الدور |
|---|---|
| `prisma/schema.prisma` (السطر ~804) | نموذج `CustomsAnnex` |
| `src/app/api/customs-annexes/route.ts` | GET + POST |
| `src/app/api/customs-annexes/[id]/route.ts` | GET + DELETE |
| `src/app/api/customs-annexes/[id]/post/route.ts` | POST (الترحيل) |
| `src/components/purchases/customs-annex-dialog.tsx` | نافذة الإدخال + الترحيل |
| `src/hooks/use-api.ts` | `useCustomsAnnexes`, `useCreateCustomsAnnex`, `usePostCustomsAnnex` |
| `src/lib/landed-cost.ts` | محرك تكلفة الوصول بالمتوسط المرجّح |
| `src/lib/purchase.ts` | `ensurePurchaseAccounts`, `paymentCreditAccountCode` |
| `src/lib/auth-helpers.ts` | `requireSeeFinancials` |

---

## 9. خلاصة تدريبية

1. الملحق يُنشأ **بعد** ترحيل فاتورة الشراء ووصول البضاعة، لتسجيل التكاليف الفعلية للجمارك/الضريبة/الشحن.
2. النسب تُدخل كنسبة مئوية من subtotal الفاتورة، والمبالغ تُحسب آلياً.
3. التكاليف تُرسمل في قيمة المخزون (مدين 1100) وفق طريقة دفع الفاتورة.
4. يمكن إنشاء **عدة ملاحق** لفاتورة واحدة، فيتراكم إجمالي التكاليف.
5. الترحيل لا رجعة فيه: بعد `POSTED` لا يمكن حذف الملحق أو تعديله.
6. الصلاحيات للأدوار المالية فقط: OWNER / ADMIN / MANAGER / ACCOUNTANT.
7. كل ترحيل يُسجَّل في سجل التدقيق بإجراء `CUSTOMS_ANNEX_POSTED`.

</div>
