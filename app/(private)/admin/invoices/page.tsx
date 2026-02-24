"use client"

import { useEffect, useState } from "react"
import { fetchAdminInvoices } from "@/app/actions/admin-dashboard"
import { InvoicesTable } from "@/components/admin/invoices-table"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, FileText } from "lucide-react"
import Link from "next/link"

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchAdminInvoices()
        setInvoices(data)
      } catch (err: any) {
        setError(err?.message || "Failed to load invoices")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center text-muted-foreground">
        <p className="text-red-500 font-medium">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Dashboard
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-[#1A1A1A] flex items-center gap-2">
            <FileText className="h-7 w-7 text-brand" />
            All Invoices
          </h1>
          <p className="text-muted-foreground mt-1">
            Complete list of all invoices and payments. Data sourced from local orders.
          </p>
        </div>
      </div>

      <InvoicesTable invoices={invoices} />
    </div>
  )
}
