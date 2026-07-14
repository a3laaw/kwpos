import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

/**
 * GET /api/search?q=QUERY
 *
 * Global search across:
 *   - Products (by name or barcode)
 *   - Customers (by name or phone)
 *   - Suppliers (by name)
 *   - Sales invoices (by invoiceNo, customerName, or customerPhone)
 *   - Purchase orders (by id/note)
 *
 * Returns the top 5 matches per category. Requires authentication.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim() || ""

  if (!q || q.length < 1) {
    return NextResponse.json({ products: [], customers: [], suppliers: [], sales: [], purchaseOrders: [] })
  }

  // Use case-insensitive contains (Prisma mode: insensitive for PostgreSQL)
  const contains = { contains: q, mode: "insensitive" as const }

  const [products, customers, suppliers, sales, purchaseOrders] = await Promise.all([
    // Products: by name or barcode
    db.product.findMany({
      where: { OR: [{ name: contains }, { barcode: contains }] },
      select: { id: true, name: true, barcode: true, salePrice: true, quantity: true, imageUrl: true },
      take: 5,
    }),
    // Customers: by name or phone
    db.customer.findMany({
      where: { OR: [{ name: contains }, { phone: contains }] },
      select: { id: true, name: true, phone: true },
      take: 5,
    }),
    // Suppliers: by name
    db.supplier.findMany({
      where: { name: contains },
      select: { id: true, name: true, phone: true },
      take: 5,
    }),
    // Sales: by invoiceNo, customerName, or customerPhone
    db.sale.findMany({
      where: { OR: [{ invoiceNo: contains }, { customerName: contains }, { customerPhone: contains }] },
      select: { id: true, invoiceNo: true, total: true, createdAt: true, customerName: true },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
    // Purchase Orders: by id or note
    db.purchaseOrder.findMany({
      where: { OR: [{ id: contains }, { note: contains }] },
      select: { id: true, status: true, total: true, note: true, createdAt: true, supplier: { select: { name: true } } },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
  ])

  return NextResponse.json({
    products: products.map((p) => ({ ...p, type: "product" as const, salePrice: Number(p.salePrice), quantity: Number(p.quantity) })),
    customers: customers.map((c) => ({ ...c, type: "customer" as const })),
    suppliers: suppliers.map((s) => ({ ...s, type: "supplier" as const })),
    sales: sales.map((s) => ({ ...s, type: "sale" as const, total: Number(s.total), createdAt: String(s.createdAt) })),
    purchaseOrders: purchaseOrders.map((po) => ({
      id: po.id,
      status: po.status,
      total: Number(po.total),
      note: po.note,
      supplierName: po.supplier?.name ?? "—",
      createdAt: String(po.createdAt),
      type: "po" as const,
    })),
  })
}
