import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"

export const dynamic = "force-dynamic"

/**
 * Upload an image file. Saves to /public/uploads and returns the public URL.
 * Accepts multipart/form-data with a "file" field.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "no-file" }, { status: 400 })

  // Validate type
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"]
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "invalid-type" }, { status: 400 })
  }
  // Max 5MB
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "too-large" }, { status: 400 })
  }

  const ext = file.type.split("/")[1] || "jpg"
  const filename = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const uploadDir = path.join(process.cwd(), "public", "uploads")
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true })
  }
  const filepath = path.join(uploadDir, filename)
  const bytes = await file.arrayBuffer()
  await writeFile(filepath, Buffer.from(bytes))

  return NextResponse.json({ url: `/uploads/${filename}` })
}
