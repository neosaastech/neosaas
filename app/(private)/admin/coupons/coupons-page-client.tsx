"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Ticket, Calendar, TrendingUp, Users } from "lucide-react"
import { CouponsTable } from "./coupons-table"

interface Coupon {
  id: string
  code: string
  description: string | null
  discountType: string
  discountValue: number
  currency: string | null
  minPurchaseAmount: number | null
  maxDiscountAmount: number | null
  usageLimit: number | null
  usageCount: number
  perUserLimit: number | null
  startDate: Date | null
  endDate: Date | null
  applicableProducts: any
  excludedProducts: any
  isActive: boolean
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
}

interface Product {
  id: string
  title: string
  price: number
}

interface CouponsPageClientProps {
  coupons: Coupon[]
  products: Product[]
}

export function CouponsPageClient({ coupons: initialCoupons, products }: CouponsPageClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "expired" | "used-up">("all")

  // Filter coupons based on search and active filter
  const filteredCoupons = initialCoupons.filter(coupon => {
    // Search filter
    const matchesSearch = 
      searchQuery === "" ||
      coupon.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coupon.description?.toLowerCase().includes(searchQuery.toLowerCase())

    // Active filter
    let matchesActiveFilter = true
    const now = new Date()
    
    if (activeFilter === "active") {
      matchesActiveFilter = 
        coupon.isActive &&
        (!coupon.startDate || new Date(coupon.startDate) <= now) &&
        (!coupon.endDate || new Date(coupon.endDate) >= now) &&
        (!coupon.usageLimit || coupon.usageCount < coupon.usageLimit)
    } else if (activeFilter === "expired") {
      matchesActiveFilter = !!(coupon.endDate && new Date(coupon.endDate) < now)
    } else if (activeFilter === "used-up") {
      matchesActiveFilter = !!(coupon.usageLimit && coupon.usageCount >= coupon.usageLimit)
    }

    return matchesSearch && matchesActiveFilter
  })

  // Calculate stats
  const stats = {
    total: initialCoupons.length,
    active: initialCoupons.filter(c => {
      const now = new Date()
      return (
        c.isActive &&
        (!c.startDate || new Date(c.startDate) <= now) &&
        (!c.endDate || new Date(c.endDate) >= now) &&
        (!c.usageLimit || c.usageCount < c.usageLimit)
      )
    }).length,
    totalUsage: initialCoupons.reduce((sum, c) => sum + c.usageCount, 0),
    expired: initialCoupons.filter(c => c.endDate && new Date(c.endDate) < new Date()).length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Discount Coupons</h1>
          <p className="text-muted-foreground mt-1">
            Manage promotional codes and discount tickets
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Coupons</p>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </div>
            <Ticket className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold mt-1 text-green-600">{stats.active}</p>
            </div>
            <Calendar className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Uses</p>
              <p className="text-2xl font-bold mt-1 text-blue-600">{stats.totalUsage}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Expired</p>
              <p className="text-2xl font-bold mt-1 text-orange-600">{stats.expired}</p>
            </div>
            <Users className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search coupons by code or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant={activeFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("all")}
          >
            All
          </Button>
          <Button
            variant={activeFilter === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("active")}
            className={activeFilter === "active" ? "bg-green-600 hover:bg-green-700" : ""}
          >
            Active
          </Button>
          <Button
            variant={activeFilter === "expired" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("expired")}
            className={activeFilter === "expired" ? "bg-orange-600 hover:bg-orange-700" : ""}
          >
            Expired
          </Button>
          <Button
            variant={activeFilter === "used-up" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("used-up")}
            className={activeFilter === "used-up" ? "bg-red-600 hover:bg-red-700" : ""}
          >
            Used Up
          </Button>
        </div>
      </div>

      {/* Coupons Table */}
      <CouponsTable coupons={filteredCoupons} products={products} />
    </div>
  )
}
