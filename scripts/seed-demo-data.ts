/**
 * Quick seed for demo screenshots — adds a few products + categories + customer.
 * Run once to populate the DB for visual demos.
 */
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient({
  datasourceUrl: "postgresql://postgres.qwicxgoslxmypksytklo:alaa%4055505186@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres",
})

async function main() {
  console.log("🌱 Seeding demo data...")

  // Get the default warehouse + category created by reset-prod-db.ts
  const wh = await prisma.warehouse.findFirst()
  const cat = await prisma.category.findFirst()
  const unit = await prisma.unit.findFirst()

  if (!wh || !cat || !unit) {
    console.log("⚠️  Run scripts/reset-prod-db.ts first to create base data")
    return
  }

  // Add more categories
  const cats = [
    { name: "عطور رجالية", barcodePrefix: 2 },
    { name: "عطور نسائية", barcodePrefix: 3 },
    { name: "بخور", barcodePrefix: 4 },
    { name: "هدايا", barcodePrefix: 5 },
  ]
  for (const c of cats) {
    await prisma.category.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    })
  }

  // Add products
  const products = [
    { name: "عطر رجالي فاخر 100مل", barcode: "6281000012345", categoryId: cat.id, salePrice: 35, costPrice: 18, quantity: 50, reorderLevel: 10, unitId: unit.id },
    { name: "عطر نسائي روز 50مل", barcode: "6281000056789", categoryId: cat.id, salePrice: 28, costPrice: 14, quantity: 30, reorderLevel: 5, unitId: unit.id },
    { name: "شمعة عطرية فاخرة", barcode: "6281000090123", categoryId: cat.id, salePrice: 15, costPrice: 7, quantity: 12, reorderLevel: 10, unitId: unit.id },
    { name: "مبخرة نحاسية يدوية", barcode: "6281000034567", categoryId: cat.id, salePrice: 45, costPrice: 22, quantity: 8, reorderLevel: 8, unitId: unit.id },
    { name: "بخور عود ملكي 50جم", barcode: "6281000078901", categoryId: cat.id, salePrice: 22, costPrice: 10, quantity: 25, reorderLevel: 5, unitId: unit.id },
    { name: "دهن عود مركز 10مل", barcode: "6281000022222", categoryId: cat.id, salePrice: 65, costPrice: 28, quantity: 15, reorderLevel: 3, unitId: unit.id },
    { name: "علبة هدايا فاخرة", barcode: "6281000033333", categoryId: cat.id, salePrice: 18, costPrice: 9, quantity: 40, reorderLevel: 10, unitId: unit.id },
    { name: "فحم شبك مخصص", barcode: "6281000044444", categoryId: cat.id, salePrice: 5, costPrice: 2.5, quantity: 100, reorderLevel: 20, unitId: unit.id },
  ]

  for (const p of products) {
    // Check if product already exists by name
    const existing = await prisma.product.findFirst({ where: { name: p.name } })
    if (existing) continue
    const prod = await prisma.product.create({ data: p })
    // Add stock to warehouse
    await prisma.stockItem.create({
      data: { productId: prod.id, warehouseId: wh.id, quantity: p.quantity },
    }).catch(() => {})
  }

  // Add a customer (check by phone first)
  const existingCust = await prisma.customer.findFirst({ where: { phone: "96555555555" } })
  if (!existingCust) {
    await prisma.customer.create({ data: { name: "محمد العنزي", phone: "96555555555", address: "الكويت" } })
  }

  // Add a supplier (check by name first)
  const existingSup = await prisma.supplier.findFirst({ where: { name: "شركة العطور العالمية" } })
  if (!existingSup) {
    await prisma.supplier.create({ data: { name: "شركة العطور العالمية", phone: "96522222222", email: "info@perfumes.kw", address: "الكويت" } })
  }

  console.log("✅ Demo data seeded:")
  console.log("  -", await prisma.product.count(), "products")
  console.log("  -", await prisma.category.count(), "categories")
  console.log("  -", await prisma.customer.count(), "customers")
  console.log("  -", await prisma.supplier.count(), "suppliers")
  console.log("  -", await prisma.stockItem.count(), "stock items")
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); process.exit(1) })
