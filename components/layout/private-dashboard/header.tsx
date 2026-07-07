"use client"

import { LogOut, User, CreditCard, Search, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserCompanyAvatar } from "@/components/common/user-company-avatar"
import { ThemeToggle } from "@/components/common/theme-toggle"
import { NotificationBell } from "@/components/admin/notification-bell"
import { UserNotificationBell } from "@/components/common/user-notification-bell"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { usePlatformConfig } from "@/contexts/platform-config-context"
import { useCart } from "@/contexts/cart-context"
import { StatusBadge } from "@/components/ui/status-badge"
import { getUserRoleConfig } from "@/lib/status-configs"
import type { SearchElement } from "@/lib/search-catalog"
import { searchCatalog } from "@/lib/search-catalog"

interface UserData {
  firstName: string
  lastName: string
  email: string
  role: string
  position?: string
  profileImage: string | null
  companyLogo?: string | null
  companyName?: string | null
  isAdmin?: boolean
}

export function PrivateHeader() {
  const router = useRouter()
  const { logo, siteName } = usePlatformConfig()
  const { itemCount } = useCart()
  const [user, setUser] = useState<UserData | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Array<SearchElement & { score: number }>>([])
  const [isSearching, setIsSearching] = useState(false)
  const [catalogItems, setCatalogItems] = useState<SearchElement[]>([])

  // Load search catalog from API
  useEffect(() => {
    const loadSearchCatalog = async () => {
      try {
        const response = await fetch('/api/search/catalog')
        if (response.ok) {
          const data = await response.json()
          setCatalogItems(data.catalog || [])
        }
      } catch (error) {
        console.error('[HEADER] Failed to load search catalog:', error)
      }
    }
    loadSearchCatalog()
  }, [])

  useEffect(() => {
    const persistUserToStorage = (userData: UserData) => {
      try {
        // Never store base64 images in localStorage — they exceed the ~5MB quota
        const { companyLogo: _logo, profileImage: _img, ...slim } = userData
        localStorage.setItem("user", JSON.stringify(slim))
      } catch (error) {
        console.warn("[HEADER] Could not persist user to localStorage:", error)
      }
    }

    const fetchUserData = async () => {
      try {
        const [meResponse, logoResponse] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/company/logo"),
        ])

        if (meResponse.ok) {
          const data = await meResponse.json()
          const userRoles = data.user.roles?.map((r: { roleName: string }) => r.roleName) || []
          let companyLogo: string | null = null
          if (logoResponse.ok) {
            const logoData = await logoResponse.json()
            companyLogo = logoData.logo ?? null
          }

          const userData: UserData = {
            firstName: data.user.firstName || "",
            lastName: data.user.lastName || "",
            email: data.user.email || "",
            role: data.user.roles?.[0]?.roleName || "User",
            position: data.user.position || data.user.roles?.[0]?.roleName || "User",
            profileImage: data.user.profileImage || null,
            companyLogo,
            companyName: data.user.company?.name || null,
            isAdmin: userRoles.includes("admin") || userRoles.includes("super_admin"),
          }
          setUser(userData)
          persistUserToStorage(userData)
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      }
    }

    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      try {
        // Drop legacy entries that stored multi-MB base64 images and broke navigation
        if (storedUser.length > 50_000) {
          localStorage.removeItem("user")
        } else {
          setUser(JSON.parse(storedUser))
        }
      } catch {
        localStorage.removeItem("user")
      }
    }

    fetchUserData()

    const handleCompanyLogoUpdated = (event: Event) => {
      const logo = (event as CustomEvent<{ logo: string | null }>).detail?.logo ?? null
      setUser((prev) => (prev ? { ...prev, companyLogo: logo } : prev))
    }

    window.addEventListener("companyLogoUpdated", handleCompanyLogoUpdated)

    const handleStorageChange = () => {
      const updatedUser = localStorage.getItem("user")
      if (updatedUser) {
        try {
          setUser(JSON.parse(updatedUser))
        } catch {
          localStorage.removeItem("user")
        }
      }
    }

    window.addEventListener("storage", handleStorageChange)
    const interval = setInterval(handleStorageChange, 1000)

    return () => {
      window.removeEventListener("companyLogoUpdated", handleCompanyLogoUpdated)
      window.removeEventListener("storage", handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (searchQuery.length > 0 && catalogItems.length > 0) {
      setIsSearching(true)
      const timer = setTimeout(() => {
        // Utiliser la fonction de recherche centralisée
        const results = searchCatalog(searchQuery, catalogItems)
        setSearchResults(results)
        setIsSearching(false)
      }, 300)

      return () => clearTimeout(timer)
    } else {
      setSearchResults([])
      setIsSearching(false)
    }
  }, [searchQuery, catalogItems])

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
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-background/90 px-4 backdrop-blur-md sm:px-6">

      {/* Mobile Logo */}
      <div className="md:hidden absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
         {logo ? (
            <img src={logo} alt={siteName} className="h-8 w-auto object-contain" />
         ) : (
            <span className="font-bold text-lg">
              <span className="text-foreground">{siteName.substring(0, 3)}</span>
              <span className="text-brand">{siteName.substring(3)}</span>
            </span>
         )}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <div className="relative hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search admin pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-64 rounded-lg border border-border bg-background ps-9 pe-4 text-sm text-foreground shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          {searchQuery && (
            <div className="absolute top-full mt-2 w-full bg-background border rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
              {isSearching ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
              ) : searchResults.length > 0 ? (
                <div className="py-2">
                  {searchResults.map((result, index) => (
                    <button
                      key={result.path}
                      onClick={() => {
                        router.push(result.path)
                        setSearchQuery("")
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-start gap-3 border-b last:border-b-0 border-border/50"
                    >
                      <Search className="h-4 w-4 text-brand mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">{result.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand/10 text-brand font-medium whitespace-nowrap">
                            {result.category}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{result.path}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Search className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">No results found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Essayez "users", "products", "admin", "settings"...
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <ThemeToggle />

        {/* Notification Bell — admin sees platform-wide events, everyone else sees their own */}
        {user?.isAdmin ? <NotificationBell /> : user && <UserNotificationBell />}

        {/* Cart Icon with Badge */}
        {itemCount > 0 && (
          <Link href="/dashboard/cart">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-brand text-[10px] font-bold text-white flex items-center justify-center animate-in zoom-in duration-300">
                {itemCount}
              </span>
            </Button>
          </Link>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-11 w-11 rounded-full p-0">
              <UserCompanyAvatar
                firstName={user?.firstName}
                lastName={user?.lastName}
                profileImage={user?.profileImage}
                companyLogo={user?.companyLogo}
                companyName={user?.companyName}
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-2">
                <div className="flex items-center gap-3">
                  <UserCompanyAvatar
                    firstName={user?.firstName}
                    lastName={user?.lastName}
                    profileImage={user?.profileImage}
                    companyLogo={user?.companyLogo}
                    companyName={user?.companyName}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {user ? `${user.firstName} ${user.lastName}` : "User"}
                    </p>
                    {user?.companyName && (
                      <p className="text-xs text-muted-foreground truncate">{user.companyName}</p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{user?.email || "user@neosaas.com"}</p>
                <p className="text-xs text-brand font-medium">{user?.position || user?.role || "Member"}</p>
                {user?.role && (
                  <StatusBadge 
                    config={getUserRoleConfig(user.role)}
                    size="sm"
                  />
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile & Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/payments" className="cursor-pointer">
                <CreditCard className="mr-2 h-4 w-4" />
                Billing & Payments
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
