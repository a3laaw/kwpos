import { PrismaClient } from '@prisma/client'
const url = "postgresql://postgres.qwicxgoslxmypksytklo:hcCBAZ3vcTnXopoR@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
const prisma = new PrismaClient({ datasourceUrl: url })
async function main() {
  console.log("=== Testing connection ===")
  const products = await prisma.product.findMany({ take: 3, select: { id: true, name: true, costPrice: true, salePrice: true } })
  console.log("Products sample:", JSON.stringify(products, null, 2))
  const users = await prisma.user.findMany({ select: { email: true, role: true } })
  console.log("Users:", JSON.stringify(users, null, 2))
  const wh = await prisma.warehouse.findMany({ select: { id: true, name: true, isActive: true } })
  console.log("Warehouses:", JSON.stringify(wh, null, 2))
}
main().catch(e => console.error("ERROR:", e.message)).finally(() => prisma.$disconnect())
