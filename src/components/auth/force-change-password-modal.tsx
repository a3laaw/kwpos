"use client"

/**
 * ForceChangePasswordModal
 *
 * Non-dismissable modal shown when the user's `passwordStatus === "MUST_CHANGE"`
 * (first login, or after an admin reset). The user must set a NEW password
 * before they can use any other part of the app.
 *
 * Behavior:
 *   - No close (X) button (`showCloseButton={false}`).
 *   - Escape key is suppressed (`onEscapeKeyDown` prevents default).
 *   - Click-outside is suppressed (`onPointerDownOutside` prevents default).
 *   - The page underneath remains mounted but the user can't interact
 *     with it (Radix Dialog overlay covers it).
 *   - On success, calls `onSuccess` which triggers a router refresh so
 *     the JWT/session re-hydrates with `mustChangePassword: false`.
 *
 * Form fields:
 *   - Current password
 *   - New password (min 8 chars, uppercase + lowercase + digit)
 *   - Confirm new password (must match)
 *
 * Live validation messages appear under each field as the user types.
 */

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ShieldAlert } from "lucide-react"

interface ValidationState {
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
  general?: string
}

export function ForceChangePasswordModal({
  open,
  onSuccess,
}: {
  open: boolean
  onSuccess?: () => void
}) {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [errors, setErrors] = React.useState<ValidationState>({})
  const [submitting, setSubmitting] = React.useState(false)

  // ── Live validation ────────────────────────────────────────────
  // Re-run validation on every keystroke so the user gets immediate
  // feedback. The actual server-side check is the source of truth, but
  // this prevents obviously-wrong submissions.
  React.useEffect(() => {
    const next: ValidationState = {}

    if (newPassword.length > 0 && newPassword.length < 8) {
      next.newPassword = "كلمة المرور يجب أن تكون 8 أحرف على الأقل"
    } else if (newPassword.length > 0 && !/[A-Z]/.test(newPassword)) {
      next.newPassword = "يجب أن تحتوي على حرف كبير واحد على الأقل (A-Z)"
    } else if (newPassword.length > 0 && !/[a-z]/.test(newPassword)) {
      next.newPassword = "يجب أن تحتوي على حرف صغير واحد على الأقل (a-z)"
    } else if (newPassword.length > 0 && !/[0-9]/.test(newPassword)) {
      next.newPassword = "يجب أن تحتوي على رقم واحد على الأقل (0-9)"
    }

    if (confirmPassword.length > 0 && confirmPassword !== newPassword) {
      next.confirmPassword = "كلمتا المرور غير متطابقتين"
    }

    if (currentPassword.length > 0 && newPassword.length > 0 && currentPassword === newPassword) {
      next.newPassword = "كلمة المرور الجديدة يجب أن تختلف عن الحالية"
    }

    setErrors(next)
  }, [currentPassword, newPassword, confirmPassword])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return

    // Final client-side check before submitting.
    const next: ValidationState = {}
    if (!currentPassword) next.currentPassword = "كلمة المرور الحالية مطلوبة"
    if (!newPassword) next.newPassword = "كلمة المرور الجديدة مطلوبة"
    if (!confirmPassword) next.confirmPassword = "تأكيد كلمة المرور مطلوب"
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      next.confirmPassword = "كلمتا المرور غير متطابقتين"
    }
    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }

    setSubmitting(true)
    setErrors({})

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        // Map server error codes to user-facing messages (Arabic).
        const msg = mapServerError(body?.error)
        setErrors({ general: msg })
        toast.error(msg)
        return
      }

      // Success — clear the form, refresh the session/router so the
      // modal disappears (mustChangePassword is in the JWT).
      toast.success("تم تغيير كلمة المرور بنجاح")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      onSuccess?.()
      // Hard refresh — the JWT session is updated server-side; the
      // `mustChangePassword` claim only flips to false once the user
      // re-authenticates OR the page does a full server render.
      router.refresh()
    } catch (e) {
      const msg = "تعذر الاتصال بالخادم. حاول مرة أخرى."
      setErrors({ general: msg })
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open}>
      {/* The non-dismissable modal: no close button, suppress Escape,
          suppress click-outside, suppress focus-trap loss. */}
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="sm:max-w-md"
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            <DialogTitle>تغيير كلمة المرور مطلوب</DialogTitle>
          </div>
          <DialogDescription>
            يجب تغيير كلمة المرور قبل استخدام النظام. لا يمكن إغلاق هذه النافذة حتى
            يتم التغيير.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current password */}
          <div className="space-y-1.5">
            <Label htmlFor="fcp-current">كلمة المرور الحالية</Label>
            <Input
              id="fcp-current"
              type="password"
              dir="ltr"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={submitting}
              autoFocus
              className="text-start"
            />
            {errors.currentPassword && (
              <p className="text-xs text-destructive">{errors.currentPassword}</p>
            )}
          </div>

          {/* New password */}
          <div className="space-y-1.5">
            <Label htmlFor="fcp-new">كلمة المرور الجديدة</Label>
            <Input
              id="fcp-new"
              type="password"
              dir="ltr"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={submitting}
              className="text-start"
            />
            {errors.newPassword ? (
              <p className="text-xs text-destructive">{errors.newPassword}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                8 أحرف على الأقل، يتضمن حرف كبير وصغير ورقم
              </p>
            )}
          </div>

          {/* Confirm new password */}
          <div className="space-y-1.5">
            <Label htmlFor="fcp-confirm">تأكيد كلمة المرور الجديدة</Label>
            <Input
              id="fcp-confirm"
              type="password"
              dir="ltr"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={submitting}
              className="text-start"
            />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword}</p>
            )}
          </div>

          {/* General error (e.g. wrong current password) */}
          {errors.general && (
            <p className="text-sm font-medium text-destructive">{errors.general}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جارٍ التغيير...
                </>
              ) : (
                "تغيير كلمة المرور"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Map server-side error codes to user-facing Arabic messages.
 * Falls back to a generic message for unknown codes.
 */
function mapServerError(code: string | undefined): string {
  switch (code) {
    case "current-password-required":
      return "كلمة المرور الحالية مطلوبة"
    case "new-password-required":
      return "كلمة المرور الجديدة مطلوبة"
    case "password-too-short":
      return "كلمة المرور يجب أن تكون 8 أحرف على الأقل"
    case "password-needs-uppercase":
      return "كلمة المرور يجب أن تحتوي على حرف كبير"
    case "password-needs-lowercase":
      return "كلمة المرور يجب أن تحتوي على حرف صغير"
    case "password-needs-digit":
      return "كلمة المرور يجب أن تحتوي على رقم"
    case "password-must-differ":
      return "كلمة المرور الجديدة يجب أن تختلف عن الحالية"
    case "current-password-incorrect":
      return "كلمة المرور الحالية غير صحيحة"
    case "unauthorized":
      return "يجب تسجيل الدخول أولاً"
    case "not-found":
      return "لم يتم العثور على المستخدم"
    case "server-error":
      return "حدث خطأ في الخادم. حاول مرة أخرى."
    default:
      return "تعذر تغيير كلمة المرور. حاول مرة أخرى."
  }
}
