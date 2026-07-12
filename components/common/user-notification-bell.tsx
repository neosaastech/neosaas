"use client"

import { useEffect, useState } from "react"
import { Bell, Package, MessageSquare, Settings, CheckCircle, Clock, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDistanceToNow } from "date-fns"
import { useRouter } from "next/navigation"

interface Notification {
  id: string
  type: 'order' | 'support' | 'system'
  title: string
  description: string
  timestamp: string
  isRead: boolean
  actionRequired: boolean
  metadata?: {
    conversationId?: string
    orderId?: string
    hasDigital?: boolean
    hasPhysical?: boolean
    viewLink?: string
    formattedAmount?: string
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
  order: { icon: Package, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'Commandes' },
  support: { icon: MessageSquare, color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/30', label: 'Support' },
  system: { icon: Settings, color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-900/30', label: 'Système' },
}

/**
 * Personal notification bell for any authenticated user (not just admins) —
 * fetches /api/notifications, scoped server-side to the current user's own
 * orders/support conversations/system messages.
 */
export function UserNotificationBell() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState<NotificationStats>({ total: 0, unread: 0, actionRequired: 0, byType: {} })
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("all")

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setNotifications(data.notifications || [])
          setStats(data.stats || { total: 0, unread: 0, actionRequired: 0, byType: {} })
        }
      }
    } catch (error) {
      console.error('[UserNotificationBell] Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, { method: 'POST' })
      fetchNotifications()
    } catch (error) {
      console.error('[UserNotificationBell] Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' })
      fetchNotifications()
    } catch (error) {
      console.error('[UserNotificationBell] Failed to mark all as read:', error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)
    setOpen(false)

    const meta = notification.metadata || {}
    if (meta.conversationId) {
      router.push('/dashboard/chat')
    } else if (meta.viewLink) {
      router.push(meta.viewLink)
    } else if (notification.type === 'order') {
      router.push('/dashboard/payments')
    } else {
      router.push('/dashboard/chat')
    }
  }

  const filteredNotifications = activeTab === 'all'
    ? notifications
    : activeTab === 'action'
      ? notifications.filter((n) => n.actionRequired)
      : notifications.filter((n) => n.type === activeTab)

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
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold">Notifications</h3>
            <p className="text-xs text-muted-foreground">
              {stats.unread} non lue{stats.unread > 1 ? 's' : ''}
            </p>
          </div>
          {stats.unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              <CheckCircle className="h-4 w-4 mr-1" />
              Tout marquer lu
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b h-auto p-1 bg-transparent">
            <TabsTrigger value="all" className="text-xs data-[state=active]:bg-muted">
              Tout
              {stats.total > 0 && <Badge variant="secondary" className="ml-1 h-5">{stats.total}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="order" className="text-xs data-[state=active]:bg-muted">
              Commandes
              {stats.byType?.order > 0 && <Badge variant="secondary" className="ml-1 h-5">{stats.byType.order}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="support" className="text-xs data-[state=active]:bg-muted">
              Support
              {stats.byType?.support > 0 && <Badge variant="secondary" className="ml-1 h-5">{stats.byType.support}</Badge>}
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
                  <p className="text-sm">Aucune notification</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredNotifications.map((notification) => {
                    const config = typeConfig[notification.type as keyof typeof typeConfig] || typeConfig.system
                    const meta = notification.metadata || {}

                    return (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                          !notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className={`h-10 w-10 rounded-full ${config.bg} flex items-center justify-center shrink-0`}>
                            {meta.hasDigital && !meta.hasPhysical ? (
                              <Download className="h-4 w-4 text-green-600" />
                            ) : (
                              getTypeIcon(notification.type)
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${!notification.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {notification.title}
                            </p>
                            {notification.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {notification.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge variant="outline" className="text-[10px] h-5">
                                {config.label}
                              </Badge>
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
