"use client"

import { useState, useRef } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Plus,
  Search,
  Trash2,
  MoreHorizontal,
  UserX,
  UserCheck,
  Pencil,
  Building2,
  Shield,
  ShieldAlert,
  FileDown,
  Download,
  Printer,
  Upload
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import {
  createUser,
  deleteUser,
  updateUserRole,
  updateUserStatus,
  bulkUpdateUserStatus,
  updateUser,
  updateCompany,
  setSiteManager,
  setDpo
} from "@/app/actions/users"
import { resendInvitation, cancelInvitation } from "@/app/actions/invitations"
import { Mail, XCircle, Gavel, ShieldCheck } from "lucide-react"
import { UserEditSheet } from "@/components/admin/user-edit-sheet"
import { UserCreateSheet } from "@/components/admin/user-create-sheet"

interface Company {
  id: string
  name: string
  email: string
  phone?: string | null
  address?: string | null
  city?: string | null
  zipCode?: string | null
  siret?: string | null
  vatNumber?: string | null
  isActive: boolean
}

interface Invitation {
  id: string
  email: string
  status: string
  createdAt: Date
  expiresAt: Date
  company?: Company | null
  role?: {
    name: string
  } | null
}

interface User {
  id: string
  username?: string | null
  email: string
  firstName: string
  lastName: string
  phone?: string | null
  address?: string | null
  city?: string | null
  postalCode?: string | null
  country?: string | null
  position?: string | null
  profileImage?: string | null
  companyId: string | null
  isActive: boolean
  isSiteManager: boolean
  isDpo?: boolean
  company?: Company | null
  userRoles: {
    role: {
      name: string
      scope: string
    }
  }[]
  createdAt: Date
  updatedAt?: Date
}

interface UsersTableProps {
  initialUsers: User[]
  initialInvitations?: Invitation[]
  companies?: Company[]
  currentUserId?: string
  isSuperAdmin?: boolean
}

export function UsersTable({ initialUsers, initialInvitations = [], companies = [], currentUserId, isSuperAdmin = false }: UsersTableProps) {
  const [users, setUsers] = useState(initialUsers)
  const [invitations, setInvitations] = useState(initialInvitations)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const csvImportInputRef = useRef<HTMLInputElement>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [sortField, setSortField] = useState<"name" | "email" | "createdAt" | "updatedAt" | null>(null)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.username && user.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.company?.name?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && user.isActive) ||
      (statusFilter === "inactive" && !user.isActive)

    return matchesSearch && matchesStatus
  })

  // Sort users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortField) return 0

    let compareValue = 0

    switch (sortField) {
      case "id":
        compareValue = a.id.localeCompare(b.id)
        break
      case "name":
        compareValue = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
        break
      case "username":
        compareValue = (a.username || "").localeCompare(b.username || "")
        break
      case "email":
        compareValue = a.email.localeCompare(b.email)
        break
      case "company":
        compareValue = (a.company?.name || "").localeCompare(b.company?.name || "")
        break
      case "role":
        compareValue = (a.userRoles[0]?.role.name || "").localeCompare(b.userRoles[0]?.role.name || "")
        break
      case "createdAt":
        compareValue = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
      case "updatedAt":
        if (!a.updatedAt && !b.updatedAt) return 0
        if (!a.updatedAt) return 1
        if (!b.updatedAt) return -1
        compareValue = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        break
    }

    return sortOrder === "asc" ? compareValue : -compareValue
  })

  const handleSort = (field: "id" | "name" | "username" | "email" | "company" | "role" | "createdAt" | "updatedAt") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const filteredInvitations = invitations.filter((invitation) => {
    const matchesSearch =
      invitation.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (invitation.company?.name || "").toLowerCase().includes(searchQuery.toLowerCase())

    // Invitations are always "pending" effectively, but we can filter if needed
    // For now, we show them if status filter is 'all' or 'inactive' (since they aren't active users yet)
    // Or maybe we should add a 'pending' status to the filter?
    // Let's just show them in 'all' for now.
    const matchesStatus = statusFilter === "all"

    return matchesSearch && matchesStatus
  })

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(filteredUsers.map(u => u.id))
    } else {
      setSelectedUsers([])
    }
  }

  const handleResendInvitation = async (invitationId: string) => {
    setIsLoading(true)
    try {
      const result = await resendInvitation(invitationId)
      if (result.success) {
        toast.success("Invitation resent successfully")
      } else {
        toast.error(result.error || "Failed to resend invitation")
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    setIsLoading(true)
    try {
      const result = await cancelInvitation(invitationId)
      if (result.success) {
        setInvitations(invitations.filter(i => i.id !== invitationId))
        toast.success("Invitation cancelled successfully")
      } else {
        toast.error(result.error || "Failed to cancel invitation")
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId])
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId))
    }
  }

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    const formData = new FormData(e.currentTarget)

    const result = await createUser(formData)

    if (result.success) {
      toast.success("User created successfully")
      setIsCreateOpen(false)
      window.location.reload()
    } else {
      toast.error(result.error || "Failed to create user")
    }
    setIsLoading(false)
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return

    const result = await deleteUser(userId)
    if (result.success) {
      toast.success("User deleted successfully")
      setUsers(users.filter(u => u.id !== userId))
      setSelectedUsers(selectedUsers.filter(id => id !== userId))
    } else {
      toast.error(result.error || "Failed to delete user")
    }
  }

  const handleRoleUpdate = async (userId: string, roleName: string) => {
    const result = await updateUserRole(userId, roleName)
    if (result.success) {
      toast.success("Role updated successfully")
      window.location.reload()
    } else {
      toast.error(result.error || "Failed to update role")
    }
  }

  const handleStatusUpdate = async (userId: string, isActive: boolean) => {
    const result = await updateUserStatus(userId, isActive)
    if (result.success) {
      toast.success(result.message)
      setUsers(users.map(u => u.id === userId ? { ...u, isActive } : u))
    } else {
      toast.error(result.error || "Failed to update status")
    }
  }

  const handleBulkStatusUpdate = async (isActive: boolean) => {
    if (selectedUsers.length === 0) {
      toast.error("No users selected")
      return
    }

    const action = isActive ? "activate" : "deactivate"
    if (!confirm(`Are you sure you want to ${action} ${selectedUsers.length} user(s)?`)) return

    setIsLoading(true)
    const result = await bulkUpdateUserStatus(selectedUsers, isActive)
    if (result.success) {
      toast.success(result.message)
      setUsers(users.map(u =>
        selectedUsers.includes(u.id) ? { ...u, isActive } : u
      ))
      setSelectedUsers([])
    } else {
      toast.error(result.error || `Failed to ${action} users`)
    }
    setIsLoading(false)
  }

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) {
      toast.error("No users selected")
      return
    }
    if (!confirm(`Are you sure you want to permanently delete ${selectedUsers.length} user(s)? This action cannot be undone.`)) return

    setIsLoading(true)
    let deleted = 0
    let failed = 0
    for (const userId of selectedUsers) {
      const result = await deleteUser(userId)
      if (result.success) {
        deleted++
      } else {
        failed++
        console.error("Failed to delete user:", userId, result.error)
      }
    }
    if (deleted > 0) {
      setUsers(users.filter(u => !selectedUsers.includes(u.id)))
      setSelectedUsers([])
      toast.success(`${deleted} user(s) deleted${failed > 0 ? `, ${failed} failed` : ""}`)
    } else {
      toast.error(`Failed to delete users (${failed} error(s))`)
    }
    setIsLoading(false)
  }

  const handleSetDpo = async (userId: string) => {
    setIsLoading(true)
    const result = await setDpo(userId)
    if (result.success) {
      toast.success("DPO updated successfully")
      setUsers(users.map(u => ({ ...u, isDpo: u.id === userId })))
    } else {
      toast.error(result.error || "Failed to set DPO")
    }
    setIsLoading(false)
  }

  const handleSetSiteManager = async (userId: string) => {
    setIsLoading(true)
    const result = await setSiteManager(userId)
    if (result.success) {
      toast.success("Legal representative updated successfully")
      setUsers(users.map(u => ({ ...u, isSiteManager: u.id === userId })))
    } else {
      toast.error(result.error || "Failed to set legal representative")
    }
    setIsLoading(false)
  }

  const handleEditUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingUser) return

    setIsLoading(true)
    const formData = new FormData(e.currentTarget)
    const companyIdRaw = formData.get("companyId") as string

    const data = {
      username: formData.get("username") as string || undefined,
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string || undefined,
      address: formData.get("address") as string || undefined,
      city: formData.get("city") as string || undefined,
      postalCode: formData.get("postalCode") as string || undefined,
      country: formData.get("country") as string || undefined,
      position: formData.get("position") as string || undefined,
      companyId: companyIdRaw && companyIdRaw !== "none" ? companyIdRaw : null,
    }

    const result = await updateUser(editingUser.id, data)

    if (result.success) {
      // Handle role update if changed
      const newRole = formData.get("role") as string
      const currentRole = editingUser.userRoles[0]?.role.name
      
      if (newRole && newRole !== currentRole) {
         const roleResult = await updateUserRole(editingUser.id, newRole)
         if (!roleResult.success) {
            toast.error(roleResult.error || "Failed to update role")
         }
      }

      toast.success("User updated successfully")
      setEditingUser(null)
      window.location.reload()
    } else {
      toast.error(result.error || "Failed to update user")
    }
    setIsLoading(false)
  }

  const handleEditCompany = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingCompany) return

    setIsLoading(true)
    const formData = new FormData(e.currentTarget)

    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string || undefined,
      address: formData.get("address") as string || undefined,
      city: formData.get("city") as string || undefined,
      zipCode: formData.get("zipCode") as string || undefined,
      siret: formData.get("siret") as string || undefined,
      vatNumber: formData.get("vatNumber") as string || undefined,
    }

    const result = await updateCompany(editingCompany.id, data)

    if (result.success) {
      toast.success("Company updated successfully")
      setEditingCompany(null)
      window.location.reload()
    } else {
      toast.error(result.error || "Failed to update company")
    }
    setIsLoading(false)
  }

  const handleExportCSV = () => {
    const usersToExport = selectedUsers.length > 0 
      ? users.filter(u => selectedUsers.includes(u.id))
      : users

    const headers = ["ID", "Username", "First Name", "Last Name", "Email", "Company", "Role", "Status", "Created At"]
    const rows = usersToExport.map(u => [
      u.id,
      u.username || "",
      u.firstName,
      u.lastName,
      u.email,
      u.company?.name || "Platform",
      u.userRoles.map(r => r.role.name).join(", "),
      u.isActive ? "Active" : "Inactive",
      new Date(u.createdAt).toLocaleDateString()
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", "users_export.csv")
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleExportXLS = () => {
    const usersToExport = selectedUsers.length > 0 
      ? users.filter(u => selectedUsers.includes(u.id))
      : users

    // Simple HTML table export which Excel can open
    const tableContent = `
      <html>
        <head>
          <meta charset="UTF-8">
        </head>
        <body>
          <table border="1">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Email</th>
                <th>Company</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              ${usersToExport.map(u => `
                <tr>
                  <td>${u.id}</td>
                  <td>${u.username || ""}</td>
                  <td>${u.firstName}</td>
                  <td>${u.lastName}</td>
                  <td>${u.email}</td>
                  <td>${u.company?.name || "Platform"}</td>
                  <td>${u.userRoles.map(r => r.role.name).join(", ")}</td>
                  <td>${u.isActive ? "Active" : "Inactive"}</td>
                  <td>${new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </body>
      </html>
    `

    const blob = new Blob([tableContent], { type: "application/vnd.ms-excel" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "users_export.xls"
    link.click()
  }

  const handlePrintPDF = () => {
    // Create a printable view
    const usersToExport = selectedUsers.length > 0 
      ? users.filter(u => selectedUsers.includes(u.id))
      : users
      
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Users Export</title>
            <style>
              body { font-family: sans-serif; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <h1>Users List</h1>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${usersToExport.map(u => `
                  <tr>
                    <td>${u.firstName} ${u.lastName}</td>
                    <td>${u.email}</td>
                    <td>${u.company?.name || "Platform"}</td>
                    <td>${u.userRoles.map(r => r.role.name).join(", ")}</td>
                    <td>${u.isActive ? "Active" : "Inactive"}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
            <script>
              window.onload = function() { window.print(); }
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const lines = text.split('\n')
      
      if (lines.length < 2) {
        toast.error("CSV file is empty or invalid")
        return
      }

      // Expected columns: username,firstName,lastName,email,password,companyId,role
      const headers = lines[0].split(',').map(h => h.trim())
      const dataLines = lines.slice(1).filter(line => line.trim())
      
      let imported = 0
      let errors = 0

      for (const line of dataLines) {
        try {
          const values = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"')) || []
          
          if (values.length < 4) continue // At minimum need firstName, lastName, email, password

          const formData = new FormData()
          formData.append('username', values[0] || '')
          formData.append('firstName', values[1])
          formData.append('lastName', values[2])
          formData.append('email', values[3])
          formData.append('password', values[4] || 'ChangeMe123!')
          formData.append('companyId', values[5] || 'none')
          formData.append('role', values[6] || 'reader')

          const result = await createUser(formData)
          if (result.success) {
            imported++
          } else {
            errors++
            console.error('Failed to import user:', values[3], result.error)
          }
        } catch (err) {
          errors++
          console.error('Error parsing CSV line:', line, err)
        }
      }

      if (imported > 0) {
        toast.success(`${imported} user(s) imported successfully${errors > 0 ? `, ${errors} error(s)` : ''}`)
        window.location.reload()
      } else {
        toast.error(`Import failed: ${errors} error(s)`)
      }
    } catch (error) {
      console.error('[UsersTable] Import error:', error)
      toast.error("Failed to import CSV file")
    }

    // Reset input
    if (csvImportInputRef.current) {
      csvImportInputRef.current.value = ''
    }
  }

  const getRoleBadgeVariant = (roleName: string) => {
    switch (roleName) {
      case "super_admin":
        return "destructive"
      case "admin":
        return "default"
      case "writer":
        return "secondary"
      default:
        return "outline"
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={csvImportInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleImportCSV}
      />
      {/* Search and Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative w-72">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground mr-2">
            Total: {filteredUsers.length}
          </span>
          {isSuperAdmin && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={handleExportCSV}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportXLS}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export as Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handlePrintPDF}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print / Save as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => csvImportInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Import CSV</span>
              </Button>
            </>
          )}

          {selectedUsers.length > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedUsers.length} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkStatusUpdate(false)}
                disabled={isLoading}
                className="text-orange-600 border-orange-600 hover:bg-orange-50"
              >
                <UserX className="mr-2 h-4 w-4" />
                Revoke
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkStatusUpdate(true)}
                disabled={isLoading}
                className="text-green-600 border-green-600 hover:bg-green-50"
              >
                <UserCheck className="mr-2 h-4 w-4" />
                Activate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isLoading}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          )}

          <Button 
            onClick={() => setIsCreateOpen(true)}
            className="bg-brand hover:bg-brand-hover text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Users Table - Desktop */}
      <div className="hidden md:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedUsers.length === sortedUsers.length && sortedUsers.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="w-24">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 -ml-2"
                  onClick={() => handleSort("id")}
                >
                  ID
                  {sortField === "id" && (
                    <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 -ml-2"
                  onClick={() => handleSort("name")}
                >
                  Name
                  {sortField === "name" && (
                    <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 -ml-2"
                  onClick={() => handleSort("username")}
                >
                  Username
                  {sortField === "username" && (
                    <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 -ml-2"
                  onClick={() => handleSort("email")}
                >
                  Email
                  {sortField === "email" && (
                    <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 -ml-2"
                  onClick={() => handleSort("company")}
                >
                  Company
                  {sortField === "company" && (
                    <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 -ml-2"
                  onClick={() => handleSort("role")}
                >
                  Role
                  {sortField === "role" && (
                    <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </Button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 -ml-2"
                  onClick={() => handleSort("createdAt")}
                >
                  Created
                  {sortField === "createdAt" && (
                    <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 -ml-2"
                  onClick={() => handleSort("updatedAt")}
                >
                  Updated
                  {sortField === "updatedAt" && (
                    <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </Button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvitations.map((invitation) => (
              <TableRow key={invitation.id} className="bg-muted/30">
                <TableCell>
                  {/* No checkbox for invitations for now */}
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 opacity-70">
                      <AvatarFallback>
                        <Mail className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="italic text-muted-foreground">Pending Invitation</span>
                      <span className="text-xs text-muted-foreground md:hidden">{invitation.email}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>-</TableCell>
                <TableCell>{invitation.email}</TableCell>
                <TableCell>
                  {invitation.company ? (
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border bg-muted/50">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium">{invitation.company.name}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-dashed">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="text-muted-foreground text-sm">Platform User</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{invitation.role?.name || "reader"}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                    Pending
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleResendInvitation(invitation.id)}
                      title="Resend Invitation"
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCancelInvitation(invitation.id)}
                      title="Cancel Invitation"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredUsers.length === 0 && filteredInvitations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No users or invitations found
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id} className={!user.isActive ? "opacity-60" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {user.id.substring(0, 8)}...
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.profileImage || ""} alt={user.username || "User"} />
                        <AvatarFallback>{user.firstName[0]}{user.lastName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span>{user.firstName} {user.lastName}</span>
                          {user.isSiteManager && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 border-blue-500 text-blue-500">
                              Legal Rep.
                            </Badge>
                          )}
                          {user.isDpo && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 border-purple-500 text-purple-500">
                              DPO
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground md:hidden">{user.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{user.username || "-"}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.company ? (
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border bg-muted/50">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <Button
                          variant="link"
                          className="p-0 h-auto font-medium text-foreground hover:underline"
                          onClick={() => setEditingCompany(user.company!)}
                        >
                          {user.company.name}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-dashed">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="text-muted-foreground text-sm">Platform User</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select 
                      defaultValue={user.userRoles[0]?.role.name || "reader"} 
                      onValueChange={(val) => handleRoleUpdate(user.id, val)}
                      disabled={user.id === currentUserId}
                    >
                      <SelectTrigger className="h-8 w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reader">Reader</SelectItem>
                        <SelectItem value="writer">Writer</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={user.isActive} 
                        onCheckedChange={(checked) => handleStatusUpdate(user.id, checked)}
                        disabled={user.id === currentUserId}
                      />
                      <span className={`text-xs ${user.isActive ? "text-green-600" : "text-red-600"}`}>
                        {user.isActive ? "Active" : "Revoked"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div>{new Date(user.createdAt).toLocaleDateString()}</div>
                    <div className="text-[10px]">{new Date(user.createdAt).toLocaleTimeString()}</div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {user.updatedAt ? (
                      <>
                        <div>{new Date(user.updatedAt).toLocaleDateString()}</div>
                        <div className="text-[10px]">{new Date(user.updatedAt).toLocaleTimeString()}</div>
                      </>
                    ) : (
                      <span>-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingUser(user)}
                        title="Edit user"
                        disabled={user.id === currentUserId}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteUser(user.id)}
                        title="Delete user"
                        disabled={user.id === currentUserId}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {isSuperAdmin && user.id !== currentUserId && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="More actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Legal / GDPR</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleSetDpo(user.id)}
                              disabled={isLoading}
                              className={user.isDpo ? "text-purple-600 font-medium" : ""}
                            >
                              <ShieldCheck className="mr-2 h-4 w-4" />
                              {user.isDpo ? "DPO (current)" : "Set as DPO"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleSetSiteManager(user.id)}
                              disabled={isLoading}
                              className={user.isSiteManager ? "text-blue-600 font-medium" : ""}
                            >
                              <Gavel className="mr-2 h-4 w-4" />
                              {user.isSiteManager ? "Legal Rep. (current)" : "Set as Legal Rep."}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile View - Cards */}
      <div className="md:hidden space-y-3">
        {/* Pending Invitations */}
        {filteredInvitations.map((invitation) => (
          <div key={invitation.id} className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 opacity-70">
                  <AvatarFallback>
                    <Mail className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm italic text-muted-foreground">Pending Invitation</p>
                  <p className="text-xs text-muted-foreground">{invitation.email}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Company:</span>
                <p className="font-medium">{invitation.company?.name || "Platform User"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Role:</span>
                <p className="font-medium">{invitation.role?.name || "reader"}</p>
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => handleResendInvitation(invitation.id)}>
                <Mail className="h-3 w-3 mr-1" />
                Resend
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-red-600" onClick={() => handleCancelInvitation(invitation.id)}>
                <XCircle className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ))}

        {/* Users */}
        {filteredUsers.length === 0 && filteredInvitations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No users or invitations found
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div key={user.id} className={`rounded-lg border bg-card p-4 space-y-3 ${!user.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedUsers.includes(user.id)}
                    onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                  />
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.profileImage || ""} alt={user.username || "User"} />
                    <AvatarFallback>{user.firstName[0]}{user.lastName[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{user.firstName} {user.lastName}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Username:</span>
                  <p className="font-medium">{user.username || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Company:</span>
                  <p className="font-medium">{user.company?.name || "Platform"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Role:</span>
                  <div className="mt-0.5">
                    {user.userRoles.map((ur, idx) => (
                      <Badge key={idx} variant={getRoleBadgeVariant(ur.role.name)} className="text-[10px] mr-1">
                        {ur.role.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <div className="mt-0.5">
                    <Badge variant={user.isActive ? "default" : "secondary"} className="text-[10px]">
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditingUser(user)}>
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                {user.id !== currentUserId && (
                  <Button variant="outline" size="sm" className="flex-1 text-red-600" onClick={() => handleDeleteUser(user.id)}>
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* User Create Sheet */}
      <UserCreateSheet
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSave={handleCreateUser}
        companies={companies}
        isLoading={isLoading}
      />

      {/* User Edit Sheet */}
      <UserEditSheet
        user={editingUser}
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        onSave={handleEditUser}
        companies={companies}
        isLoading={isLoading}
      />

      {/* Edit Company Dialog */}
      <Dialog open={!!editingCompany} onOpenChange={(open) => !open && setEditingCompany(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>
              Update company information.
            </DialogDescription>
          </DialogHeader>
          {editingCompany && (
            <form onSubmit={handleEditCompany} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input
                    id="company-name"
                    name="name"
                    defaultValue={editingCompany.name}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-email">Email</Label>
                  <Input
                    id="company-email"
                    name="email"
                    type="email"
                    defaultValue={editingCompany.email}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-phone">Phone</Label>
                  <Input
                    id="company-phone"
                    name="phone"
                    defaultValue={editingCompany.phone || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-siret">SIRET</Label>
                  <Input
                    id="company-siret"
                    name="siret"
                    defaultValue={editingCompany.siret || ""}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-vatNumber">VAT Number</Label>
                <Input
                  id="company-vatNumber"
                  name="vatNumber"
                  defaultValue={editingCompany.vatNumber || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-address">Address</Label>
                <Input
                  id="company-address"
                  name="address"
                  defaultValue={editingCompany.address || ""}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-city">City</Label>
                  <Input
                    id="company-city"
                    name="city"
                    defaultValue={editingCompany.city || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-zipCode">Zip Code</Label>
                  <Input
                    id="company-zipCode"
                    name="zipCode"
                    defaultValue={editingCompany.zipCode || ""}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingCompany(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* User Create Sheet */}
      <UserCreateSheet
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSave={handleCreateUser}
        companies={companies}
        isLoading={isLoading}
      />

      {/* User Edit Sheet */}
      <UserEditSheet
        user={editingUser}
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        onSave={handleEditUser}
        companies={companies}
        isLoading={isLoading}
      />
    </div>
  )
}
