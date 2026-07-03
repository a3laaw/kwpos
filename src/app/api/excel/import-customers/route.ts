import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import * as XLSX from "xlsx"

export const dynamic = "force-dynamic"

/**
 * Import customers from an uploaded .xlsx/.csv file.
 * Expected columns: الاسم*, الهاتف, العنوان.
 * Matched by phone (if present) else by name; existing → updated, new → created.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "no-file" }, { status: 400 })

  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: "array" })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, any>[]

  if (rows.length === 0) {
    return NextResponse.json({ error: "empty-file" }, { status: 400 })
  }

  let created = 0
  let updated = 0
  let skipped = 0
  const errors: string[] = []

  for (const row of rows) {
    const name = String(row["الاسم"] ?? row["name"] ?? "").trim()
    if (!name) {
      skipped++
      continue
    }
    const phone = String(row["الهاتف"] ?? row["phone"] ?? "").trim()
    const address = String(row["العنوان"] ?? row["address"] ?? "").trim()

    try {
      let existing = phone ? await db.customer.findFirst({ where: { phone } }) : null
      if (!existing) existing = await db.customer.findFirst({ where: { name } })

      if (existing) {
        await db.customer.update({
          where: { id: existing.id },
          data: { name, phone, address },
        })
        updated++
      } else {
        await db.customer.create({ data: { name, phone, address } })
        created++
      }
    } catch (e: any) {
      errors.push(`${name}: ${e?.message || "error"}`)
    }
  }

  return NextResponse.json({ ok: true, total: rows.length, created, updated, skipped, errors: errors.slice(0, 10) })
}
