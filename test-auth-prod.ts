import { PrismaClient } from '@prisma/client'
import bcrypt from "bcryptjs"
const prisma = new PrismaClient({
  datasourceUrl: "postgresql://postgres.qwicxgoslxmypksytklo:hcCBAZ3vcTnXopoR@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
})
async function main() {
  // Simulate what auth.ts does when user types "admin" + "1234"
  const input = "admin"
  const inputLower = input.toLowerCase()
  
  console.log("=== Testing auth flow for input:", input, "===")
  
  // Step 1: exact email match
  let user = await prisma.user.findUnique({ where: { email: inputLower } })
  console.log("Step 1 (exact email):", user ? user.email : "not found")
  
  // Step 2: local-part match
  if (!user) {
    user = await prisma.user.findFirst({ where: { email: { startsWith: inputLower + "@" } } })
    console.log("Step 2 (local-part):", user ? user.email : "not found")
  }
  
  // Step 3: name match
  if (!user) {
    user = await prisma.user.findFirst({ where: { name: { equals: input } } })
    console.log("Step 3 (name):", user ? user.email : "not found")
  }
  
  if (user) {
    const ok = bcrypt.compareSync("1234", user.passwordHash)
    console.log("Password match:", ok)
    console.log("User would login as:", user.role)
  } else {
    console.log("❌ User not found by any method!")
  }
  
  // Also test with full email
  console.log("\n=== Testing with full email: admin@demo.com ===")
  const user2 = await prisma.user.findUnique({ where: { email: "admin@demo.com" } })
  console.log("Found:", user2?.email, "role:", user2?.role)
  if (user2) {
    const ok = bcrypt.compareSync("1234", user2.passwordHash)
    console.log("Password match:", ok)
  }
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect())
