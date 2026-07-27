"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import {
  LogOut,
  User,
  Shield,
  Settings,
  Key,
  Mail,
  X,
  ArrowLeft,
  Users,
  FileText,
  ShoppingBag,
  CalendarDays,
  Rocket,
  Headphones,
  Layers,
  LayoutGrid,
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
import { BrandMark } from "@/components/common/brand-mark"

/** Product catalog — client home (/dashboard) */
const catalogueItem = {
  name: "Catalog",
  href: "/dashboard",
  icon: LayoutGrid,
}

/** Account management sub-menus (collapsible section) */
const profileSubItems = [
  { name: "My Profile", href: "/dashboard/profile" },
  { name: "Company Management", href: "/dashboard/company-management" },
  { name: "Payments", href: "/dashboard/payments" },
]

const clientSupportSubItems = [
  { name: "Chat", href: "/dashboard/chat" },
  { name: "Support", href: "/dashboard/support" },
]

const profilePaths = ["/dashboard/profile", ...profileSubItems.map((i) => i.href)]
const clientSupportPaths = clientSupportSubItems.map((i) => i.href)
const accountPaths = [...profilePaths, ...clientSupportPaths]

function isPathActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

function isAnyPathActive(pathname: string, paths: string[]) {
  return paths.some((href) => isPathActive(pathname, href))
}

const adminItems = [
  { name: "Business", href: "/admin", icon: Rocket, superAdminOnly: false },
  { name: "Appointments", href: "/admin/appointments", icon: CalendarDays, superAdminOnly: false },
  { name: "Products", href: "/admin/products", icon: ShoppingBag, superAdminOnly: false },
  { name: "Organization", href: "/admin/users", icon: Users, superAdminOnly: true },
  { name: "Content", href: "/admin/pages", icon: Layers, superAdminOnly: false },
  { name: "Internal Routes", href: "/admin/internal-routes", icon: FileText, superAdminOnly: true },
  { name: "Parameters", href: "/admin/settings", icon: Settings, superAdminOnly: false },
  { name: "API Management", href: "/admin/api", icon: Key, superAdminOnly: false },
  { name: "Mail Management", href: "/admin/mail", icon: Mail, superAdminOnly: false },
  { name: "Legal & Compliance", href: "/admin/legal", icon: FileText, superAdminOnly: false },
]

const supportSubItems = [
  { name: "Chat", href: "/admin/chat" },
  { name: "Tickets", href: "/admin/support" },
]

// Header/Footer share /admin/pages (see app/(private)/admin/pages/page.tsx's
// ?type= switch) rather than owning separate routes — these sub-links just
// preset that query param.
const contentSubItems = [
  { name: "Pages", href: "/admin/pages" },
  { name: "Header", href: "/admin/pages?type=header" },
  { name: "Footer", href: "/admin/pages?type=footer" },
  { name: "Modules", href: "/admin/pages?type=modules" },
  { name: "Media", href: "/admin/pages?type=media" },
  { name: "Style", href: "/admin/pages?type=style" },
]

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface PrivateSidebarProps {
  isOpen?: boolean
  onClose?: () => void
  isCollapsed?: boolean
}

function NavLink({
  item,
  isActive,
  isCollapsed,
  onClick,
  indent = false,
}: {
  item: NavItem
  isActive: boolean
  isCollapsed: boolean
  onClick: () => void
  indent?: boolean
}) {
  const Icon = item.icon
  const linkContent = (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
        isCollapsed ? "px-3 py-2 justify-center" : cn("px-3 py-2", indent && "pl-6"),
        isActive ? "bg-brand text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!isCollapsed && item.name}
    </Link>
  )

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right">{item.name}</TooltipContent>
      </Tooltip>
    )
  }

  return linkContent
}

function SubNavLink({
  name,
  href,
  isActive,
  onClick,
}: {
  name: string
  href: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive ? "bg-brand text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {name}
    </Link>
  )
}

export function PrivateSidebar({ isOpen = false, onClose, isCollapsed = false }: PrivateSidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isAdmin, isSuperAdmin, isLoading } = useUser()
  const { siteName, logo, logoDisplayMode } = usePlatformConfig()
  const [isAdminOpen, setIsAdminOpen] = useState(
    pathname.startsWith("/admin") || pathname.startsWith("/dashboard/admin"),
  )
  const [isSupportOpen, setIsSupportOpen] = useState(
    pathname.startsWith("/admin/support") || pathname.startsWith("/admin/chat"),
  )
  const contentTypeParam = searchParams.get("type")
  const [isContentOpen, setIsContentOpen] = useState(pathname === "/admin/pages")
  // Query-param-based sub-links (?type=header/footer) can't be told apart by
  // pathname alone the way every other sub-link here can — isPathActive's
  // startsWith check would never see the query string.
  const isContentSubItemActive = (href: string) => {
    if (pathname !== "/admin/pages") return false
    const type = href.includes("?type=") ? href.split("?type=")[1] : null
    return type === contentTypeParam || (type === null && !contentTypeParam)
  }
  const [isAccountOpen, setIsAccountOpen] = useState(isAnyPathActive(pathname, accountPaths))
  const [isProfileOpen, setIsProfileOpen] = useState(isAnyPathActive(pathname, profilePaths))
  const [isClientSupportOpen, setIsClientSupportOpen] = useState(isAnyPathActive(pathname, clientSupportPaths))

  const showLogoInHeader =
    isCollapsed || logoDisplayMode === "logo" || logoDisplayMode === "both"
  const showSiteNameInHeader =
    !isCollapsed && (logoDisplayMode === "text" || logoDisplayMode === "both")
  const visibleAdminItems = adminItems.filter((item) => !item.superAdminOnly || isSuperAdmin)

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
    window.location.href = "/auth/login"
  }

  const serviceItems: NavItem[] = [catalogueItem]

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
            <BrandMark siteName={siteName} logo={logo} showLogo={showLogoInHeader} showSiteName={showSiteNameInHeader} />
          </Link>
          <div className={cn("ml-auto flex items-center", isCollapsed && "hidden")}>
            {isOpen && !isCollapsed && (
              <Button variant="ghost" size="icon" className="ml-auto md:hidden" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Service area — catalog */}
        <nav className={cn("flex-1 space-y-1 overflow-y-auto", isCollapsed ? "p-2" : "p-4")}>
          {!isCollapsed && (
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Service
            </p>
          )}

          {serviceItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isActive={isPathActive(pathname, item.href)}
              isCollapsed={isCollapsed}
              onClick={handleLinkClick}
            />
          ))}

          {!isLoading && isAdmin && (
            <>
              {isCollapsed ? (
                <div className="pt-2 border-t mt-2 space-y-1">
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

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href="/admin/support"
                        onClick={handleLinkClick}
                        className={cn(
                          "flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          pathname.startsWith("/admin/support") || pathname.startsWith("/admin/chat")
                            ? "bg-brand text-white"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Headphones className="h-4 w-4" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">Support</TooltipContent>
                  </Tooltip>

                  {visibleAdminItems
                    .filter((item) => item.href !== "/admin")
                    .map((item) => {
                      const Icon = item.icon
                      const isActive = isPathActive(pathname, item.href)
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
                <Collapsible open={isAdminOpen} onOpenChange={setIsAdminOpen} className="pt-2 border-t mt-2">
                  <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5" />
                      <span>Admin</span>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isAdminOpen && "rotate-180")} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-1 space-y-1 pl-6">
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

                    <Collapsible open={isSupportOpen} onOpenChange={setIsSupportOpen}>
                      <CollapsibleTrigger
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          pathname.startsWith("/admin/support") || pathname.startsWith("/admin/chat")
                            ? "bg-brand/10 text-brand"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Headphones className="h-4 w-4" />
                          <span>Support</span>
                        </div>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isSupportOpen && "rotate-180")} />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-1 space-y-1 pl-7">
                        {supportSubItems.map((item) => {
                          const isActive = isPathActive(pathname, item.href)
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

                    <Collapsible open={isContentOpen} onOpenChange={setIsContentOpen}>
                      <CollapsibleTrigger
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          pathname === "/admin/pages" ? "bg-brand/10 text-brand" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Layers className="h-4 w-4" />
                          <span>Content</span>
                        </div>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isContentOpen && "rotate-180")} />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-1 space-y-1 pl-7">
                        {contentSubItems.map((item) => (
                          <SubNavLink
                            key={item.href}
                            name={item.name}
                            href={item.href}
                            isActive={isContentSubItemActive(item.href)}
                            onClick={handleLinkClick}
                          />
                        ))}
                      </CollapsibleContent>
                    </Collapsible>

                    {visibleAdminItems
                      .filter((item) => item.href !== "/admin" && item.href !== "/admin/pages")
                      .map((item) => {
                        const Icon = item.icon
                        const isActive = isPathActive(pathname, item.href)
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

        {/* Account management — collapsible, above collapse control */}
        <div className={cn("border-t", isCollapsed ? "p-2" : "p-4", "space-y-1")}>
          {isCollapsed ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/dashboard/profile"
                    onClick={handleLinkClick}
                    className={cn(
                      "flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isAnyPathActive(pathname, profilePaths)
                        ? "bg-brand text-white"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <User className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Profile</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/dashboard/support"
                    onClick={handleLinkClick}
                    className={cn(
                      "flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isAnyPathActive(pathname, clientSupportPaths)
                        ? "bg-brand text-white"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Headphones className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Support</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <Collapsible open={isAccountOpen} onOpenChange={setIsAccountOpen}>
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5" />
                  <span>Account</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform", isAccountOpen && "rotate-180")} />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 space-y-1 pl-3">
                {/* Profile → company + billing */}
                <Collapsible open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                  <CollapsibleTrigger
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isAnyPathActive(pathname, profilePaths)
                        ? "bg-brand/10 text-brand"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4" />
                      <span>Profile</span>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isProfileOpen && "rotate-180")} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-1 space-y-1 pl-7">
                    {profileSubItems.map((item) => (
                      <SubNavLink
                        key={item.href}
                        name={item.name}
                        href={item.href}
                        isActive={isPathActive(pathname, item.href)}
                        onClick={handleLinkClick}
                      />
                    ))}
                  </CollapsibleContent>
                </Collapsible>

                {/* Support → chat + help */}
                <Collapsible open={isClientSupportOpen} onOpenChange={setIsClientSupportOpen}>
                  <CollapsibleTrigger
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isAnyPathActive(pathname, clientSupportPaths)
                        ? "bg-brand/10 text-brand"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Headphones className="h-4 w-4" />
                      <span>Support</span>
                    </div>
                    <ChevronDown
                      className={cn("h-4 w-4 transition-transform", isClientSupportOpen && "rotate-180")}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-1 space-y-1 pl-7">
                    {clientSupportSubItems.map((item) => (
                      <SubNavLink
                        key={item.href}
                        name={item.name}
                        href={item.href}
                        isActive={isPathActive(pathname, item.href)}
                        onClick={handleLinkClick}
                      />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </CollapsibleContent>
            </Collapsible>
          )}

          {isCollapsed ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="w-full text-muted-foreground hover:text-foreground"
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
                className="w-full justify-start text-muted-foreground hover:text-foreground"
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
