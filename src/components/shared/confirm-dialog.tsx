"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useT } from "@/components/i18n-context"
import { Loader2 } from "lucide-react"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: React.ReactNode
  confirmText?: string
  cancelText?: string
  destructive?: boolean
  /** Extra class for the confirm button (overrides destructive default). */
  confirmClassName?: string
  /** Extra class for the cancel button (e.g. red outline). */
  cancelClassName?: string
  loading?: boolean
  onConfirm: () => void | Promise<void>
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  cancelText,
  destructive = true,
  confirmClassName,
  cancelClassName,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const t = useT()
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title ?? t.confirmDescription}</AlertDialogTitle>
          <AlertDialogDescription>{description ?? t.confirmDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={loading}
            className={cancelClassName || undefined}
          >
            {cancelText ?? t.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={async (e) => {
              e.preventDefault()
              await onConfirm()
            }}
            className={
              confirmClassName
                ? confirmClassName
                : destructive
                  ? "bg-destructive text-white hover:bg-destructive/90"
                  : ""
            }
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmText ?? t.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
