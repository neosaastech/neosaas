import { db } from "@/db"
import { vatRates } from "@/db/schema"
import { desc } from "drizzle-orm"
import { VatRatesTable } from "./vat-rates-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export default async function VatRatesPage() {
  const rates = await db.select().from(vatRates).orderBy(desc(vatRates.isDefault), vatRates.country, vatRates.name)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">VAT Rates Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage tax rates for different countries and regions
          </p>
        </div>
        <Link href="/admin/vat-rates/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add VAT Rate
          </Button>
        </Link>
      </div>

      <VatRatesTable rates={rates} />
    </div>
  )
}
