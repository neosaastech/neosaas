import { db } from "@/db"
import { vatRates } from "@/db/schema"
import { eq } from "drizzle-orm"
import { VatRateForm } from "../vat-rate-form"
import { notFound } from "next/navigation"

interface EditVatRatePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditVatRatePage({ params }: EditVatRatePageProps) {
  const { id } = await params
  const [rate] = await db.select().from(vatRates).where(eq(vatRates.id, id))

  if (!rate) {
    notFound()
  }

  return <VatRateForm initialData={rate} />
}
