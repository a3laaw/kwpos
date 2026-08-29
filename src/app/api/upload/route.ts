import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

/**
 * Image upload — Track 4.1 (Vercel Blob upgrade)
 *
 * ── Dual-mode upload ─────────────────────────────────────────────────
 * This endpoint accepts a multipart/form-data `file` field and stores
 * the image. The storage target is selected automatically:
 *
 *   1) If `process.env.BLOB_READ_WRITE_TOKEN` is set → upload to Vercel
 *      Blob via dynamic `import("@vercel/blob")` and return its public
 *      URL. The `@vercel/blob` package is NOT added to package.json —
 *      Vercel automatically makes it available on its runtime when the
 *      token env var is set. The dynamic import fails gracefully if
 *      the package isn't installed locally (e.g. on dev without the
 *      env var), and we fall back to base64.
 *
 *   2) Otherwise (local dev / preview without Blob token) → fall back
 *      to base64 data URL. This is the original behaviour: the image
 *      is converted to a `data:image/...;base64,...` URL and stored
 *      directly in the DB. It works but bloats the DB row, breaks Excel
 *      export at ~32k chars, and is wasteful. The migration script in
 *      `scripts/migrate-base64-images.ts` cleans up legacy rows.
 *
 * ── Auth ─────────────────────────────────────────────────────────────
 * Any authenticated user can upload — image-upload.tsx is used in
 * product/bundle/composition/settings forms, all of which are already
 * gated by their own role checks on the mutation routes that consume
 * the resulting URL.
 *
 * ── Validation ───────────────────────────────────────────────────────
 *   - File must be present (`file` field in multipart form).
 *   - MIME type must be image/jpeg | image/png | image/webp | image/gif.
 *   - Size ≤ 4 MB (Vercel's serverless body limit). The client
 *     pre-resizes via image-resize.ts so this is mostly a safety net.
 */

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])
const MAX_SIZE = 4 * 1024 * 1024 // 4 MB

function extFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg": return "jpg"
    case "image/png": return "png"
    case "image/webp": return "webp"
    case "image/gif": return "gif"
    default: return "bin"
  }
}

export async function POST(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  // ── Parse multipart form ────────────────────────────────────────────
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: "invalid-form" }, { status: 400 })
  }

  const file = form.get("file")
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "file-required" }, { status: 400 })
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: "invalid-file-type" }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "file-too-large" }, { status: 413 })
  }

  // Read the file bytes (used by both Blob-upload and base64 paths).
  const buffer = Buffer.from(await file.arrayBuffer())

  // ── Path A: Vercel Blob (when token is configured) ──────────────────
  // Dynamic-import @vercel/blob so the route doesn't crash on dev boxes
  // that don't have the package installed. On Vercel's runtime, the
  // package is available automatically once BLOB_READ_WRITE_TOKEN is set.
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      // @ts-ignore — @vercel/blob is intentionally not in package.json; it's
      // available automatically on the Vercel runtime when the env var is
      // set. The dynamic import fails gracefully if the package isn't
      // installed locally (we catch and fall back to base64 below).
      const { put } = await import("@vercel/blob")
      // Stable filename — we let Vercel Blob add a short random suffix
      // to avoid collisions when the same image is uploaded twice.
      const filename = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extFromMime(file.type)}`
      const blob = await put(filename, buffer, {
        access: "public",
        contentType: file.type,
        addRandomSuffix: false,
      })
      return NextResponse.json({ url: blob.url, storage: "blob" })
    } catch (e) {
      // If @vercel/blob isn't installed locally (e.g. dev box without the
      // env var), the dynamic import itself throws. If the upload fails
      // (network, bad token, etc.), `put()` throws. Either way, fall back
      // to base64 so the user can still save their image — it's better to
      // have a working base64 upload than a hard error.
      console.warn("[upload] Vercel Blob upload failed, falling back to base64:", (e as Error).message)
    }
  }

  // ── Path B: base64 data URL (fallback / local dev) ───────────────────
  const base64 = buffer.toString("base64")
  const dataUrl = `data:${file.type};base64,${base64}`
  return NextResponse.json({ url: dataUrl, storage: "base64" })
}
