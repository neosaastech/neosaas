"use client"

import { useEffect, useState } from "react"
import { Bell, Package, Calendar, CreditCard, User, MessageSquare, Settings, CheckCircle, Info, Clock, Download, ExternalLink, Truck, FileCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Notification {
  id: string
  type: 'order' | 'payment' | 'user' | 'support' | 'system'
  title: string
  description: string
  timestamp: string
  isRead: boolean
  actionRequired: boolean
  metadata?: {
    userId?: string
    userName?: string
    userEmail?: string
    userImage?: string
    orderId?: string
    conversationId?: string
    notificationType?: string
    // Order specific
    formattedAmount?: string
    productLabel?: string
    hasDigital?: boolean
    hasPhysical?: boolean
    viewLink?: string
    items?: Array<{
      name: string
      type: string
      quantity: number
      price: number
      productId?: string
    }>
    // Conversation specific
    isUnassigned?: boolean
    priority?: string
    status?: string
    [key: string]: any
  }
}

interface NotificationStats {
  total: number
  unread: number
  actionRequired: number
  byType: Record<string, number>
}

const typeConfig = {
  order: { icon: Package, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'Orders' },
  payment: { icon: CreditCard, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', label: 'Payments' },
  user: { icon: User, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30', label: 'Users' },
  profile_update: { icon: User, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30', label: 'Profile Update' },
  settings: { icon: Settings, color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-900/30', label: 'Settings' },
  subscription: { icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', label: 'Subscription' },
  support: { icon: MessageSquare, color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/30', label: 'Support' },
  system: { icon: Settings, color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-900/30', label: 'System' },
}

export function NotificationBell() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    actionRequired: 0,
    byType: {}
  })
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("all")

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/admin/notifications')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setNotifications(data.notifications || [])
          setStats(data.stats || { total: 0, unread: 0, actionRequired: 0, byType: {} })
          console.log('[NotificationBell] Loaded', data.notifications?.length || 0, 'notifications')
        } else {
          console.error('[NotificationBell] API returned error:', data.error)
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('[NotificationBell] Request failed:', response.status, errorData)
      }
    } catch (error) {
      console.error('[NotificationBell] Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/admin/notifications/${notificationId}/read`, {
        method: 'POST'
      })
      fetchNotifications()
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch('/api/admin/notifications/read-all', {
        method: 'POST'
      })
      fetchNotifications()
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)
    setOpen(false)

    const meta = notification.metadata

    // Navigate based on notification type
    if (notification.type === 'support' && meta?.conversationId) {
      // Navigate to Support Reply page with the conversation ID
      router.push(`/admin/support/reply?id=${meta.conversationId}`)
    } else if (meta?.conversationId) {
      router.push(`/admin/support/reply?id=${meta.conversationId}`)
    } else if (meta?.orderId) {
      // Use viewLink if available (e.g., for digital products), otherwise go to admin order page
      router.push(`/admin/orders/${meta.orderId}`)
    } else if (notification.type === 'support') {
      router.push('/admin/chat')
    } else if (notification.type === 'order') {
      router.push('/admin/orders')
    } else if (['user', 'profile_update', 'settings', 'subscription'].includes(notification.type)) {
      // User-related notifications - go to user management or specific user
      if (meta?.userId) {
        router.push(`/admin/users/${meta.userId}`)
      } else {
        router.push('/admin/users')
      }
    } else {
      router.push('/admin/chat')
    }
  }

  const filteredNotifications = activeTab === 'all'
    ? notifications
    : activeTab === 'action'
      ? notifications.filter(n => n.actionRequired)
      : activeTab === 'user'
        // Include user-related notification types: user, profile_update, settings, subscription
        ? notifications.filter(n => ['user', 'profile_update', 'settings', 'subscription'].includes(n.type))
        : notifications.filter(n => n.type === activeTab)

  const getTypeIcon = (type: string) => {
    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.system
    const Icon = config.icon
    return <Icon className={`h-4 w-4 ${config.color}`} />
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {stats.unread > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center animate-in zoom-in duration-300">
              {stats.unread > 99 ? '99+' : stats.unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold">Notifications</h3>
            <p className="text-xs text-muted-foreground">
              {stats.unread} unread{stats.actionRequired > 0 && `, ${stats.actionRequired} require action`}
            </p>
          </div>
          {stats.unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              <CheckCircle className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Filters */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b h-auto p-1 bg-transparent">
            <TabsTrigger value="all" className="text-xs data-[state=active]:bg-muted">
              All
              {stats.total > 0 && <Badge variant="secondary" className="ml-1 h-5">{stats.total}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="action" className="text-xs data-[state=active]:bg-muted">
              Action
              {stats.actionRequired > 0 && <Badge variant="destructive" className="ml-1 h-5">{stats.actionRequired}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="order" className="text-xs data-[state=active]:bg-muted">
              Orders
              {stats.byType?.order > 0 && <Badge variant="secondary" className="ml-1 h-5">{stats.byType.order}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="support" className="text-xs data-[state=active]:bg-muted">
              Support
              {stats.byType?.support > 0 && <Badge variant="secondary" className="ml-1 h-5">{stats.byType.support}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="user" className="text-xs data-[state=active]:bg-muted">
              Users
              {(stats.byType?.user || 0) + (stats.byType?.profile_update || 0) > 0 && (
                <Badge variant="secondary" className="ml-1 h-5">
                  {(stats.byType?.user || 0) + (stats.byType?.profile_update || 0)}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="m-0">
            <ScrollArea className="h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <Bell className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredNotifications.map((notification) => {
                    const config = typeConfig[notification.type as keyof typeof typeConfig] || typeConfig.system
                    const meta = notification.metadata || {}

                    // Get appropriate icon for order type
                    const getOrderIcon = () => {
                      if (meta.hasDigital && !meta.hasPhysical) {
                        return <Download className="h-4 w-4 text-green-600" />
                      }
                      if (meta.hasPhysical) {
                        return <Truck className="h-4 w-4 text-blue-600" />
                      }
                      return getTypeIcon(notification.type)
                    }

                    // Get product type badge color
                    const getProductTypeBadge = () => {
                      if (!meta.productLabel) return null
                      const colors: Record<string, string> = {
                        'Digital': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                        'Physical': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                        'Mixed': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                      }
                      return (
                        <Badge variant="outline" className={`text-[10px] h-5 border-0 ${colors[meta.productLabel] || ''}`}>
                          {meta.productLabel}
                        </Badge>
                      )
                    }

                    return (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                          !notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          {/* User avatar or type icon */}
                          {meta.userImage || meta.userName ? (
                            <Avatar className="h-10 w-10 flex-shrink-0">
                              <AvatarImage src={meta.userImage} />
                              <AvatarFallback className={config.bg}>
                                {meta.userName?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className={`h-10 w-10 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
                              {notification.type === 'order' ? getOrderIcon() : getTypeIcon(notification.type)}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className={`text-sm font-medium ${!notification.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {meta.userName && (
                                    <span className="text-primary">{meta.userName}</span>
                                  )}{' '}
                                  {notification.title}
                                </p>
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                  {notification.description}
                                </p>
                                {/* Show amount prominently for orders */}
                                {meta.formattedAmount && (
                                  <p className="text-sm font-semibold text-brand mt-1">
                                    {meta.formattedAmount}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                {notification.actionRequired && (
                                  <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-xs flex-shrink-0">
                                    Action
                                  </Badge>
                                )}
                                {meta.hasDigital && !meta.hasPhysical && (
                                  <Badge variant="outline" className="text-[10px] h-5 bg-green-100 text-green-700 border-0 dark:bg-green-900/30 dark:text-green-400">
                                    <Download className="h-3 w-3 mr-1" />
                                    Delivered
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {getProductTypeBadge() || (
                                <Badge variant="outline" className="text-[10px] h-5">
                                  {config.label}
                                </Badge>
                              )}
                              {meta.isUnassigned && (
                                <Badge variant="destructive" className="text-[10px] h-5">
                                  Unassigned
                                </Badge>
                              )}
                              {meta.priority && (meta.priority === 'high' || meta.priority === 'urgent') && (
                                <Badge variant="destructive" className="text-[10px] h-5">
                                  {meta.priority.toUpperCase()}
                                </Badge>
                              )}
                              <span className="text-[10px] text-muted-foreground flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                              </span>
                              {!notification.isRead && (
                                <span className="h-2 w-2 rounded-full bg-blue-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="border-t p-2">
          <Link href="/admin/chat" onClick={() => setOpen(false)}>
            <Button variant="ghost" className="w-full justify-center text-sm">
              View All Notifications
            </Button>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
