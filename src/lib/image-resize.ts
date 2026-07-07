/**
 * Client-side image resize + compress.
 *
 * Why: phones produce 3–5 MB JPEGs. Vercel's serverless body limit is
 * ~4.5 MB. Sending a raw phone photo to /api/upload can exceed that,
 * causing Vercel to return a 413 HTML error page — which the client
 * then tries to JSON-parse and gets "Unexpected token '<'".
 *
 * This helper draws the image onto a canvas at a max dimension (default
 * 800px) and re-encodes as JPEG at quality 0.8, producing a ~50–150 KB
 * file regardless of the original size. It also strips EXIF orientation
 * issues by normalising through the canvas.
 */

export interface ResizeOptions {
  /** Maximum width or height — the longer edge is scaled to this. */
  maxDim?: number
  /** JPEG quality 0..1. Default 0.8. */
  quality?: number
  /** Output MIME type. Default image/jpeg. */
  mimeType?: string
}

/**
 * Resize + compress an image File on the client.
 * Returns a new File (JPEG by default) that is typically 50–200 KB.
 */
export async function resizeImageFile(
  file: File,
  opts: ResizeOptions = {}
): Promise<File> {
  const maxDim = opts.maxDim ?? 800
  const quality = opts.quality ?? 0.8
  const mimeType = opts.mimeType ?? "image/jpeg"

  // If it's already small enough and a web-friendly format, pass through.
  if (
    file.size < 300 * 1024 && // < 300 KB
    (file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp")
  ) {
    return file
  }

  // Load the image
  const bitmap = await loadBitmap(file)

  // Compute scaled dimensions (preserve aspect ratio)
  let { width, height } = bitmap
  if (width > height && width > maxDim) {
    height = Math.round((height * maxDim) / width)
    width = maxDim
  } else if (height > maxDim) {
    width = Math.round((width * maxDim) / height)
    height = maxDim
  }

  // Draw onto canvas
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("canvas-unsupported")
  ctx.drawImage(bitmap, 0, 0, width, height)

  // Convert to blob
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mimeType, quality)
  )
  if (!blob) throw new Error("encode-failed")

  // Release bitmap resources
  if ("close" in bitmap && typeof (bitmap as ImageBitmap).close === "function") {
    ;(bitmap as ImageBitmap).close()
  }

  // Build a new File with a .jpg extension
  const baseName = file.name.replace(/\.[^.]+$/, "")
  return new File([blob], `${baseName}.jpg`, { type: mimeType })
}

/**
 * Load a File into an ImageBitmap (preferred) or HTMLImageElement (fallback).
 * ImageBitmap is faster and available in all modern browsers.
 */
async function loadBitmap(
  file: File
): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file)
    } catch {
      // fall through to HTMLImageElement
    }
  }
  // Fallback for older browsers / Safari < 15
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("image-decode-failed"))
    }
    img.src = url
  })
}
