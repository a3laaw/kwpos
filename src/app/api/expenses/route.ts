import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { serializeExpense } from "@/lib/serialize"
import { createJournalEntry } from "@/lib/journal"
import type { ExpenseType } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") as ExpenseType | null

  const rows = await db.expenseTransaction.findMany({
    where: type ? { type } : undefined,
    include: { account: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  // attach payment account name manually (no relation defined for paymentAccountId)
  const paymentIds = Array.from(new Set(rows.map((r) => r.paymentAccountId)))
  const paymentAccounts = await db.account.findMany({ where: { id: { in: paymentIds } } })
  const paMap = new Map(paymentAccounts.map((a) => [a.id, a.name]))

  const items = rows.map((r) => ({
    ...serializeExpense(r as any),
    paymentAccountName: paMap.get(r.paymentAccountId) ?? null,
  }))

  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const body = await req.json()
  const {
    type,
    employeeName,
    title,
    category,
    amount,
    date,
    accountId,
    paymentAccountId,
    note,
  } = body || {}

  if (!type || !["SALARY", "ADMIN"].includes(type)) {
    return NextResponse.json({ error: "invalid-type" }, { status: 400 })
  }
  const amt = Number(amount)
  if (!amt || amt <= 0) {
    return NextResponse.json({ error: "amount-required" }, { status: 400 })
  }
  if (!accountId || !paymentAccountId) {
    return NextResponse.json({ error: "accounts-required" }, { status: 400 })
  }
  if (type === "SALARY" && !employeeName?.trim()) {
    return NextResponse.json({ error: "employee-name-required" }, { status: 400 })
  }
  if (type === "ADMIN" && !title?.trim()) {
    return NextResponse.json({ error: "title-required" }, { status: 400 })
  }

  // Validate accounts exist
  const [expAcc, payAcc] = await Promise.all([
    db.account.findUnique({ where: { id: accountId } }),
    db.account.findUnique({ where: { id: paymentAccountId } }),
  ])
  if (!expAcc) return NextResponse.json({ error: "expense-account-not-found" }, { status: 400 })
  if (!payAcc) return NextResponse.json({ error: "payment-account-not-found" }, { status: 400 })

  const dateObj = date ? new Date(date) : new Date()
  if (isNaN(dateObj.getTime())) {
    return NextResponse.json({ error: "invalid-date" }, { status: 400 })
  }

  // Transaction: create the expense record (balances are updated via the journal entry)
  const created = await db.$transaction(async (tx) => {
    const exp = await tx.expenseTransaction.create({
      data: {
        type,
        employeeName: type === "SALARY" ? String(employeeName).trim() : null,
        payDate: type === "SALARY" ? dateObj : null,
        title: type === "ADMIN" ? String(title).trim() : null,
        category: type === "ADMIN" ? (category ? String(category) : "أخرى") : null,
        date: type === "ADMIN" ? dateObj : null,
        amount: +amt.toFixed(3),
        accountId,
        paymentAccountId,
        note: note?.trim() || null,
      },
      include: { account: true },
    })
    return exp
  })

  // Generate the double-entry journal entry (also updates account balances)
  const desc =
    type === "SALARY"
      ? `صرف راتب — ${employeeName}`
      : `مصروف إداري — ${title}${category ? ` (${category})` : ""}`
  try {
    await createJournalEntry({
      sourceType: "EXPENSE",
      sourceId: created.id,
      description: desc,
      date: dateObj,
      lines: [
        { accountCode: expAcc.code, debit: +amt.toFixed(3), description: desc },
        { accountCode: payAcc.code, credit: +amt.toFixed(3), description: "سداد" },
      ],
    })
  } catch (e: any) {
    console.error("[expenses] journal entry failed:", e?.message)
  }

  const payAcc2 = await db.account.findUnique({ where: { id: paymentAccountId } })
  return NextResponse.json(
    {
      ...serializeExpense(created as any),
      paymentAccountName: payAcc2?.name ?? null,
    },
    { status: 201 }
  )
}
