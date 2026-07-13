<div dir="rtl">

# 17 — مرجع واجهات برمجة التطبيقات (API Reference)

> دليل مبسّط لمطوّري الواجهات ومديري النظام. يصف مسار كل واجهة، طريقة الطلب (Method)،
> وظيفتها، الصلاحيات المطلوبة، أهم المدخلات وأهم المخرجات.
>
> الرموز المستخدمة:
> - **الصلاحيات:** `ADMIN` · `OWNER` · `MANAGER` · `ACCOUNTANT` · `SALES` · `CASHIER` · `WAREHOUSE` · `مستخدم` (أي مستخدم مسجّل دخوله) · `عام` (بدون تسجيل دخول).
> - مصدر الجداول هو المسارات في `src/app/api/`.

---

## 1) المبيعات (Sales)

| المسار | Method | الوظيفة | الصلاحيات | أبرز المدخلات | أبرز المخرجات |
|---|---|---|---|---|---|
| `/api/sales` | GET | قائمة المبيعات مع بحث وترقيم صفحات | مستخدم | `?q=&page=&pageSize=` | `{ items, pagination }` |
| `/api/sales` | POST | إنشاء فاتورة بيع (POS) | OWNER · ADMIN · MANAGER · SALES · CASHIER | `{ customerName, customerPhone, items:[{productId,quantity,unitPrice?}], discount, paymentMethod, warehouseId? }` | كائن الفاتورة كاملاً + `201` |
| `/api/sales/[id]` | GET | تفاصيل فاتورة واحدة | OWNER · ADMIN · SALES | — | كائن الفاتورة |
| `/api/sales/[id]/refund` | POST | مرتجع جزئي للفاتورة | ADMIN | `{ items:[{saleItemId, returnedQty}], override14Days? }` | الفاتورة بعد التحديث + `refundSummary` + `creditNoteNo` |
| `/api/sales/[id]/cancel` | POST | إلغاء الفاتورة بالكامل | OWNER · ADMIN · MANAGER | `{ reason }` (إلزامي ≥ 3 أحرف) | `{ ok, sale, refundSummary }` |

الملفات: `src/app/api/sales/route.ts` · `src/app/api/sales/[id]/route.ts` · `src/app/api/sales/[id]/refund/route.ts` · `src/app/api/sales/[id]/cancel/route.ts`.

---

## 2) المنتجات (Products)

| المسار | Method | الوظيفة | الصلاحيات | أبرز المدخلات | أبرز المخرجات |
|---|---|---|---|---|---|
| `/api/products` | GET | قائمة المنتجات + فلترة (بحث/فئة/مورد/مخزن/منخفض) | مستخدم | `?q=&categoryId=&supplierId=&warehouseId=&lowStock=true` | `{ items }` (يُخفى `costPrice` لـ SALES/CASHIER) |
| `/api/products` | POST | إنشاء منتج جديد | OWNER · ADMIN · WAREHOUSE | `{ name, barcode?, categoryId?, supplierId?, costPrice, salePrice, wholesalePrice?, corporatePrice?, taxRate?, unit?, warehouseStock?:[{warehouseId,quantity}] }` | كائن المنتج + `201` |
| `/api/products/[id]` | GET | تفاصيل منتج | مستخدم | — | كائن المنتج |
| `/api/products/[id]` | PUT | تحديث منتج + (اختياري) ضبط كميات المستودعات | OWNER · ADMIN · WAREHOUSE | نفس حقول POST + `warehouseStock?` | كائن المنتج |
| `/api/products/[id]` | DELETE | حذف منتج | OWNER · ADMIN · MANAGER | — | `{ ok:true }` |
| `/api/products/generate-barcode` | GET | توليد باركود 13 رقم للفئة | مستخدم | `?categoryId=` | `{ barcode, prefix, sequence }` |

الملفات: `src/app/api/products/route.ts` · `src/app/api/products/[id]/route.ts` · `src/app/api/products/generate-barcode/route.ts`.

---

## 3) العملاء (Customers)

| المسار | Method | الوظيفة | الصلاحيات | أبرز المدخلات | أبرز المخرجات |
|---|---|---|---|---|---|
| `/api/customers` | GET | قائمة العملاء + بحث | مستخدم | `?q=` | `{ items }` |
| `/api/customers` | POST | إنشاء عميل | OWNER · ADMIN · MANAGER · SALES | `{ name, phone?, address?, type?(RETAIL\|WHOLESALE\|CORPORATE) }` | كائن العميل + `201` |
| `/api/customers/[id]` | GET/PUT | عرض/تعديل عميل | مستخدم / OWNER · ADMIN · MANAGER | — / `{ name?, phone?, address?, type? }` | كائن العميل |
| `/api/customers/[id]/statement` | GET | كشف حساب العميل | OWNER · ADMIN · ACCOUNTANT | — | ملخص العمليات |
| `/api/customers/[id]/points` | GET/POST | نقاط الولاء | مستخدم | — | رصيد النقاط |
| `/api/customers/loyalty-report` | GET | تقرير ولاء العملاء | OWNER · ADMIN | — | `{ items }` |

الملفات: `src/app/api/customers/route.ts` · `src/app/api/customers/[id]/route.ts` · `src/app/api/customers/[id]/statement/route.ts` · `src/app/api/customers/[id]/points/route.ts` · `src/app/api/customers/loyalty-report/route.ts`.

---

## 4) الموردون (Suppliers)

| المسار | Method | الوظيفة | الصلاحيات | أبرز المدخلات | أبرز المخرجات |
|---|---|---|---|---|---|
| `/api/suppliers` | GET | قائمة الموردين | مستخدم | — | `{ items }` مع `productsCount` و `ordersCount` |
| `/api/suppliers` | POST | إنشاء مورد | OWNER · ADMIN · WAREHOUSE | `{ name, contact?, phone?, email?, address?, supplierType?(LOCAL\|FOREIGN) }` | كائن المورد + `201` |
| `/api/suppliers/[id]` | GET/PUT/DELETE | عرض/تعديل/حذف | مستخدم / OWNER · ADMIN · WAREHOUSE / OWNER · ADMIN · MANAGER | — / نفس حقول POST / — | كائن المورد / `{ ok:true }` |
| `/api/suppliers/[id]/statement` | GET | كشف حساب المورد | OWNER · ADMIN · ACCOUNTANT | — | ملخص العمليات |
| `/api/suppliers/balances` | GET | أرصدة الموردين | OWNER · ADMIN · ACCOUNTANT | — | `{ items }` |

الملفات: `src/app/api/suppliers/route.ts` · `src/app/api/suppliers/[id]/route.ts` · `src/app/api/suppliers/[id]/statement/route.ts` · `src/app/api/suppliers/balances/route.ts`.

---

## 5) المشتريات (Purchase Orders & Invoices)

| المسار | Method | الوظيفة | الصلاحيات | أبرز المدخلات | أبرز المخرجات |
|---|---|---|---|---|---|
| `/api/purchase-orders` | GET | قائمة أوامر الشراء | مستخدم | `?status=` | `{ items }` |
| `/api/purchase-orders` | POST | إنشاء أمر شراء | OWNER · ADMIN · WAREHOUSE | `{ supplierId, items:[{productId,quantity,unitCost,suggestedSalePrice?}], customsAmount?, shippingAmount?, otherCharges?, taxRate?, note? }` | كائن الأمر + `201` |
| `/api/purchase-orders/[id]` | GET/PUT/DELETE | عرض/تحديث/حذف أمر | مستخدم / OWNER·ADMIN·WAREHOUSE / OWNER·ADMIN·MANAGER | `?note&status` / — | كائن الأمر / `{ ok:true }` (يُرفض الحذف إذا كان مستلماً) |
| `/api/purchase-orders/[id]` | PATCH | اعتماد/رفض أمر تلقائي | OWNER · ADMIN | `{ status: APPROVED\|REJECTED, items?:[{id,quantity,unitCost}], rejectionReason? }` | كائن الأمر |
| `/api/purchase-orders/[id]/receive` | POST | استلام البضاعة + تحديث التكلفة + قيد محاسبي | OWNER · ADMIN · WAREHOUSE | `{ customsAmount?, shippingAmount?, otherCharges? }` | كائن الأمر بعد الاستلام |
| `/api/purchase-orders/auto-draft` | POST | إنشاء أمر تلقائي مسود | OWNER · ADMIN | — | كائن الأمر |
| `/api/purchase-invoices` | GET | قائمة فواتير الشراء | مستخدم | — | `{ items }` |
| `/api/purchase-invoices` | POST | إنشاء فاتورة شراء (DRAFT أو POSTED) | OWNER · ADMIN · WAREHOUSE | `{ supplierId, warehouseId?, purchaseOrderId?, items:[{productId,quantity,unitCost}], taxRate?, discount?, shipping?, customs?, otherCharges?, post?:boolean, paymentMethod? }` | كائن الفاتورة + `201` |
| `/api/purchase-invoices/[id]` | GET/PUT | عرض/تعديل فاتورة | مستخدم / OWNER·ADMIN·WAREHOUSE | — | كائن الفاتورة |
| `/api/purchase-invoices/[id]/post` | POST | ترحيل فاتورة DRAFT → POSTED | OWNER · ADMIN · WAREHOUSE | — | `{ id, invoiceNo, status, journalEntryId }` |

الملفات: `src/app/api/purchase-orders/route.ts` · `src/app/api/purchase-orders/[id]/route.ts` · `src/app/api/purchase-orders/[id]/receive/route.ts` · `src/app/api/purchase-orders/auto-draft/route.ts` · `src/app/api/purchase-invoices/route.ts` · `src/app/api/purchase-invoices/[id]/route.ts` · `src/app/api/purchase-invoices/[id]/post/route.ts`.

---

## 6) المحاسبة (Accounting)

| المسار | Method | الوظيفة | الصلاحيات | أبرز المدخلات | أبرز المخرجات |
|---|---|---|---|---|---|
| `/api/accounts` | GET | شجرة الحسابات + الأرصدة | ADMIN | — | `{ items, flat }` |
| `/api/accounts` | POST | إنشاء حساب | ADMIN | `{ code, name, type(ASSET\|LIABILITY\|EQUITY\|REVENUE\|EXPENSE), parentId? }` | كائن الحساب + `201` |
| `/api/accounts/[id]` | GET/PUT/DELETE | إدارة حساب | ADMIN | — / نفس POST / — | كائن الحساب |
| `/api/journal-entries` | GET | قيود اليومية (آخر 100) | OWNER · ADMIN · ACCOUNTANT | `?sourceType=` | `{ items }` |
| `/api/journal-entries/manual` | POST | قيد يدوي | OWNER · ADMIN · ACCOUNTANT | `{ description, date?, lines:[{accountCode, debit, credit, description?}] }` | `{ ok:true, id }` + `201` |
| `/api/expenses` | GET/POST | مصاريف (رواتب/إدارية) | OWNER · ADMIN · ACCOUNTANT | `?type=SALARY\|ADMIN` / `{ type, amount, accountId, paymentAccountId, ... }` | `{ items }` / كائن المصروف |
| `/api/trial-balance` | GET | ميزان المراجعة | ADMIN | — | `{ rows, totalDebit, totalCredit }` |
| `/api/financial-reports` | GET | قائمة الدخل | OWNER · ADMIN · ACCOUNTANT | `?from=&to=` | تقرير PnL |
| `/api/financial-reports/balance-sheet` | GET | الميزانية العمومية | OWNER · ADMIN · ACCOUNTANT | `?at=` | تقرير الميزانية |
| `/api/financial-reports/cash-flow` | GET | التدفقات النقدية | OWNER · ADMIN · ACCOUNTANT | `?from=&to=` | تقرير التدفقات |
| `/api/financial-reports/general-ledger` | GET | الأستاذ العام | OWNER · ADMIN · ACCOUNTANT | `?from=&to=&accountId=` | `{ items }` |
| `/api/financial-reports/vat` | GET | تقرير ضريبة القيمة المضافة | OWNER · ADMIN · ACCOUNTANT | `?from=&to=` | ملخص الضريبة |

الملفات: `src/app/api/accounts/route.ts` · `src/app/api/journal-entries/route.ts` · `src/app/api/journal-entries/manual/route.ts` · `src/app/api/expenses/route.ts` · `src/app/api/trial-balance/route.ts` · `src/app/api/financial-reports/route.ts` · `src/app/api/financial-reports/balance-sheet/route.ts` · `src/app/api/financial-reports/cash-flow/route.ts` · `src/app/api/financial-reports/general-ledger/route.ts` · `src/app/api/financial-reports/vat/route.ts`.

> مدفوعات الموردين: `src/app/api/suppliers/[id]/pay/` · `src/app/api/supplier-payments/route.ts` (POST ينشئ سند صرف + قيد: مدين 2010 ذمم دائنة / دائن 1010 نقدية أو 1020 بنك).

---

## 7) الإعدادات والمستخدمون (Settings & Users)

| المسار | Method | الوظيفة | الصلاحيات | أبرز المدخلات | أبرز المخرجات |
|---|---|---|---|---|---|
| `/api/settings` | GET | إعدادات الدولة النشطة | عام | — | `{ code, currency, ... }` |
| `/api/settings` | PUT | تغيير الدولة النشطة | ADMIN | `{ code }` (KW · SA · AE …) | كائن الدولة |
| `/api/users` | GET | قائمة المستخدمين | OWNER · ADMIN | — | `{ items }` (بدون `passwordHash`) |
| `/api/users` | POST | إنشاء مستخدم | OWNER · ADMIN | `{ email, name, password, role, warehouseId? }` | كائن المستخدم + `201` |
| `/api/users/[id]` | GET/PUT/DELETE | إدارة مستخدم | OWNER · ADMIN | — / `{ email?, name?, password?, role?, warehouseId? }` / — | كائن المستخدم |
| `/api/users/change-password` | POST | تغيير كلمة المرور الخاصة بالمسجّل دخوله | مستخدم | `{ oldPassword, newPassword, confirmPassword }` | `{ ok:true }` |
| `/api/users/me/preferences` | GET/PUT | تفضيلات المستخدم الحالي | مستخدم | `{ posExpressMode? }` | التفضيلات |

الملفات: `src/app/api/settings/route.ts` · `src/app/api/users/route.ts` · `src/app/api/users/[id]/route.ts` · `src/app/api/users/change-password/route.ts` · `src/app/api/users/me/preferences/route.ts`.

> قوة كلمة المرور مُبسّطة: الحد الأدنى 4 أحرف (انظر `validatePasswordStrength` في `src/app/api/users/route.ts`).

---

## 8) المخازن والتصنيفات والوحدات (Warehouses · Categories · Units)

| المسار | Method | الوظيفة | الصلاحيات | أبرز المدخلات | أبرز المخرجات |
|---|---|---|---|---|---|
| `/api/warehouses` | GET | قائمة المخازن | مستخدم | — | `{ items }` |
| `/api/warehouses` | POST | إنشاء مخزن | ADMIN · WAREHOUSE | `{ name, code?, location?, isActive? }` | كائن المخزن + `201` |
| `/api/warehouses/[id]` | GET/PUT/DELETE | إدارة مخزن | مستخدم / ADMIN·WAREHOUSE / ADMIN | — | كائن المخزن |
| `/api/categories` | GET | قائمة التصنيفات + شجرة | مستخدم | — | `{ items, tree }` |
| `/api/categories` | POST | إنشاء تصنيف | OWNER · ADMIN · WAREHOUSE | `{ name, code?, parentId?, barcodePrefix? }` | كائن التصنيف + `201` |
| `/api/categories/[id]` | GET/PUT/DELETE | إدارة تصنيف | مستخدم / OWNER·ADMIN·WAREHOUSE / OWNER·ADMIN | — | كائن التصنيف |
| `/api/units` | GET | قائمة الوحدات | مستخدم | — | `{ items }` |
| `/api/units` | POST | إنشاء وحدة | ADMIN | `{ name }` | كائن الوحدة + `201` |
| `/api/units/[id]` | DELETE | حذف وحدة | ADMIN | — | `{ ok:true }` |

الملفات: `src/app/api/warehouses/route.ts` · `src/app/api/warehouses/[id]/route.ts` · `src/app/api/categories/route.ts` · `src/app/api/categories/[id]/route.ts` · `src/app/api/units/route.ts` · `src/app/api/units/[id]/route.ts`.

---

## 9) الجرد والتحويلات والتفتيش (Stock Takes · Transfers · Spot Checks)

| المسار | Method | الوظيفة | الصلاحيات | أبرز المدخلات | أبرز المخرجات |
|---|---|---|---|---|---|
| `/api/stock-takes` | GET | قائمة عمليات الجرد | مستخدم | — | `{ items }` (آخر 50) |
| `/api/stock-takes` | POST | إنشاء جرد كمسودة | OWNER · ADMIN · WAREHOUSE | `{ warehouseId?, note?, items:[{productId, actualQty}] }` | كائن الجرد + `201` |
| `/api/stock-takes/[id]/approve` | POST | اعتماد الجرد + تعديل المخزون + قيد | OWNER · ADMIN · WAREHOUSE | — | `{ ok, id, takeNo, status, summary }` |
| `/api/stock-transfers` | GET | قائمة التحويلات | مستخدم | — | `{ items }` (آخر 50) |
| `/api/stock-transfers` | POST | تحويل صادر (OUT) | OWNER · ADMIN · WAREHOUSE | `{ fromWarehouseId, toWarehouseId, items:[{productId,quantity}], note? }` | كائن التحويل + `201` |
| `/api/stock-transfers/[id]/receive` | POST | استلام تحويل | OWNER · ADMIN · WAREHOUSE | — | كائن التحويل |
| `/api/spot-checks` | GET | قائمة تفتيش أعمى | مستخدم | — | `{ items }` |
| `/api/spot-checks` | POST | تسجيل تفتيش أعمى | مستخدم | `{ productId, countedQty, note? }` | `{ ... , variance }` |

الملفات: `src/app/api/stock-takes/route.ts` · `src/app/api/stock-takes/[id]/approve/route.ts` · `src/app/api/stock-transfers/route.ts` · `src/app/api/stock-transfers/[id]/receive/route.ts` · `src/app/api/spot-checks/route.ts`.

---

## 10) الباقات والتركيبات (Bundles & Compositions)

| المسار | Method | الوظيفة | الصلاحيات | أبرز المدخلات | أبرز المخرجات |
|---|---|---|---|---|---|
| `/api/bundles` | GET | قائمة الباقات (تفعيل/إيقاف تلقائي حسب التاريخ) | مستخدم | `?q=&active=true\|false` | `{ items }` (يُخفى التكلفة لـ SALES/CASHIER) |
| `/api/bundles` | POST | إنشاء باقة | OWNER · ADMIN · WAREHOUSE | `{ name, salePrice, items:[{productId,quantity}], description?, imageUrl?, isActive?, startDate?, endDate?, category? }` | كائن الباقة + `201` |
| `/api/bundles/[id]` | GET/PUT/DELETE | إدارة باقة | OWNER · ADMIN · WAREHOUSE | — | كائن الباقة |
| `/api/compositions` | GET | قائمة التركيبات (الوصفات) | مستخدم | `?q=&active=true\|false` | `{ items }` |
| `/api/compositions` | POST | إنشاء تركيبة | OWNER · ADMIN · WAREHOUSE | `{ name, outputProductId? , createNewProduct?:boolean, profitAmount?, yieldQty, yieldUnit?, ingredients:[{productId,quantity,unit?,notes?}], ... }` | كائن التركيبة + `201` |
| `/api/compositions/[id]` | GET/PUT/DELETE | إدارة تركيبة | OWNER · ADMIN · WAREHOUSE | — | كائن التركيبة |
| `/api/compositions/[id]/produce` | POST | إنتاج دفعة من المنتج النهائي | OWNER · ADMIN · WAREHOUSE | `{ batches?:number }` أو `{ quantity?:number }` | `{ ok, produced, unit }` |

الملفات: `src/app/api/bundles/route.ts` · `src/app/api/bundles/[id]/route.ts` · `src/app/api/compositions/route.ts` · `src/app/api/compositions/[id]/route.ts` · `src/app/api/compositions/[id]/produce/route.ts`.

---

## 11) التسعير والعروض (Pricing & Promotions)

| المسار | Method | الوظيفة | الصلاحيات | أبرز المدخلات | أبرز المخرجات |
|---|---|---|---|---|---|
| `/api/promotions` | GET | قائمة العروض | مستخدم | — | `{ items }` |
| `/api/promotions` | POST | إنشاء عرض | ADMIN (canManagePricing) | `{ scope:PRODUCT\|CATEGORY\|ALL\|ALL_EXCEPT_CATEGORIES, productId?, categoryIds?:[], discountType:PERCENT\|AMOUNT, discountValue, startAt, endAt, note? }` | `{ id, ok }` + `201` |
| `/api/promotions` | DELETE | إيقاف عرض (Soft-deactivate) | ADMIN | `?id=` | `{ ok:true }` |
| `/api/pricing` | GET | جدول التسعير لكل المنتجات + العروض النشطة | مستخدم | — | `{ items }` |
| `/api/pricing/effective` | GET | السعر الفعلي لمنتج/عميل | مستخدم | `?productId=&customerId=` | السعر النهائي |
| `/api/pricing/audit` | GET | سجل تغيير الأسعار | OWNER · ADMIN | — | `{ items }` |

الملفات: `src/app/api/promotions/route.ts` · `src/app/api/pricing/route.ts` · `src/app/api/pricing/effective/route.ts` · `src/app/api/pricing/audit/route.ts`.

---

## 12) الورديات (Shifts)

| المسار | Method | الوظيفة | الصلاحيات | أبرز المدخلات | أبرز المخرجات |
|---|---|---|---|---|---|
| `/api/shifts` | GET | قائمة الورديات | مستخدم | `?status=OPEN\|CLOSED` | `{ items }` (آخر 50) |
| `/api/shifts` | POST | فتح وردية | مستخدم | `{ openingBalance }` | `{ id, shiftNo, status, openingBalance }` + `201` |
| `/api/shifts` | PATCH | إغلاق وردية + قيد العجز/الفائض | مستخدم | `{ id, countedCash, countedKnet, countedVisa, note? }` | `{ ...expected, counted, variance }` |
| `/api/shifts/current` | GET | وردية المستخدم المفتوحة حالياً | مستخدم | — | `{ shift: null \| {...} }` |
| `/api/shifts/[id]/approve` | POST | اعتماد إغلاق وردية | OWNER · ADMIN · MANAGER | — | `{ ok }` |
| `/api/shifts/[id]/close` | POST | إغلاق وردية (بديل) | مستخدم | — | كائن الوردية |

الملفات: `src/app/api/shifts/route.ts` · `src/app/api/shifts/current/route.ts` · `src/app/api/shifts/[id]/approve/route.ts` · `src/app/api/shifts/[id]/close/route.ts`.

---

## 13) الاستيراد والتصدير (Excel)

| المسار | Method | الوظيفة | الصلاحيات | أبرز المدخلات | أبرز المخرجات |
|---|---|---|---|---|---|
| `/api/excel/import-products` | POST | استيراد ملف منتجات (.xlsx/.xls/.csv) | ADMIN · WAREHOUSE | FormData: `file` (≤ 5 ميجابايت، ≤ 5000 صف) | `{ created, updated, skipped, catsCreated, errors }` |
| `/api/excel/import-customers` | POST | استيراد ملف عملاء | OWNER · ADMIN · MANAGER | FormData: `file` | `{ created, updated, skipped, errors }` |
| `/api/excel/export` | GET | تصدير إلى .xlsx | مستخدم (مع قيود حسب الدور) | `?type=sales\|products\|journal\|customers\|suppliers&from=&to=` | ملف `xlsx` |

الملفات: `src/app/api/excel/import-products/route.ts` · `src/app/api/excel/import-customers/route.ts` · `src/app/api/excel/export/route.ts`.

---

## 14) التقارير والتحليلات (Reports & Analytics)

| المسار | Method | الوظيفة | الصلاحيات | أبرز المدخلات | أبرز المخرجات |
|---|---|---|---|---|---|
| `/api/reports` | GET | تقرير موحّد (KPI + توزيعات) | مستخدم | `?from=&to=&productId=&categoryId=&paymentMethod=&source=POS\|SHOPIFY` | `{ summary, byProduct, byCategory, byDay, byPayment, filters, products, categories }` |
| `/api/reports/matrix` | GET | مصفوفة تقارير متقدمة | OWNER · ADMIN | — | `{ items }` |
| `/api/dashboard` | GET | لوحة المبيعات | مستخدم | — | KPIs اليوم |
| `/api/dashboard/manager` | GET | لوحة المدير | OWNER · ADMIN · MANAGER | — | KPIs شاملة |
| `/api/analytics` | GET | تحليلات إضافية | OWNER · ADMIN | — | `{ items }` |
| `/api/audit-logs` | GET | سجل التدقيق | OWNER · ADMIN | — | `{ items }` |
| `/api/audit-logs/void-rate` | GET | معدّل الإلغاء | OWNER · ADMIN | — | نسبة الإلغاء |

الملفات: `src/app/api/reports/route.ts` · `src/app/api/reports/matrix/route.ts` · `src/app/api/dashboard/route.ts` · `src/app/api/dashboard/manager/route.ts` · `src/app/api/analytics/route.ts` · `src/app/api/audit-logs/route.ts` · `src/app/api/audit-logs/void-rate/route.ts`.

---

## 15) عمليات النظام والتشخيص (Diagnose · Bootstrap · Seed · Search)

| المسار | Method | الوظيفة | الصلاحيات | أبرز المدخلات | أبرز المخرجات |
|---|---|---|---|---|---|
| `/api/diagnose` | GET | فحص اتصال قاعدة البيانات + وجود الأدمن | عام | — | `{ env, dbConnected, userCount, adminExists, diagnosis }` |
| `/api/bootstrap-admin` | POST | إنشاء/إعادة تعيين حساب `admin@demo.com` | عام (يتطلب معرفة `BOOTSTRAP_ADMIN_PASSWORD`) | `{ password }` | `{ ok, admin, loginHint }` |
| `/api/seed` | POST | زرع بيانات أولية (اختياري `reset:true`) | ADMIN | `{ reset? }` | `{ ok, message, users }` |
| `/api/search` | GET | بحث عام | مستخدم | `?q=` | `{ items }` |
| `/api/notifications` | GET | إشعارات المستخدم | مستخدم | — | `{ items }` |
| `/api/admin/apply-*-schema` | POST | تطبيق migrations نقصية | OWNER · ADMIN | — | `{ ok }` |
| `/api/admin/apply-indexes` | POST | إضافة فهارس أداء | OWNER · ADMIN | — | `{ ok }` |
| `/api/admin/analyze` | GET | تحليل الأداء | OWNER · ADMIN | — | تقرير |

الملفات: `src/app/api/diagnose/route.ts` · `src/app/api/bootstrap-admin/route.ts` · `src/app/api/seed/route.ts` · `src/app/api/search/route.ts` · `src/app/api/notifications/route.ts` · `src/app/api/admin/apply-audit-log-schema/route.ts` · `src/app/api/admin/apply-stock-transfer-schema/route.ts` · `src/app/api/admin/apply-stock-take-schema/route.ts` · `src/app/api/admin/apply-purchase-returns-schema/route.ts` · `src/app/api/admin/apply-indexes/route.ts` · `src/app/api/admin/analyze/route.ts` · `src/app/api/admin/create-supplier-payment-table/route.ts`.

---

## 16) تكامل Shopify

| المسار | Method | الوظيفة | الصلاحيات | أبرز المدخلات | أبرز المخرجات |
|---|---|---|---|---|---|
| `/api/shopify/status` | GET | حالة الاتصال بـ Shopify | OWNER · ADMIN | — | `{ connected, domain? }` |
| `/api/shopify/sync-products` | POST | مزامنة المنتجات مع Shopify | OWNER · ADMIN | — | `{ ok, synced }` |
| `/api/shopify/import-orders` | POST | استيراد الطلبات | OWNER · ADMIN | `{ since? }` | `{ ok, imported }` |

> متغيرات البيئة المطلوبة: `SHOPIFY_STORE_DOMAIN` و `SHOPIFY_ACCESS_TOKEN` (انظر `src/lib/shopify.ts`). ملف المصدر: `src/app/api/shopify/`.

---

## ملاحظات عامة

- جميع المسارات تحت `/api/*` ترجع JSON.
- الترويسة `dynamic = "force-dynamic"` مستخدمة في معظم المسارات لمنع التخزين المؤقت (caching) على Vercel.
- كل عمليات الكتابة المالية تعمل داخل `db.$transaction` لضمان الذرية (atomicity)، مع تحديد `timeout` و `maxWait` لتقليل احتمال خطأ PgBouncer `Transaction not found`.
- الحقول المالية تُقرَّب إلى 3 منازل عشرية (دالة `r(v)` المتكررة في المسارات).
- تفاصيل الأخطاء وأسبابها موثّقة بالكامل في `docs/19-errors-troubleshooting.md`.

</div>
