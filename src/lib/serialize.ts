/**
 * Serialize barrel file — re-exports all entity serializers.
 *
 * The original monolithic serialize.ts (374 lines, 15 functions) was
 * split into per-entity modules (Split Module — Fowler):
 *   serialize/inventory.ts     — Product, Warehouse, Category
 *   serialize/purchases.ts     — Supplier, PurchaseOrder, PoItem
 *   serialize/sales.ts         — Sale, SaleItem
 *   serialize/accounting.ts    — Account, Expense, Customer
 *   serialize/exchanges.ts     — Exchange, ExchangeLine
 *   serialize/bundles.ts       — Bundle, BundleItem
 *   serialize/compositions.ts  — Composition, CompositionIngredient
 *
 * This file preserves the import path `@/lib/serialize` so all existing
 * imports continue to work without changes.
 */

export type { AnyRow } from "./serialize-types"

export {
  serializeProduct,
  serializeWarehouse,
  serializeCategory,
} from "./serialize/inventory"

export {
  serializeSupplier,
  serializePoItem,
  serializePurchaseOrder,
} from "./serialize/purchases"

export {
  serializeSaleItem,
  serializeSale,
} from "./serialize/sales"

export {
  serializeAccount,
  serializeExpense,
  serializeCustomer,
} from "./serialize/accounting"

export {
  serializeExchangeLine,
  serializeExchange,
} from "./serialize/exchanges"

export {
  serializeBundleItem,
  serializeBundle,
} from "./serialize/bundles"

export {
  serializeCompositionIngredient,
  serializeComposition,
} from "./serialize/compositions"
