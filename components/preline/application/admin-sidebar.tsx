"use client"

/**
 * Application sidebar — fixed in layout flow (pushes content), never overlays on desktop.
 * Mobile: slim icon rail always visible (no drawer overlay).
 */
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  LogOut,
  ArrowLeft,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useUser } from "@/lib/contexts/user-context"
import { usePlatformConfig } from "@/contexts/platform-config-context"
import { SiteNameText } from "@/components/common/site-name-text"
import {
  adminNavItems,
  dashboardNavItems,
  supportSubItems,
  type NavItem,
} from "@/lib/preline/private-nav"

interface PrelineAdminSidebarProps {
  /** @deprecated overlay mode removed — prop kept for layout compat */
  isOpen?: boolean
  onClose?: () => void
}

function NavLink({
  item,
  isActive,
  collapsed,
  onNavigate,
  nested,
}: {
  item: NavItem
  isActive: boolean
  collapsed?: boolean
  onNavigate?: () => void
  nested?: boolean
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-x-3.5 rounded-lg py-2 text-sm font-medium transition-colors",
        nested ? "ps-9 pe-2" : "px-2.5",
        collapsed && "justify-center px-2",
        isActive
          ? "bg-brand text-white"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      title={collapsed ? item.name : undefined}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span>{item.name}</span>}
    </Link>
  )
}

function isPathActive(pathname: string, href: string) {
  if (href === "/dashboard" || href === "/admin") {
    return pathname === href
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function PrelineAdminSidebar({ onClose }: PrelineAdminSidebarProps) {
  const pathname = usePathname()
  const { isAdmin, isSuperAdmin, isLoading } = useUser()
  const { siteName, siteNameStyle, siteNameHtml, logo, logoDisplayMode } = usePlatformConfig()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isSupportOpen, setIsSupportOpen] = useState(
    pathname.startsWith("/admin/support") || pathname.startsWith("/admin/chat"),
  )

  const visibleAdminItems = adminNavItems.filter((item) => !item.superAdminOnly || isSuperAdmin)
  const logoInitials = siteName.substring(0, 2).toUpperCase()

  // Mobile: always icon rail. Desktop: user can expand/collapse.
  const showLabels = !isCollapsed

  const handleNavigate = () => onClose?.()

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

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-e border-border bg-background transition-[width] duration-300",
        showLabels ? "w-64 max-md:w-18" : "w-18",
      )}
      aria-label="Sidebar"
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-border px-3",
          showLabels ? "max-md:justify-center md:px-4" : "justify-center",
        )}
      >
        <Link href="/dashboard" className="flex items-center gap-2" onClick={handleNavigate}>
          {(showLabels === false || logoDisplayMode === "logo" || logoDisplayMode === "both") &&
            (logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={siteName} className="size-8 rounded-lg object-contain" />
            ) : (
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
                {logoInitials}
              </span>
            ))}
          {showLabels && (logoDisplayMode === "text" || logoDisplayMode === "both") && (
            <SiteNameText siteName={siteName} siteNameStyle={siteNameStyle} siteNameHtml={siteNameHtml} className="hidden text-lg font-bold md:inline" />
          )}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 md:p-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
        <ul className="space-y-1">
          {showLabels && (
            <li className="hidden px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:block">
              Dashboard
            </li>
          )}
          {dashboardNavItems.map((item) => (
            <li key={item.href}>
              <NavLink
                item={item}
                isActive={isPathActive(pathname, item.href)}
                collapsed={!showLabels}
                onNavigate={handleNavigate}
              />
            </li>
          ))}
        </ul>

        {!isLoading && isAdmin && (
          <ul className="mt-4 space-y-1 border-t border-border pt-4">
            {showLabels && (
              <li className="hidden px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:block">
                Admin
              </li>
            )}

            <li>
              <NavLink
                item={adminNavItems[0]}
                isActive={isPathActive(pathname, "/admin")}
                collapsed={!showLabels}
                onNavigate={handleNavigate}
              />
            </li>

            {showLabels && (
              <li className="hidden md:block">
                <button
                  type="button"
                  onClick={() => setIsSupportOpen((v) => !v)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium",
                    pathname.startsWith("/admin/support") || pathname.startsWith("/admin/chat")
                      ? "bg-brand/10 text-brand"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span className="ps-2">Support</span>
                  <ChevronDown className={cn("size-4 transition-transform", isSupportOpen && "rotate-180")} />
                </button>
                {isSupportOpen && (
                  <ul className="mt-1 space-y-1">
                    {supportSubItems.map((item) => (
                      <li key={item.href}>
                        <NavLink
                          item={item}
                          isActive={isPathActive(pathname, item.href)}
                          onNavigate={handleNavigate}
                          nested
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )}

            {visibleAdminItems
              .filter((item) => item.href !== "/admin")
              .map((item) => (
                <li key={item.href}>
                  <NavLink
                    item={item}
                    isActive={isPathActive(pathname, item.href)}
                    collapsed={!showLabels}
                    onNavigate={handleNavigate}
                    nested={showLabels}
                  />
                </li>
              ))}
          </ul>
        )}
      </nav>

      <div className="shrink-0 border-t border-border p-2 md:p-3">
        <button
          type="button"
          onClick={() => setIsCollapsed((v) => !v)}
          className={cn(
            "mb-2 hidden w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground md:flex",
            !showLabels && "justify-center",
          )}
        >
          {isCollapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
          {showLabels && <span>Collapse</span>}
        </button>
        <Link
          href="/"
          onClick={handleNavigate}
          className={cn(
            "mb-2 flex items-center gap-x-3.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
            !showLabels && "justify-center",
          )}
          title="Back to site"
        >
          <ArrowLeft className="size-4 shrink-0" />
          {showLabels && <span className="hidden md:inline">Back to site</span>}
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            "flex w-full items-center gap-x-3.5 rounded-lg px-2.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30",
            !showLabels && "justify-center",
          )}
          title="Log out"
        >
          <LogOut className="size-4 shrink-0" />
          {showLabels && <span className="hidden md:inline">Log out</span>}
        </button>
      </div>
    </aside>
  )
}
