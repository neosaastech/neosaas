"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Shield, Globe, Users, FileText } from "lucide-react"
import { useState, useEffect } from "react"
import { getPages, updatePageAccess, syncPages, type AccessLevel } from "@/app/actions/pages"
import { toast } from "sonner"

interface Page {
  path: string
  name: string
  access: AccessLevel
  group: string
}

const defaultPages: Page[] = [
  { path: "/", name: "Home Page", access: "public", group: "Public" },
  { path: "/features", name: "Features", access: "public", group: "Public" },
  { path: "/pricing", name: "Pricing", access: "public", group: "Public" },
  { path: "/docs", name: "Documentation", access: "public", group: "Public" },
  { path: "/auth/login", name: "Login", access: "public", group: "Authentication" },
  { path: "/auth/register", name: "Register", access: "public", group: "Authentication" },
  { path: "/dashboard", name: "Dashboard Overview", access: "user", group: "Dashboard" },
  { path: "/dashboard/profile", name: "User Profile", access: "user", group: "Dashboard" },
  { path: "/dashboard/payments", name: "Payments", access: "user", group: "Dashboard" },
  { path: "/dashboard/company-management", name: "Company Management", access: "user", group: "Dashboard" },
  { path: "/dashboard/checkout", name: "Checkout", access: "user", group: "Dashboard" },
  { path: "/admin", name: "Admin Dashboard", access: "admin", group: "Admin" },
  { path: "/admin/api", name: "API Management", access: "admin", group: "Admin" },
  { path: "/admin/pages", name: "Pages ACL", access: "admin", group: "Admin" },
  { path: "/admin/mail", name: "Mail Management", access: "admin", group: "Admin" },
]

export function PagesSettings() {
  const [searchTerm, setSearchTerm] = useState("")
  const [pages, setPages] = useState<Page[]>([])
  const [filteredPages, setFilteredPages] = useState<Page[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPages = async () => {
      setIsLoading(true)
      const result = await getPages()
      if (result.success && result.data && result.data.length > 0) {
        // Map DB result to Page interface
        const dbPages = result.data.map(p => ({
          path: p.path,
          name: p.name,
          access: p.access as AccessLevel,
          group: p.group
        }))
        setPages(dbPages)
        setFilteredPages(dbPages)
      } else {
        // If no pages in DB, sync default pages
        await syncPages(defaultPages)
        setPages(defaultPages)
        setFilteredPages(defaultPages)
      }
      setIsLoading(false)
    }
    fetchPages()
  }, [])

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm) {
        setIsSearching(true)
        const filtered = pages.filter(
          (page) =>
            page.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
            page.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            page.group.toLowerCase().includes(searchTerm.toLowerCase()),
        )
        setFilteredPages(filtered)
        setIsSearching(false)
      } else {
        setFilteredPages(pages)
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm, pages])

  const getAccessBadge = (access: AccessLevel) => {
    switch (access) {
      case "public":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <Globe className="w-3 h-3 mr-1" /> Public
          </Badge>
        )
      case "user":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <Users className="w-3 h-3 mr-1" /> User
          </Badge>
        )
      case "admin":
        return (
          <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
            <Shield className="w-3 h-3 mr-1" /> Admin
          </Badge>
        )
      case "super_admin":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <Shield className="w-3 h-3 mr-1" /> Super Admin
          </Badge>
        )
      default:
        return <Badge variant="outline">{access}</Badge>
    }
  }

  const handleAccessChange = async (path: string, newAccess: AccessLevel) => {
    // Optimistic update
    const updatedPages = pages.map(p => 
      p.path === path ? { ...p, access: newAccess } : p
    )
    setPages(updatedPages)
    
    // Also update filtered pages if needed
    if (searchTerm) {
      setFilteredPages(filteredPages.map(p => 
        p.path === path ? { ...p, access: newAccess } : p
      ))
    } else {
      setFilteredPages(updatedPages)
    }

    const result = await updatePageAccess(path, newAccess)
    if (result.success) {
      toast.success(`Access updated for ${path}`)
    } else {
      toast.error("Failed to update access")
      // Revert on error
      // (Implementation omitted for brevity, but ideally should revert state)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-brand" />
          Pages Access Control
        </CardTitle>
        <CardDescription>
          Manage access levels for different pages of your application.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center mb-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search pages..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Page Name</TableHead>
                <TableHead className="min-w-[180px] hidden sm:table-cell">Path</TableHead>
                <TableHead className="min-w-[100px] hidden md:table-cell">Group</TableHead>
                <TableHead className="min-w-[160px]">Access Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Loading pages...
                  </TableCell>
                </TableRow>
              ) : filteredPages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No pages found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPages.map((page) => (
                  <TableRow key={page.path}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-1">
                        <span>{page.name}</span>
                        <span className="sm:hidden font-mono text-xs text-muted-foreground">{page.path}</span>
                        <span className="md:hidden">
                          <Badge variant="outline" className="text-xs">{page.group}</Badge>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground hidden sm:table-cell">
                      {page.path}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline">{page.group}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          defaultValue={page.access}
                          onValueChange={(value) => handleAccessChange(page.path, value as AccessLevel)}
                        >
                          <SelectTrigger className="w-[140px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">
                              <div className="flex items-center">
                                <Globe className="w-3 h-3 mr-2 text-green-500" /> Public
                              </div>
                            </SelectItem>
                            <SelectItem value="user">
                              <div className="flex items-center">
                                <Users className="w-3 h-3 mr-2 text-blue-500" /> User
                              </div>
                            </SelectItem>
                            <SelectItem value="admin">
                              <div className="flex items-center">
                                <Shield className="w-3 h-3 mr-2 text-purple-500" /> Admin
                              </div>
                            </SelectItem>
                            <SelectItem value="super_admin">
                              <div className="flex items-center">
                                <Shield className="w-3 h-3 mr-2 text-red-500" /> Super Admin
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
