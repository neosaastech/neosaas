"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Menu } from "lucide-react"
import { Home, BarChart3, Settings, CreditCard, Palette, BookOpen, Layers } from "lucide-react"

export function MainMobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)

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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="pr-0">
        <ScrollArea className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
          <div className="flex flex-col space-y-3">
            {mainNavItems.map(
              (item) =>
                item.href && (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 text-muted-foreground",
                      pathname === item.href && "text-foreground font-medium",
                    )}
                    onClick={() => setOpen(false)}
                  >
                    {item.icon}
                    {item.title}
                  </Link>
                ),
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
