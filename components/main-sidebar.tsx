"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Home, BarChart3, Settings, CreditCard, Palette, BookOpen, Layers } from "lucide-react"

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items: {
    href: string
    title: string
    icon?: React.ReactNode
  }[]
}

export function SidebarNav({ className, items, ...props }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <nav className={cn("flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1", className)} {...props}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
            pathname === item.href ? "bg-accent text-accent-foreground" : "transparent",
          )}
        >
          {item.icon}
          {item.title}
        </Link>
      ))}
    </nav>
  )
}

export function MainSidebar() {
  const mainNavItems = [
    {
      title: "Home",
      href: "/",
      icon: <Home className="h-4 w-4" />,
    },
    {
      title: "Features",
      href: "/features",
      icon: <Layers className="h-4 w-4" />,
    },
    {
      title: "Dashboard Demo",
      href: "/dashboard-demo",
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      title: "Pricing",
      href: "/pricing",
      icon: <CreditCard className="h-4 w-4" />,
    },
    {
      title: "Documentation",
      href: "/docs",
      icon: <BookOpen className="h-4 w-4" />,
    },
    {
      title: "Appearance",
      href: "/appearance",
      icon: <Palette className="h-4 w-4" />,
    },
    {
      title: "Brand",
      href: "/brand",
      icon: <Settings className="h-4 w-4" />,
    },
  ]

  return (
    <div className="w-full">
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Navigation</h2>
          <ScrollArea className="h-[calc(100vh-10rem)]">
            <SidebarNav items={mainNavItems} />
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
