import { getProductById, getProducts } from "@/app/actions/ecommerce"
import { db } from "@/db"
import { vatRates } from "@/db/schema"
import { eq } from "drizzle-orm"
import { ProductForm } from "../product-form"
import { notFound } from "next/navigation"

interface EditProductPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params
  const { data: product } = await getProductById(id)
  const { data: products } = await getProducts()
  const rates = await db.select().from(vatRates).where(eq(vatRates.isActive, true))

  if (!product) {
    notFound()
  }

  return <ProductForm initialData={product} products={products || []} vatRates={rates} />
}
