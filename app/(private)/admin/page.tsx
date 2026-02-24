"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardStats } from "@/components/admin/dashboard-stats"
import { DashboardPayments } from "@/components/admin/dashboard-payments"
import { DashboardInvoices } from "@/components/admin/dashboard-invoices"
import { AdminSubscriptions } from "@/components/admin/admin-subscriptions"
import { PaymentSettings } from "@/components/admin/payment-settings"

export default function AdminPage() {
  // Note: Admin access is already verified by AdminClientGuard in layout.tsx
  // No need for double verification here

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1A1A1A]">Business Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your platform performance, payments, and invoices.
            Payments are processed directly via Stripe.
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
          <TabsTrigger value="overview" className="data-[state=active]:bg-brand data-[state=active]:text-white">
            Overview
          </TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-brand data-[state=active]:text-white">
            <span className="hidden sm:inline">Recent Orders</span>
            <span className="sm:hidden">Orders</span>
          </TabsTrigger>
          <TabsTrigger value="stripe" className="data-[state=active]:bg-brand data-[state=active]:text-white">
            <span className="hidden sm:inline">Payment Settings</span>
            <span className="sm:hidden">Payments</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <DashboardStats />
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="space-y-6">
            <DashboardPayments />
            <DashboardInvoices />
            <AdminSubscriptions />
          </div>
        </TabsContent>

        <TabsContent value="stripe" className="space-y-4">
          <PaymentSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
