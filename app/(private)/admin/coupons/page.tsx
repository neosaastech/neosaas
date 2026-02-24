import { getCoupons } from "@/app/actions/coupons"
import { db } from "@/db"
import { products } from "@/db/schema"
import { CouponsPageClient } from "./coupons-page-client"

export default async function AdminCouponsPage() {
  const { data: coupons } = await getCoupons()
  const allProducts = await db.select().from(products)

  return (
    <CouponsPageClient 
      coupons={coupons || []} 
      products={allProducts}
    />
  )
}
