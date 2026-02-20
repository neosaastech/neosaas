"use client"

import { useEffect, useState, useRef } from "react"
import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import {
  MessageCircle,
  X,
  Send,
  Minus,
  ArrowLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useUser } from "@/lib/contexts/user-context"

interface ChatMessage {
  id: string
  conversationId: string
  senderType: 'guest' | 'user' | 'admin' | 'system'
  senderName?: string
  content: string
  messageType: string
  createdAt: string
}

interface ChatConversation {
  id: string
  subject: string
  status: string
  lastMessageAt: string
  messages?: ChatMessage[]
}

interface GuestInfo {
  email: string
  name: string
  sessionId: string
}

const STORAGE_KEY = 'chat_guest_session'

export function ChatWidget() {
  const { user, isLoading: userLoading } = useUser()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [view, setView] = useState<'welcome' | 'form' | 'chat' | 'list'>('welcome')
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [guestInfo, setGuestInfo] = useState<GuestInfo | null>(null)
  const [guestEmail, setGuestEmail] = useState("")
  const [guestName, setGuestName] = useState("")
  const [subject, setSubject] = useState("")
  const [initialMessage, setInitialMessage] = useState("")
  const [creating, setCreating] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load guest session from storage
  useEffect(() => {
    if (!user && !userLoading) {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setGuestInfo(parsed)
        } catch (e) {
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    }
  }, [user, userLoading])

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      let url = '/api/chat/conversations'
      if (!user && guestInfo?.sessionId) {
        url += `?guestSessionId=${guestInfo.sessionId}`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setConversations(data.data)
        if (data.data.length > 0 && !selectedConversation) {
          // Auto-select first conversation
          setView('list')
        }
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error)
    }
  }

  // Fetch messages
  const fetchMessages = async (conversationId: string) => {
    try {
      let url = `/api/chat/conversations/${conversationId}/messages`
      if (!user && guestInfo?.sessionId) {
        url += `?guestSessionId=${guestInfo.sessionId}`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setMessages(data.data)
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error)
    }
  }

  // Create new conversation
  const createConversation = async () => {
    if (!subject.trim() || !initialMessage.trim()) return
    if (!user && (!guestEmail.trim() || !guestName.trim())) return

    setCreating(true)
    try {
      const body: any = {
        subject: subject.trim(),
        message: initialMessage.trim(),
      }

      if (!user) {
        body.guestEmail = guestEmail.trim()
        body.guestName = guestName.trim()
      }

      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()
      if (data.success) {
        // Save guest session
        if (!user && data.data.guestSessionId) {
          const newGuestInfo = {
            email: guestEmail.trim(),
            name: guestName.trim(),
            sessionId: data.data.guestSessionId,
          }
          setGuestInfo(newGuestInfo)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newGuestInfo))
        }

        setSelectedConversation(data.data.conversation)
        setMessages([data.data.message])
        setView('chat')
        setSubject("")
        setInitialMessage("")
        setGuestEmail("")
        setGuestName("")
      }
    } catch (error) {
      console.error("Failed to create conversation:", error)
    } finally {
      setCreating(false)
    }
  }

  // Send message
  const sendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return

    setSending(true)
    try {
      const body: any = { content: newMessage.trim() }
      if (!user && guestInfo?.sessionId) {
        body.guestSessionId = guestInfo.sessionId
      }

      const response = await fetch(`/api/chat/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()
      if (data.success) {
        setMessages(prev => [...prev, data.data])
        setNewMessage("")
      }
    } catch (error) {
      console.error("Failed to send message:", error)
    } finally {
      setSending(false)
    }
  }

  // Poll for new messages
  useEffect(() => {
    if (isOpen && (user || guestInfo)) {
      fetchConversations()
      const interval = setInterval(() => {
        if (selectedConversation) {
          fetchMessages(selectedConversation.id)
        } else {
          fetchConversations()
        }
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [isOpen, user, guestInfo, selectedConversation?.id])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id)
    }
  }, [selectedConversation?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Determine initial view
  useEffect(() => {
    if (isOpen) {
      if (user) {
        if (conversations.length > 0) {
          setView('list')
        } else {
          setView('form')
        }
      } else if (guestInfo) {
        if (conversations.length > 0) {
          setView('list')
        } else {
          setView('form')
        }
      } else {
        setView('welcome')
      }
    }
  }, [isOpen, user, guestInfo, conversations.length])

  const handleStartChat = () => {
    if (user) {
      setView('form')
    } else if (guestInfo) {
      setView('form')
    } else {
      setView('form')
    }
  }

  const selectConversation = (conv: ChatConversation) => {
    setSelectedConversation(conv)
    setView('chat')
  }

  if (userLoading) return null

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => {
          setIsOpen(true)
          setIsMinimized(false)
        }}
        className={cn(
          "fixed bottom-6 right-6 z-50 p-4 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform",
          isOpen && "hidden"
        )}
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 w-[380px] bg-background border rounded-lg shadow-xl overflow-hidden transition-all",
            isMinimized ? "h-14" : "h-[500px]"
          )}
        >
          {/* Header */}
          <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <span className="font-semibold">Support Chat</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => {
                  setIsOpen(false)
                  setSelectedConversation(null)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          {!isMinimized && (
            <div className="h-[calc(100%-56px)] flex flex-col">
              {/* Welcome View */}
              {view === 'welcome' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Welcome!</h3>
                  <p className="text-muted-foreground text-sm mb-6">
                    We're here to help. Start a conversation with our team.
                  </p>
                  <Button onClick={handleStartChat} className="w-full">
                    Start a conversation
                  </Button>
                </div>
              )}

              {/* Form View */}
              {view === 'form' && (
                <div className="flex-1 p-4 overflow-y-auto">
                  <div className="space-y-4">
                    {!user && !guestInfo && (
                      <>
                        <div>
                          <Label htmlFor="guest-name">Your name</Label>
                          <Input
                            id="guest-name"
                            placeholder="John Doe"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="guest-email">Your email</Label>
                          <Input
                            id="guest-email"
                            type="email"
                            placeholder="john@example.com"
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                          />
                        </div>
                      </>
                    )}
                    <div>
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        placeholder="What do you need help with?"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        placeholder="Describe your request..."
                        value={initialMessage}
                        onChange={(e) => setInitialMessage(e.target.value)}
                        className="min-h-[100px]"
                      />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Button
                      onClick={createConversation}
                      disabled={creating || !subject.trim() || !initialMessage.trim() || (!user && !guestInfo && (!guestEmail.trim() || !guestName.trim()))}
                      className="w-full"
                    >
                      {creating ? "Sending..." : "Send"}
                    </Button>
                    {conversations.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => setView('list')}
                        className="w-full"
                      >
                        View my conversations
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Conversations List */}
              {view === 'list' && (
                <div className="flex-1 flex flex-col">
                  <div className="p-3 border-b">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setView('form')}
                      className="w-full"
                    >
                      + New conversation
                    </Button>
                  </div>
                  <ScrollArea className="flex-1">
                    {conversations.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground">
                        <p>No conversations</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {conversations.map((conv) => (
                          <button
                            key={conv.id}
                            onClick={() => selectConversation(conv)}
                            className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
                          >
                            <p className="font-medium text-sm truncate">{conv.subject}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(conv.lastMessageAt), "MMM d 'at' HH:mm", { locale: enUS })}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}

              {/* Chat View */}
              {view === 'chat' && selectedConversation && (
                <>
                  {/* Chat Header */}
                  <div className="p-3 border-b flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setSelectedConversation(null)
                        setView('list')
                      }}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-medium text-sm truncate">
                      {selectedConversation.subject}
                    </span>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-3">
                    <div className="space-y-3">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            "flex",
                            message.senderType === 'admin' ? "justify-start" : "justify-end"
                          )}
                        >
                          {message.messageType === 'system' ? (
                            <div className="text-center text-xs text-muted-foreground py-1 w-full">
                              {message.content}
                            </div>
                          ) : (
                            <div className={cn(
                              "max-w-[80%] rounded-lg p-2.5",
                              message.senderType === 'admin'
                                ? "bg-muted"
                                : "bg-primary text-primary-foreground"
                            )}>
                              {message.senderType === 'admin' && message.senderName && (
                                <p className="text-xs font-medium mb-1">{message.senderName}</p>
                              )}
                              <p className="text-sm">{message.content}</p>
                              <p className={cn(
                                "text-[10px] mt-1",
                                message.senderType === 'admin'
                                  ? "text-muted-foreground"
                                  : "text-primary-foreground/70"
                              )}>
                                {format(new Date(message.createdAt), "HH:mm")}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Message Input */}
                  {selectedConversation.status !== 'closed' && (
                    <div className="p-3 border-t">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Your message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              sendMessage()
                            }
                          }}
                        />
                        <Button
                          size="icon"
                          onClick={sendMessage}
                          disabled={sending || !newMessage.trim()}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}
