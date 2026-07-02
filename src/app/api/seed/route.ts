import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { makeInvoiceNo } from "@/lib/format"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const reset = body?.reset === true

    if (reset) {
      // Clean all tables (ordered to respect FK constraints)
      await db.saleItem.deleteMany()
      await db.sale.deleteMany()
      await db.purchaseOrderItem.deleteMany()
      await db.purchaseOrder.deleteMany()
      await db.product.deleteMany()
      await db.supplier.deleteMany()
      await db.category.deleteMany()
      await db.user.deleteMany()
    }

    const existingUsers = await db.user.count()
    if (existingUsers > 0 && !reset) {
      return NextResponse.json({
        ok: true,
        message: "already-seeded",
        users: await db.user.count(),
      })
    }

    // ---- Users ----
    const pw = (p: string) => bcrypt.hashSync(p, 10)
    const users = await db.$transaction([
      db.user.create({
        data: {
          email: "admin@demo.com",
          name: "أحمد المدير",
          passwordHash: pw("***REMOVED***"),
          role: "ADMIN",
        },
      }),
      db.user.create({
        data: {
          email: "sales@demo.com",
          name: "سارة الموظفة",
          passwordHash: pw("***REMOVED***"),
          role: "SALES",
        },
      }),
      db.user.create({
        data: {
          email: "warehouse@demo.com",
          name: "خالد أمين المخزن",
          passwordHash: pw("***REMOVED***"),
          role: "WAREHOUSE",
        },
      }),
    ])

    // ---- Categories ----
    const categories = await db.$transaction([
      db.category.create({ data: { name: "مواد غذائية" } }),
      db.category.create({ data: { name: "مشروبات" } }),
      db.category.create({ data: { name: "منظفات" } }),
      db.category.create({ data: { name: "إلكترونيات" } }),
      db.category.create({ data: { name: "قرطاسية" } }),
      db.category.create({ data: { name: "أدوات منزلية" } }),
    ])
    const [food, drinks, cleaning, electronics, stationery, household] = categories

    // ---- Suppliers (Kuwait) ----
    const suppliers = await db.$transaction([
      db.supplier.create({
        data: {
          name: "شركة المركز للأغذية",
          contact: "محمد العنزي",
          phone: "+965 5123 4567",
          email: "info@markaz-foods.kw",
          address: "حولي - شارع ابن خلدون",
        },
      }),
      db.supplier.create({
        data: {
          name: "مؤسسة الإمداد التجارية",
          contact: "عبدالله العتيبي",
          phone: "+965 6765 4321",
          email: "sales@imdad.kw",
          address: "الشويخ الصناعية - قطعة 4",
        },
      }),
      db.supplier.create({
        data: {
          name: "شركة التقنية الحديثة",
          contact: "فيصل الشمري",
          phone: "+965 5098 7654",
          email: "orders@moderntech.kw",
          address: "الفروانية - المنطقة الصناعية",
        },
      }),
      db.supplier.create({
        data: {
          name: "بيت القرطاسية",
          contact: "نورة الصباح",
          phone: "+965 5332 1100",
          email: "hello@stationery.kw",
          address: "السالمية - شارع البحر",
        },
      }),
    ])
    const [sFood, sGeneral, sTech, sStationery] = suppliers

    // ---- Products (prices in KWD — Kuwaiti Dinar) ----
    const productDefs: Array<{
      name: string
      barcode: string
      cat: string
      sup: string
      qty: number
      reorder: number
      cost: number
      sale: number
      unit: string
    }> = [
      { name: "أرز بسمتي 5كجم", barcode: "6281000012345", cat: food.id, sup: sFood.id, qty: 80, reorder: 15, cost: 2.3, sale: 3.1, unit: "كيس" },
      { name: "زيت دوار الشمس 1.5ل", barcode: "6281000012352", cat: food.id, sup: sFood.id, qty: 120, reorder: 20, cost: 0.75, sale: 1.1, unit: "زجاجة" },
      { name: "سكر ناعم 2كجم", barcode: "6281000012369", cat: food.id, sup: sFood.id, qty: 8, reorder: 15, cost: 0.6, sale: 0.85, unit: "كيس" },
      { name: "معكرونة إيطالية 500ج", barcode: "6281000012376", cat: food.id, sup: sGeneral.id, qty: 60, reorder: 12, cost: 0.35, sale: 0.55, unit: "علبة" },
      { name: "حليب طازج 2ل", barcode: "6281000012383", cat: drinks.id, sup: sFood.id, qty: 45, reorder: 18, cost: 0.95, sale: 1.3, unit: "علبة" },
      { name: "عصير برتقال 1ل", barcode: "6281000012390", cat: drinks.id, sup: sFood.id, qty: 6, reorder: 20, cost: 0.42, sale: 0.7, unit: "علبة" },
      { name: "مياه معدنية 40*330مل", barcode: "6281000012406", cat: drinks.id, sup: sGeneral.id, qty: 90, reorder: 25, cost: 1.2, sale: 1.85, unit: "كرتون" },
      { name: "شاي أحمر 250ج", barcode: "6281000012413", cat: drinks.id, sup: sGeneral.id, qty: 50, reorder: 10, cost: 1.0, sale: 1.5, unit: "علبة" },
      { name: "مسحوق غسيل 3كجم", barcode: "6281000012420", cat: cleaning.id, sup: sGeneral.id, qty: 35, reorder: 10, cost: 1.85, sale: 2.7, unit: "كيس" },
      { name: "سائل جلي 1ل", barcode: "6281000012437", cat: cleaning.id, sup: sGeneral.id, qty: 70, reorder: 15, cost: 0.5, sale: 0.85, unit: "زجاجة" },
      { name: "معطر أرضيات 2ل", barcode: "6281000012444", cat: cleaning.id, sup: sGeneral.id, qty: 4, reorder: 12, cost: 0.75, sale: 1.25, unit: "زجاجة" },
      { name: "سماعة بلوتوث", barcode: "6281000012451", cat: electronics.id, sup: sTech.id, qty: 25, reorder: 8, cost: 5.8, sale: 9.9, unit: "قطعة" },
      { name: "شاحن سريع 25واط", barcode: "6281000012468", cat: electronics.id, sup: sTech.id, qty: 40, reorder: 10, cost: 2.1, sale: 3.75, unit: "قطعة" },
      { name: "كابل USB-C 1م", barcode: "6281000012475", cat: electronics.id, sup: sTech.id, qty: 3, reorder: 15, cost: 0.65, sale: 1.35, unit: "قطعة" },
      { name: "باور بانك 10000mAh", barcode: "6281000012482", cat: electronics.id, sup: sTech.id, qty: 18, reorder: 6, cost: 4.6, sale: 7.9, unit: "قطعة" },
      { name: "دفتر A4 80 ورقة", barcode: "6281000012499", cat: stationery.id, sup: sStationery.id, qty: 200, reorder: 40, cost: 0.32, sale: 0.58, unit: "قطعة" },
      { name: "قلم جاف أزرق (علبة 12)", barcode: "6281000012505", cat: stationery.id, sup: sStationery.id, qty: 75, reorder: 20, cost: 0.5, sale: 1.0, unit: "علبة" },
      { name: "ورق طباعة A4 (500 ورقة)", barcode: "6281000012512", cat: stationery.id, sup: sStationery.id, qty: 9, reorder: 15, cost: 0.9, sale: 1.5, unit: "رزمة" },
      { name: "مقلاة هوائية 5ل", barcode: "6281000012529", cat: household.id, sup: sGeneral.id, qty: 12, reorder: 5, cost: 15.0, sale: 24.9, unit: "قطعة" },
      { name: "طقم أواني 6 قطع", barcode: "6281000012536", cat: household.id, sup: sGeneral.id, qty: 7, reorder: 4, cost: 18.3, sale: 29.0, unit: "طقم" },
      { name: "مكنسة كهربائية", barcode: "6281000012543", cat: household.id, sup: sTech.id, qty: 5, reorder: 3, cost: 23.3, sale: 37.4, unit: "قطعة" },
      { name: "محمصة خبز", barcode: "6281000012550", cat: household.id, sup: sTech.id, qty: 14, reorder: 5, cost: 5.4, sale: 9.2, unit: "قطعة" },
    ]

    const products = await db.$transaction(
      productDefs.map((p) =>
        db.product.create({
          data: {
            name: p.name,
            barcode: p.barcode,
            categoryId: p.cat,
            supplierId: p.sup,
            quantity: p.qty,
            reorderLevel: p.reorder,
            costPrice: p.cost,
            salePrice: p.sale,
            unit: p.unit,
          },
        })
      )
    )

    // ---- A few purchase orders (one received, one pending) ----
    const po1Items = [
      { productId: products[0].id, quantity: 50, unitCost: 2.3 },
      { productId: products[1].id, quantity: 80, unitCost: 0.75 },
    ]
    const po1 = await db.purchaseOrder.create({
      data: {
        supplierId: sFood.id,
        status: "RECEIVED",
        total: po1Items.reduce((a, b) => a + b.quantity * b.unitCost, 0),
        note: "توريد شهري دوري",
        items: { create: po1Items.map((it) => ({ ...it, subtotal: it.quantity * it.unitCost })) },
      },
    })

    const po2Items = [
      { productId: products[12].id, quantity: 30, unitCost: 0.65 },
      { productId: products[11].id, quantity: 15, unitCost: 5.8 },
    ]
    await db.purchaseOrder.create({
      data: {
        supplierId: sTech.id,
        status: "PENDING",
        total: po2Items.reduce((a, b) => a + b.quantity * b.unitCost, 0),
        note: "بانتظار التوريد",
        items: { create: po2Items.map((it) => ({ ...it, subtotal: it.quantity * it.unitCost })) },
      },
    })

    // ---- Sales invoices (spread across last 7 days) ----
    const salesPeople = [users[0].id, users[1].id]
    const saleTemplates: Array<{
      customer: string
      items: Array<{ pi: number; qty: number }>
      payment: "CASH" | "CARD" | "TRANSFER"
      discount: number
      daysAgo: number
      userIdx: number
    }> = [
      { customer: "عميل نقدي", items: [{ pi: 0, qty: 2 }, { pi: 1, qty: 3 }], payment: "CASH", discount: 0, daysAgo: 0, userIdx: 1 },
      { customer: "شركة الأمل", items: [{ pi: 15, qty: 10 }, { pi: 16, qty: 5 }], payment: "TRANSFER", discount: 1.0, daysAgo: 0, userIdx: 0 },
      { customer: "عميل نقدي", items: [{ pi: 4, qty: 4 }, { pi: 5, qty: 6 }], payment: "CARD", discount: 0, daysAgo: 1, userIdx: 1 },
      { customer: "مؤسسة النور", items: [{ pi: 11, qty: 2 }, { pi: 12, qty: 3 }], payment: "TRANSFER", discount: 1.5, daysAgo: 1, userIdx: 0 },
      { customer: "عميل نقدي", items: [{ pi: 8, qty: 1 }, { pi: 9, qty: 3 }], payment: "CASH", discount: 0, daysAgo: 2, userIdx: 1 },
      { customer: "عميل نقدي", items: [{ pi: 18, qty: 1 }], payment: "CARD", discount: 0, daysAgo: 2, userIdx: 1 },
      { customer: "متجر الريان", items: [{ pi: 6, qty: 5 }, { pi: 7, qty: 4 }], payment: "TRANSFER", discount: 1.2, daysAgo: 3, userIdx: 0 },
      { customer: "عميل نقدي", items: [{ pi: 0, qty: 3 }, { pi: 2, qty: 2 }], payment: "CASH", discount: 0, daysAgo: 3, userIdx: 1 },
      { customer: "عميل نقدي", items: [{ pi: 19, qty: 1 }, { pi: 20, qty: 2 }], payment: "CARD", discount: 0, daysAgo: 4, userIdx: 1 },
      { customer: "شركة الأمل", items: [{ pi: 13, qty: 8 }, { pi: 14, qty: 5 }], payment: "TRANSFER", discount: 2.0, daysAgo: 4, userIdx: 0 },
      { customer: "عميل نقدي", items: [{ pi: 3, qty: 6 }], payment: "CASH", discount: 0, daysAgo: 5, userIdx: 1 },
      { customer: "عميل نقدي", items: [{ pi: 21, qty: 2 }], payment: "CARD", discount: 0, daysAgo: 5, userIdx: 1 },
      { customer: "متجر الريان", items: [{ pi: 1, qty: 8 }, { pi: 4, qty: 5 }], payment: "TRANSFER", discount: 1.5, daysAgo: 6, userIdx: 0 },
      { customer: "عميل نقدي", items: [{ pi: 10, qty: 2 }, { pi: 9, qty: 4 }], payment: "CASH", discount: 0, daysAgo: 6, userIdx: 1 },
    ]

    const TAX = 0 // Kuwait has no VAT currently
    let invoiceSeq = 1
    for (const t of saleTemplates) {
      const itemsData = t.items.map((it) => {
        const p = products[it.pi]
        return { productId: p.id, quantity: it.qty, unitPrice: p.salePrice, subtotal: p.salePrice * it.qty }
      })
      const subtotal = itemsData.reduce((a, b) => a + b.subtotal, 0)
      const afterDiscount = Math.max(0, subtotal - t.discount)
      const taxAmount = +(afterDiscount * (TAX / 100)).toFixed(2)
      const total = +(afterDiscount + taxAmount).toFixed(2)
      const createdAt = new Date(Date.now() - t.daysAgo * 24 * 60 * 60 * 1000)
      await db.sale.create({
        data: {
          invoiceNo: makeInvoiceNo(invoiceSeq++),
          customerName: t.customer,
          subtotal,
          taxRate: TAX,
          taxAmount,
          discount: t.discount,
          total,
          paid: total,
          paymentMethod: t.payment,
          userId: salesPeople[t.userIdx],
          createdAt,
          items: { create: itemsData },
        },
      })
    }

    return NextResponse.json({
      ok: true,
      message: "seeded",
      counts: {
        users: await db.user.count(),
        categories: await db.category.count(),
        suppliers: await db.supplier.count(),
        products: await db.product.count(),
        purchaseOrders: await db.purchaseOrder.count(),
        sales: await db.sale.count(),
      },
    })
  } catch (e: any) {
    console.error("[seed] error", e)
    return NextResponse.json({ ok: false, error: e?.message || "seed-failed" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    counts: {
      users: await db.user.count(),
      categories: await db.category.count(),
      suppliers: await db.supplier.count(),
      products: await db.product.count(),
      purchaseOrders: await db.purchaseOrder.count(),
      sales: await db.sale.count(),
    },
  })
}
