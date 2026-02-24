"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"

interface UserRole {
  roleName: string
  roleDescription: string
}

interface UserPermission {
  permissionName: string
  permissionDescription: string
}

interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  companyId: string | null
  isActive: boolean
  roles: UserRole[]
  permissions: UserPermission[]
}

interface UserContextType {
  user: User | null
  isLoading: boolean
  hasRole: (roleName: string | string[]) => boolean
  hasPermission: (permissionName: string | string[]) => boolean
  isAdmin: boolean
  isSuperAdmin: boolean
  refetch: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchUser = async () => {
    try {
      const response = await fetch("/api/auth/me")
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error("Failed to fetch user:", error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  const hasRole = (roleName: string | string[]): boolean => {
    if (!user) return false
    const roleNames = Array.isArray(roleName) ? roleName : [roleName]
    return user.roles.some((role) => roleNames.includes(role.roleName))
  }

  const hasPermission = (permissionName: string | string[]): boolean => {
    if (!user) return false
    const permissionNames = Array.isArray(permissionName) ? permissionName : [permissionName]
    return user.permissions.some((permission) => permissionNames.includes(permission.permissionName))
  }

  const isAdmin = hasRole(["admin", "super_admin"])
  const isSuperAdmin = hasRole(["super_admin"])

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading,
        hasRole,
        hasPermission,
        isAdmin,
        isSuperAdmin,
        refetch: fetchUser,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
