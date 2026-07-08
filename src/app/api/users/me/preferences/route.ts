import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

/**
 * PATCH /api/users/me/preferences
 *
 * Updates the current user's UI preferences. Currently supports:
 *   { posExpressMode: boolean }
 *
 * The preference is stored on the User row so it persists across
 * sessions and devices. The session JWT is NOT refreshed here —
 * the client should call `update()` from next-auth/react or do a
 * router.refresh() to re-read the session.
 */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({} as any))
  const { posExpressMode } = body || {}

  const data: { posExpressMode?: boolean } = {}
  if (typeof posExpressMode === "boolean") {
    data.posExpressMode = posExpressMode
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "no-fields-to-update" }, { status: 400 })
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data,
    select: { id: true, posExpressMode: true },
  })

  return NextResponse.json({ ok: true, posExpressMode: updated.posExpressMode })
}
