"use client"

import * as React from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Menu } from "lucide-react"
import { Home, Users, CreditCard, Settings, LineChart, PieChart, Activity } from "lucide-react"

export function DemoMobileNav() {
  const [open, setOpen] = React.useState(false)

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
      setOpen(false)
    }
  }

  const navItems = [
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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="mr-2 h-8 px-2 text-base">
          <Menu className="h-4 w-4 mr-2" />
          Sections
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="pr-0">
        <div className="px-2 py-4">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Dashboard Sections</h2>
        </div>
        <ScrollArea className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
          <div className="flex flex-col space-y-3">
            {navItems.map((item, index) => (
              <button
                key={index}
                onClick={item.onClick}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                {item.icon}
                {item.title}
              </button>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
