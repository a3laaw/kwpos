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
 * The "الفئة" column supports NESTED categories using ">" as separator:
 *   "عطور > عطور رجالية" → creates "عطور" (root) + "عطور رجالية" (child)
 *   "عطور" → uses existing or creates as root category
 * If a category doesn't exist, it's created automatically.
 *
 * Products are matched by barcode (if present) or name; existing → updated, new → created.
 */

/** Parse a category path like "عطور > عطور رجالية" and return [parent, child]. */
function parseCategoryPath(raw: string): string[] {
  // Split by ">" and trim each part
  return raw
    .split(">")
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Resolve or create a category by path. Returns the leaf category ID. */
async function resolveOrCreateCategory(
  path: string[],
  existingCats: Map<string, string> // name → id cache (updated in place)
): Promise<string | null> {
  if (path.length === 0) return null

  let parentId: string | null = null
  let currentId: string | null = null

  for (const partName of path) {
    // Check cache first
    const cacheKey = parentId ? `${parentId}::${partName}` : partName
    const cached = existingCats.get(cacheKey)
    if (cached) {
      currentId = cached
      parentId = cached
      continue
    }

    // Check DB: find by name AND parentId
    const found: { id: string } | null = await db.category.findFirst({
      where: { name: partName, parentId },
      select: { id: true },
    })

    if (found) {
      currentId = found.id
      existingCats.set(cacheKey, found.id)
    } else {
      // Create new category
      const newCat: { id: string } = await db.category.create({
        data: {
          name: partName,
          parentId: parentId,
        },
        select: { id: true },
      })
      currentId = newCat.id
      existingCats.set(cacheKey, newCat.id)
    }

    parentId = currentId
  }

  return currentId
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN" && user.role !== "WAREHOUSE") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "no-file" }, { status: 400 })
  
  // Security: limit file size to 5MB and validate type
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "file-too-large" }, { status: 413 })
  }
  const validTypes = [".xlsx", ".xls", ".csv"]
  const fileName = (file.name || "").toLowerCase()
  if (!validTypes.some(ext => fileName.endsWith(ext))) {
    return NextResponse.json({ error: "invalid-file-type" }, { status: 400 })
  }

  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: "array" })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, any>[]

  if (rows.length === 0) {
    return NextResponse.json({ error: "empty-file" }, { status: 400 })
  }
  if (rows.length > 5000) {
    return NextResponse.json({ error: "too-many-rows", max: 5000 }, { status: 400 })
  }

  // Preload units for name-matching — map unit name → id so the import
  // can link the Product.unitId FK when the unit name matches.
  const units = await db.unit.findMany()
  const unitNameToId = new Map(units.map((u) => [u.name, u.id]))

  // Category cache: maps "parentId::name" or just "name" → categoryId
  // Preload all existing categories into the cache
  const allCats = await db.category.findMany({ select: { id: true, name: true, parentId: true } })
  const catCache = new Map<string, string>()
  for (const c of allCats) {
    const key = c.parentId ? `${c.parentId}::${c.name}` : c.name
    catCache.set(key, c.id)
  }

  let created = 0
  let updated = 0
  let skipped = 0
  let catsCreated = 0
  const errors: string[] = []

  for (const row of rows) {
    const name = String(row["الاسم"] ?? row["name"] ?? "").trim()
    if (!name) {
      skipped++
      continue
    }
    const barcode = String(row["الباركود"] ?? row["barcode"] ?? "").trim() || null
    const categoryRaw = String(row["الفئة"] ?? row["category"] ?? "").trim()

    // Resolve or create category (supports "أب > ابن" nesting)
    let categoryId: string | null = null
    if (categoryRaw) {
      const path = parseCategoryPath(categoryRaw)
      const beforeCount = catCache.size
      categoryId = await resolveOrCreateCategory(path, catCache)
      if (catCache.size > beforeCount) {
        catsCreated += (catCache.size - beforeCount)
      }
    }

    const quantity = Number(row["الكمية"] ?? row["quantity"] ?? 0) || 0
    const reorderLevel = Number(row["حد الطلب"] ?? row["reorder"] ?? 5) || 0
    const costPrice = Number(row["سعر التكلفة"] ?? row["cost"] ?? 0) || 0
    const salePrice = Number(row["سعر البيع"] ?? row["sale"] ?? 0) || 0
    const unit = String(row["الوحدة"] ?? row["unit"] ?? "قطعة").trim() || "قطعة"
    // Resolve unit name → unitId FK (null if the unit isn't defined in Settings)
    const resolvedUnitId = unitNameToId.get(unit) ?? null
    // Image URL — supports direct links, Google Drive, and Imgur
    let imageUrl = String(row["رابط الصورة"] ?? row["imageUrl"] ?? row["image"] ?? "").trim() || null
    // Convert Google Drive share links to direct image links
    if (imageUrl && imageUrl.includes("drive.google.com")) {
      const fileIdMatch = imageUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)
      if (fileIdMatch) {
        imageUrl = `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`
      }
    }
    // Convert Google Drive open?id= links
    if (imageUrl && imageUrl.includes("open?id=")) {
      const fileIdMatch = imageUrl.match(/open\?id=([a-zA-Z0-9_-]+)/)
      if (fileIdMatch) {
        imageUrl = `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`
      }
    }

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
            unitId: resolvedUnitId,
            ...(imageUrl ? { imageUrl } : {}),
          },
        })
        updated++
      } else {
        await db.product.create({
          data: { name, barcode, categoryId, quantity, reorderLevel, costPrice, salePrice, unit, unitId: resolvedUnitId, imageUrl },
        })
        created++
      }
    } catch (e: any) {
      errors.push(`${name}: ${e?.message || "error"}`)
    }
  }

  return NextResponse.json({
    ok: true,
    total: rows.length,
    created,
    updated,
    skipped,
    catsCreated,
    errors: errors.slice(0, 10),
  })
}
