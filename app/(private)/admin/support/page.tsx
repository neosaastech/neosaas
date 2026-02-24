"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import {
  MessageSquare,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Ticket,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  Eye,
  Trash2,
  UserPlus,
  CheckSquare,
  X,
  Archive,
  Info,
  AlertTriangle,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { InfoOverlay } from "@/components/admin/info-overlay"

// ============================================================================
// Types
// ============================================================================

interface Conversation {
  id: string
  userId?: string
  guestEmail?: string
  guestName?: string
  subject: string
  category: 'info' | 'action' | 'urgent'
  status: 'open' | 'pending' | 'resolved' | 'closed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  assignedAdminId?: string
  lastMessageAt: string
  createdAt: string
  unreadCount?: number
  metadata?: Record<string, any>
  user?: {
    id: string
    firstName: string
    lastName: string
    email: string
    profileImage?: string
  }
  assignedAdmin?: {
    id: string
    firstName: string
    lastName: string
    profileImage?: string
  }
}

interface UserOption {
  id: string
  firstName: string
  lastName: string
  email: string
  profileImage?: string
  company?: {
    name: string
  }
}

interface Stats {
  total: number
  open: number
  pending: number
  unassigned: number
  resolved?: number
  byCategory?: {
    info: number
    action: number
    urgent: number
  }
}

// ============================================================================
// Constants
// ============================================================================

const statusConfig = {
  open: {
    label: "In Progress",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200"
  },
  pending: {
    label: "Pending",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200"
  },
  resolved: {
    label: "Solved",
    badgeClass: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200"
  },
  closed: {
    label: "Closed",
    badgeClass: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200"
  },
}

const categoryConfig = {
  info: {
    label: "Info",
    icon: Info,
    badgeClass: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    description: "Information only - No chat",
  },
  action: {
    label: "Action",
    icon: AlertCircle,
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    description: "Action required - Chat available",
  },
  urgent: {
    label: "Urgent",
    icon: AlertTriangle,
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    description: "Priority - Immediate attention",
  },
}

// ============================================================================
// Main Component
// ============================================================================

export default function SupportListPage() {
  const router = useRouter()

  // State
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, open: 0, pending: 0, unassigned: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkProcessing, setBulkProcessing] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 10

  // Info Overlay
  const [showInfoOverlay, setShowInfoOverlay] = useState(false)
  const [selectedInfoNotification, setSelectedInfoNotification] = useState<Conversation | null>(null)

  // New conversation dialog
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [userSearch, setUserSearch] = useState("")
  const [userSearchResults, setUserSearchResults] = useState<UserOption[]>([])
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null)
  const [newSubject, setNewSubject] = useState("")
  const [newMessage, setNewMessage] = useState("")
  const [creatingConversation, setCreatingConversation] = useState(false)
  const [searchingUsers, setSearchingUsers] = useState(false)

  // ============================================================================
  // Selection Helpers
  // ============================================================================

  const isAllSelected = conversations.length > 0 && selectedIds.size === conversations.length
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < conversations.length

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(conversations.map(c => c.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchConversations = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)

      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)
      // Always pass category parameter for support list
      // When "all" is selected, pass "all" to include info notifications
      // The API excludes 'info' by default, so we need to explicitly request all
      params.set("category", categoryFilter === "all" ? "all" : categoryFilter)
      if (searchQuery) params.set("search", searchQuery)
      params.set("limit", itemsPerPage.toString())
      params.set("offset", ((currentPage - 1) * itemsPerPage).toString())

      const response = await fetch(`/api/admin/chat?${params}`)
      const data = await response.json()

      if (data.success) {
        setConversations(data.data || [])
        setStats(data.stats || { total: 0, open: 0, pending: 0, unassigned: 0 })
        setTotalPages(Math.ceil((data.pagination?.total || 0) / itemsPerPage))
        if (isRefresh) toast.success("Tickets refreshed")
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error)
      toast.error("Failed to load tickets")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [statusFilter, categoryFilter, searchQuery, currentPage])

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setUserSearchResults([])
      return
    }

    setSearchingUsers(true)
    try {
      const response = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}&limit=10`)
      const data = await response.json()

      if (data.success || Array.isArray(data)) {
        const users = data.success ? data.data : data
        setUserSearchResults(users.slice(0, 10))
      }
    } catch (error) {
      console.error("Failed to search users:", error)
    } finally {
      setSearchingUsers(false)
    }
  }, [])

  // ============================================================================
  // Actions
  // ============================================================================

  const handleTicketClick = (conv: Conversation) => {
    // For 'info' category, show overlay instead of navigating
    if (conv.category === 'info') {
      setSelectedInfoNotification(conv)
      setShowInfoOverlay(true)
    } else {
      // For 'action' and 'urgent', navigate to reply page
      router.push(`/admin/support/reply?id=${conv.id}`)
    }
  }

  const openTicket = (id: string) => {
    router.push(`/admin/support/reply?id=${id}`)
  }

  const deleteTicket = async (id: string) => {
    if (!confirm("Are you sure you want to delete this ticket?")) return

    try {
      const response = await fetch(`/api/admin/chat/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success("Ticket deleted")
        fetchConversations()
      } else {
        toast.error("Failed to delete ticket")
      }
    } catch (error) {
      toast.error("Connection error")
    }
  }

  // Bulk Actions
  const bulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} ticket(s)?`)) return

    setBulkProcessing(true)
    try {
      const promises = Array.from(selectedIds).map(id =>
        fetch(`/api/admin/chat/${id}`, { method: 'DELETE' })
      )
      await Promise.all(promises)
      toast.success(`${selectedIds.size} ticket(s) deleted`)
      clearSelection()
      fetchConversations()
    } catch (error) {
      toast.error("Failed to delete some tickets")
    } finally {
      setBulkProcessing(false)
    }
  }

  const bulkUpdateStatus = async (newStatus: string) => {
    if (selectedIds.size === 0) return

    setBulkProcessing(true)
    try {
      const promises = Array.from(selectedIds).map(id =>
        fetch(`/api/admin/chat/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })
      )
      await Promise.all(promises)
      toast.success(`${selectedIds.size} ticket(s) updated to ${statusConfig[newStatus as keyof typeof statusConfig]?.label || newStatus}`)
      clearSelection()
      fetchConversations()
    } catch (error) {
      toast.error("Failed to update some tickets")
    } finally {
      setBulkProcessing(false)
    }
  }

  const createConversation = async () => {
    if (!selectedUser || !newSubject.trim() || !newMessage.trim()) return

    setCreatingConversation(true)
    try {
      const response = await fetch('/api/admin/chat/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          subject: newSubject.trim(),
          message: newMessage.trim(),
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast.success("Ticket created")
        setShowNewDialog(false)
        setSelectedUser(null)
        setNewSubject("")
        setNewMessage("")
        setUserSearch("")
        setUserSearchResults([])

        await fetchConversations()
        if (data.data?.conversation?.id) {
          router.push(`/admin/support/reply?id=${data.data.conversation.id}`)
        }
      } else {
        toast.error(data.error || "Failed to create ticket")
      }
    } catch (error) {
      toast.error("Connection error")
    } finally {
      setCreatingConversation(false)
    }
  }

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    fetchConversations()
    const interval = setInterval(() => fetchConversations(), 30000)
    return () => clearInterval(interval)
  }, [fetchConversations])

  useEffect(() => {
    const timer = setTimeout(() => searchUsers(userSearch), 300)
    return () => clearTimeout(timer)
  }, [userSearch, searchUsers])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
    clearSelection()
  }, [statusFilter, categoryFilter, searchQuery])

  // ============================================================================
  // Helpers
  // ============================================================================

  const getCustomerName = (conv: Conversation) => {
    if (conv.user) {
      return `${conv.user.firstName} ${conv.user.lastName}`.trim()
    }
    return conv.guestName || 'Visitor'
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getTicketId = (id: string) => {
    return `#${id.slice(0, 6).toUpperCase()}`
  }

  // Calculate solved tickets
  const solvedTickets = stats.resolved ?? (stats.total - stats.pending - stats.open)

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Support List</h1>
          <nav className="text-sm text-muted-foreground mt-1">
            Home &gt; Support List
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchConversations(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Ticket
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Tickets */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Ticket className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </div>

        {/* Pending Tickets */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {(stats.pending + stats.open).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </div>

        {/* Solved Tickets */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {solvedTickets.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Solved</p>
            </div>
          </div>
        </div>

        {/* Info Category */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Info className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.byCategory?.info ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Info</p>
            </div>
          </div>
        </div>

        {/* Action Category */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.byCategory?.action ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Action</p>
            </div>
          </div>
        </div>

        {/* Urgent Category */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.byCategory?.urgent ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Urgent</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tickets Table Card */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border">
        {/* Card Header */}
        <div className="p-6 border-b">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Support Tickets</h2>
              <p className="text-sm text-muted-foreground">Your most recent support tickets list</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Category Filter */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <button
                  onClick={() => setCategoryFilter("all")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                    categoryFilter === "all"
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  All
                </button>
                <button
                  onClick={() => setCategoryFilter("info")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1",
                    categoryFilter === "info"
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Info className="h-3 w-3" />
                  Info
                </button>
                <button
                  onClick={() => setCategoryFilter("action")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1",
                    categoryFilter === "action"
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <AlertCircle className="h-3 w-3" />
                  Action
                </button>
                <button
                  onClick={() => setCategoryFilter("urgent")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1",
                    categoryFilter === "urgent"
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <AlertTriangle className="h-3 w-3" />
                  Urgent
                </button>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                    statusFilter === "all"
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter("resolved")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                    statusFilter === "resolved"
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Solved
                </button>
                <button
                  onClick={() => setStatusFilter("pending")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                    statusFilter === "pending"
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Pending
                </button>
              </div>

              {/* Search */}
              <div className="relative w-40">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              {/* Filter Button */}
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="px-6 py-3 bg-primary/5 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {selectedIds.size} ticket(s) selected
              </span>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => bulkUpdateStatus('resolved')}
                disabled={bulkProcessing}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Mark as Solved
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => bulkUpdateStatus('closed')}
                disabled={bulkProcessing}
              >
                <Archive className="h-4 w-4 mr-2" />
                Close
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={bulkDelete}
                disabled={bulkProcessing}
              >
                {bulkProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                    className={cn(isSomeSelected && "data-[state=checked]:bg-primary/50")}
                  />
                </TableHead>
                <TableHead className="w-[100px]">Ticket ID</TableHead>
                <TableHead className="w-[80px]">Type</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="w-[110px]">Create Date</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : conversations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex flex-col items-center">
                      <MessageSquare className="h-8 w-8 mb-2 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No tickets found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                conversations.map((conv) => {
                  const customerName = getCustomerName(conv)
                  const isSelected = selectedIds.has(conv.id)
                  const catConfig = categoryConfig[conv.category] || categoryConfig.action
                  const CategoryIcon = catConfig.icon

                  return (
                    <TableRow
                      key={conv.id}
                      className={cn(
                        "cursor-pointer transition-colors",
                        isSelected && "bg-primary/5"
                      )}
                      onClick={() => handleTicketClick(conv)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(conv.id)}
                          aria-label={`Select ticket ${getTicketId(conv.id)}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center gap-2">
                          {conv.unreadCount && conv.unreadCount > 0 && (
                            <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                          <span>{getTicketId(conv.id)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("text-xs font-medium border-0 gap-1", catConfig.badgeClass)}
                        >
                          <CategoryIcon className="h-3 w-3" />
                          {catConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 flex-shrink-0">
                            <AvatarImage src={conv.user?.profileImage || undefined} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                              {getInitials(customerName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                              {customerName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {conv.user?.email || conv.guestEmail || ''}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[250px]">
                          {conv.subject}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(conv.createdAt), "dd MMM, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-medium border-0",
                            conv.status === 'resolved' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                            conv.status === 'pending' && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                            conv.status === 'open' && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                            conv.status === 'closed' && "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                          )}
                        >
                          {statusConfig[conv.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleTicketClick(conv)}>
                              <Eye className="h-4 w-4 mr-2" />
                              {conv.category === 'info' ? 'View Details' : 'Open Chat'}
                            </DropdownMenuItem>
                            {conv.category !== 'info' && (
                              <DropdownMenuItem onClick={() => openTicket(conv.id)}>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Reply
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => deleteTicket(conv.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {conversations.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} to {Math.min(currentPage * itemsPerPage, stats.total)} of {stats.total}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages || 1) }, (_, i) => {
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              )
            })}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(p => Math.min(totalPages || 1, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Info Overlay */}
      <InfoOverlay
        isOpen={showInfoOverlay}
        onClose={() => {
          setShowInfoOverlay(false)
          setSelectedInfoNotification(null)
        }}
        notification={selectedInfoNotification}
      />

      {/* New Ticket Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* User Search */}
            <div className="space-y-2">
              <Label>Select a customer</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9"
                />
                {searchingUsers && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Search Results */}
              {userSearchResults.length > 0 && !selectedUser && (
                <div className="border rounded-md max-h-40 overflow-y-auto">
                  {userSearchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        setSelectedUser(user)
                        setUserSearch('')
                        setUserSearchResults([])
                      }}
                      className="w-full p-2 text-left hover:bg-muted flex items-center gap-2"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.profileImage || undefined} />
                        <AvatarFallback className="text-xs">
                          {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected User */}
              {selectedUser && (
                <div className="border rounded-md p-3 bg-muted/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedUser.profileImage || undefined} />
                      <AvatarFallback>
                        {selectedUser.firstName?.charAt(0)}{selectedUser.lastName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {selectedUser.firstName} {selectedUser.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
                    Remove
                  </Button>
                </div>
              )}
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Ticket subject..."
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Initial Message</Label>
              <Textarea
                id="message"
                placeholder="Describe the issue..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={createConversation}
              disabled={creatingConversation || !selectedUser || !newSubject.trim() || !newMessage.trim()}
            >
              {creatingConversation ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Ticket
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
