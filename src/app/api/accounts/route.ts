import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { serializeAccount } from "@/lib/serialize"
import type { Account, AccountType } from "@/lib/types"

export const dynamic = "force-dynamic"

/** Build a nested tree from flat account rows. */
function buildTree(rows: any[]): Account[] {
  const map = new Map<string, Account>()
  const roots: Account[] = []
  // serialize first
  for (const r of rows) {
    map.set(r.id, { ...serializeAccount(r), children: [] })
  }
  for (const r of rows) {
    const node = map.get(r.id)!
    if (r.parentId && map.has(r.parentId)) {
      map.get(r.parentId)!.children!.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

/** Sum the balances of all descendant accounts (recursive). */
function sumSubtree(node: Account): number {
  let total = node.balance || 0
  for (const c of node.children || []) {
    total += sumSubtree(c)
  }
  return total
}

/** Attach a `totalBalance` (including children) to each node. */
function withTotals(nodes: Account[]): Account[] {
  return nodes.map((n) => ({
    ...n,
    balance: +(sumSubtree(n)).toFixed(3),
    children: n.children?.length ? withTotals(n.children) : n.children,
  }))
}

const TYPE_ORDER: Record<AccountType, number> = {
  ASSET: 1,
  LIABILITY: 2,
  EQUITY: 3,
  REVENUE: 4,
  EXPENSE: 5,
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const rows = await db.account.findMany({
    orderBy: [{ code: "asc" }],
  })

  const tree = buildTree(rows as any[])
  // sort roots by type order then code
  tree.sort((a, b) => (TYPE_ORDER[a.type] - TYPE_ORDER[b.type]) || a.code.localeCompare(b.code))
  const withTotal = withTotals(tree)

  return NextResponse.json({ items: withTotal, flat: (rows as any[]).map(serializeAccount) })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const body = await req.json()
  const { code, name, type, parentId } = body || {}

  if (!code || !name || !type) {
    return NextResponse.json({ error: "code-name-type-required" }, { status: 400 })
  }
  const validTypes: AccountType[] = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "invalid-type" }, { status: 400 })
  }

  // unique code
  const exists = await db.account.findUnique({ where: { code: String(code).trim() } })
  if (exists) return NextResponse.json({ error: "code-exists" }, { status: 409 })

  // if parentId given, inherit type from parent
  let finalType = type as AccountType
  if (parentId) {
    const parent = await db.account.findUnique({ where: { id: parentId } })
    if (!parent) return NextResponse.json({ error: "parent-not-found" }, { status: 400 })
    finalType = parent.type as AccountType
  }

  const created = await db.account.create({
    data: {
      code: String(code).trim(),
      name: String(name).trim(),
      type: finalType,
      parentId: parentId || null,
      isSystem: false,
    },
  })

  return NextResponse.json(serializeAccount(created as any), { status: 201 })
}
