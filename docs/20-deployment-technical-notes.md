<div dir="rtl">

# 20 — ملاحظات النشر والتشغيل التقنية (Deployment & Technical Notes)

> ملاحظات موجّهة لمدير النظام المسؤول عن نشر التطبيق وصيانته. يفترض هذا الملف
> إلماماً أساسياً بلوحة تحكم Vercel و Supabase. المصادر المعتمدة: `DEPLOY.md`،
> `vercel.json`، `src/lib/db.ts`، `src/lib/auth.ts`، `prisma/schema.prisma`.

---

## 1) Supabase — قاعدة البيانات

**ما هي:** منصة استضافة قواعد بيانات PostgreSQL مُدارة بالكامل. يستخدمها KWPOS كقاعدة
بيانات رئيسية مع لوحة تحكم ويب و SQL Editor ونسخ احتياطي تلقائي.

**كيفية الوصول:**
1. اذهب إلى https://app.supabase.com وادخل بمشروعك.
2. اختر المشروع من القائمة.
3. الأقسام المهمة:
   - **Database** — جداول قاعدة البيانات + مراقبة الاتصالات.
   - **SQL Editor** — لتنفيذ سكربتات SQL مباشرة (مigrations يدوية، فحوصات).
   - **Backups** — نسخ احتياطية يومية (الخطة المجانية تحتفظ بـ 7 أيام).
   - **Project Settings → Database** — روابط الاتصال (Connection strings).

**SQL Editor — الاستخدام الشائع:**
- التحقق من وجود جدول: `SELECT to_regclass('public."User"');`
- عدّ المستخدمين: `SELECT count(*) FROM "User";`
- إعادة تعيين أدمن (بديل عن `/api/bootstrap-admin`):
  ```sql
  UPDATE "User"
  SET "passwordHash" = '<bcrypt hash>'
  WHERE email = 'admin@demo.com';
  ```
- إصلاح قيد مفقود: شغّل migration عكسي من `prisma/migrations/`.

---

## 2) Vercel — الاستضافة والتشغيل

**ما هي:** منصة استضافة تطبيقات Next.js serverless. كل صفحة وكل مسار `/api/*` يعمل
كـ function مستقل قد يُنسخ عبر instances متعددة.

**العمليات اليومية:**
- **Deployments:** قائمة كل عمليات النشر. كل `git push` على الفرع الرئيسي يُشغّل بناءً
  تلقائياً.
- **Environment Variables:** Settings → Environment Variables. يجب أن تكون لكل من
  Production و Preview و Development حسب الحاجة.
- **Logs:** كل function له سجل مباشر (Realtime Logs) مفيد لتتبّع الأخطاء.
- **Redeploy:** لإعادة نشر نسخة سابقة دون دفع كود جديد — Deployments → ⋯ → Redeploy.

**`vercel.json` (موجود في المستودع):**
```json
{
  "framework": "nextjs",
  "installCommand": "bun install",
  "regions": ["syd1"]
}
```
- `regions: ["syd1"]` — منطقة سيدني بأستراليا. **يجب أن تتطابق مع منطقة مشروع Supabase**
  لتقليل زمن الاستجابة. إذا كان Supabase في `us-east-1` غيّرها إلى `iad1` أو ما يكافئها.
- `installCommand: "bun install"` — يستخدم bun بدل npm لتسريع البناء.

---

## 3) Prisma — ORM وإدارة المخطط

**ملف المخطط:** `prisma/schema.prisma` يحتوي على تعريف كل النماذج والعلاقات.
بدايته:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")
}
```

**الأوامر الأساسية:**

| الأمر | متى يُستخدم | ملاحظة |
|---|---|---|
| `npx prisma migrate dev` | تطوير محلي | يُنشئ migration جديد ويطبّقه |
| `npx prisma migrate deploy` | **الإنتاج فقط** | يطبّق migrations المعلّقة دون تفاعل |
| `npx prisma generate` | بعد كل تحديث للمخطط | يُولّد Prisma Client |
| `npx prisma db push` | تطوير محلي فقط | ⚠️ **ممنوع على الإنتاج** — يتجاوز migrations |
| `npx prisma studio` | تطوير محلي | واجهة ويب لتصفّح البيانات |

> **تحذير من `DEPLOY.md`:** لا تستخدم `db push` على الإنتاج. استخدم `migrate deploy`
> فقط. `db push` يمكن أن يحذف أعمدة وبيانات إذا تغيّر المخطط بشكل غير متوافق.

**كيفية إنشاء migration جديد:**
```bash
# محلياً (مع DATABASE_URL تشير إلى قاعدة تطوير)
npx prisma migrate dev --name add_xxx_field

# راجع الملف المنشأ في prisma/migrations/
git add prisma/migrations/
git commit -m "prisma: add xxx field"
git push  # Vercel سيشغّل migrate deploy تلقائياً في build
```

---

## 4) NextAuth — المصادقة والجلسات

**الملف:** `src/lib/auth.ts`.

- **الاستراتيجية:** `jwt` — جلسة بدون قاعدة بيانات (stateless).
- **المدة:** 7 أيام (`maxAge: 60*60*24*7`).
- **التشفير:** يستخدم `NEXTAUTH_SECRET` لتشفير وفك تشفير توكن JWT.
- **التحقق من كلمة المرور:** `bcryptjs.compare`.
- **تسجيل الدخول:** يدعم البريد الإلكتروني **أو** اسم المستخدم (الجزء قبل @ أو
  الحقل `name`). انظر `authorize()` في `src/lib/auth.ts`.
- **الصفحات:** `signIn: "/"` — صفحة الدخول هي الصفحة الرئيسية.

**متغيرات البيئة المطلوبة:**

| المتغير | الغرض | توليد قيمة |
|---|---|---|
| `NEXTAUTH_URL` | رابط التطبيق الأساسي | `https://your-app.vercel.app` |
| `NEXTAUTH_SECRET` | تشفير JWT | `openssl rand -base64 32` |
| `AUDIT_INTERNAL_SECRET` | توقيع طلبات التدقيق الداخلية | `openssl rand -base64 32` |

> **مهم:** لا تغيّر `NEXTAUTH_SECRET` على بيئة فيها جلسات نشطة — كل الجلسات
> ستُبطل ويضطر المستخدمون لإعادة الدخول. الكود في `src/lib/auth.ts` يكتم
> أخطاء `JWEDecryptionFailed` بهدوء ويعيد المستخدم لصفحة الدخول.

---

## 5) متغيرات البيئة (Environment Variables) — المرجع الكامل

| المتغير | مثال القيمة | الغرض | ملاحظات |
|---|---|---|---|
| `DATABASE_URL` | `postgresql://postgres.REF:PWD@aws-ME.pooler.supabase.com:6543/postgres?pgbouncer=true` | اتصال PgBouncer للـ migrations | منفذ 6543 + `pgbouncer=true` |
| `DIRECT_DATABASE_URL` | `postgresql://postgres:PWD@db.REF.supabase.co:5432/postgres` | اتصال مباشر لوقت التشغيل (interactive transactions) | منفذ 5432، **بدون** `pgbouncer`. الكود يضيف `connection_limit=3` تلقائياً |
| `NEXTAUTH_URL` | `https://kwpos.vercel.app` | رابط التطبيق | يجب أن يطابق نطاق Vercel |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | تشفير JWT | إلزامي — بدونه الجلسات تتعطل |
| `AUDIT_INTERNAL_SECRET` | `openssl rand -base64 32` | توقيع سجلات التدقيق الداخلية | إلزامي |
| `BOOTSTRAP_ADMIN_PASSWORD` | سلسلة قوية | كلمة مرور أدمن الطوارئ | يستخدمها `/api/bootstrap-admin` لإنشاء/إعادة تعيين `admin@demo.com` |
| `SHOPIFY_STORE_DOMAIN` | `my-store.myshopify.com` | نطاق متجر Shopify | اختياري — لتفعيل التكامل |
| `SHOPIFY_ACCESS_TOKEN` | `shpat_...` | توكن وصول Shopify API | اختياري — يُولّد من لوحة Shopify |
| `SEED_ADMIN_PASSWORD` | كلمة قوية | كلمة مرور الأدمن عند `POST /api/seed` | اختياري — يُستخدم فقط في الزرع الأولي |
| `SEED_SALES_PASSWORD` | كلمة قوية | كلمة مرور حساب `sales` المُ seeded | اختياري |

> ملاحظة على `DATABASE_URL`: يميّز `DEPLOY.md` بين:
> - **Pooled** (`?pgbouncer=true`) — يستخدمه `migrate deploy` فقط (يتسامح مع
>   اتصالات قصيرة).
> - **Direct** (لا `pgbouncer`) — يستخدمه Prisma Client في وقت التشغيل لدعم
>   `db.$transaction` (interactive transactions). الكود في `src/lib/db.ts` يفضّل
>   `DIRECT_DATABASE_URL` تلقائياً.

---

## 6) كيفية النشر (Deployment Workflow)

### المسار القياسي
```bash
# 1) محلياً — تطوير الميزة
git checkout -b feature/xxx
# ... تعديل الكود ...
npm run lint && npm run build  # تحقق محلي

# 2) دفع لـ GitHub
git add .
git commit -m "feat: xxx"
git push origin feature/xxx

# 3) Pull Request على GitHub
# - Vercel ينشئ deployment معاينة (Preview) تلقائياً
# - اختبر الرابط المعروض في PR

# 4) دمج على main
# - Vercel ينشر تلقائياً على Production
# - تأكد من نجاح Build Logs
```

### النشر الأولي (لمشروع جديد)
1. استورد المستودع `https://github.com/a3laaw/kwpos.git` على Vercel.
2. أضف كل متغيرات البيئة من الجدول أعلاه (لـ Production).
3. اضغط Deploy. انتظر `✓ Ready`.
4. شغّل `npx prisma migrate deploy` محلياً ضد قاعدة Supabase (أو مفعّل من build script).
5. شغّل `POST /api/bootstrap-admin` لإنشاء حساب الأدمن الأول.
6. نفّذ اختبارات الدخان (Smoke Tests) من القسم 7 في `DEPLOY.md`.

### إعادة النشر (Rollback)
- Vercel → Deployments → اختر آخر deployment ناجح → ⋯ → **Redeploy**.
- لا يحتاج دفع كود — يعيد بناء نفس الـ commit.

---

## 7) النسخ الاحتياطي (Backup)

### Supabase Backup التلقائي
- الخطة المجانية: نسخ يومية تُحفظ لـ **7 أيام**.
- الخطة المدفوعة (Pro): نسخ يومية تُحفظ لـ 30 يوم + Point-in-Time Recovery (PITR).

### استعادة نسخة
1. Supabase Dashboard → Database → Backups.
2. اختر التاريخ المطلوب ← **Restore**.
3. انتظر — قد تستغرق دقائق حسب حجم القاعدة.
4. أعد نشر التطبيق على Vercel لتجديد اتصالات Prisma.

### نسخ يدوي عبر SQL Editor
```sql
-- تصدير هيكل الجداول
pg_dump --schema=public --no-owner --no-privileges \
  "postgresql://postgres:PWD@db.REF.supabase.co:5432/postgres" \
  > backup_$(date +%Y%m%d).sql
```
أو استخدم واجهة Supabase → Database → **Export data**.

### تصدير بيانات محددة عبر التطبيق
- `GET /api/excel/export?type=sales&from=&to=` — تصدير المبيعات.
- `GET /api/excel/export?type=products` — تصدير المنتجات.
- `GET /api/excel/export?type=journal` — تصدير القيود.

---

## 8) تشغيل migrations عبر Supabase SQL Editor

### الطريقة الموصى بها: `prisma migrate deploy`
```bash
# محلياً مع متغيرات البيئة مضبوطة
export DATABASE_URL="...pooler..."
export DIRECT_DATABASE_URL="...direct..."
npx prisma migrate deploy
```

### الطريقة اليدوية (SQL Editor)
1. افتح ملف migration من `prisma/migrations/<timestamp>_xxx/migration.sql`.
2. الصقه في Supabase → SQL Editor → New query.
3. شغّله (Run).
4. أنشئ صفّاً في جدول `_prisma_migrations` يدوياً لإعلام Prisma بأن الـ migration طُبّق:
   ```sql
   INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, applied_steps_count)
   VALUES (gen_random_uuid(), '', '<timestamp>_xxx', now(), 1);
   ```

### فحوصات ما بعد الـ migration
```sql
-- تأكد من وجود الجداول الأساسية
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- عدّ السجلات في كل جدول أساسي
SELECT
  (SELECT count(*) FROM "User") AS users,
  (SELECT count(*) FROM "Product") AS products,
  (SELECT count(*) FROM "Sale") AS sales,
  (SELECT count(*) FROM "Account") AS accounts,
  (SELECT count(*) FROM "JournalEntry") AS journal_entries;
```

---

## 9) المخاطر التشغيلية (Operational Risks)

### 1. نفاد اتصالات Supabase (Connection Pool Exhaustion)
- **المشكلة:** Vercel serverless يفتح اتصالاً لكل instance. Supabase Free يحدّ بـ ~15
  اتصالاً مباشراً. تحت حمل عالٍ تنفد الاتصالات وتبدأ الطلبات بالفشل بـ 500.
- **التخفيف:**
  - الكود يضيف `connection_limit=3` لكل instance (انظر `src/lib/db.ts`).
  - الكود يخزّن `PrismaClient` في `globalThis` لمنع إنشاء عميل جديد لكل طلب.
  - راقب Supabase → Database → Connections باستمرار.
- **الحل الطارئ:** أعد نشر التطبيق على Vercel لإعادة تدوير instances.

### 2. مهلة الدوال على Vercel Hobby (Function Timeouts)
- **المشكلة:** خطة Hobby تحدّد مهلة 10 ثوانٍ لكل serverless function. عمليات مثل
  ترحيل فاتورة شراء كبيرة، أو اعتماد جرد ضخم، أو توليد تقرير شهر كامل قد تتجاوزها.
- **التخفيف:**
  - قلّل نطاق التقاreport بـ `?from=&to=`.
  - جزّء عمليات الاستيراد الكبيرة (≤ 5000 صف لكل ملف).
  - للحالات الحرجة: انتقل لخطة Vercel Pro (مهلة 60 ثانية) أو فكّك المعاملة.
- **في الكود:** كل المعاملات الحساسة تستخدم `timeout: 10000` و `maxWait: 5000`
  داخل `db.$transaction`.

### 3. PgBouncer + Interactive Transactions (الخطأ `Transaction not found`)
- **المشكلة:** PgBouncer في وضع `transaction pooling` يغلق الاتصال بين الاستعلامات،
  مما يكسر `db.$transaction` التفاعلية في Prisma. يظهر الخطأ عشوائياً عند:
  - البيع (`POST /api/sales`).
  - الإلغاء والمرتجع.
  - استلام أمر شراء.
  - إنتاج تركيبة.
- **السبب الجذري:** `DIRECT_DATABASE_URL` غير مضبوط في Vercel، فيسقط الكود على
  `DATABASE_URL` (pooler مع `pgbouncer=true`).
- **الحل:**
  1. أضف `DIRECT_DATABASE_URL` يشير إلى `db.PROJECT_REF.supabase.co:5432` (المنفذ 5432
     بدون pgbouncer).
  2. أعد النشر.
  3. تحقق بـ `GET /api/diagnose` أن `hasDirectDatabaseUrl: true`.
- **في الكود:** انظر `getDatasourceUrl()` في `src/lib/db.ts` — تفضّل `DIRECT_DATABASE_URL`
  وتضيف `connection_limit=3`، وتسجل تحذيراً واضحاً عند غيابه.

### 4. fire-and-forget على Vercel
- **المشكلة:** Vercel serverless لا يضمن استمرار التنفيذ بعد إرجاع الرد. أي قيد
  محاسبي أو سجل تدقيق مكتوب بـ `void (async () => {...})()` قد يُقطع.
- **التخفيف في الكود:**
  - مسار الإلغاء `src/app/api/sales/[id]/cancel/route.ts` يستخدم fire-and-forget
    للقيد العكسي وسجل التدقيق (مقبول لأن حالة الفاتورة محفوظة).
  - مسارات البيع والمرتجع والاستلام تنتظر (`await`) كل العمليات الحرجة داخل
    المعاملة.
  - ملاحظة `DEPLOY.md`: «لا تعتمد على fire-and-forget للعمليات المالية على Vercel».

### 5. تجاوز حجم الطلب (Request Body Size)
- **الحد الافتراضي:** Vercel يسمح بـ 4.5MB للجسم. ملفات Excel أكبر يجب أن تُرفع عبر
  `multipart/form-data` (وهو ما يفعله `/api/excel/import-*`).
- **الحد المطبّق في الكود:** 5MB لملفات Excel — يُرجع `file-too-large` (413) عند
  التجاوز.

---

## 10) `vercel.json` — تفاصيل التهيئة

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "installCommand": "bun install",
  "regions": ["syd1"]
}
```

| الحقل | القيمة | الشرح |
|---|---|---|
| `framework` | `nextjs` | إطار العمل — يفعّل تحسينات Vercel الخاصة بـ Next.js |
| `installCommand` | `bun install` | استخدام bun لتسريع تثبيت الحزم (~3x أسرع من npm) |
| `regions` | `["syd1"]` | منطقة الاستضافة — **يجب أن تتطابق مع منطقة Supabase** لتقليل زمن الاتصال |

### مطابقة منطقة Vercel مع Supabase
| منطقة Supabase | منطقة Vercel المقابلة |
|---|---|
| `Southeast Asia (Singapore)` | `sin1` أو `syd1` |
| `Northeast Asia (Tokyo)` | `hnd1` |
| `US East (N. Virginia)` | `iad1` |
| `US West (Oregon)` | `sfo1` أو `pdx1` |
| `EU West (Ireland)` | `dub1` |
| `EU Central (Frankfurt)` | `fra1` |

> التحقق من منطقة Supabase: Project Settings → General → Region.
> تغيير المنطقة على Vercel: عدّل `vercel.json` ثم `git push` — Vercel سينشر في
> المنطقة الجديدة (قد تحتاج إعادة نشر كامل).

---

## 11) `connection_limit=1` في `DIRECT_DATABASE_URL`

رغم أن `src/lib/db.ts` يضيف حالياً `connection_limit=3` (توازن بين الأداء وحدود
Supabase المجانية)، فإن `DEPLOY.md` يوصي بـ `connection_limit=1` للأنظمة الصغيرة
كإجراء احتياطي صارم.

**متى تستخدم `connection_limit=1`:**
- على خطة Supabase المجانية مع حمل منخفض.
- عند ظهور أخطاء `too many connections` متكررة.
- في بيئات المعاينة (Preview) التي لا تتعامل مع حمل متزامن.

**متى ترفعها إلى `connection_limit=3` أو أعلى:**
- على خطة Supabase Pro (60+ اتصال).
- عند وجود عدة كاشيرات يعملون في وقت واحد.
- عند تنفيذ عمليات تقارير ثقيلة.

**التحقق من القيمة الحالية:**
الكود في `src/lib/db.ts` يضيف `connection_limit=3` تلقائياً. لفرض قيمة مختلفة، مرّرها
في نهاية `DIRECT_DATABASE_URL`:
```
postgresql://postgres:PWD@db.REF.supabase.co:5432/postgres?connection_limit=1
```
الكود يكتشف وجود `connection_limit=` ولا يضيفها مرة أخرى.

---

## 12) قائمة فحص ما بعد النشر (Post-Deploy Checklist)

- [ ] فتح `https://your-app.vercel.app/api/diagnose` — يجب أن يرجع:
  - `hasDatabaseUrl: true`
  - `hasDirectDatabaseUrl: true`
  - `hasNextauthSecret: true`
  - `hasBootstrapPw: true`
  - `dbConnected: true`
  - `adminExists: true`
- [ ] تسجيل الدخول بـ `admin@demo.com` + كلمة `BOOTSTRAP_ADMIN_PASSWORD`.
- [ ] اختبار دخان بدون تسجيل دخول (يجب أن يرجع 401):
  ```bash
  curl https://your-app.vercel.app/api/sales      # 401
  curl https://your-app.vercel.app/api/products   # 401
  curl https://your-app.vercel.app/api/settings   # 200 (عام)
  ```
- [ ] تنفيذ بيع تجري في POS + التحقق من طباعة الفاتورة.
- [ ] إنشاء منتج + التأكد من ظهوره في POS.
- [ ] مراجعة Supabase → Database → Connections — يجب أن يكون العدد < 15.
- [ ] مراجعة Vercel → Logs — لا أخطاء 5xx متكررة.

---

## 13) جهات اتصال ومراجع

- **مستودع الكود:** `https://github.com/a3laaw/kwpos.git`
- **دليل النشر الأساسي:** `DEPLOY.md` في جذر المستودع.
- **مخطط قاعدة البيانات:** `prisma/schema.prisma`.
- **سلوك اتصال Prisma:** `src/lib/db.ts`.
- **تهيئة المصادقة:** `src/lib/auth.ts`.
- **تكامل Shopify:** `src/lib/shopify.ts`.

</div>
