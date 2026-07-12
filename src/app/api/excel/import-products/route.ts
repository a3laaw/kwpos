import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import * as XLSX from "xlsx"

export const dynamic = "force-dynamic"

/**
 * Import products from an uploaded .xlsx/.csv file.
 * Expected columns:
 *   الاسم (required), الباركود (optional), الفئة (optional),
 *   الكمية (optional), حد الطلب (optional),
 *   سعر التكلفة, سعر البيع,
 *   الوحدة (optional), رابط الصورة (optional).
 *
 * The "رابط الصورة" column accepts a direct image URL (https://...)
 * that will be stored as the product's imageUrl.
 *
 * Products are matched by barcode (if present) or name; existing → updated, new → created.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN" && user.role !== "WAREHOUSE") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

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

  // Preload categories + units for name-matching
  const [categories, units] = await Promise.all([
    db.category.findMany(),
    db.unit.findMany(),
  ])
  const catByName = new Map(categories.map((c) => [c.name, c.id]))
  const unitNames = new Set(units.map((u) => u.name))

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
    const barcode = String(row["الباركود"] ?? row["barcode"] ?? "").trim() || null
    const categoryName = String(row["الفئة"] ?? row["category"] ?? "").trim()
    const categoryId = categoryName ? catByName.get(categoryName) || null : null
    const quantity = Number(row["الكمية"] ?? row["quantity"] ?? 0) || 0
    const reorderLevel = Number(row["حد الطلب"] ?? row["reorder"] ?? 5) || 0
    const costPrice = Number(row["سعر التكلفة"] ?? row["cost"] ?? 0) || 0
    const salePrice = Number(row["سعر البيع"] ?? row["sale"] ?? 0) || 0
    const unit = String(row["الوحدة"] ?? row["unit"] ?? "قطعة").trim() || "قطعة"
    // Image URL — direct link to an image (https://example.com/photo.jpg)
    const imageUrl = String(row["رابط الصورة"] ?? row["imageUrl"] ?? row["image"] ?? "").trim() || null

    try {
      // Match by barcode first, then by name
      let existing = barcode ? await db.product.findFirst({ where: { barcode } }) : null
      if (!existing) existing = await db.product.findFirst({ where: { name } })

      if (existing) {
        await db.product.update({
          where: { id: existing.id },
          data: {
            barcode: barcode ?? existing.barcode,
            categoryId: categoryId ?? existing.categoryId,
            quantity,
            reorderLevel,
            costPrice,
            salePrice,
            unit,
            ...(imageUrl ? { imageUrl } : {}),
          },
        })
        updated++
      } else {
        await db.product.create({
          data: { name, barcode, categoryId, quantity, reorderLevel, costPrice, salePrice, unit, imageUrl },
        })
        created++
      }
    } catch (e: any) {
      errors.push(`${name}: ${e?.message || "error"}`)
    }
  }

  return NextResponse.json({ ok: true, total: rows.length, created, updated, skipped, errors: errors.slice(0, 10) })
}
