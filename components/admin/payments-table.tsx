"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { CreditCard } from "lucide-react"

interface Payment {
  id: string
  orderNumber: string
  companyName: string | null
  userName: string | null
  userEmail: string | null
  amount: number
  status: string
  method: string | null
  date: Date | null
  createdAt: Date
}

interface PaymentsTableProps {
  payments: Payment[]
}

export function PaymentsTable({ payments }: PaymentsTableProps) {
  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order Number</TableHead>
              <TableHead>Origin (Company/User)</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No payments found.
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.orderNumber}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {payment.companyName || payment.userName || "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {payment.userEmail || (payment.companyName ? "Company Account" : "-")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(payment.amount / 100)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {payment.method || "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {payment.date ? new Date(payment.date).toLocaleDateString() : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {payments.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            No payments found.
          </Card>
        ) : (
          payments.map((payment) => (
            <Card key={payment.id} className="p-4">
              <div className="space-y-3">
                {/* Header avec Order Number */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{payment.orderNumber}</span>
                  </div>
                  <Badge variant="outline">
                    {payment.method || "Unknown"}
                  </Badge>
                </div>

                {/* Origin */}
                <div>
                  <div className="font-medium">
                    {payment.companyName || payment.userName || "Unknown"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {payment.userEmail || (payment.companyName ? "Company Account" : "-")}
                  </div>
                </div>

                {/* Amount et Date */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="text-xl font-bold text-brand">
                    {formatCurrency(payment.amount / 100)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {payment.date ? new Date(payment.date).toLocaleDateString() : "-"}
                  </span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </>
  )
}
