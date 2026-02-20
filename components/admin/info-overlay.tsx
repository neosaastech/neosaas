"use client"

import { format } from "date-fns"
import { X, Info, User, Mail, Calendar, FileText, Clock, ArrowRight, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface InfoOverlayProps {
  isOpen: boolean
  onClose: () => void
  notification: {
    id: string
    subject: string
    status: string
    category: 'info' | 'action' | 'urgent'
    priority?: string
    createdAt: string
    lastMessageAt?: string
    metadata?: Record<string, any>
    user?: {
      id: string
      firstName: string
      lastName: string
      email: string
      profileImage?: string
    }
    guestName?: string
    guestEmail?: string
  } | null
}

const categoryConfig = {
  info: {
    label: 'Information',
    icon: Info,
    badgeClass: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  action: {
    label: 'Action Required',
    icon: FileText,
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  urgent: {
    label: 'Urgent',
    icon: Clock,
    badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
}

// Format field name for display (camelCase -> Proper Case)
function formatFieldName(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())
    .trim()
}

// Check if the notification contains profile change data
function isProfileChange(metadata?: Record<string, any>): boolean {
  return metadata?.notificationType === 'profile_change' ||
         metadata?.changeType !== undefined ||
         metadata?.previousValue !== undefined ||
         metadata?.changes !== undefined
}

// Parse change details from metadata
function getChangeDetails(metadata?: Record<string, any>): {
  changeType?: string
  changeTitle?: string
  previousValue?: string
  newValue?: string
  actionRequired?: boolean
  changes?: Array<{ field: string, from: string, to: string }>
  changesCount?: number
} {
  if (!metadata) return {}
  return {
    changeType: metadata.changeType,
    changeTitle: metadata.changeTitle,
    previousValue: metadata.previousValue,
    newValue: metadata.newValue,
    actionRequired: metadata.actionRequired ?? false,
    changes: metadata.changes,
    changesCount: metadata.changesCount
  }
}

// Fields to exclude from "Additional Details" display
const EXCLUDED_METADATA_KEYS = [
  'internal', 'private', 'secret', 'notificationType',
  'changeType', 'changeTitle', 'previousValue', 'newValue',
  'actionRequired', 'notificationMode', 'changes', 'changesCount'
]

export function InfoOverlay({ isOpen, onClose, notification }: InfoOverlayProps) {
  if (!isOpen || !notification) return null

  const config = categoryConfig[notification.category] || categoryConfig.info
  const Icon = config.icon
  const isInfo = notification.category === 'info'
  const hasProfileChange = isProfileChange(notification.metadata)
  const changeDetails = getChangeDetails(notification.metadata)

  const getCustomerName = () => {
    if (notification.user) {
      return `${notification.user.firstName} ${notification.user.lastName}`.trim()
    }
    return notification.guestName || 'Guest'
  }

  const getCustomerEmail = () => {
    return notification.user?.email || notification.guestEmail || ''
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const customerName = getCustomerName()

  // Filter metadata entries for display (exclude internal fields)
  const metadataEntries = notification.metadata
    ? Object.entries(notification.metadata).filter(([key]) =>
        !EXCLUDED_METADATA_KEYS.some(k => key.toLowerCase().includes(k.toLowerCase()))
      )
    : []

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Overlay Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-gray-900 shadow-xl z-50 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center",
              notification.category === 'info' && "bg-gray-100 dark:bg-gray-800",
              notification.category === 'action' && "bg-blue-100 dark:bg-blue-900/30",
              notification.category === 'urgent' && "bg-red-100 dark:bg-red-900/30"
            )}>
              <Icon className={cn(
                "h-5 w-5",
                notification.category === 'info' && "text-gray-600",
                notification.category === 'action' && "text-blue-600",
                notification.category === 'urgent' && "text-red-600"
              )} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Notification Details
              </h2>
              <Badge variant="outline" className={cn("text-xs mt-1", config.badgeClass)}>
                {config.label}
              </Badge>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="p-6 space-y-6">
            {/* Subject */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {notification.subject}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                ID: #{notification.id.slice(0, 8).toUpperCase()}
              </p>
            </div>

            <Separator />

            {/* Customer Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Customer
              </h4>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={notification.user?.profileImage || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(customerName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {customerName}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {getCustomerEmail()}
                  </p>
                </div>
              </div>
            </div>

            {/* Profile Change Details (for info notifications) */}
            {hasProfileChange && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Change Details
                    {changeDetails.changesCount && changeDetails.changesCount > 1 && (
                      <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                        ({changeDetails.changesCount} fields modified)
                      </span>
                    )}
                  </h4>

                  {changeDetails.changeTitle && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {changeDetails.changeTitle}
                      </p>
                      {changeDetails.changeType && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Type: {formatFieldName(changeDetails.changeType)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Show multiple changes */}
                  {changeDetails.changes && changeDetails.changes.length > 0 && (
                    <div className="space-y-2">
                      {changeDetails.changes.map((change, index) => (
                        <div key={index} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                          <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">
                            {change.field}
                          </p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded border text-gray-600 dark:text-gray-400 truncate">
                              {change.from}
                            </code>
                            <ArrowRight className="h-3 w-3 text-blue-500 flex-shrink-0" />
                            <code className="flex-1 text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded border text-blue-600 dark:text-blue-400 truncate">
                              {change.to}
                            </code>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Show single old -> new value (backward compatibility) */}
                  {!changeDetails.changes && (changeDetails.previousValue || changeDetails.newValue) && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground mb-1">Previous Value</p>
                          <p className="text-sm font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded border">
                            {changeDetails.previousValue || '(empty)'}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground mb-1">New Value</p>
                          <p className="text-sm font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded border text-blue-600 dark:text-blue-400">
                            {changeDetails.newValue || '(empty)'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <Separator />

            {/* Timestamps */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Timeline
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs">Created</span>
                  </div>
                  <p className="font-medium text-sm">
                    {format(new Date(notification.createdAt), "dd MMM yyyy, HH:mm")}
                  </p>
                </div>
                {notification.lastMessageAt && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs">Last Activity</span>
                    </div>
                    <p className="font-medium text-sm">
                      {format(new Date(notification.lastMessageAt), "dd MMM yyyy, HH:mm")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Status & Priority - Only show for action/urgent, hide for info */}
            {!isInfo && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn(
                      "capitalize",
                      notification.status === 'open' && "bg-blue-100 text-blue-700",
                      notification.status === 'pending' && "bg-amber-100 text-amber-700",
                      notification.status === 'resolved' && "bg-green-100 text-green-700",
                      notification.status === 'closed' && "bg-gray-100 text-gray-700"
                    )}>
                      {notification.status}
                    </Badge>
                    {notification.priority && (
                      <Badge variant="outline" className={cn(
                        "capitalize",
                        notification.priority === 'urgent' && "bg-red-100 text-red-700",
                        notification.priority === 'high' && "bg-orange-100 text-orange-700",
                        notification.priority === 'normal' && "bg-blue-100 text-blue-700",
                        notification.priority === 'low' && "bg-gray-100 text-gray-700"
                      )}>
                        {notification.priority} priority
                      </Badge>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Additional Metadata (filtered) */}
            {metadataEntries.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Additional Details
                  </h4>
                  <div className="space-y-2">
                    {metadataEntries.map(([key, value]) => (
                      <div key={key} className="flex justify-between items-start p-2 bg-muted/30 rounded">
                        <span className="text-sm text-muted-foreground">
                          {formatFieldName(key)}
                        </span>
                        <span className="text-sm font-medium text-right max-w-[200px] break-words">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Info Notice - Only for info category */}
            {isInfo && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Informational Notification
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      This is a passive notification for informational purposes only.
                      No action is required. There is no chat associated with this notification type.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  )
}

export default InfoOverlay
