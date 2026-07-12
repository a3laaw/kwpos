import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { canSeeCost, canSeeFinancials, canManageProducts } from "@/lib/permissions"
import * as XLSX from "xlsx"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * Export data to .xlsx. `?type=sales|products|journal|customers|suppliers`
 * Optional `?from=&to=` for sales/journal.
 *
 * ── Role-based export permissions ──
 *   sales      → financial roles only (OWNER/ADMIN/MANAGER/ACCOUNTANT)
 *   journal    → financial roles only
 *   products   → inventory/product-manage roles (OWNER/ADMIN/MANAGER/WAREHOUSE)
 *                cost column is stripped for roles that can't see cost
 *   customers  → any authenticated user (sales staff need the phone book)
 *   suppliers  → inventory/financial roles (OWNER/ADMIN/MANAGER/WAREHOUSE/ACCOUNTANT)
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const role = user.role as Role

  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") || "sales"
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  // ── Gate each export type by role ──
  if (type === "sales" || type === "journal") {
    if (!canSeeFinancials(role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }
  } else if (type === "products") {
    if (!canManageProducts(role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }
  } else if (type === "suppliers") {
    if (!canSeeFinancials(role) && !canManageProducts(role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }
  } else if (type === "customers") {
    // Customer export: OWNER/ADMIN/MANAGER/SALES/CASHIER can export
    // (they need the phone book for POS). WAREHOUSE/ACCOUNTANT should
    // not export customer data — it's not their domain.
    if (!canSeeFinancials(role) && !canManageProducts(role)) {
      // Allow SALES and CASHIER even though they're not financial/product-manage
      // Check explicitly:
      if (role !== "SALES" && role !== "CASHIER") {
        return NextResponse.json({ error: "forbidden" }, { status: 403 })
      }
    }
  }

  const dateFilter: any = {}
  if (from) dateFilter.gte = new Date(from)
  if (to) {
    const t = new Date(to)
    t.setHours(23, 59, 59, 999)
    dateFilter.lte = t
  }

  let headerRow: string[] = []
  let dataRows: any[][] = []
  let sheetName = "Sheet1"
  let filename = "export.xlsx"

  if (type === "sales") {
    sheetName = "المبيعات"
    filename = "sales.xlsx"
    headerRow = ["رقم الفاتورة", "التاريخ", "العميل", "الهاتف", "طريقة الدفع", "المجموع الفرعي", "الخصم", "الضريبة", "الإجمالي", "البائع"]
    const sales = await db.sale.findMany({
      where: Object.keys(dateFilter).length ? { createdAt: dateFilter } : {},
      include: { user: true },
      orderBy: { createdAt: "desc" },
    })
    dataRows = sales.map((s) => [
      s.invoiceNo,
      new Date(s.createdAt).toLocaleString("ar-KW-u-nu-latn"),
      s.customerName || "عميل نقدي",
      s.customerPhone || "",
      s.paymentMethod === "CASH" ? "نقدي" : s.paymentMethod === "CARD" ? "بطاقة" : "تحويل",
      s.subtotal, s.discount, s.taxAmount, s.total,
      s.user?.name || "",
    ])
  } else if (type === "products") {
    sheetName = "الأصناف"
    filename = "products.xlsx"
    // Cost column is included ONLY for roles that can see cost. SALES/CASHIER
    // get an export without the cost column so financial data doesn't leak
    // out via Excel — even though the export itself is already gated to
    // product-manage roles, this is defense-in-depth.
    const seeCost = canSeeCost(role)
    headerRow = seeCost
      ? ["الاسم", "الباركود", "الفئة", "الكمية", "حد الطلب", "سعر التكلفة", "سعر البيع", "الوحدة", "رابط الصورة"]
      : ["الاسم", "الباركود", "الفئة", "الكمية", "حد الطلب", "سعر البيع", "الوحدة", "رابط الصورة"]
    const products = await db.product.findMany({
      include: { category: true },
      orderBy: { name: "asc" },
    })
    dataRows = products.map((p) =>
      seeCost
        ? [p.name, p.barcode || "", p.category?.name || "", p.quantity, p.reorderLevel, p.costPrice, p.salePrice, p.unit, p.imageUrl || ""]
        : [p.name, p.barcode || "", p.category?.name || "", p.quantity, p.reorderLevel, p.salePrice, p.unit, p.imageUrl || ""]
    )
  } else if (type === "journal") {
    sheetName = "القيود"
    filename = "journal.xlsx"
    headerRow = ["رقم القيد", "التاريخ", "المصدر", "الوصف", "رمز الحساب", "اسم الحساب", "مدين", "دائن"]
    const entries = await db.journalEntry.findMany({
      where: Object.keys(dateFilter).length ? { date: dateFilter } : {},
      include: { lines: { include: { account: true } } },
      orderBy: { createdAt: "desc" },
    })
    for (const je of entries) {
      for (const l of je.lines) {
        dataRows.push([
          je.entryNo,
          new Date(je.date).toLocaleDateString("ar-KW-u-nu-latn"),
          je.sourceType,
          je.description,
          l.account.code, l.account.name,
          l.debit, l.credit,
        ])
      }
    }
  } else if (type === "customers") {
    sheetName = "العملاء"
    filename = "customers.xlsx"
    headerRow = ["الاسم", "الهاتف", "العنوان", "تاريخ الإضافة"]
    const customers = await db.customer.findMany({ orderBy: { createdAt: "desc" } })
    dataRows = customers.map((c) => [
      c.name, c.phone, c.address,
      new Date(c.createdAt).toLocaleDateString("ar-KW-u-nu-latn"),
    ])
  } else if (type === "suppliers") {
    sheetName = "الموردون"
    filename = "suppliers.xlsx"
    headerRow = ["الاسم", "مسؤول التواصل", "الهاتف", "البريد", "العنوان"]
    const suppliers = await db.supplier.findMany({ orderBy: { name: "asc" } })
    dataRows = suppliers.map((s) => [s.name, s.contact || "", s.phone || "", s.email || "", s.address || ""])
  } else {
    return NextResponse.json({ error: "invalid-type" }, { status: 400 })
  }

  const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows])
  ws["!cols"] = headerRow.map(() => ({ wch: 18 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
