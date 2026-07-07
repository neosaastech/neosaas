"use client"

import { useEffect, useState } from "react"
import { PaymentsTable } from "@/components/admin/payments-table"
import { fetchAdminPayments } from "@/app/actions/admin-dashboard"
import { Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function DashboardPayments() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchAdminPayments()
        setPayments(data)
      } catch (error) {
        console.error("Failed to load payments:", error)
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
        <CardTitle>Recent Orders</CardTitle>
        <CardDescription>
          A list of recent orders from your users.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PaymentsTable payments={payments} />
      </CardContent>
    </Card>
  )
}
