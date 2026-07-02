/**
 * Shopify Admin API (REST) helper.
 *
 * Setup:
 *  1. In your Shopify admin, create a Custom App (Apps → Develop apps).
 *  2. Grant it `read_products`, `read_orders` scopes.
 *  3. Install the app and copy the Admin API access token.
 *  4. Set SHOPIFY_STORE_DOMAIN (e.g. "my-store.myshopify.com") and
 *     SHOPIFY_ACCESS_TOKEN in .env.
 *
 * All functions throw a descriptive Error when Shopify is not configured.
 */

const DOMAIN = process.env.SHOPIFY_STORE_DOMAIN?.trim() || ""
const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN?.trim() || ""
const API_VERSION = "2024-01"

export interface ShopifyConfig {
  configured: boolean
  domain: string
}

export function getShopifyConfig(): ShopifyConfig {
  return {
    configured: DOMAIN !== "" && TOKEN !== "",
    domain: DOMAIN,
  }
}

function adminUrl(path: string): string {
  return `https://${DOMAIN}/admin/api/${API_VERSION}/${path}`
}

async function shopifyFetch<T>(path: string): Promise<T> {
  if (!DOMAIN || !TOKEN) {
    throw new Error("shopify-not-configured")
  }
  const res = await fetch(adminUrl(path), {
    headers: {
      "X-Shopify-Access-Token": TOKEN,
      Accept: "application/json",
    },
    cache: "no-store",
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`shopify-http-${res.status}:${text.slice(0, 200)}`)
  }
  return res.json() as Promise<T>
}

/* ----------------------------- Types ----------------------------- */

export interface ShopifyVariant {
  id: number
  title: string
  sku: string | null
  price: string
  inventory_quantity: number | null
  barcode: string | null
}
export interface ShopifyProduct {
  id: number
  title: string
  handle: string
  product_type: string
  vendor: string
  variants: ShopifyVariant[]
}
export interface ShopifyOrderLineItem {
  id: number
  title: string
  quantity: number
  sku: string | null
  price: string
  product_id: number | null
}
export interface ShopifyOrder {
  id: number
  name: string // e.g. "#1001"
  created_at: string
  total_price: string
  financial_status: string
  customer: { display_name: string } | null
  line_items: ShopifyOrderLineItem[]
}

/* ----------------------------- Products ----------------------------- */

interface ShopifyProductsResponse {
  products: ShopifyProduct[]
}

export async function fetchShopifyProducts(limit = 100): Promise<ShopifyProduct[]> {
  const data = await shopifyFetch<ShopifyProductsResponse>(
    `products.json?limit=${limit}`
  )
  return data.products || []
}

/* ----------------------------- Orders ----------------------------- */

interface ShopifyOrdersResponse {
  orders: ShopifyOrder[]
}

export async function fetchShopifyOrders(limit = 50): Promise<ShopifyOrder[]> {
  const data = await shopifyFetch<ShopifyOrdersResponse>(
    `orders.json?limit=${limit}&status=any`
  )
  return data.orders || []
}
