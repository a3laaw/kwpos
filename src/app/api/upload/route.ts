import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * POST /api/upload
 *
 * Image upload endpoint. Accepts a single image file (multipart/form-data),
 * validates it, and returns a base64 data URL that can be stored directly
 * in the database (Product.imageUrl, Bundle.imageUrl, etc.).
 *
 * WHY DATA URL (not filesystem / cloud):
 *   Vercel serverless has a READ-ONLY filesystem — writing to public/uploads/
 *   would silently fail (ephemeral, lost on cold start). Data URLs require no
 *   filesystem, no cloud credentials, and work everywhere. The client-side
 *   resize (in use-api.ts → useUploadImage) keeps files small (~50-150 KB),
 *   so DB bloat is minimal for a POS system.
 *
 * LIMITS:
 *   - Max size: 2 MB (after client resize, should be ~150 KB)
 *   - Allowed types: image/jpeg, image/png, image/webp, image/gif
 *   - Auth: any logged-in user can upload
 *
 * Returns:
 *   200 { url: "data:image/jpeg;base64,..." }
 *   400 { error: "no-file" | "invalid-file-type" }
 *   413 { error: "file-too-large" }
 *   401 { error: "unauthorized" }
 */
const MAX_SIZE = 2 * 1024 * 1024 // 2 MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "invalid-form-data" }, { status: 400 })
  }

  const file = formData.get("file") as File | null
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "no-file" }, { status: 400 })
  }

  // Validate type
  const contentType = (file.type || "").toLowerCase()
  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json({ error: "invalid-file-type" }, { status: 400 })
  }

  // Validate size
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "file-too-large" }, { status: 413 })
  }

  // Read file → buffer → base64 data URL
  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString("base64")
    const dataUrl = `data:${contentType};base64,${base64}`

    return NextResponse.json({ url: dataUrl })
  } catch (e: any) {
    console.error("[upload] Failed to process image:", e?.message ?? e)
    return NextResponse.json({ error: "upload-failed" }, { status: 500 })
  }
}
