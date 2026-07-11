import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, hasRole } from "@/lib/session"
import type { JournalEntry, JournalLine } from "@/lib/types"

export const dynamic = "force-dynamic"

function serializeLine(l: any): JournalLine {
  return {
    id: String(l.id),
    accountId: String(l.accountId),
    accountCode: String(l.account?.code ?? ""),
    accountName: String(l.account?.name ?? ""),
    accountType: (l.account?.type as any) ?? "ASSET",
    debit: Number(l.debit ?? 0),
    credit: Number(l.credit ?? 0),
    description: (l.description as string | null) ?? null,
  }
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!hasRole(user.role, ["OWNER", "ADMIN", "ACCOUNTANT" as any])) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const sourceType = searchParams.get("sourceType") || undefined

  const rows = await db.journalEntry.findMany({
    where: sourceType ? { sourceType } : undefined,
    include: { lines: { include: { account: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  const items: JournalEntry[] = rows.map((je: any) => ({
    id: String(je.id),
    entryNo: String(je.entryNo),
    date: String(je.date),
    sourceType: je.sourceType,
    sourceId: je.sourceId ?? null,
    description: String(je.description),
    totalDebit: Number(je.totalDebit ?? 0),
    totalCredit: Number(je.totalCredit ?? 0),
    lines: (je.lines as any[]).map(serializeLine),
    createdAt: String(je.createdAt),
  }))

  return NextResponse.json({ items })
}
