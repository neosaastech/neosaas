"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { format, isToday, isYesterday } from "date-fns"
import { enUS } from "date-fns/locale"
import {
  Search,
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  ImageIcon,
  Loader2,
  Plus,
  X,
  MessageCircle,
  ExternalLink,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  content: string
  messageType: string
  isRead: boolean
  createdAt: string
  attachmentUrl?: string
}

interface Contact {
  id: string
  odiserId?: string
  guestEmail?: string
  guestName?: string
  subject: string
  status: 'open' | 'pending' | 'resolved' | 'closed'
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
    position?: string
    company?: {
      name: string
    }
  }
  lastMessage?: {
    content: string
    senderType: string
  }
}

interface UserOption {
  id: string
  firstName: string
  lastName: string
  email: string
  profileImage?: string
  company?: { name: string }
}

// ============================================================================
// Helpers
// ============================================================================

const formatMessageTime = (dateStr: string) => {
  const date = new Date(dateStr)
  if (isToday(date)) {
    return format(date, "HH:mm", { locale: enUS })
  } else if (isYesterday(date)) {
    return `Yesterday ${format(date, "HH:mm", { locale: enUS })}`
  }
  return format(date, "d MMM, HH:mm", { locale: enUS })
}

const formatContactTime = (dateStr: string) => {
  const date = new Date(dateStr)
  if (isToday(date)) {
    return format(date, "HH:mm")
  } else if (isYesterday(date)) {
    return "Yesterday"
  }
  return format(date, "d MMM")
}

// ============================================================================
// Main Component
// ============================================================================

export default function ChatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedId = searchParams.get('id')
  const { user: currentUser } = useUser()

  // State
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Message input
  const [messageContent, setMessageContent] = useState("")
  const [sending, setSending] = useState(false)

  // New conversation dialog
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [userSearch, setUserSearch] = useState("")
  const [userSearchResults, setUserSearchResults] = useState<UserOption[]>([])
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [creatingConversation, setCreatingConversation] = useState(false)
  const [searchingUsers, setSearchingUsers] = useState(false)

  // User profile overlay
  const [showUserProfile, setShowUserProfile] = useState(false)

  // File upload refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchContacts = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/chat')
      const data = await response.json()

      if (data.success) {
        const contactsList = (data.data || []).map((conv: any) => ({
          ...conv,
          lastMessage: conv.messages?.[0],
        }))
        setContacts(contactsList)
      }
    } catch (error) {
      console.error("Failed to fetch contacts:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMessages = useCallback(async (conversationId: string) => {
    setMessagesLoading(true)
    try {
      const response = await fetch(`/api/admin/chat/${conversationId}`)
      const data = await response.json()

      if (data.success) {
        setSelectedContact(data.data.conversation)
        setMessages(data.data.messages || [])
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error)
    } finally {
      setMessagesLoading(false)
    }
  }, [])

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setUserSearchResults([])
      return
    }

    setSearchingUsers(true)
    try {
      const response = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}&limit=10`)
      const data = await response.json()

      if (data.success) {
        setUserSearchResults(data.data || [])
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

  const selectContact = (contact: Contact) => {
    router.push(`/admin/chat?id=${contact.id}`, { scroll: false })
  }

  const sendMessage = async () => {
    if (!selectedContact || !messageContent.trim()) return

    setSending(true)
    try {
      const response = await fetch(`/api/admin/chat/${selectedContact.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messageContent.trim() }),
      })

      const data = await response.json()
      if (data.success) {
        setMessages(prev => [...prev, data.data])
        setMessageContent("")
        inputRef.current?.focus()
        fetchContacts()
      }
    } catch (error) {
      toast.error("Failed to send message")
    } finally {
      setSending(false)
    }
  }

  const createConversation = async () => {
    if (!selectedUser || !newMessage.trim()) return

    setCreatingConversation(true)
    try {
      const response = await fetch('/api/admin/chat/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          subject: `Chat with ${selectedUser.firstName} ${selectedUser.lastName}`,
          message: newMessage.trim(),
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast.success("Conversation started")
        setShowNewDialog(false)
        setSelectedUser(null)
        setNewMessage("")
        setUserSearch("")
        setUserSearchResults([])
        await fetchContacts()
        if (data.data?.conversation?.id) {
          router.push(`/admin/chat?id=${data.data.conversation.id}`)
        }
      } else {
        toast.error(data.error || "Failed to start conversation")
      }
    } catch (error) {
      toast.error("Connection error")
    } finally {
      setCreatingConversation(false)
    }
  }

  // Emoji picker handler
  const handleEmojiClick = () => {
    // Insert a common emoji - could be expanded to a full emoji picker later
    const emojis = ['😊', '👍', '❤️', '🎉', '✅', '🙏', '💬', '📞']
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]
    setMessageContent(prev => prev + randomEmoji)
    inputRef.current?.focus()
  }

  // File attachment handler
  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB.")
      return
    }

    // For now, show a toast - file upload to be implemented with proper storage
    toast.info(`File "${file.name}" selected. File upload feature coming soon!`)

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Image upload handler
  const handleImageClick = () => {
    imageInputRef.current?.click()
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file.")
      return
    }

    // Check file size (max 5MB for images)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large. Maximum size is 5MB.")
      return
    }

    // For now, show a toast - image upload to be implemented with proper storage
    toast.info(`Image "${file.name}" selected. Image upload feature coming soon!`)

    // Reset input
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    fetchContacts()
    const interval = setInterval(fetchContacts, 15000)
    return () => clearInterval(interval)
  }, [fetchContacts])

  useEffect(() => {
    if (selectedId) {
      fetchMessages(selectedId)
      const interval = setInterval(() => fetchMessages(selectedId), 5000)
      return () => clearInterval(interval)
    } else {
      setSelectedContact(null)
      setMessages([])
    }
  }, [selectedId, fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const timer = setTimeout(() => searchUsers(userSearch), 300)
    return () => clearTimeout(timer)
  }, [userSearch, searchUsers])

  // ============================================================================
  // Helpers
  // ============================================================================

  const getContactName = (contact: Contact) => {
    if (contact.user) {
      return `${contact.user.firstName} ${contact.user.lastName}`.trim()
    }
    return contact.guestName || 'Visitor'
  }

  const getContactRole = (contact: Contact) => {
    if (contact.user?.position) return contact.user.position
    if (contact.user?.company?.name) return contact.user.company.name
    return contact.user?.email || contact.guestEmail || ''
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const filteredContacts = contacts.filter(contact => {
    if (!searchQuery) return true
    const name = getContactName(contact).toLowerCase()
    const role = getContactRole(contact).toLowerCase()
    return name.includes(searchQuery.toLowerCase()) || role.includes(searchQuery.toLowerCase())
  })

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="border-b bg-white dark:bg-gray-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Chats</h1>
            <p className="text-sm text-muted-foreground">Home &gt; Chats</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden bg-gray-50 dark:bg-gray-950">
        {/* Left Panel - Contacts List */}
        <div className="w-80 border-r bg-white dark:bg-gray-900 flex flex-col">
          {/* Header with New Button */}
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-lg">Chats</h2>
            <Button variant="ghost" size="icon" onClick={() => setShowNewDialog(true)}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-gray-50 dark:bg-gray-800 border-0"
              />
            </div>
          </div>

          {/* Contacts List */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground p-4">
                <MessageCircle className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">No conversations</p>
                <Button variant="link" size="sm" onClick={() => setShowNewDialog(true)}>
                  Start a new chat
                </Button>
              </div>
            ) : (
              <div>
                {filteredContacts.map((contact) => {
                  const isSelected = selectedId === contact.id
                  const contactName = getContactName(contact)
                  const contactRole = getContactRole(contact)
                  const isOnline = contact.status === 'open'

                  return (
                    <button
                      key={contact.id}
                      onClick={() => selectContact(contact)}
                      className={cn(
                        "w-full p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3",
                        isSelected && "bg-gray-100 dark:bg-gray-800"
                      )}
                    >
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={contact.user?.profileImage || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(contactName)}
                          </AvatarFallback>
                        </Avatar>
                        {/* Online indicator */}
                        <span className={cn(
                          "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-gray-900",
                          isOnline ? "bg-green-500" : "bg-gray-400"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 dark:text-white truncate">
                            {contactName}
                          </span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                            {formatContactTime(contact.lastMessageAt)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {contactRole}
                        </p>
                      </div>
                      {contact.unreadCount && contact.unreadCount > 0 && (
                        <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                          {contact.unreadCount}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Panel - Chat Window */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
          {!selectedId ? (
            // No conversation selected
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Select a conversation</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose a contact to start chatting
                </p>
                <Button className="mt-4" onClick={() => setShowNewDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Chat
                </Button>
              </div>
            </div>
          ) : messagesLoading && !selectedContact ? (
            // Loading
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedContact ? (
            <>
              {/* Chat Header */}
              <div className="border-b px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedContact.user?.profileImage || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(getContactName(selectedContact))}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {getContactName(selectedContact)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {getContactRole(selectedContact)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* WhatsApp Button */}
                  {selectedContact.user?.phone && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                      asChild
                    >
                      <a
                        href={`https://wa.me/${selectedContact.user.phone.replace(/[^\d+]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Contact via WhatsApp"
                      >
                        <WhatsAppIcon className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  {/* View Profile Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowUserProfile(true)}
                    title="View Profile"
                  >
                    <User className="h-4 w-4" />
                  </Button>
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
                      {selectedContact.user?.id && (
                        <DropdownMenuItem asChild>
                          <a href={`/admin/users/${selectedContact.user.id}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open Full Profile
                          </a>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-destructive">Block</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Messages Area */}
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-4 max-w-4xl mx-auto">
                  {messages.map((msg) => {
                    const isAdmin = msg.senderType === 'admin'
                    const isSystem = msg.senderType === 'system'

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center">
                          <span className="text-xs text-muted-foreground bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                            {msg.content}
                          </span>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={msg.id}
                        className={cn("flex", isAdmin ? "justify-end" : "justify-start")}
                      >
                        <div className="flex items-end gap-2 max-w-[70%]">
                          {!isAdmin && (
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarImage src={selectedContact.user?.profileImage || undefined} />
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {getInitials(getContactName(selectedContact))}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div>
                            <div
                              className={cn(
                                "rounded-2xl px-4 py-2.5",
                                isAdmin
                                  ? "bg-primary text-primary-foreground rounded-br-md"
                                  : "bg-gray-100 dark:bg-gray-800 rounded-bl-md"
                              )}
                            >
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              {msg.attachmentUrl && msg.messageType === 'image' && (
                                <img
                                  src={msg.attachmentUrl}
                                  alt="Attachment"
                                  className="mt-2 rounded-lg max-w-full"
                                />
                              )}
                            </div>
                            <p className={cn(
                              "text-xs text-muted-foreground mt-1",
                              isAdmin ? "text-right" : "text-left"
                            )}>
                              {!isAdmin && <span>{msg.senderName || getContactName(selectedContact)}, </span>}
                              {formatMessageTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="border-t p-4">
                <div className="flex items-center gap-3 max-w-4xl mx-auto">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={handleEmojiClick}
                    title="Add emoji"
                  >
                    <Smile className="h-5 w-5" />
                  </Button>
                  <Input
                    ref={inputRef}
                    placeholder="Type a message"
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    className="flex-1 bg-gray-50 dark:bg-gray-800 border-0"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={handleFileClick}
                    title="Attach file"
                  >
                    <Paperclip className="h-5 w-5" />
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={handleImageClick}
                    title="Send image"
                  >
                    <ImageIcon className="h-5 w-5" />
                  </Button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleImageChange}
                    accept="image/*"
                  />
                  <Button
                    size="icon"
                    onClick={sendMessage}
                    disabled={!messageContent.trim() || sending}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* User Profile Overlay */}
      <UserProfileOverlay
        isOpen={showUserProfile}
        onClose={() => setShowUserProfile(false)}
        userId={selectedContact?.user?.id}
        userData={selectedContact?.user ? {
          id: selectedContact.user.id,
          firstName: selectedContact.user.firstName,
          lastName: selectedContact.user.lastName,
          email: selectedContact.user.email,
          phone: selectedContact.user.phone,
          profileImage: selectedContact.user.profileImage,
          company: selectedContact.user.company,
        } : null}
      />

      {/* New Conversation Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Chat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* User Search */}
            <div className="space-y-2">
              <Label>Search for a user</Label>
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
                  <Button variant="ghost" size="icon" onClick={() => setSelectedUser(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Type your message..."
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
              disabled={creatingConversation || !selectedUser || !newMessage.trim()}
            >
              {creatingConversation ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Start Chat
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
