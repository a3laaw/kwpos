import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { createJournalEntry } from "@/lib/journal"

export const dynamic = "force-dynamic"

/** Create a manual double-entry journal entry (admin-only). */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const body = await req.json()
  const { description, date, lines } = body || {}
  if (!description?.trim()) {
    return NextResponse.json({ error: "description-required" }, { status: 400 })
  }
  if (!Array.isArray(lines) || lines.length < 2) {
    return NextResponse.json({ error: "at-least-2-lines" }, { status: 400 })
  }

  try {
    const id = await createJournalEntry({
      sourceType: "MANUAL",
      description: description.trim(),
      date: date ? new Date(date) : new Date(),
      lines: lines.map((l: any) => ({
        accountCode: String(l.accountCode),
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        description: l.description?.trim() || undefined,
      })),
    })
    return NextResponse.json({ ok: true, id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "manual-je-failed" }, { status: 400 })
  }
}
