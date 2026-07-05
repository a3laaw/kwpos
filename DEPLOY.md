<div dir="rtl">

# 🚀 دليل النشر على Vercel

## المشكلة
البيئة الحالية (sandbox) تقتل خادم التطوير بعد فترة قصيرة. الحل الدائم هو نشر المشروع على **Vercel** (مجاني) مع قاعدة بيانات **Turso** (SQLite متوافق مع serverless، مجاني).

---

## الخطوة 1: إنشاء قاعدة بيانات Turso (مجاناً)

1. اذهب إلى **https://turso.tech** → Sign up (بGitHub أو Google)
2. بعد تسجيل الدخول، اضغط **New Database**
3. اختر اسم: `kwpos`
4. اختر أقرب منطقة (Frankfurt أو Bahrain)
5. بعد الإنشاء، اذهب لـ **Settings → Tokens** → أنشئ token جديداً
6. احفظ هاتين القيمتين:
   - **Database URL**: مثل `libsql://kwpos-xxx.turso.io`
   - **Auth Token**: مثل `eyJhbGciOi...`

---

## الخطوة 2: تحديث Prisma لـ Turso

على جهازك المحلي (أو هنا)، عدّل `prisma/schema.prisma` — أضف في الأعلى:

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

ثم شغّل:
```bash
# محلياً مع Turso
DATABASE_URL="libsql://kwpos-xxx.turso.io?authToken=eyJ..." bun run db:push
```

---

## الخطوة 3: نشر على Vercel

1. اذهب إلى **https://vercel.com** → Sign up بـ GitHub
2. اضغط **New Project**
3. اختر مستودع `a3laaw/kwpos`
4. في إعدادات Environment Variables، أضف:

| المتغير | القيمة |
|---|---|
| `DATABASE_URL` | `libsql://kwpos-xxx.turso.io` |
| `TURSO_DATABASE_URL` | `libsql://kwpos-xxx.turso.io` |
| `TURSO_AUTH_TOKEN` | `eyJhbGciOi...` |
| `NEXTAUTH_SECRET` | (ولّده بـ `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | `https://kwpos.vercel.app` (رابط المشروع بعد النشر) |

5. اضغط **Deploy**
6. انتظر ~2 دقيقة حتى يكتمل النشر

---

## الخطوة 4: تهيئة البيانات التجريبية

بعد النشر، افتح رابط المشروع + `/api/seed`:
```
https://kwpos.vercel.app/api/seed
```

أو استخدم curl:
```bash
curl -X POST https://kwpos.vercel.app/api/seed -H "Content-Type: application/json" -d '{"reset": true}'
```

---

## الخطوة 5: تسجيل الدخول

| الدور | البريد | كلمة المرور |
|---|---|---|
| مدير النظام | admin@demo.com | ***REMOVED*** |
| موظف مبيعات | sales@demo.com | ***REMOVED*** |
| أمين مخزن | warehouse@demo.com | ***REMOVED*** |

---

## ✅ النتيجة
- المشروع يعمل 24/7 بدون توقف
- رابط عام: `https://kwpos.vercel.app`
- قاعدة بيانات سحابية دائمة

</div>
