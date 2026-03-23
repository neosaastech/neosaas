"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  CreditCard,
  Building2,
  LogOut,
  User,
  Shield,
  Settings,
  Key,
  Mail,
  X,
  PanelLeftClose,
  PanelLeft,
  ArrowLeft,
  Users,
  FileText,
  ShoppingBag,
  CalendarDays,
  HelpCircle,
  MessageSquare,
  Rocket,
  Headphones,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import { useUser } from "@/lib/contexts/user-context"
import { usePlatformConfig } from "@/contexts/platform-config-context"

const navItems = [
  { name: "Overview", href: "/dashboard", icon: Home },
  { name: "Payments", href: "/dashboard/payments", icon: CreditCard },
  { name: "Company Management", href: "/dashboard/company-management", icon: Building2 },
  { name: "Profile", href: "/dashboard/profile", icon: User },
  { name: "Chat", href: "/dashboard/chat", icon: MessageSquare },
  { name: "Support", href: "/dashboard/support", icon: HelpCircle },
]

const adminItems = [
  { name: "Business", href: "/admin", icon: Rocket, superAdminOnly: false },
  { name: "Appointments", href: "/admin/appointments", icon: CalendarDays, superAdminOnly: false },
  { name: "Products", href: "/admin/products", icon: ShoppingBag, superAdminOnly: false },
  { name: "Organization", href: "/admin/users", icon: Users, superAdminOnly: true },
  { name: "Parameters", href: "/admin/settings", icon: Settings, superAdminOnly: false },
  { name: "API Management", href: "/admin/api", icon: Key, superAdminOnly: false },
  { name: "Mail Management", href: "/admin/mail", icon: Mail, superAdminOnly: false },
  { name: "Legal & Compliance", href: "/admin/legal", icon: FileText, superAdminOnly: false },
]

// Support sub-menu items (no icons for sub-items as per TailAdmin design)
const supportSubItems = [
  { name: "Chat", href: "/admin/chat" },
  { name: "Tickets", href: "/admin/support" },
]

interface PrivateSidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function PrivateSidebar({ isOpen = false, onClose }: PrivateSidebarProps) {
  const pathname = usePathname()
  const { isAdmin, isSuperAdmin, isLoading } = useUser()
  const { siteName, logo, logoDisplayMode } = usePlatformConfig()
  const [isAdminOpen, setIsAdminOpen] = useState(
    pathname.startsWith("/admin") || pathname.startsWith("/dashboard/admin"),
  )
  const [isSupportOpen, setIsSupportOpen] = useState(
    pathname.startsWith("/admin/support") || pathname.startsWith("/admin/chat"),
  )
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Get initials for collapsed logo (first 2 letters)
  const logoInitials = siteName.substring(0, 2).toUpperCase()

  // Filter admin items based on user role
  const visibleAdminItems = adminItems.filter(item => !item.superAdminOnly || isSuperAdmin)

  const handleLinkClick = () => {
    if (onClose) onClose()
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch (error) {
      console.error("Logout failed", error)
    }
    localStorage.removeItem("user")
    localStorage.removeItem("authToken")
    toast.success("Logged out successfully")
    // Force full page reload to ensure cookies are cleared and auth state is reset
    window.location.href = "/auth/login"
  }

  return (
    <TooltipProvider delayDuration={0}>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />}

      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-50 flex flex-col border-r bg-background transition-all duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          isCollapsed ? "w-[68px]" : "w-64",
        )}
      >
                        <div className={cn("flex h-16 items-center border-b", isCollapsed ? "px-3 justify-center" : "px-6")}>
          <Link href="/dashboard" className="flex items-center gap-2" onClick={handleLinkClick}>
            {(isCollapsed || logoDisplayMode === 'logo' || logoDisplayMode === 'both') && (
              logo ? (
                <img src={logo} alt={siteName} className="h-8 w-8 object-contain" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-primary-foreground font-bold">
                  {logoInitials}
                </div>
              )
            )}
            {!isCollapsed && (logoDisplayMode === 'text' || logoDisplayMode === 'both') && (
              <span className="font-bold text-xl">
                <span className="text-foreground">{siteName.substring(0, 3)}</span>
                <span className="text-brand">{siteName.substring(3)}</span>
              </span>
            )}
          </Link>
          <div className={cn("ml-auto flex items-center", isCollapsed && "hidden")}>
          {isOpen && !isCollapsed && (
            <Button variant="ghost" size="icon" className="ml-auto md:hidden" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
        </div>

        <nav className={cn("flex-1 space-y-1 overflow-y-auto", isCollapsed ? "p-2" : "p-4")}>
          {navItems.map((item) => {
            const Icon = item.icon
            const isRoot = item.href === "/dashboard"
            const isActive = isRoot 
              ? pathname === item.href 
              : (pathname === item.href || pathname.startsWith(`${item.href}/`))

            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleLinkClick}
                className={cn(
                  "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
                  isCollapsed ? "px-3 py-2 justify-center" : "px-3 py-2",
                  isActive ? "bg-brand text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && item.name}
              </Link>
            )

            if (isCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right">{item.name}</TooltipContent>
                </Tooltip>
              )
            }
            return linkContent
          })}

          {!isLoading && isAdmin && (
            <>
              {isCollapsed ? (
                // Collapsed: show admin items directly with tooltips
                <div className="pt-2 border-t mt-2 space-y-1">
                  {/* Business */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href="/admin"
                        onClick={handleLinkClick}
                        className={cn(
                          "flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          pathname === "/admin"
                            ? "bg-brand text-white"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Rocket className="h-4 w-4" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">Business</TooltipContent>
                  </Tooltip>

                  {/* Support */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href="/admin/support"
                        onClick={handleLinkClick}
                        className={cn(
                          "flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          (pathname.startsWith("/admin/support") || pathname.startsWith("/admin/chat"))
                            ? "bg-brand text-white"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Headphones className="h-4 w-4" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">Support</TooltipContent>
                  </Tooltip>

                  {/* Other admin items */}
                  {visibleAdminItems.filter(item => item.href !== "/admin").map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            onClick={handleLinkClick}
                            className={cn(
                              "flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                              isActive
                                ? "bg-brand text-white"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">{item.name}</TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              ) : (
                // Expanded: keep collapsible admin section
                <Collapsible open={isAdminOpen} onOpenChange={setIsAdminOpen}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5" />
                      <span>Admin</span>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isAdminOpen && "rotate-180")} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-1 space-y-1 pl-6">
                    {/* Business - first item */}
                    <Link
                      href="/admin"
                      onClick={handleLinkClick}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        pathname === "/admin"
                          ? "bg-brand text-white"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Rocket className="h-4 w-4" />
                      Business
                    </Link>

                    {/* Support - collapsible sub-menu */}
                    <Collapsible open={isSupportOpen} onOpenChange={setIsSupportOpen}>
                      <CollapsibleTrigger className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        (pathname.startsWith("/admin/support") || pathname.startsWith("/admin/chat"))
                          ? "bg-brand/10 text-brand"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}>
                        <div className="flex items-center gap-3">
                          <Headphones className="h-4 w-4" />
                          <span>Support</span>
                        </div>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isSupportOpen && "rotate-180")} />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-1 space-y-1 pl-7">
                        {supportSubItems.map((item) => {
                          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={handleLinkClick}
                              className={cn(
                                "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                  ? "bg-brand text-white"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                              )}
                            >
                              {item.name}
                            </Link>
                          )
                        })}
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Other admin items */}
                    {visibleAdminItems.filter(item => item.href !== "/admin").map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={handleLinkClick}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-brand text-white"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {item.name}
                        </Link>
                      )
                    })}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </>
          )}
        </nav>

        <div className={cn("border-t", isCollapsed ? "p-2" : "p-4")}>
          <Button
            variant="ghost"
            size={isCollapsed ? "icon" : "sm"}
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "hidden md:flex mb-2 text-muted-foreground hover:text-foreground",
              isCollapsed ? "w-full justify-center" : "w-full justify-start",
            )}
          >
            {isCollapsed ? (
              <PanelLeft className="h-5 w-5" />
            ) : (
              <>
                <PanelLeftClose className="h-5 w-5 mr-2" />
                <span>Collapse</span>
              </>
            )}
          </Button>

          {isCollapsed ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="w-full mb-2 text-muted-foreground hover:text-foreground"
                  >
                    <Link href="/" onClick={handleLinkClick}>
                      <ArrowLeft className="h-5 w-5" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Back to Home</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Log out</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                className="w-full justify-start mb-2 text-muted-foreground hover:text-foreground"
              >
                <Link href="/" className="flex items-center gap-3" onClick={handleLinkClick}>
                  <ArrowLeft className="h-5 w-5" />
                  Back to Home
                </Link>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5 mr-3" />
                Log out
              </Button>
            </>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}
