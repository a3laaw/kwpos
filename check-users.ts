import { db } from "@/lib/db"
async function main() {
  const count = await db.user.count()
  if (count === 0) {
    console.log("NO_USERS_IN_DB")
  } else {
    const users = await db.user.findMany({ select: { email: true, name: true, role: true } })
    console.log("USERS_IN_DB:", JSON.stringify(users, null, 2))
  }
  await db.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
