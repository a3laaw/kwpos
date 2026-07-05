import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

/** GET /api/shifts/current — get the current user's open shift */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const shift = await db.shift.findFirst({
    where: { userId: user.id, status: "OPEN" },
    include: { user: { select: { name: true, email: true } } },
  })

  if (!shift) return NextResponse.json({ shift: null })
  return NextResponse.json({ shift })
}
