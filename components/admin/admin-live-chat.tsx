"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { format, isToday, isYesterday, isThisWeek } from "date-fns"
import { enUS } from "date-fns/locale"
import {
  MessageCircle,
  X,
  Send,
  Minimize2,
  Maximize2,
  Search,
  User,
  Circle,
  ChevronLeft,
  Loader2,
  UserPlus,
  MoreVertical,
  Trash2,
  Archive,
  Phone,
  Mail,
  Building2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useUser } from "@/lib/contexts/user-context"

interface ChatMessage {
  id: string
  conversationId: string
  senderId?: string
  senderType: 'guest' | 'user' | 'admin' | 'system'
  senderName?: string
  senderEmail?: string
  content: string
  messageType: string
  isRead: boolean
  createdAt: string
}

interface ChatConversation {
  id: string
  userId?: string
  guestEmail?: string
  guestName?: string
  subject: string
  status: 'open' | 'pending' | 'resolved' | 'closed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  assignedAdminId?: string
  lastMessageAt: string
  createdAt: string
  user?: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone?: string
    profileImage?: string
    company?: {
      name: string
    }
  }
  unreadCount?: number
}

interface UserOption {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  profileImage?: string
  company?: {
    name: string
  }
}

const statusColors = {
  open: "bg-blue-500",
  pending: "bg-amber-500",
  resolved: "bg-green-500",
  closed: "bg-gray-500",
}

const priorityColors = {
  low: "bg-gray-400",
  normal: "bg-blue-400",
  high: "bg-orange-500",
  urgent: "bg-red-500",
}

export function AdminLiveChat() {
  const { user: currentAdmin } = useUser()
  const [isOpen, setIsOpen] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [view, setView] = useState<'list' | 'chat' | 'new'>('list')
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // New conversation state
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [userSearch, setUserSearch] = useState("")
  const [userSearchResults, setUserSearchResults] = useState<UserOption[]>([])
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null)
  const [newSubject, setNewSubject] = useState("")
  const [newInitialMessage, setNewInitialMessage] = useState("")
  const [creatingConversation, setCreatingConversation] = useState(false)
  const [searchingUsers, setSearchingUsers] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLTextAreaElement>(null)

  // Format message timestamp
  const formatMessageTimestamp = (dateStr: string) => {
    const date = new Date(dateStr)
    if (isToday(date)) {
      return format(date, "HH:mm", { locale: enUS })
    } else if (isYesterday(date)) {
      return `Yesterday at ${format(date, "HH:mm", { locale: enUS })}`
    } else if (isThisWeek(date)) {
      return format(date, "EEEE 'at' HH:mm", { locale: enUS })
    } else {
      return format(date, "d MMM yyyy 'at' HH:mm", { locale: enUS })
    }
  }

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/chat')
      const data = await response.json()

      if (data.success) {
        setConversations(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch messages
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/admin/chat/${conversationId}/messages`)
      const data = await response.json()

      if (data.success) {
        setMessages(data.data || [])
        // Mark as read
        await fetch(`/api/admin/chat/${conversationId}/read`, { method: 'POST' })
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error)
    }
  }, [])

  // Search users
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

  // Create new conversation
  const createConversation = async () => {
    if (!selectedUser || !newSubject.trim() || !newInitialMessage.trim()) return

    setCreatingConversation(true)
    try {
      const response = await fetch('/api/admin/chat/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          subject: newSubject.trim(),
          message: newInitialMessage.trim(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Conversation created successfully")
        setShowNewDialog(false)
        setSelectedUser(null)
        setNewSubject("")
        setNewInitialMessage("")
        setUserSearch("")
        setUserSearchResults([])

        // Select the new conversation
        await fetchConversations()
        if (data.data?.conversation) {
          setSelectedConversation(data.data.conversation)
          setMessages([data.data.message])
          setView('chat')
        }
      } else {
        toast.error(data.error || "Failed to create conversation")
      }
    } catch (error) {
      console.error("Failed to create conversation:", error)
      toast.error("Connection error")
    } finally {
      setCreatingConversation(false)
    }
  }

  // Send message
  const sendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return

    setSending(true)
    try {
      const response = await fetch(`/api/admin/chat/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage.trim() }),
      })

      const data = await response.json()

      if (data.success) {
        setMessages(prev => [...prev, data.data])
        setNewMessage("")
        messageInputRef.current?.focus()
      } else {
        toast.error("Failed to send message")
      }
    } catch (error) {
      console.error("Failed to send message:", error)
      toast.error("Connection error")
    } finally {
      setSending(false)
    }
  }

  // Close conversation
  const closeConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      })

      if (response.ok) {
        toast.success("Conversation closed")
        if (selectedConversation?.id === conversationId) {
          setSelectedConversation(null)
          setView('list')
        }
        fetchConversations()
      }
    } catch (error) {
      toast.error("Failed to close conversation")
    }
  }

  // Effects
  useEffect(() => {
    if (isOpen) {
      fetchConversations()
      const interval = setInterval(fetchConversations, 15000)
      return () => clearInterval(interval)
    }
  }, [isOpen, fetchConversations])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id)
      const interval = setInterval(() => fetchMessages(selectedConversation.id), 5000)
      return () => clearInterval(interval)
    }
  }, [selectedConversation?.id, fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(userSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [userSearch, searchUsers])

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true
    const search = searchQuery.toLowerCase()
    const userName = conv.user
      ? `${conv.user.firstName} ${conv.user.lastName}`.toLowerCase()
      : (conv.guestName || '').toLowerCase()
    const email = (conv.user?.email || conv.guestEmail || '').toLowerCase()
    return userName.includes(search) || email.includes(search) || conv.subject.toLowerCase().includes(search)
  })

  // Get user display name
  const getUserName = (conv: ChatConversation) => {
    if (conv.user) {
      return `${conv.user.firstName} ${conv.user.lastName}`.trim()
    }
    return conv.guestName || 'Visitor'
  }

  const getUserInitials = (conv: ChatConversation) => {
    if (conv.user) {
      return `${conv.user.firstName?.charAt(0) || ''}${conv.user.lastName?.charAt(0) || ''}`.toUpperCase()
    }
    return conv.guestName?.charAt(0)?.toUpperCase() || 'V'
  }

  // Calculate total unread
  const totalUnread = conversations.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0)

  return (
    <>
      {/* Floating Chat Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setIsOpen(true)}
              className={cn(
                "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg",
                "bg-primary hover:bg-primary/90 text-primary-foreground",
                "transition-all hover:scale-105",
                isOpen && "hidden"
              )}
            >
              <MessageCircle className="h-6 w-6" />
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Live Chat</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Chat Window */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-50 bg-background border rounded-lg shadow-2xl overflow-hidden transition-all duration-300",
            isMaximized
              ? "inset-4 md:inset-8"
              : "bottom-6 right-6 w-[420px] h-[600px]"
          )}
        >
          {/* Header */}
          <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {view === 'chat' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
                  onClick={() => {
                    setSelectedConversation(null)
                    setView('list')
                  }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}
              <MessageCircle className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">
                  {view === 'chat' && selectedConversation
                    ? getUserName(selectedConversation)
                    : 'Chat Admin'}
                </h3>
                {view === 'list' && (
                  <p className="text-xs text-primary-foreground/70">
                    {conversations.filter(c => c.status === 'open').length} active conversations
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* New Conversation Button */}
              <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>New Conversation</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* User Search */}
                    <div className="space-y-2">
                      <Label>Select a client</Label>
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedUser(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Subject */}
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        placeholder="Conversation subject..."
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                      />
                    </div>

                    {/* Message */}
                    <div className="space-y-2">
                      <Label htmlFor="message">Initial message</Label>
                      <Textarea
                        id="message"
                        placeholder="Write your message..."
                        value={newInitialMessage}
                        onChange={(e) => setNewInitialMessage(e.target.value)}
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
                      disabled={creatingConversation || !selectedUser || !newSubject.trim() || !newInitialMessage.trim()}
                    >
                      {creatingConversation ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Maximize/Minimize */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => setIsMaximized(!isMaximized)}
              >
                {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>

              {/* Close */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => {
                  setIsOpen(false)
                  setSelectedConversation(null)
                  setView('list')
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="h-[calc(100%-52px)] flex flex-col">
            {/* Conversations List */}
            {view === 'list' && (
              <>
                {/* Search */}
                <div className="p-3 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search a conversation..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* List */}
                <ScrollArea className="flex-1">
                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                      <MessageCircle className="h-8 w-8 mb-2 opacity-20" />
                      <p className="text-sm">No conversations</p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setShowNewDialog(true)}
                        className="mt-2"
                      >
                        Start a new conversation
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredConversations.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => {
                            setSelectedConversation(conv)
                            setView('chat')
                          }}
                          className={cn(
                            "w-full p-3 text-left hover:bg-muted/50 transition-colors",
                            conv.unreadCount && conv.unreadCount > 0 && "bg-blue-50/50 dark:bg-blue-900/10"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className="relative">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={conv.user?.profileImage || undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {getUserInitials(conv)}
                                </AvatarFallback>
                              </Avatar>
                              <span
                                className={cn(
                                  "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
                                  statusColors[conv.status]
                                )}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className={cn(
                                  "font-medium truncate",
                                  conv.unreadCount && conv.unreadCount > 0 && "text-foreground"
                                )}>
                                  {getUserName(conv)}
                                </p>
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                  {format(new Date(conv.lastMessageAt), "HH:mm")}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {conv.subject}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] h-5",
                                    conv.status === 'open' && "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
                                    conv.status === 'pending' && "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
                                    conv.status === 'resolved' && "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400",
                                    conv.status === 'closed' && "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                                  )}
                                >
                                  {conv.status === 'open' ? 'Open' :
                                   conv.status === 'pending' ? 'Pending' :
                                   conv.status === 'resolved' ? 'Resolved' : 'Closed'}
                                </Badge>
                                {conv.unreadCount && conv.unreadCount > 0 && (
                                  <Badge variant="default" className="h-5 text-[10px] bg-primary">
                                    {conv.unreadCount}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </>
            )}

            {/* Chat View */}
            {view === 'chat' && selectedConversation && (
              <>
                {/* User Info Bar */}
                <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={selectedConversation.user?.profileImage || undefined} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getUserInitials(selectedConversation)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{selectedConversation.subject}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {selectedConversation.user?.email || selectedConversation.guestEmail}
                        {selectedConversation.user?.company && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {selectedConversation.user.company.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {selectedConversation.user?.email && (
                        <DropdownMenuItem asChild>
                          <a href={`mailto:${selectedConversation.user.email}`}>
                            <Mail className="h-4 w-4 mr-2" />
                            Send an email
                          </a>
                        </DropdownMenuItem>
                      )}
                      {selectedConversation.user?.phone && (
                        <DropdownMenuItem asChild>
                          <a href={`tel:${selectedConversation.user.phone}`}>
                            <Phone className="h-4 w-4 mr-2" />
                            Call
                          </a>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => closeConversation(selectedConversation.id)}
                        className="text-destructive"
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Close conversation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const isAdmin = message.senderType === 'admin'
                      const isSystem = message.messageType === 'system'

                      if (isSystem) {
                        return (
                          <div key={message.id} className="text-center">
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                              {message.content}
                            </span>
                          </div>
                        )
                      }

                      return (
                        <div
                          key={message.id}
                          className={cn("flex", isAdmin ? "justify-end" : "justify-start")}
                        >
                          <div
                            className={cn(
                              "max-w-[75%] rounded-lg p-3",
                              isAdmin
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            )}
                          >
                            {!isAdmin && message.senderName && (
                              <p className="text-xs font-medium mb-1 text-muted-foreground">
                                {message.senderName}
                              </p>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <p
                              className={cn(
                                "text-[10px] mt-1",
                                isAdmin ? "text-primary-foreground/70" : "text-muted-foreground"
                              )}
                            >
                              {formatMessageTimestamp(message.createdAt)}
                              {isAdmin && message.isRead && " · Read"}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                {selectedConversation.status !== 'closed' && (
                  <div className="p-3 border-t">
                    <div className="flex gap-2">
                      <Textarea
                        ref={messageInputRef}
                        placeholder="Write your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            sendMessage()
                          }
                        }}
                        className="min-h-[60px] max-h-[120px] resize-none"
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={sending || !newMessage.trim()}
                        className="self-end"
                      >
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Closed conversation notice */}
                {selectedConversation.status === 'closed' && (
                  <div className="p-3 border-t bg-muted/50 text-center">
                    <p className="text-sm text-muted-foreground">
                      This conversation is closed
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
