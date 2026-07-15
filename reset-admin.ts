import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
async function main() {
  const newPw = "Admin@2026"
  const hash = bcrypt.hashSync(newPw, 10)
  await db.user.update({
    where: { email: "admin@demo.com" },
    data: { passwordHash: hash },
  })
  console.log("RESET OK — admin@demo.com / " + newPw)
  await db.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
