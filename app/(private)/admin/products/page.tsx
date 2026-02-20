import { getProducts } from "@/app/actions/ecommerce"
import { getCoupons } from "@/app/actions/coupons"
import { db } from "@/db"
import { vatRates, orderItems, products as productsTable } from "@/db/schema"
import { eq, sql } from "drizzle-orm"
import { ProductsPageClient } from "./products-page-client"

export default async function AdminProductsPage() {
  const [{ data: products }, { data: couponsData }] = await Promise.all([
    getProducts(),
    getCoupons(),
  ])

  // Récupérer le nombre de ventes par produit
  let salesByProduct = new Map<string, number>()
  try {
    const salesCountResult = await db
      .select({
        productId: sql<string>`COALESCE(${orderItems.itemId}, '')::text`,
        salesCount: sql<number>`CAST(COUNT(*) AS INTEGER)`,
      })
      .from(orderItems)
      .where(eq(orderItems.itemType, 'product'))
      .groupBy(orderItems.itemId)

    salesByProduct = new Map(salesCountResult.map(r => [r.productId, r.salesCount]))
  } catch (error) {
    console.error("[AdminProducts] Failed to fetch sales counts:", error)
  }

  // Enrichir les produits avec le nombre de ventes
  const productsWithSales = (products || []).map(product => ({
    ...product,
    salesCount: salesByProduct.get(product.id) || 0
  }))

  let rates: (typeof vatRates.$inferSelect)[] = []
  try {
    rates = await db.select().from(vatRates).where(eq(vatRates.isActive, true))
  } catch (error) {
    console.error("[AdminProducts] Failed to fetch VAT rates:", error)
  }

  return <ProductsPageClient products={productsWithSales} vatRates={rates} coupons={couponsData || []} />
}
