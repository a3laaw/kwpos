import { NextResponse } from "next/server"
import { getShopifyConfig } from "@/lib/shopify"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const cfg = getShopifyConfig()
  return NextResponse.json({
    configured: cfg.configured,
    domain: cfg.domain || null,
    message: cfg.configured
      ? "متصل بمتجر شوبيفاي"
      : "لم يتم إعداد التكامل بعد — أضف SHOPIFY_STORE_DOMAIN و SHOPIFY_ACCESS_TOKEN إلى ملف .env",
  })
}
