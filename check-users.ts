import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient({
  datasourceUrl: "postgresql://postgres.qwicxgoslxmypksytklo:hcCBAZ3vcTnXopoR@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
})
async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, passwordHash: true } })
  console.log("Users count:", users.length)
  for (const u of users) {
    // Check if password hash starts with $2 (bcrypt)
    const hashOk = u.passwordHash?.startsWith("$2") ?? false
    console.log(`  ${u.email} | role: ${u.role} | hash valid: ${hashOk} | hash length: ${u.passwordHash?.length || 0}`)
  }
  
  // Test password "1234" against admin
  const admin = users.find(u => u.email === "admin@demo.com")
  if (admin) {
    const bcrypt = await import("bcryptjs")
    const match = bcrypt.compareSync("1234", admin.passwordHash)
    console.log(`\nAdmin password "1234" match: ${match}`)
  }
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect())
