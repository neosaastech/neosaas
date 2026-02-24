import { getProducts } from "@/app/actions/ecommerce"
import { db } from "@/db"
import { vatRates } from "@/db/schema"
import { eq } from "drizzle-orm"
import { ProductForm } from "../product-form"

export default async function NewProductPage() {
  const { data: products } = await getProducts()
  const rates = await db.select().from(vatRates).where(eq(vatRates.isActive, true))
  
  return <ProductForm products={products || []} vatRates={rates} />
}
