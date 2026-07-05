<div dir="rtl">

# دليل المساهمة في KWPOS

شكراً لاهتمامك بالمساهمة في مشروع KWPOS! يرجى اتباع القواعد التالية لضمان جودة المشروع واستقراره.

---

## 🚫 قاعدة عدم الانحدار (No Regression)

هذه هي القاعدة الأهم:

- ❌ **لا تحذف** أي ميزة قائمة
- ❌ **لا تعدّل** المنطق المحاسبي أو المالي
- ❌ **لا تكسر** أي واجهة مستخدم قائمة
- ✅ أضف ميزات جديدة **دون** لمس الموجود
- ✅ أصلح الأخطاء **في مكانها** دون إعادة كتابة المكوّن بالكامل

---

## 📋 قبل كل Pull Request

### 1. فحص الكود
```bash
bun run lint
```
يجب أن يكون الناتج **نظيفاً تماماً** (0 أخطاء، 0 تحذيرات).

### 2. اختبار الميزة
- اختبر الميزة في الواجهة (Arabic + English)
- تأكد أن زر تبديل اللغة يعمل بشكل صحيح
- تأكد أن الـ RTL/LTR لا ينكسر

### 3. توثيق التغييرات
- حدّث `System_Progress_Log.md` بقسم جديد يصف التغيير
- اذكر: التاريخ، الملفات المعدّلة، المشكلة المحلولة

---

## 🔤 قواعد الكود

### TypeScript
- استخدم TypeScript في كل ملف (`.ts` / `.tsx`)
- استخدم `interface` للأنواع العامة و`type` للاتحادات
- تجنب `any` قدر الإمكان — استخدم `unknown` مع type guard إذا لزم

### React
- استخدم `"use client"` فقط للمكوّنات التي تحتاج hooks/事件
- استخدم `useT()` للنصوص المترجمة — **لا تكتب عربية مثبتة (hardcoded)**
- استخدم `useFmt()` للعملة والتواريخ — **لا تكتب "د.ك" يدوياً**

### Prisma
- بعد تعديل `schema.prisma`: شغّل `bun run db:push`
- **أعد تشغيل خادم التطوير** بعد `db:push` لتحميل Prisma client المُجدَّد
- لا تستخدم `@map` لتغيير أسماء الأعمدة — استخدم الأسماء كما هي

### i18n
- كل نص في الواجهة يجب أن يمر عبر `useT()` + مفتاح في `src/lib/i18n.ts`
- أضف المفتاح إلى **كل من** الواجهة (interface) + القاموس العربي + القاموس الإنجليزي
- استخدم بادئات الوحدات: `pos*`, `inv*`, `po*`, `rep*`, `prc*`, `shf*`, `spc*`, `dsh*`, `acc*`, `cus*`, `anl*`, `set*`, `int*`

---

## 📝 قواعد الكوميت (Commit Messages)

استخدم صيغة [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>

[optional body]
```

### الأنواع
| النوع | الاستخدام |
|---|---|
| `feat` | ميزة جديدة |
| `fix` | إصلاح خطأ |
| `chore` | صيانة، تنظيف، إعدادات |
| `docs` | توثيق (README, CHANGELOG) |
| `refactor` | إعادة هيكلة دون تغيير السلوك |
| `style` | تنسيق فقط (مسافات، فواصل) |

### أمثلة
```
feat: add exchange anti-fraud validation (14-day rule + remaining qty)
fix: prevent zero-stock product from being added to cart
chore: remove verification screenshots from repo
docs: add professional README.md
```

---

## 🌿 فروع Git

```bash
# أنشئ فرعاً جديداً لكل ميزة
git checkout -b feature/your-feature-name

# بعد الانتهاء:
git push origin feature/your-feature-name
# ثم افتح Pull Request على GitHub
```

---

## 🔒 الأمان

- ❌ لا ترفع `.env` أو أي ملف يحتوي على أسرار
- ❌ لا ترفع `db/*.db` (قاعدة البيانات تحتوي على بيانات حساسة)
- ✅ استخدم `.env.example` كقالب فقط
- ✅ إذا اكتشفت سراً مرفوعاً بالخطأ، أبلغ فوراً وأصلحه

---

## 🧪 الاختبار

حالياً لا يوجد إطار اختبار آلي. قبل كل PR:

1. سجّل الدخول كـ `admin@demo.com / admin123`
2. اختبر الميزة في **الوضع العربي** (RTL)
3. بدّل للإنجليزية وتأكد أنها تعمل في **الوضع الإنجليزي** (LTR)
4. اختبر مع حساب `sales@demo.com` (صلاحيات محدودة)
5. تأكد أن `bun run lint` نظيف

---

## ❓ الأسئلة والدعم

- افتح [Issue](https://github.com/a3laaw/kwpos/issues) على GitHub
- صف المشكلة بوضوح مع لقطات شاشة إن أمكن

---

شكراً لمساهمتك! 🙏

</div>
