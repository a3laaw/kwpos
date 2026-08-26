<div dir="rtl">

# 22 — أدوات صيانة بيانات الإدارة (Admin Data Tools)

> دليل مسارات الإدارة الصيانة في KWPOS. يشرح كل مسار، تأثيره على البيانات،
> بوابة الإنتاج (production gate) `ENABLE_ADMIN_DDL`، وواجهة الإعداد التي
> تُشغّلها. مكتوب لمدير النظام الذي يصون البيانات ولا يُستخدم يومياً من
> الكاشير.

---

## 1. نظرة عامة

هذه المسارات إدارية/صيانة، **لا** تُستخدم في التشغيل اليومي للكاشير. الهدف:
تصحيح تزامن المخزون، إعادة بناء `StockItem` من السجل التاريخي، أو مسح
البيانات لإعادة الضبط قبل الإطلاق. كلها مُقيّدة بدور `OWNER`/`ADMIN` وكلها
تُفحص بوابة الإنتاج أولاً.

### الجدول المرجعي

| المسار | التأثير | قابلية الرجوع |
|---|---|---|
| `/api/admin/recalc-stock` | إعادة حساب `Product.quantity` من مجموع `StockItem` | آمن — لا يحذف بيانات |
| `/api/admin/fix-stock` | إعادة بناء `StockItem` من تاريخ المعاملات | آمن مع `dryRun: true` — راجع التقرير قبل التنفيذ |
| `/api/admin/clear-transactions` | مسح كامل للفواتير والجرد والقيود (مؤقت — تخريبي) | **لا رجعة فيه** — احتياطي قبل الإطلاق فقط |
| `/api/admin/apply-*-schema` (6 مسارات) | تعديل DDL على قاعدة البيانات | راجع `prisma/migrations/` بدلاً منها |
| `/api/admin/apply-indexes` | إنشاء فهارس مفقودة | آمن لكن يُفضّل عبر migration |
| `/api/admin/analyze` | تحليل أداء قاعدة البيانات | للقراءة فقط |
| `/api/admin/create-supplier-payment-table` | إنشاء جدول مدفوعات الموردين | عبر migration عادةً |
| `/api/seed` | زرع بيانات تجريبية (يمسح الكل عند `reset: true`) | **لا رجعة فيه** مع `reset: true` |

---

## 2. بوابة الإنتاج (Production Gate)

كل المسارات أعلاه تستخدم النمط نفسه:

```ts
if (process.env.NODE_ENV === "production" &&
    process.env.ENABLE_ADMIN_DDL !== "true") {
  return NextResponse.json(
    { error: "admin-ddl-disabled-in-production" },
    { status: 403 }
  )
}
// ...logic...
```

- في **التطوير** (`NODE_ENV !== "production"`): المسار يعمل دائماً.
- في **الإنتاج** (`NODE_ENV === "production"`): المسار يُرجع `403` فوراً
  ما لم يُضبط `ENABLE_ADMIN_DDL=true` في متغيرات بيئة Vercel.

> هذا يحمي قاعدة الإنتاج من التشغيل العرضي لهذه المسارات بعد النشر. إن
> احتجت إلى تشغيلها في الإنتاج: اضبط `ENABLE_ADMIN_DDL=true` مؤقتاً في
> Vercel → Settings → Environment Variables، أعِد النشر، شغّل المسار، ثم
> احذف المتغير وأعِد النشر.

### المسارات المُطبَّقة على البوابة (11 مساراً)

- `/api/admin/recalc-stock`, `/api/admin/fix-stock`, `/api/admin/clear-transactions`
- `/api/admin/apply-audit-log-schema`, `/api/admin/apply-stock-take-schema`,
  `/api/admin/apply-stock-transfer-schema`, `/api/admin/apply-purchase-returns-schema`
- `/api/admin/apply-indexes`, `/api/admin/analyze`
- `/api/admin/create-supplier-payment-table`
- `/api/seed`

> مسارات `apply-*-schema` تستخدم نمط `POST_handler_disabled`: الدالة
> الأصلية سُمّيت `POST_handler_disabled` ودالة `POST` الجديدة تطبّق البوابة
> ثم تستدعيها. هذا يسهّل إعادة تفعيل المسار لاحقاً دون لمس المنطق.

---

## 3. تفاصيل كل مسار

### 3.1 `POST /api/admin/recalc-stock` — إعادة حساب المخزون المُجمَّع

يُعيد حساب `Product.quantity` لكل المنتجات من مجموع `StockItem.quantity`
(الذي يمثّل الكمية الفعلية لكل مخزن). يُستخدم عند فقد التزامن بين
`Product.quantity` (المخزن المؤقت) و`StockItem` (المصدر الموثوق).

- **الصلاحية:** OWNER/ADMIN.
- **المدخلات:** لا شيء.
- **الناتج:** `{ ok, totalProducts, corrected, unchanged, corrections[] }`.
- **`corrections[]`:** أول 50 منتجاً صُحّحت مع oldQty/newQty/byWarehouse.

> آمن: لا يحذف أي بيانات، فقط يُحدّث `Product.quantity` ليطابق `StockItem`.

### 3.2 `POST /api/admin/fix-stock` — إعادة بناء StockItem

يُعيد بناء `StockItem` لكل المنتجات في المخزن الافتراضي بناءً على تاريخ
المعاملات: فواتير شراء مُرحّلة + أوامر شراء مُستلَمة − مرتجعات شراء − مبيعات
مكتملة (صافي المرتجع).

- **الصلاحية:** OWNER/ADMIN.
- **المدخلات:** `{ dryRun?: boolean }`.
  - `dryRun: true` → تقرير فقط دون تعديل.
  - `dryRun: false` → تنفيذ الفعلي (`upsert` على `StockItem` + تحديث `Product.quantity`).
- **الناتج:** `{ ok, dryRun, totalProducts, fixed, skipped, corrections[] }`.
- **`skipped`:** المنتجات ذات التوقع السالب (بِيع أكثر من المشترى — تضارب بيانات).

> يُوصى بشدّة بشغله أولاً مع `dryRun: true` لمراجعة التقرير قبل التنفيذ.
> يصلح حالات فشل `$transaction` السابقة على PgBouncer.

### 3.3 `POST /api/admin/clear-transactions` — مسح كامل للمعاملات (مؤقت — تخريبي)

يمسح **كل** بيانات المعاملات: فواتير البيع، الفواتير المعلّقة، التبديل،
الجرد، الجرد الأعمى، القيود المحاسبية، `StockItem`، ويعيد تعيين
`Product.quantity = 0` و `Customer.loyaltyPoints = 0`. يحتفظ بـ:
المستخدمين، الفئات، الوحدات، الموردين، المنتجات، المخازن، الحسابات،
الإعدادات، سجل التدقيق، الباقات، التركيبات، العروض، أوامر/فواتير الشراء
والملاحق والمرتجعات والتحويلات والورديات.

- **الصلاحية:** OWNER/ADMIN.
- **التأكيد الإلزامي:** الجسم يجب أن يحوي `{ "confirm": "DELETE" }` — وإلا
  يُرجَع `400 confirmation-required`.
- **سجل التدقيق:** بعد اكتمال المسح، يُكتَب سجل وحيد بإجراء `CLEAR_TRANSACTIONS`
  يحمل اسم المستخدم وعدد السجلات الممحوة في `metadata`. هذا السجل **وحده**
  ينجو من المسح كشاهد على من قام به ومتى.

> **تحذير:** مسار مؤقت — احذفه بعد الإطلاق من `settings-view.tsx` و
> `src/app/api/admin/clear-transactions/route.ts`. مصمّم للاختبار قبل
> الإطلاق فقط، لا للصيانة الدورية.

### 3.4 `POST /api/seed` — زرع البيانات التجريبية

يُنشئ مستخدمين تجريبيّين (admin/manager/accountant/sales/warehouse/cashier)
مع كلمات مرور تُقرأ من `SEED_*_PASSWORD` (أو تُولّد عشوائياً وتُرجَع في
الرد)، ومنتجات وفئات وموردين وحسابات. عند `body.reset === true` يُمسح كل
الجدول أولاً.

- **الصلاحية:** OWNER/ADMIN.
- **المدخلات:** `{ reset?: boolean }`.
- **كلمات المرور:** تُقرأ من `SEED_ADMIN_PASSWORD`, `SEED_MANAGER_PASSWORD`,
  `SEED_ACCOUNTANT_PASSWORD`, `SEED_SALES_PASSWORD`,
  `SEED_WAREHOUSE_PASSWORD`, `SEED_CASHIER_PASSWORD`. إن لم تُضبط، تُولّد
  آلياً وتُرجَع في الرد فقط (لا تُحفظ في مكان آخر).
- مُفعّل عليها بوابة الإنتاج (`403 admin-ddl-disabled-in-production`).

### 3.5 `POST /api/admin/apply-*-schema` — مسارات DDL

| المسار | الوظيفة |
|---|---|
| `/api/admin/apply-audit-log-schema` | إنشاء/تعديل جدول `AuditLog` |
| `/api/admin/apply-stock-take-schema` | إنشاء/تعديل جداول `StockTake` + `StockTakeItem` |
| `/api/admin/apply-stock-transfer-schema` | إنشاء/تعديل جداول `StockTransfer` + `StockTransferItem` |
| `/api/admin/apply-purchase-returns-schema` | إنشاء/تعديل جداول `PurchaseReturn` + `PurchaseReturnItem` |
| `/api/admin/apply-indexes` | إنشاء فهارس `@@index` الناقصة |
| `/api/admin/create-supplier-payment-table` | إنشاء جدول `SupplierPayment` |
| `/api/admin/analyze` | `ANALYZE` على قاعدة البيانات (إحصاءات المُحسّن) — للقراءة فقط |

كلها تستخدم `POST_handler_disabled` كاسم بديل للمنطق الأصلي، ودالة `POST`
جديدة تطبّق البوابة ثم تستدعيها.

> **توصية:** يُفضّل تشغيل هذه عبر `prisma migrate deploy` بدلاً من المسارات.
> المسارات للاستخدام الطارئ فقط عندما يتعذّر فعل ذلك.

---

## 4. الواجهة (UI) — صيانة النظام

الملف: `SystemMaintenanceCard` داخل `src/components/settings/settings-view.tsx`
(السطر ~907). يُفتح من شاشة الإعدادات بتبويب «الصيانة».

| الزر | المسار المُستدعَى | التأكيد قبل التنفيذ |
|---|---|---|
| «إعادة حساب المخزون» | `POST /api/admin/recalc-stock` | لا — آمن |
| «فحص المخزون (dry run)» | `POST /api/admin/fix-stock` بـ `{ dryRun: true }` | لا |
| «إصلاح المخزون» | `POST /api/admin/fix-stock` بـ `{ dryRun: false }` | لا (لكن يُفضّل dry run أولاً) |
| «مسح المعاملات» (منطقة الخطر) | `POST /api/admin/clear-transactions` بـ `{ confirm: "DELETE" }` | **نعم** — نافذة `ConfirmDialog` + كتابة `DELETE` يدوياً |

> منطقة الخطر (clear-transactions) مُعلَّمة بتعليق `TEMPORARY` في
> `settings-view.tsx` — يجب حذفها بعد الإطلاق.

### الصلاحية في الواجهة

تبويب «الصيانة» يظهر فقط للأدوار التي تستطيع رؤية شاشة الإعدادات الكاملة
(OWNER/ADMIN عادةً). البطاقة نفسها لا تُطبّق صلاحية إضافية لأن كل مسار
من المسارات المُستدعَاة يطبّق OWNER/ADMIN على الخادم.

---

## 5. سجل التدقيق (Audit Trail)

| المسار | الإجراء المُسجَّل |
|---|---|
| `/api/admin/clear-transactions` | `CLEAR_TRANSACTIONS` (يُكتب بعد المسح، يحوي counts في metadata) |
| `/api/admin/recalc-stock` | لا يُسجَّل حالياً (لا يُعدّل البيانات بشكل جذري) |
| `/api/admin/fix-stock` | لا يُسجَّل حالياً |
| `/api/seed` | لا يُسجَّل حالياً (لأنه يمسح سجل التدقيق نفسه عند `reset: true`) |
| `/api/admin/apply-*-schema` | لا يُسجَّل (DDL عبر Prisma migrations يُسجَّل في `_prisma_migrations`) |

> `clear-transactions` هو الوحيد الذي يُسجِّل صراحةً لأنه تخريبي ولا رجعة
> فيه. السجل ينجو من المسح كشاهد وحيد.

---

## 6. ملفات مرجعية

| الملف | الدور |
|---|---|
| `src/app/api/admin/recalc-stock/route.ts` | إعادة حساب Product.quantity |
| `src/app/api/admin/fix-stock/route.ts` | إعادة بناء StockItem من السجل |
| `src/app/api/admin/clear-transactions/route.ts` | المسح الكامل (مؤقت) |
| `src/app/api/admin/apply-audit-log-schema/route.ts` | DDL لجدول AuditLog |
| `src/app/api/admin/apply-stock-take-schema/route.ts` | DDL لجداول StockTake |
| `src/app/api/admin/apply-stock-transfer-schema/route.ts` | DDL لجداول StockTransfer |
| `src/app/api/admin/apply-purchase-returns-schema/route.ts` | DDL لجداول PurchaseReturn |
| `src/app/api/admin/apply-indexes/route.ts` | إنشاء الفهارس |
| `src/app/api/admin/analyze/route.ts` | ANALYZE قاعدة البيانات |
| `src/app/api/admin/create-supplier-payment-table/route.ts` | DDL لـ SupplierPayment |
| `src/app/api/seed/route.ts` | زرع البيانات التجريبية |
| `src/components/settings/settings-view.tsx` | `SystemMaintenanceCard` (السطر ~907) |

---

## 7. خلاصة تدريبية

1. هذه مسارات **صيانة** لا تشغيل يومي — OWNER/ADMIN فقط.
2. كلها مُقيّدة ببوابة `ENABLE_ADMIN_DDL` في الإنتاج (تُرجع `403` ما لم تُفعّل).
3. `recalc-stock` آمن ولا يحذف — يُعيد حساب `Product.quantity` من `StockItem`.
4. `fix-stock` آمن مع `dryRun: true` — راجع التقرير قبل التنفيذ.
5. `clear-transactions` تخريبي ولا رجعة فيه — مؤقت قبل الإطلاق فقط، ويتطلب كتابة `DELETE` للتأكيد.
6. `seed` يزرع بيانات تجريبية (يمسح الكل عند `reset: true`) — اضبط `SEED_*_PASSWORD` في الإنتاج.
7. مسارات DDL (`apply-*-schema`) للاستخدام الطارئ فقط — يُفضّل `prisma migrate deploy`.
8. كل المسح الكامل (`clear-transactions`) يُسجَّل بإجراء `CLEAR_TRANSACTIONS` في سجل التدقيق.

</div>
