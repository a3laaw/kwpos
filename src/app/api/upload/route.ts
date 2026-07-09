import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

/**
 * POST /api/upload — upload an image file.
 *
 * Accepts multipart/form-data with a "file" field.
 * Returns a base64 data URL stored in Product.imageUrl.
 *
 * Client-side resize (src/lib/image-resize.ts) keeps uploads ~80–150 KB
 * so we stay well under Vercel's serverless body limit.
 */
export async function POST(req: NextRequest) {
  // ── Auth ──
  let user
  try {
    user = await getCurrentUser()
  } catch {
    return NextResponse.json({ error: "auth-error" }, { status: 401 })
  }
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  // ── Parse multipart body ──
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json(
      { error: "file-too-large", message: "Body parse failed" },
      { status: 413 }
    )
  }

  const file = formData.get("file") as File | null
  if (!file) {
    return NextResponse.json({ error: "no-file" }, { status: 400 })
  }

  // ── Validate type ──
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "invalid-file-type", message: "JPEG, PNG, WebP, GIF only" },
      { status: 400 }
    )
  }

  // ── Validate size (max 4 MB) ──
  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json(
      { error: "file-too-large", message: "Max 4 MB" },
      { status: 400 }
    )
  }

  // ── Convert to base64 data URL ──
  try {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString("base64")
    const dataUrl = `data:${file.type};base64,${base64}`
    return NextResponse.json({ url: dataUrl }, { status: 201 })
  } catch (e: any) {
    console.error("[upload] encode error:", e?.message)
    return NextResponse.json(
      { error: "upload-failed", message: e?.message },
      { status: 500 }
    )
  }
}
