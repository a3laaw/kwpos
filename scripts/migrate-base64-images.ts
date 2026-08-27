/**
 * Migrate base64 data URLs in Product.imageUrl to local files or Vercel Blob.
 *
 * TEMPORARY MIGRATION SCRIPT — run once to clean up legacy base64 images
 * that were stored directly in the database (each ~280KB, causing Excel
 * export to fail with "Text length must not exceed 32767 characters").
 *
 * ── HOW IT WORKS ───────────────────────────────────────────────────
 * For each product whose imageUrl starts with "data:image/":
 *   1. Decode the base64 payload to a Buffer.
 *   2. Write it to either:
 *      a) public/uploads/products/<productId>.<ext>  (local FS)
 *      b) Vercel Blob  (returns a public URL)
 *   3. Update the DB row: imageUrl = <newUrl>.
 *
 * ── STORAGE TARGET SELECTION ────────────────────────────────────────
 * The write target is selected automatically by default, with an
 * optional CLI flag to force one:
 *
 *   Default (no flag):
 *     - If BLOB_READ_WRITE_TOKEN env var is set → upload to Vercel Blob.
 *     - Otherwise → save to local filesystem under public/uploads/.
 *
 *   --blob    Force Vercel Blob upload (requires BLOB_READ_WRITE_TOKEN).
 *              Errors out if the env var isn't set.
 *
 *   --local   Force local filesystem write (ignores BLOB_READ_WRITE_TOKEN).
 *              Useful for preview deployments with a persistent volume.
 *
 * ── ENVIRONMENT SUPPORT ────────────────────────────────────────────
 * LOCAL filesystem under public/uploads/ works for:
 *   - Local development (next dev serves public/ statically)
 *   - Vercel preview deployments with a persistent volume mounted at public/uploads
 *
 * VERCEL BLOB works for:
 *   - Production Vercel (read-only filesystem). Requires BLOB_READ_WRITE_TOKEN
 *     env var. The @vercel/blob package is available automatically on the
 *     Vercel runtime when the token is set — no need to add it to package.json.
 *     When running locally you may need `bun add @vercel/blob` first.
 *
 * ── SAFETY ─────────────────────────────────────────────────────────
 *   - Dry-run by default (prints what it would do, changes nothing).
 *   - Pass --apply to actually write files + update the DB.
 *   - Idempotent: re-running on already-migrated rows is a no-op.
 *
 * ── USAGE ─────────────────────────────────────────────────────────
 *   bun run scripts/migrate-base64-images.ts                       # dry run (auto target)
 *   bun run scripts/migrate-base64-images.ts --apply                # apply (auto target)
 *   bun run scripts/migrate-base64-images.ts --apply --blob        # force Vercel Blob
 *   bun run scripts/migrate-base64-images.ts --apply --local       # force local FS
 */
import { db } from "@/lib/db"
import { writeFileSync, mkdirSync, existsSync } from "node:fs"
import path from "node:path"
import crypto from "node:crypto"

type WriteTarget = "local" | "vercel-blob"

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "products")

function extFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg": return "jpg"
    case "image/jpg": return "jpg"
    case "image/png": return "png"
    case "image/webp": return "webp"
    case "image/gif": return "gif"
    default: return "bin"
  }
}

/** Parse a data URL into { mime, buffer }. Returns null if not a data URL. */
function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
  const m = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/)
  if (!m) return null
  return { mime: m[1], buffer: Buffer.from(m[2], "base64") }
}

/**
 * Resolve the storage target based on CLI flags + env.
 *   --blob  → forces "vercel-blob" (errors if no token)
 *   --local → forces "local" (ignores token)
 *   none    → "vercel-blob" if BLOB_READ_WRITE_TOKEN is set, else "local"
 */
function resolveWriteTarget(): WriteTarget {
  const forceBlob = process.argv.includes("--blob")
  const forceLocal = process.argv.includes("--local")

  if (forceBlob && forceLocal) {
    console.error("[base64-migration] conflicting flags --blob and --local. Pick one.")
    process.exit(2)
  }
  if (forceBlob) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("[base64-migration] --blob requires BLOB_READ_WRITE_TOKEN env var.")
      process.exit(2)
    }
    return "vercel-blob"
  }
  if (forceLocal) return "local"
  // Auto: prefer Blob when the token is set (production Vercel),
  // fall back to local FS (dev / preview).
  return process.env.BLOB_READ_WRITE_TOKEN ? "vercel-blob" : "local"
}

async function uploadToLocal(productId: string, mime: string, buffer: Buffer): Promise<string> {
  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true })
  const ext = extFromMime(mime)
  // Use a short hash of the productId to avoid filename collisions and
  // keep filenames stable across re-runs.
  const hash = crypto.createHash("sha1").update(productId).digest("hex").slice(0, 12)
  const filename = `${hash}.${ext}`
  const filepath = path.join(UPLOAD_DIR, filename)
  writeFileSync(filepath, buffer)
  return `/uploads/products/${filename}`
}

async function uploadToVercelBlob(productId: string, mime: string, buffer: Buffer): Promise<string> {
  // Lazy import so the script doesn't crash if @vercel/blob isn't installed.
  // On Vercel's runtime the package is auto-available when BLOB_READ_WRITE_TOKEN
  // is set; locally you may need `bun add @vercel/blob` first.
  const { put } = await import("@vercel/blob")
  const ext = extFromMime(mime)
  const hash = crypto.createHash("sha1").update(productId).digest("hex").slice(0, 12)
  const filename = `products/${hash}.${ext}`
  const blob = await put(filename, buffer, {
    access: "public",
    addRandomSuffix: false,
    contentType: mime,
  })
  return blob.url
}

async function main() {
  const apply = process.argv.includes("--apply")
  const WRITE_TARGET = resolveWriteTarget()
  console.log(`\n[base64-migration] mode: ${apply ? "APPLY" : "DRY-RUN (pass --apply to write)"}`)
  console.log(`[base64-migration] write target: ${WRITE_TARGET}`)
  if (WRITE_TARGET === "vercel-blob") {
    console.log(`[base64-migration] using BLOB_READ_WRITE_TOKEN (${process.env.BLOB_READ_WRITE_TOKEN ? "set" : "EMPTY"})`)
  }
  console.log("")

  // Find all products whose imageUrl is a base64 data URL.
  const products = await db.product.findMany({
    where: { imageUrl: { startsWith: "data:image/" } },
    select: { id: true, name: true, imageUrl: true },
  })
  console.log(`[base64-migration] found ${products.length} products with base64 imageUrl\n`)

  if (products.length === 0) {
    console.log("[base64-migration] nothing to migrate — DB is clean.")
    return
  }

  let migrated = 0
  let failed = 0
  const errors: Array<{ productId: string; error: string }> = []

  for (const p of products) {
    if (!p.imageUrl) continue
    const parsed = parseDataUrl(p.imageUrl)
    if (!parsed) {
      console.log(`  ✗ ${p.id} — imageUrl is not a valid data URL (skipped)`)
      failed++
      errors.push({ productId: p.id, error: "invalid-data-url" })
      continue
    }

    const sizeKb = Math.round(parsed.buffer.length / 1024)
    try {
      let newUrl: string
      if (WRITE_TARGET === "vercel-blob") {
        newUrl = await uploadToVercelBlob(p.id, parsed.mime, parsed.buffer)
      } else {
        newUrl = await uploadToLocal(p.id, parsed.mime, parsed.buffer)
      }
      console.log(`  ${apply ? "✓" : "•"} ${p.name} (${sizeKb}KB) → ${newUrl}`)

      if (apply) {
        await db.product.update({
          where: { id: p.id },
          data: { imageUrl: newUrl },
        })
        migrated++
      } else {
        migrated++ // count for dry-run preview
      }
    } catch (e: any) {
      console.log(`  ✗ ${p.name} — error: ${e?.message ?? e}`)
      failed++
      errors.push({ productId: p.id, error: String(e?.message ?? e).slice(0, 200) })
    }
  }

  console.log(`\n[base64-migration] ${apply ? "DONE" : "DRY-RUN COMPLETE"}`)
  console.log(`  migrated: ${migrated}`)
  console.log(`  failed:   ${failed}`)
  if (errors.length > 0) {
    console.log(`  errors (first 5):`)
    for (const e of errors.slice(0, 5)) {
      console.log(`    ${e.productId}: ${e.error}`)
    }
  }
  if (!apply) {
    console.log(`\n  → Re-run with --apply to actually write files and update the DB.`)
  }
}

main()
  .catch((e) => {
    console.error("[base64-migration] FATAL:", e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
