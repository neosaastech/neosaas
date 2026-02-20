"use client"

import { Menu, LogOut, User, CreditCard, Search, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThemeToggle } from "@/components/common/theme-toggle"
import { NotificationBell } from "@/components/admin/notification-bell"
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
  isAdmin?: boolean
}

interface PrivateHeaderProps {
  onMenuClick?: () => void
}

export function PrivateHeader({ onMenuClick }: PrivateHeaderProps) {
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
    // Fetch user data from API
    const fetchUserData = async () => {
      try {
        const response = await fetch("/api/auth/me")
        if (response.ok) {
          const data = await response.json()
          const userRoles = data.user.roles?.map((r: any) => r.roleName) || []
          const userData = {
            firstName: data.user.firstName || "",
            lastName: data.user.lastName || "",
            email: data.user.email || "",
            role: data.user.roles?.[0]?.roleName || "User",
            position: data.user.position || data.user.roles?.[0]?.roleName || "User",
            profileImage: data.user.profileImage || null,
            isAdmin: userRoles.includes('admin') || userRoles.includes('super_admin'),
          }
          setUser(userData)
          // Update localStorage for other components
          localStorage.setItem("user", JSON.stringify(userData))
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      }
    }

    // Initial load from localStorage
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    } else {
      // Default mock data
      setUser({
        firstName: "Musharof",
        lastName: "Chowdhury",
        email: "randomuser@pimjo.com",
        role: "Team Manager",
        position: "Team Manager",
        profileImage: null,
      })
    }

    // Fetch fresh data from API
    fetchUserData()

    const handleStorageChange = () => {
      const updatedUser = localStorage.getItem("user")
      if (updatedUser) {
        setUser(JSON.parse(updatedUser))
      }
    }

    window.addEventListener("storage", handleStorageChange)
    const interval = setInterval(handleStorageChange, 1000)

    return () => {
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

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
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
    <header className="flex h-16 items-center gap-4 border-b bg-background px-6 relative">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

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
              className="w-64 h-9 pl-9 pr-4 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
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
                  <p className="text-sm font-medium text-muted-foreground">Aucun résultat trouvé</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Essayez "users", "products", "admin", "settings"...
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <ThemeToggle />

        {/* Admin Notification Bell */}
        {user?.isAdmin && <NotificationBell />}

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
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10 border-2 border-brand/20">
                <AvatarImage
                  src={user?.profileImage || "/placeholder.svg?height=40&width=40"}
                  alt={user ? `${user.firstName} ${user.lastName}` : "User"}
                />
                <AvatarFallback className="bg-brand text-white font-semibold">
                  {user ? getInitials(user.firstName, user.lastName) : "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-2">
                <p className="text-sm font-semibold">{user ? `${user.firstName} ${user.lastName}` : "User"}</p>
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
