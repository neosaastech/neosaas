"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Book } from "lucide-react"

interface DocsSidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items: {
    title: string
    href: string
    icon?: React.ComponentType<{ className?: string }>
    items?: {
      title: string
      href: string
    }[]
  }[]
}

export function DocsSidebarNav({ className, items, ...props }: DocsSidebarNavProps) {
  const pathname = usePathname()

  return (
    <nav className={cn("flex flex-col space-y-1", className)} {...props}>
      {items.map((item) => (
        <div key={item.href} className="space-y-1">
          <Link href={item.href}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-2 font-medium",
                pathname === item.href ? "bg-muted font-medium" : "font-normal",
              )}
            >
              {item.icon && <item.icon className="h-4 w-4" />}
              {item.title}
            </Button>
          </Link>
          {item.items?.length && (
            <div className="ml-4 border-l pl-2 pt-1">
              {item.items.map((subItem) => (
                <Link key={subItem.href} href={subItem.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-sm",
                      pathname === subItem.href ? "bg-muted font-medium" : "font-normal",
                    )}
                  >
                    {subItem.title}
                  </Button>
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  )
}

export function DocsSidebar() {
  const items = [
    {
      title: "Getting Started",
      href: "/docs",
      icon: Book,
      items: [
        {
          title: "Introduction",
          href: "/docs",
        },
        {
          title: "Installation",
          href: "/docs/installation",
        },
        {
          title: "Download from GitHub",
          href: "/docs/download",
        },
      ],
    },
  ]

  return (
    <ScrollArea className="h-full py-6 pr-6">
      <div className="mb-4">
        <h4 className="px-2 text-xl font-semibold tracking-tight">Documentation</h4>
        <p className="px-2 text-sm text-muted-foreground">Learn how to use NeoSaaS effectively</p>
      </div>
      <DocsSidebarNav items={items} />
    </ScrollArea>
  )
}
