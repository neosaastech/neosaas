"use client"

import Link from "next/link"
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, CreditCard, Mail, HardDrive, BarChart4, Home } from 'lucide-react'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import { Menu, X } from 'lucide-react'

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard-exemple",
    icon: LayoutDashboard,
  },
  {
    title: "Users",
    href: "/dashboard-exemple/users",
    icon: Users,
  },
  {
    title: "Payments",
    href: "/dashboard-exemple/payments",
    icon: CreditCard,
  },
  {
    title: "Email",
    href: "/dashboard-exemple/email",
    icon: Mail,
  },
  {
    title: "Storage",
    href: "/dashboard-exemple/storage",
    icon: HardDrive,
  },
  {
    title: "Analytics",
    href: "/dashboard-exemple/analytics",
    icon: BarChart4,
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        <span className="sr-only">Toggle Menu</span>
      </Button>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform border-r bg-background transition-transform duration-300 ease-in-out md:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="border-b px-6 py-4">
            <Link href="/dashboard-exemple" className="flex items-center gap-2">
              <div className="font-bold text-2xl tracking-tight">
                <span className="text-foreground">Neo</span>
                <span className="text-brand">SaaS</span>
              </div>
            </Link>
            <Badge variant="outline" className="mt-2 text-xs">
              Example Dashboard
            </Badge>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <nav className="grid items-start px-2 gap-1">
              {navItems.map((item, index) => {
                const isActive = pathname === item.href
                return (
                  <Link key={index} href={item.href}>
                    <span
                      className={cn(
                        "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                        isActive ? "bg-accent text-accent-foreground" : "transparent",
                      )}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </span>
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className="border-t p-4">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  )
}
