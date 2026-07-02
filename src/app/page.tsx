import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { LoginScreen } from "@/components/auth/login-screen"
import { AppShell } from "@/components/app-shell"
import type { Role } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return <LoginScreen />
  }

  const user = {
    id: session.user.id,
    name: session.user.name || (session.user.email ?? "مستخدم"),
    email: session.user.email ?? "",
    role: (session.user.role as Role) || "SALES",
  }

  return <AppShell user={user} />
}
