import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { makeInvoiceNo } from "@/lib/format"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  // Auth: ADMIN only — seeding resets the entire database.
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const reset = body?.reset === true

    if (reset) {
      // Clean all tables (ordered to respect FK constraints)
      await db.journalLine.deleteMany()
      await db.journalEntry.deleteMany()
      await db.expenseTransaction.deleteMany()
      await db.account.deleteMany()
      await db.customer.deleteMany()
      await db.saleItem.deleteMany()
      await db.sale.deleteMany()
      await db.purchaseOrderItem.deleteMany()
      await db.purchaseOrder.deleteMany()
      await db.product.deleteMany()
      await db.stockItem.deleteMany()
      await db.warehouse.deleteMany()
      await db.supplier.deleteMany()
      await db.category.deleteMany()
      await db.unit.deleteMany()
      await db.user.deleteMany()
      await db.setting.deleteMany()
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
    // Passwords are read from environment variables (no hardcoded secrets).
    // If not set, strong random passwords are generated and returned.
    const pw = (p: string) => bcrypt.hashSync(p, 10)
    const randomPw = () =>
      Array.from(crypto.getRandomValues(new Uint8Array(15)))
        .map((b) => b.toString(36).padStart(2, "0"))
        .join("")
        .slice(0, 20)
    const adminPw = process.env.SEED_ADMIN_PASSWORD || randomPw()
    const managerPw = process.env.SEED_MANAGER_PASSWORD || randomPw()
    const accountantPw = process.env.SEED_ACCOUNTANT_PASSWORD || randomPw()
    const salesPw = process.env.SEED_SALES_PASSWORD || randomPw()
    const warehousePw = process.env.SEED_WAREHOUSE_PASSWORD || randomPw()
    const cashierPw = process.env.SEED_CASHIER_PASSWORD || randomPw()
    // Use stable IDs so existing sessions stay valid after a re-seed.
    const users = await db.$transaction([
      db.user.create({
        data: {
          id: "user-admin-demo",
          email: "admin@demo.com",
          name: "أحمد المدير",
          passwordHash: pw(adminPw),
          role: "ADMIN",
          posExpressMode: false,
        },
      }),
      db.user.create({
        data: {
          id: "user-manager-demo",
          email: "manager@demo.com",
          name: "محمد المدير",
          passwordHash: pw(managerPw),
          role: "MANAGER",
          posExpressMode: false,
        },
      }),
      db.user.create({
        data: {
          id: "user-accountant-demo",
          email: "accountant@demo.com",
          name: "فاطمة المحاسبة",
          passwordHash: pw(accountantPw),
          role: "ACCOUNTANT",
          posExpressMode: false,
        },
      }),
      db.user.create({
        data: {
          id: "user-sales-demo",
          email: "sales@demo.com",
          name: "سارة الموظفة",
          passwordHash: pw(salesPw),
          role: "SALES",
          posExpressMode: true,
        },
      }),
      db.user.create({
        data: {
          id: "user-warehouse-demo",
          email: "warehouse@demo.com",
          name: "خالد أمين المخزن",
          passwordHash: pw(warehousePw),
          role: "WAREHOUSE",
          posExpressMode: false,
        },
      }),
      db.user.create({
        data: {
          id: "user-cashier-demo",
          email: "cashier@demo.com",
          name: "نورة الكاشير",
          passwordHash: pw(cashierPw),
          role: "CASHIER",
          posExpressMode: true, // CASHIER always Express Mode
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

    // ---- Warehouses (multi-warehouse support) ----
    const warehouses = await db.$transaction([
      db.warehouse.create({ data: { name: "المخزن الرئيسي", code: "WH-01", location: "المقر الرئيسي" } }),
      db.warehouse.create({ data: { name: "مخزن الفرع", code: "WH-02", location: "فرع السالمية" } }),
      db.warehouse.create({ data: { name: "مخزن الإلكترونيات", code: "WH-03", location: "مبنى الإلكترونيات" } }),
    ])
    const [whMain, whBranch] = warehouses

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
      productDefs.map((p, idx) => {
        // Distribute: electronics → WH-03, food/drinks split WH-01/WH-02, rest → WH-01
        const isElectronics = p.cat === electronics.id
        const isFoodish = p.cat === food.id || p.cat === drinks.id
        let stockItems: any
        if (isElectronics) {
          stockItems = { create: [{ warehouseId: whMain.id, quantity: p.qty }] }
        } else if (isFoodish) {
          const half = Math.ceil(p.qty / 2)
          stockItems = {
            create: [
              { warehouseId: whMain.id, quantity: half },
              { warehouseId: whBranch.id, quantity: p.qty - half },
            ],
          }
        } else {
          stockItems = { create: [{ warehouseId: whMain.id, quantity: p.qty }] }
        }
        return db.product.create({
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
            stockItems,
          },
        })
      })
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

    // ─── Simulated Shopify sales (tagged SHP-) ───────────────────────
    // These represent orders synced from a Shopify store — they feed the
    // P&L revenue figure and the sales analytics widgets.
    const shopifySales: Array<{
      customer: string
      items: Array<{ pi: number; qty: number }>
      daysAgo: number
    }> = [
      { customer: "Noor Al-Sabah", items: [{ pi: 11, qty: 1 }, { pi: 12, qty: 2 }], daysAgo: 0 },
      { customer: "Khaled Al-Anezi", items: [{ pi: 0, qty: 3 }], daysAgo: 1 },
      { customer: "Mariam Al-Otaibi", items: [{ pi: 18, qty: 1 }, { pi: 21, qty: 1 }], daysAgo: 2 },
      { customer: "Ahmed Al-Shammari", items: [{ pi: 15, qty: 5 }, { pi: 16, qty: 3 }], daysAgo: 3 },
      { customer: "Fatima Al-Qahtani", items: [{ pi: 4, qty: 6 }, { pi: 6, qty: 2 }], daysAgo: 4 },
      { customer: "Abdullah Al-Mutairi", items: [{ pi: 13, qty: 2 }, { pi: 14, qty: 1 }], daysAgo: 5 },
    ]
    let shpSeq = 1
    for (const s of shopifySales) {
      const itemsData = s.items.map((it) => {
        const p = products[it.pi]
        return { productId: p.id, quantity: it.qty, unitPrice: p.salePrice, subtotal: p.salePrice * it.qty }
      })
      const subtotal = itemsData.reduce((a, b) => a + b.subtotal, 0)
      const createdAt = new Date(Date.now() - s.daysAgo * 24 * 60 * 60 * 1000)
      await db.sale.create({
        data: {
          invoiceNo: `SHP-${String(1000 + shpSeq++).padStart(4, "0")}`,
          customerName: s.customer,
          subtotal,
          taxRate: 0,
          taxAmount: 0,
          discount: 0,
          total: subtotal,
          paid: subtotal,
          paymentMethod: "CARD",
          userId: users[0].id,
          createdAt,
          items: { create: itemsData },
        },
      })
    }

    // ─── Chart of Accounts (system hierarchy) ────────────────────────
    const accountDefs: Array<{
      code: string
      name: string
      type: string
      parentIdCode?: string
      balance?: number
    }> = [
      // Assets (1000s)
      { code: "1000", name: "الأصول", type: "ASSET", balance: 0 },
      { code: "1010", name: "النقدية", type: "ASSET", parentIdCode: "1000", balance: 1243 },
      { code: "1020", name: "البنك", type: "ASSET", parentIdCode: "1000", balance: 3372 },
      { code: "1100", name: "المخزون", type: "ASSET", parentIdCode: "1000", balance: 0 },
      // Liabilities (2000s) — credit-normal → negative balance (debit-positive convention)
      { code: "2000", name: "الخصوم", type: "LIABILITY", balance: 0 },
      { code: "2010", name: "ذمم دائنة", type: "LIABILITY", parentIdCode: "2000", balance: -320 },
      { code: "2110", name: "ضريبة مستحقة", type: "LIABILITY", parentIdCode: "2000", balance: 0 },
      // Equity (3000s) — credit-normal → negative balance
      // Capital is set so the opening balance sheet balances with the
      // post-expense asset position (Cash 1243 + Bank 3372 = 4615;
      // Liabilities 320 + Capital 4295 = 4615).
      { code: "3000", name: "حقوق الملكية", type: "EQUITY", balance: 0 },
      { code: "3010", name: "رأس المال", type: "EQUITY", parentIdCode: "3000", balance: -4295 },
      // Revenues (4000s)
      { code: "4000", name: "الإيرادات", type: "REVENUE", balance: 0 },
      { code: "4010", name: "إيرادات المبيعات", type: "REVENUE", parentIdCode: "4000", balance: 0 },
      { code: "4020", name: "إيرادات شوبيفاي", type: "REVENUE", parentIdCode: "4000", balance: 0 },
      // Expenses (5000s)
      { code: "5000", name: "المصروفات", type: "EXPENSE", balance: 0 },
      { code: "5010", name: "الرواتب", type: "EXPENSE", parentIdCode: "5000", balance: 0 },
      { code: "5020", name: "الإيجار", type: "EXPENSE", parentIdCode: "5000", balance: 0 },
      { code: "5030", name: "المرافق", type: "EXPENSE", parentIdCode: "5000", balance: 0 },
      { code: "5040", name: "الاشتراكات", type: "EXPENSE", parentIdCode: "5000", balance: 0 },
      { code: "5050", name: "التسويق", type: "EXPENSE", parentIdCode: "5000", balance: 0 },
      { code: "5090", name: "مصروفات إدارية أخرى", type: "EXPENSE", parentIdCode: "5000", balance: 0 },
    ]

    const codeToId = new Map<string, string>()
    // Insert root accounts first, then children
    const roots = accountDefs.filter((a) => !a.parentIdCode)
    const children = accountDefs.filter((a) => a.parentIdCode)
    for (const a of roots) {
      const created = await db.account.create({
        data: { code: a.code, name: a.name, type: a.type, balance: a.balance ?? 0, isSystem: true },
      })
      codeToId.set(a.code, created.id)
    }
    for (const a of children) {
      const created = await db.account.create({
        data: {
          code: a.code,
          name: a.name,
          type: a.type,
          parentId: codeToId.get(a.parentIdCode!)!,
          balance: a.balance ?? 0,
          isSystem: true,
        },
      })
      codeToId.set(a.code, created.id)
    }

    const cashId = codeToId.get("1010")!
    const bankId = codeToId.get("1020")!
    const salariesAccId = codeToId.get("5010")!
    const rentAccId = codeToId.get("5020")!
    const utilitiesAccId = codeToId.get("5030")!
    const subscriptionsAccId = codeToId.get("5040")!
    const marketingAccId = codeToId.get("5050")!
    const otherAccId = codeToId.get("5090")!

    // ─── Expense transactions (salaries + admin) ─────────────────────
    const expenseDefs: Array<{
      type: "SALARY" | "ADMIN"
      amount: number
      daysAgo: number
      employeeName?: string
      title?: string
      category?: string
      accountId: string
      paymentAccountId: string
      note?: string
    }> = [
      // Salaries
      { type: "SALARY", amount: 450, daysAgo: 2, employeeName: "أحمد المدير", accountId: salariesAccId, paymentAccountId: bankId, note: "راتب شهري" },
      { type: "SALARY", amount: 320, daysAgo: 2, employeeName: "سارة الموظفة", accountId: salariesAccId, paymentAccountId: bankId, note: "راتب شهري" },
      { type: "SALARY", amount: 280, daysAgo: 2, employeeName: "خالد أمين المخزن", accountId: salariesAccId, paymentAccountId: cashId, note: "راتب شهري" },
      // Admin expenses
      { type: "ADMIN", amount: 250, daysAgo: 5, title: "إيجار المحل", category: "إيجار", accountId: rentAccId, paymentAccountId: cashId },
      { type: "ADMIN", amount: 65, daysAgo: 4, title: "فاتورة الكهرباء", category: "مرافق", accountId: utilitiesAccId, paymentAccountId: cashId },
      { type: "ADMIN", amount: 18, daysAgo: 6, title: "اشتراك شوبيفاي", category: "اشتراكات", accountId: subscriptionsAccId, paymentAccountId: bankId },
      { type: "ADMIN", amount: 40, daysAgo: 3, title: "إعلان إنستغرام", category: "تسويق", accountId: marketingAccId, paymentAccountId: bankId },
      { type: "ADMIN", amount: 12, daysAgo: 1, title: "أدوات مكتبية", category: "أخرى", accountId: otherAccId, paymentAccountId: cashId },
    ]

    for (const e of expenseDefs) {
      const date = new Date(Date.now() - e.daysAgo * 24 * 60 * 60 * 1000)
      await db.expenseTransaction.create({
        data: {
          type: e.type,
          employeeName: e.employeeName ?? null,
          payDate: e.type === "SALARY" ? date : null,
          title: e.title ?? null,
          category: e.category ?? null,
          date: e.type === "ADMIN" ? date : null,
          amount: e.amount,
          accountId: e.accountId,
          paymentAccountId: e.paymentAccountId,
          note: e.note ?? null,
        },
      })
      // Update account balances (debit expense, credit payment asset)
      await db.account.update({ where: { id: e.accountId }, data: { balance: { increment: e.amount } } })
      await db.account.update({ where: { id: e.paymentAccountId }, data: { balance: { decrement: e.amount } } })
    }

    // ─── Customers (CRM directory) ──────────────────────────────────
    const customerDefs = [
      { name: "نور الصباح", phone: "+965 5511 2233", address: "السالمية - شارع البحر" },
      { name: "خالد العنزي", phone: "+965 5544 7788", address: "حولي - ابن خلدون" },
      { name: "مريم العتيبي", phone: "+965 9900 1122", address: "الفروانية - المنطقة السكنية" },
      { name: "أحمد الشمري", phone: "+965 6633 4455", address: "الجهراء - الصناعية" },
      { name: "فاطمة القحطاني", phone: "+965 5577 9900", address: "مبارك الكبير - قرية جابر" },
      { name: "عبدالله المطيري", phone: "+965 9988 5566", address: "أبرق خيطان - 12" },
      { name: "هند الدوسري", phone: "+965 6611 3344", address: "بيان - blok 4" },
      { name: "يوسف الحربي", phone: "+965 5522 6677", address: "السالمية - عمارة 22" },
    ]
    await db.$transaction(
      customerDefs.map((c) => db.customer.create({ data: c }))
    )

    // ─── Units of measure ──────────────────────────────────────────
    const unitDefs = ["قطعة", "كيلو", "جرام", "علبة", "كيس", "زجاجة", "كرتون", "رزمة", "طقم", "لتر", "متر"]
    if (reset || (await db.unit.count()) === 0) {
      await db.$transaction(
        unitDefs.map((u) => db.unit.create({ data: { name: u } }))
      )
    }

    return NextResponse.json({
      ok: true,
      message: "seeded",
      // Return generated passwords ONLY if they were randomly generated
      // (env vars not set). Store these securely; they are NOT shown again.
      generatedPasswords:
        process.env.SEED_ADMIN_PASSWORD ? undefined : {
          admin: adminPw,
          manager: managerPw,
          accountant: accountantPw,
          sales: salesPw,
          warehouse: warehousePw,
          cashier: cashierPw,
        },
      counts: {
        users: await db.user.count(),
        categories: await db.category.count(),
        suppliers: await db.supplier.count(),
        products: await db.product.count(),
        purchaseOrders: await db.purchaseOrder.count(),
        sales: await db.sale.count(),
        accounts: await db.account.count(),
        expenses: await db.expenseTransaction.count(),
        customers: await db.customer.count(),
        units: await db.unit.count(),
        warehouses: await db.warehouse.count(),
      },
    })
  } catch (e: any) {
    console.error("[seed] error", e)
    return NextResponse.json({ ok: false, error: e?.message || "seed-failed" }, { status: 500 })
  }
}

export async function GET() {
  // Auth: ADMIN only — exposes DB row counts.
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  return NextResponse.json({
    ok: true,
    counts: {
      users: await db.user.count(),
      categories: await db.category.count(),
      suppliers: await db.supplier.count(),
      products: await db.product.count(),
      purchaseOrders: await db.purchaseOrder.count(),
      sales: await db.sale.count(),
      accounts: await db.account.count(),
      expenses: await db.expenseTransaction.count(),
      customers: await db.customer.count(),
    },
  })
}
