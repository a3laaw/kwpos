import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

/**
 * Central Notification System API (Track 4.3).
 *
 * GET  — list UNREAD notifications for the current user (take 50, newest
 *        first). Auth: any authenticated user. The bell component polls
 *        this every 30s (refetchInterval in the useQuery call).
 *
 * POST — mark notification(s) as read. Body:
 *          { id?: string, all?: boolean }
 *        - `{ id: "<cuid>" }`  → marks that single notification as read.
 *        - `{ all: true }`     → marks ALL the user's unread notifications
 *                                as read (used by a "mark all read"
 *                                button if/when one is added).
 *        - empty body / no fields → no-op (200).
 *
 * Notifications are stored in the `Notification` Prisma model (per-user,
 * persistent). Helpers in `src/lib/notifications.ts` create rows here
 * when business events happen (stock-low, payment-due, etc.).
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const items = await db.notification.findMany({
    where: { userId: user.id, read: false },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return NextResponse.json({
    items: items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      link: n.link,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount: items.length,
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({} as any))
  const id = typeof body?.id === "string" ? body.id : null
  const all = body?.all === true

  if (all) {
    // Mark ALL the user's unread notifications as read.
    const result = await db.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    })
    return NextResponse.json({ marked: result.count })
  }

  if (id) {
    // Mark a single notification as read — scoped to the current user
    // so a user can't mark another user's notifications as read by
    // guessing their cuids.
    const existing = await db.notification.findUnique({
      where: { id },
      select: { userId: true, read: true },
    })
    if (!existing) {
      return NextResponse.json({ error: "not-found" }, { status: 404 })
    }
    if (existing.userId !== user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }
    if (!existing.read) {
      await db.notification.update({
        where: { id },
        data: { read: true },
      })
    }
    return NextResponse.json({ marked: 1 })
  }

  // Empty body — no-op (still 200 so the bell doesn't surface an error).
  return NextResponse.json({ marked: 0 })
}
