"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Menu } from "lucide-react"
import { Book, FileText, Layers, Lightbulb, Settings, Zap } from "lucide-react"

export function DocsMobileNav() {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()

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
          title: "Configuration",
          href: "/docs/configuration",
        },
      ],
    },
    {
      title: "Core Concepts",
      href: "/docs/core-concepts",
      icon: Layers,
      items: [
        {
          title: "User Management",
          href: "/docs/core-concepts/user-management",
        },
        {
          title: "Billing & Subscriptions",
          href: "/docs/core-concepts/billing",
        },
        {
          title: "Analytics",
          href: "/docs/core-concepts/analytics",
        },
      ],
    },
    {
      title: "API Reference",
      href: "/docs/api-reference",
      icon: Zap,
      items: [
        {
          title: "Authentication",
          href: "/docs/api-reference/authentication",
        },
        {
          title: "Users API",
          href: "/docs/api-reference/users",
        },
        {
          title: "Payments API",
          href: "/docs/api-reference/payments",
        },
      ],
    },
    {
      title: "Guides",
      href: "/docs/guides",
      icon: FileText,
      items: [
        {
          title: "Custom Integrations",
          href: "/docs/guides/custom-integrations",
        },
        {
          title: "White Labeling",
          href: "/docs/guides/white-labeling",
        },
      ],
    },
    {
      title: "Best Practices",
      href: "/docs/best-practices",
      icon: Lightbulb,
    },
    {
      title: "Advanced Configuration",
      href: "/docs/advanced-configuration",
      icon: Settings,
    },
  ]

  return (
    <div className="flex w-full items-center justify-between">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="mr-2">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="pr-0">
          <SheetHeader>
            <SheetTitle>Documentation</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-8rem)] pb-10">
            <div className="flex flex-col space-y-2 py-4">
              {items.map((item) => (
                <div key={item.href} className="px-1">
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                      pathname === item.href ? "bg-accent text-accent-foreground" : "transparent",
                    )}
                  >
                    {item.icon && <item.icon className="h-4 w-4" />}
                    {item.title}
                  </Link>
                  {item.items?.length && (
                    <div className="ml-4 border-l pl-2 pt-1">
                      {item.items.map((subItem) => (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex w-full items-center rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground",
                            pathname === subItem.href ? "bg-accent text-accent-foreground" : "transparent",
                          )}
                        >
                          {subItem.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
      <div className="flex-1 text-center">
        <Link href="/docs" className="text-lg font-semibold">
          Docs
        </Link>
      </div>
    </div>
  )
}
