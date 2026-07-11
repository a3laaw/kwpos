import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
async function main() {
  const pw = (p: string) => bcrypt.hashSync(p, 10)
  const resets = [
    { email: "admin@demo.com", pw: "Admin@2026" },
    { email: "manager@demo.com", pw: "Manager@2026" },
    { email: "accountant@demo.com", pw: "Accountant@2026" },
    { email: "sales@demo.com", pw: "Sales@2026" },
    { email: "warehouse@demo.com", pw: "Warehouse@2026" },
    { email: "cashier@demo.com", pw: "Cashier@2026" },
  ]
  for (const r of resets) {
    await db.user.update({ where: { email: r.email }, data: { passwordHash: pw(r.pw) } })
    console.log(r.email + " → " + r.pw)
  }
  await db.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
