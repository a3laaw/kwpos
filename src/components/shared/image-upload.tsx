"use client"

import * as React from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { ImagePlus, Loader2, X } from "lucide-react"
import { useUploadImage } from "@/hooks/use-api"
import { useT } from "@/components/i18n-context"

interface ImageUploadProps {
  value?: string | null
  onChange: (url: string | null) => void
  /** Render label */
  label?: string
  className?: string
  /** Shape: "square" for product images, "circle" for avatars */
  shape?: "square" | "circle"
}

/**
 * Image upload field with preview. Uploads to /api/upload and stores the
 * returned public URL. Shows the current image with a remove button.
 */
export function ImageUpload({ value, onChange, label, className, shape = "square" }: ImageUploadProps) {
  const t = useT()
  const uploadMut = useUploadImage()
  const fileRef = React.useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const res = await uploadMut.mutateAsync(file)
      onChange(res.url)
      toast.success(t.imageUploaded)
    } catch (err: any) {
      const code = err?.message || ""
      // Translate known error codes to user-friendly messages
      if (code === "file-too-large") {
        toast.error(t.imageTooLarge)
      } else if (code === "invalid-file-type") {
        toast.error(t.imageUploadFailed, { description: t.imageFormatsHint })
      } else if (code === "image-decode-failed" || code === "encode-failed") {
        toast.error(t.imageResizeFailed)
      } else {
        toast.error(t.imageUploadFailed, { description: code })
      }
    }
    if (fileRef.current) fileRef.current.value = ""
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Preview / dropzone */}
      <div
        className={cn(
          "relative shrink-0 overflow-hidden border-2 border-dashed border-border/70 bg-muted/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors",
          shape === "circle" ? "h-16 w-16 rounded-full" : "h-20 w-20 rounded-lg"
        )}
        onClick={() => fileRef.current?.click()}
      >
        {value ? (
          <>
            <img src={value} alt="preview" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onChange(null)
              }}
              className="absolute top-0.5 left-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow hover:scale-110 transition-transform"
            >
              <X className="h-3 w-3" />
            </button>
          </>
        ) : uploadMut.isPending ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <ImagePlus className="h-7 w-7 text-muted-foreground" />
        )}
      </div>

      <div className="min-w-0">
        {label ? <p className="text-sm font-medium">{label}</p> : null}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="text-xs text-primary hover:underline"
          disabled={uploadMut.isPending}
        >
          {value ? t.changeImage : t.uploadImage}
        </button>
        <p className="text-[10px] text-muted-foreground">{t.imageFormatsHint}</p>
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  )
}
