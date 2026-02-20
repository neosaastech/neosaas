"use client"

import { useEffect, useState } from "react"
import { InvoicesTable } from "@/components/admin/invoices-table"
import { fetchAdminInvoices } from "@/app/actions/admin-dashboard"
import { Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function DashboardInvoices() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchAdminInvoices()
        setInvoices(data)
      } catch (error) {
        console.error("Failed to load invoices:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
        <CardDescription>
          Invoices linked to recent orders.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <InvoicesTable invoices={invoices} />
      </CardContent>
    </Card>
  )
}
