import { db } from "@/lib/db"
import type { CustomerTier } from "@/lib/types"

/**
 * Resolve or create a customer record based on the phone number.
 *
 * - If a phone is provided and an existing customer has it → link to them
 *   (and update their address if missing).
 * - If a phone is provided but no customer has it → create a new customer.
 * - If no phone is provided → returns { customerId: undefined } (walk-in sale).
 *
 * Returns the customerId (if linked/created), the resolved display name,
 * and the customer's pricing tier (RETAIL/WHOLESALE/CORPORATE).
 */
export async function resolveOrCreateCustomer(params: {
  name: string | null
  phone: string
  address: string | null
}): Promise<{ customerId: string | undefined; resolvedName: string | null; customerType: CustomerTier }> {
  const { name, phone, address } = params
  let resolvedName = name

  if (!phone) {
    return { customerId: undefined, resolvedName, customerType: "RETAIL" }
  }

  const existing = await db.customer.findFirst({ where: { phone } })
  if (existing) {
    if (!resolvedName) resolvedName = existing.name
    // Fill in missing address from the sale if the customer doesn't have one
    if (address && !existing.address) {
      await db.customer.update({
        where: { id: existing.id },
        data: { address },
      })
    }
    const tier = ((existing.type as string) || "RETAIL") as CustomerTier
    return { customerId: existing.id, resolvedName, customerType: tier }
  }

  // No existing customer with this phone → create one
  const created = await db.customer.create({
    data: {
      name: resolvedName || "عميل نقدي",
      phone,
      address: address || "",
    },
  })
  return { customerId: created.id, resolvedName, customerType: "RETAIL" }
}
