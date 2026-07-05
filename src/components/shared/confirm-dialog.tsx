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
  title = "تأكيد العملية",
  description = "هل أنت متأكد؟ لا يمكن التراجع عن هذه العملية.",
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  destructive = true,
  confirmClassName,
  cancelClassName,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={loading}
            className={cancelClassName || undefined}
          >
            {cancelText}
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
            {loading ? "جارٍ التنفيذ..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
