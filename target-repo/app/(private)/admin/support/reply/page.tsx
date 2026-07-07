"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { format, isToday, isYesterday, isThisWeek } from "date-fns"
import { enUS } from "date-fns/locale"
import {
  ArrowLeft,
  Send,
  Paperclip,
  MoreVertical,
  Mail,
  Clock,
  CheckCircle,
  UserPlus,
  RefreshCw,
  Loader2,
  Building2,
  Archive,
  AlertCircle,
  User,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useUser } from "@/lib/contexts/user-context"
import { UserProfileOverlay } from "@/components/admin/user-profile-overlay"

// WhatsApp icon as SVG component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
)

// ============================================================================
// Types
// ============================================================================

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
  sender?: {
    id: string
    firstName: string
    lastName: string
    profileImage?: string
  }
}

interface Conversation {
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
  unreadCount?: number
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
  assignedAdmin?: {
    id: string
    firstName: string
    lastName: string
    profileImage?: string
  }
}

// ============================================================================
// Constants
// ============================================================================

const statusConfig = {
  open: {
    label: "In Progress",
    color: "bg-blue-500",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
  },
  pending: {
    label: "On Hold",
    color: "bg-amber-500",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
  },
  resolved: {
    label: "Solved",
    color: "bg-green-500",
    badgeClass: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
  },
  closed: {
    label: "Closed",
    color: "bg-gray-500",
    badgeClass: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
  },
}

const priorityConfig = {
  low: { label: "Low", color: "border-gray-300 bg-gray-50 text-gray-700" },
  normal: { label: "Normal", color: "border-blue-300 bg-blue-50 text-blue-700" },
  high: { label: "High", color: "border-orange-300 bg-orange-50 text-orange-700" },
  urgent: { label: "Urgent", color: "border-red-300 bg-red-50 text-red-700" },
}

// ============================================================================
// Helper Functions
// ============================================================================

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

// ============================================================================
// Main Component
// ============================================================================

export default function SupportReplyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ticketId = searchParams.get('id')
  const { user: currentUser } = useUser()

  // State
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Reply
  const [replyContent, setReplyContent] = useState("")
  const [sending, setSending] = useState(false)

  // User profile overlay
  const [showUserProfile, setShowUserProfile] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLTextAreaElement>(null)

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchConversation = useCallback(async (isRefresh = false) => {
    if (!ticketId) return

    try {
      if (isRefresh) setRefreshing(true)

      const response = await fetch(`/api/admin/chat/${ticketId}`)
      const data = await response.json()

      if (data.success) {
        setConversation(data.data.conversation)
        setMessages(data.data.messages || [])
        if (isRefresh) toast.success("Messages refreshed")
      } else {
        toast.error("Failed to load ticket")
        router.push('/admin/support')
      }
    } catch (error) {
      console.error("Failed to fetch conversation:", error)
      toast.error("Connection error")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [ticketId, router])

  // ============================================================================
  // Actions
  // ============================================================================

  const sendReply = async () => {
    if (!conversation || !replyContent.trim()) return

    setSending(true)
    try {
      const response = await fetch(`/api/admin/chat/${conversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent.trim() }),
      })

      const data = await response.json()
      if (data.success) {
        setMessages(prev => [...prev, data.data])
        setReplyContent("")
        messageInputRef.current?.focus()
        toast.success("Message sent")
      } else {
        toast.error("Failed to send message")
      }
    } catch (error) {
      toast.error("Connection error")
    } finally {
      setSending(false)
    }
  }

  const updateStatus = async (newStatus: string) => {
    if (!conversation) return

    try {
      const response = await fetch(`/api/admin/chat/${conversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await response.json()
      if (data.success) {
        setConversation({ ...conversation, status: newStatus as any })
        toast.success("Status updated")
      }
    } catch (error) {
      toast.error("Failed to update status")
    }
  }

  const assignToMe = async () => {
    if (!conversation || !currentUser?.id) return

    try {
      const response = await fetch(`/api/admin/chat/${conversation.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: currentUser.id }),
      })

      if (response.ok) {
        toast.success("Ticket assigned to you")
        fetchConversation()
      }
    } catch (error) {
      toast.error("Failed to assign ticket")
    }
  }

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    if (!ticketId) {
      router.push('/admin/support')
      return
    }
    fetchConversation()
    // Polling for new messages
    const interval = setInterval(() => fetchConversation(), 5000)
    return () => clearInterval(interval)
  }, [ticketId, fetchConversation, router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ============================================================================
  // Helpers
  // ============================================================================

  const getCustomerName = () => {
    if (!conversation) return ''
    if (conversation.user) {
      return `${conversation.user.firstName} ${conversation.user.lastName}`.trim()
    }
    return conversation.guestName || 'Visitor'
  }

  const getCustomerEmail = () => {
    if (!conversation) return ''
    return conversation.user?.email || conversation.guestEmail || ''
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  // ============================================================================
  // Render
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-medium">Ticket not found</h2>
        <Button className="mt-4" onClick={() => router.push('/admin/support')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tickets
        </Button>
      </div>
    )
  }

  const customerName = getCustomerName()

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push('/admin/support')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Avatar className="h-10 w-10">
                <AvatarImage src={conversation.user?.profileImage || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(customerName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    {conversation.subject}
                  </h2>
                  <Badge variant="outline" className={cn("text-xs", statusConfig[conversation.status].badgeClass)}>
                    {statusConfig[conversation.status].label}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="font-mono text-xs">#{conversation.id.slice(0, 8).toUpperCase()}</span>
                  <span>•</span>
                  <span>{customerName}</span>
                  {conversation.user?.company && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {conversation.user.company.name}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchConversation(true)}
                disabled={refreshing}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
                Refresh
              </Button>
              {!conversation.assignedAdminId && (
                <Button variant="outline" size="sm" onClick={assignToMe}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Take Ticket
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowUserProfile(true)}>
                    <User className="h-4 w-4 mr-2" />
                    View Profile
                  </DropdownMenuItem>
                  {conversation.user?.id && (
                    <DropdownMenuItem asChild>
                      <a href={`/admin/users/${conversation.user.id}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Full Profile
                      </a>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {conversation.user?.email && (
                    <DropdownMenuItem asChild>
                      <a href={`mailto:${conversation.user.email}`}>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Email
                      </a>
                    </DropdownMenuItem>
                  )}
                  {conversation.user?.phone && (
                    <DropdownMenuItem asChild>
                      <a
                        href={`https://wa.me/${conversation.user.phone.replace(/[^\d+]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600"
                      >
                        <WhatsAppIcon className="h-4 w-4 mr-2" />
                        WhatsApp
                      </a>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => updateStatus('closed')} className="text-destructive">
                    <Archive className="h-4 w-4 mr-2" />
                    Close Ticket
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-6 bg-gray-50 dark:bg-gray-950">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => {
              const isAdmin = msg.senderType === 'admin'
              const isSystem = msg.senderType === 'system'
              const senderName = isAdmin
                ? (msg.sender ? `${msg.sender.firstName} ${msg.sender.lastName}`.trim() : 'Support Team')
                : (msg.senderName || customerName)

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2 max-w-md">
                      <p className="text-sm text-amber-700 dark:text-amber-400 text-center">
                        {msg.content}
                      </p>
                      <p className="text-xs text-amber-600/70 dark:text-amber-500/70 text-center mt-1">
                        {formatMessageTimestamp(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                )
              }

              return (
                <div key={msg.id} className="flex gap-4">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage
                      src={isAdmin
                        ? msg.sender?.profileImage || undefined
                        : conversation.user?.profileImage || undefined
                      }
                    />
                    <AvatarFallback className={cn(
                      "text-sm font-medium",
                      isAdmin ? "bg-primary text-primary-foreground" : "bg-gray-100 text-gray-700"
                    )}>
                      {getInitials(senderName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {senderName}
                      </span>
                      {isAdmin && (
                        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                          Support Team
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {formatMessageTimestamp(msg.createdAt)}
                      </span>
                    </div>
                    <div className={cn(
                      "rounded-lg p-4 text-sm",
                      isAdmin
                        ? "bg-primary/5 border border-primary/10"
                        : "bg-white dark:bg-gray-800 border"
                    )}>
                      <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-200">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Reply Form */}
        {conversation.status !== 'closed' ? (
          <div className="bg-white dark:bg-gray-900 border-t p-4">
            <div className="max-w-3xl mx-auto">
              <div className="relative">
                <Textarea
                  ref={messageInputRef}
                  placeholder="Type your reply here..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="min-h-[100px] pr-24 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      sendReply()
                    }
                  }}
                />
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button onClick={sendReply} disabled={!replyContent.trim() || sending} size="sm">
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Reply
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-muted-foreground">
                  Press {typeof window !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to send
                </p>
                {/* Status Controls */}
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <RadioGroup
                    value={conversation.status}
                    onValueChange={updateStatus}
                    className="flex items-center gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="open" id="status-open" />
                      <Label htmlFor="status-open" className="text-sm cursor-pointer flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        In-Progress
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="resolved" id="status-resolved" />
                      <Label htmlFor="status-resolved" className="text-sm cursor-pointer flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        Solved
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pending" id="status-pending" />
                      <Label htmlFor="status-pending" className="text-sm cursor-pointer flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        On-Hold
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-100 dark:bg-gray-800 border-t p-4 text-center">
            <p className="text-sm text-muted-foreground">
              This ticket is closed.
              <Button variant="link" size="sm" onClick={() => updateStatus('open')} className="ml-1">
                Reopen it
              </Button>
            </p>
          </div>
        )}
      </div>

      {/* Right Sidebar - Ticket Details */}
      <div className="hidden lg:block w-80 border-l bg-white dark:bg-gray-900 overflow-y-auto">
        <div className="p-6">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-6">
            Ticket Details
          </h3>
          <div className="space-y-5">
            {/* Customer Info */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Avatar className="h-12 w-12">
                <AvatarImage src={conversation.user?.profileImage || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(customerName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {customerName}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {getCustomerEmail()}
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm text-muted-foreground mb-1">Email</p>
              <p className="font-medium text-gray-900 dark:text-white break-all text-sm">
                {getCustomerEmail()}
              </p>
            </div>
            {conversation.user?.phone && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Phone</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {conversation.user.phone}
                </p>
              </div>
            )}
            {conversation.user?.company && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Company</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {conversation.user.company.name}
                </p>
              </div>
            )}

            <Separator />

            <div>
              <p className="text-sm text-muted-foreground mb-1">Ticket ID</p>
              <p className="font-mono text-sm text-gray-900 dark:text-white">
                #{conversation.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Created</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {format(new Date(conversation.createdAt), "MMM d, yyyy 'at' HH:mm")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Last Activity</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {formatMessageTimestamp(conversation.lastMessageAt)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Priority</p>
              <Badge variant="outline" className={cn("capitalize", priorityConfig[conversation.priority].color)}>
                {conversation.priority}
              </Badge>
            </div>
            {conversation.assignedAdmin && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Assigned To</p>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={conversation.assignedAdmin.profileImage || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(`${conversation.assignedAdmin.firstName} ${conversation.assignedAdmin.lastName}`)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {`${conversation.assignedAdmin.firstName} ${conversation.assignedAdmin.lastName}`}
                  </span>
                </div>
              </div>
            )}

            <Separator />

            {/* Quick Actions */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Quick Actions</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => setShowUserProfile(true)}
              >
                <User className="h-4 w-4 mr-2" />
                View Profile
              </Button>
              {conversation.user?.email && (
                <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                  <a href={`mailto:${conversation.user.email}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </a>
                </Button>
              )}
              {conversation.user?.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                  asChild
                >
                  <a
                    href={`https://wa.me/${conversation.user.phone.replace(/[^\d+]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <WhatsAppIcon className="h-4 w-4 mr-2" />
                    WhatsApp
                  </a>
                </Button>
              )}
              {conversation.status !== 'closed' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-destructive hover:text-destructive"
                  onClick={() => updateStatus('closed')}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Close Ticket
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* User Profile Overlay */}
      <UserProfileOverlay
        isOpen={showUserProfile}
        onClose={() => setShowUserProfile(false)}
        userId={conversation.user?.id}
        userData={conversation.user ? {
          id: conversation.user.id,
          firstName: conversation.user.firstName,
          lastName: conversation.user.lastName,
          email: conversation.user.email,
          phone: conversation.user.phone,
          profileImage: conversation.user.profileImage,
          company: conversation.user.company,
        } : null}
      />
    </div>
  )
}
