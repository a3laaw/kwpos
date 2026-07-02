import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { getActiveCountryCode, setActiveCountry } from "@/lib/settings"
import { getCountry } from "@/lib/countries"

export const dynamic = "force-dynamic"

/** Public: returns the active country config (needed for client formatting). */
export async function GET() {
  const code = await getActiveCountryCode()
  const country = getCountry(code)
  return NextResponse.json(country)
}

/** Admin-only: change the active country. */
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const body = await req.json()
  const code = String(body?.code || "").trim().toUpperCase()
  const valid = ["KW", "SA", "AE", "QA", "BH", "OM", "EG", "JO", "MA", "IQ", "DZ", "TN"]
  if (!valid.includes(code)) {
    return NextResponse.json({ error: "invalid-country" }, { status: 400 })
  }

  await setActiveCountry(code)
  const country = getCountry(code)
  return NextResponse.json(country)
}
