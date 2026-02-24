"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Home, Users, CreditCard, Settings, LineChart, PieChart, Activity } from "lucide-react"

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items: {
    title: string
    icon?: React.ReactNode
    href?: string
    onClick?: () => void
  }[]
}

export function SidebarNav({ className, items, ...props }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <nav className={cn("flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1", className)} {...props}>
      {items.map((item, index) => {
        const isActive = item.href ? pathname === item.href : false
        return (
          <button
            key={index}
            onClick={item.onClick}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
              isActive ? "bg-accent text-accent-foreground" : "transparent",
            )}
          >
            {item.icon}
            {item.title}
          </button>
        )
      })}
    </nav>
  )
}

export function DemoSidebar() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  const sidebarItems = [
    {
      title: "Dashboard Overview",
      icon: <Home className="h-4 w-4" />,
      onClick: () => scrollToSection("overview"),
    },
    {
      title: "Revenue Analytics",
      icon: <LineChart className="h-4 w-4" />,
      onClick: () => scrollToSection("revenue"),
    },
    {
      title: "User Metrics",
      icon: <Users className="h-4 w-4" />,
      onClick: () => scrollToSection("users"),
    },
    {
      title: "Engagement Data",
      icon: <Activity className="h-4 w-4" />,
      onClick: () => scrollToSection("engagement"),
    },
    {
      title: "Plan Distribution",
      icon: <PieChart className="h-4 w-4" />,
      onClick: () => scrollToSection("plans"),
    },
    {
      title: "Billing Information",
      icon: <CreditCard className="h-4 w-4" />,
      onClick: () => scrollToSection("billing"),
    },
    {
      title: "Settings",
      icon: <Settings className="h-4 w-4" />,
      onClick: () => scrollToSection("settings"),
    },
  ]

  return (
    <div className="w-full">
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Dashboard Demo</h2>
          <ScrollArea className="h-[calc(100vh-10rem)]">
            <SidebarNav items={sidebarItems} />
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
