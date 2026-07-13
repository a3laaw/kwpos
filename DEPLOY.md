# دليل النشر — KWPOS على Supabase + Vercel

## المتطلبات

- حساب [Supabase](https://supabase.com)
- حساب [Vercel](https://vercel.com)
- مستودع GitHub: `https://github.com/a3laaw/kwpos.git`

---

## 1. إنشاء مشروع Supabase

1. اذهب إلى [Supabase Dashboard](https://app.supabase.com) → New Project
2. اختر اسماً وكلمة مرور قوية لقاعدة البيانات
3. احفظ كلمة المرور — لن تظهر مرة أخرى
4. انتظر حتى يصبح المشروع جاهزاً

---

## 2. الحصول على روابط الاتصال

في Supabase Dashboard → Project Settings → Database:

### Pooled Connection (DATABASE_URL — للـ migrations فقط)
```
postgresql://postgres.PROJECT_REF:PASSWORD@aws-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true
```
> هذا الرابط يستخدم PgBouncer (transaction pooling). مناسب لـ Prisma migrations
> ولكن **لا يدعم interactive transactions**.

### Direct Connection (DIRECT_DATABASE_URL — للتطبيق runtime)
```
postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
```
> هذا الرابط يتصل مباشرة بقاعدة البيانات (بدون PgBouncer). يدعم
> interactive transactions ($transaction) وهو ما يستخدمه التطبيق
> في وقت التشغيل. الكود يضيف `connection_limit=1` تلقائياً.

> **مهم جداً:**
> - لا تستخدم PgBouncer transaction pooling للـ Prisma interactive transactions.
> - استخدم `prisma migrate deploy` في الإنتاج.
> - لا تستخدم `db push` في الإنتاج.
> - راقب Supabase connection count مع Vercel serverless.

---

## 3. إعداد متغيرات البيئة في Vercel

اذهب إلى Vercel → مشروعك → Settings → Environment Variables:

| المتغير | القيمة | ملاحظة |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres.PROJECT_REF:PASSWORD@aws-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true` | Pooled — للـ migrations |
| `DIRECT_DATABASE_URL` | `postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres` | Direct host — للتطبيق runtime |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | رابط التطبيق |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | سر عشوائي قوي |
| `AUDIT_INTERNAL_SECRET` | `openssl rand -base64 32` | سر عشوائي قوي |

> **تحذير:** لا تستخدم `db push` على الإنتاج. استخدم `prisma migrate deploy` فقط.

---

## 4. تطبيق Migrations

```bash
# استنساخ المشروع
git clone https://github.com/a3laaw/kwpos.git
cd kwpos
npm install

# تعيين متغيرات البيئة محلياً
export DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true"
export DIRECT_DATABASE_URL="postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres"

# تطبيق migrations
npx prisma migrate deploy

# توليد Prisma client
npx prisma generate
```

---

## 5. Seed آمن

بعد تطبيق migrations، يمكن إنشاء بيانات أولية:

```bash
# تعيين كلمات مرور آمنة عبر environment
export SEED_ADMIN_PASSWORD="YourStrongPassword"
export SEED_SALES_PASSWORD="YourStrongPassword"

# شغل seed عبر API (يتطلب صلاحية ADMIN)
curl -X POST https://your-app.vercel.app/api/seed \
  -H "Content-Type: application/json" \
  -d '{"reset": true}'
```

> **تحذير:** الـ seed يحذف كل البيانات الموجودة. لا تستخدمه على نظام فيه بيانات حقيقية.

---

## 6. النشر على Vercel

1. اذهب إلى [Vercel Dashboard](https://vercel.com/dashboard)
2. Import Project → اختر مستودع `kwpos`
3. تأكد من أن Environment Variables مضبوطة (الخطوة 3)
4. اضغط Deploy
5. انتظر حتى يكتمل البناء (✅ Ready)

---

## 7. Smoke Tests بعد النشر

### بدون تسجيل دخول:
```bash
curl https://your-app.vercel.app/api/sales      # يجب أن يرجع 401
curl https://your-app.vercel.app/api/products   # يجب أن يرجع 401
curl https://your-app.vercel.app/api/settings   # يجب أن يرجع 401
```

### بعد تسجيل الدخول:
1. افتح رابط التطبيق
2. سجل دخول كمدير النظام
3. جرّب: POS → بيع منتج → تحقق من الفاتورة
4. جرّب: المخازن → إضافة منتج → تحقق
5. جرّب: الإعدادات → التصنيفات → إضافة تصنيف

---

## 8. مراقبة اتصالات Supabase

Vercel serverless يفتح اتصالات لكل function instance. لمراقبة:

1. Supabase Dashboard → Database → Connections
2. يجب أن تكون الاتصالات < 15 (حد Supabase المجاني)
3. الكود يضيف `connection_limit=1` تلقائياً
4. إذا زادت الاتصالات، أعد نشر التطبيق (Vercel يعيد تدوير instances)

---

## 9. خطة التراجع (Rollback)

### إذا فشل النشر:
1. Vercel → Deployments → اختر آخر deployment ناجح
2. اضغط ⋯ → Redeploy

### إذا فشلت migrations:
1. Supabase Dashboard → Database → SQL Editor
2. شغّل migration عكسي (إذا متوفر)
3. أو استرجع backup (Supabase → Database → Backups)

---

## 10. تحذيرات مهمة

- ❌ **لا تستخدم `db push`** على الإنتاج — استخدم `migrate deploy` فقط
- ❌ **لا تضع أسراراً في الكود** — استخدم Environment Variables
- ❌ **لا تعتمد على fire-and-forget** للعمليات المالية على Vercel
- ✅ **اربط Supabase بـ Vercel** عبر Environment Variables فقط
- ✅ **راقب الاتصالات** بانتظام على Supabase Dashboard
