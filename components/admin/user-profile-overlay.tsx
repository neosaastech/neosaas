"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import {
  X,
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  Calendar,
  ExternalLink,
  MessageSquare,
  Clock,
  ShoppingBag,
  CreditCard,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

// WhatsApp icon as SVG component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
)

interface UserProfileOverlayProps {
  isOpen: boolean
  onClose: () => void
  userId?: string
  userData?: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone?: string
    profileImage?: string
    profileType?: string
    address?: string
    city?: string
    postalCode?: string
    country?: string
    createdAt?: string
    company?: {
      name: string
      position?: string
    }
    stats?: {
      totalOrders?: number
      totalSpent?: number
      ticketsCreated?: number
    }
  } | null
}

export function UserProfileOverlay({ isOpen, onClose, userId, userData: initialData }: UserProfileOverlayProps) {
  const [userData, setUserData] = useState(initialData)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && userId && !initialData) {
      fetchUserData()
    } else if (initialData) {
      setUserData(initialData)
    }
  }, [isOpen, userId, initialData])

  const fetchUserData = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}`)
      const data = await response.json()
      if (data.success) {
        setUserData(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase()
  }

  const getFullName = () => {
    if (!userData) return ''
    return `${userData.firstName} ${userData.lastName}`.trim()
  }

  const formatPhoneForWhatsApp = (phone?: string) => {
    if (!phone) return ''
    // Remove all non-numeric characters except +
    return phone.replace(/[^\d+]/g, '')
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Overlay Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl z-50 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                User Profile
              </h2>
              <p className="text-xs text-muted-foreground">
                Customer details
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-80px)]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : !userData ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <User className="h-12 w-12 mb-4 opacity-20" />
              <p>User not found</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Profile Header */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                <Avatar className="h-16 w-16 border-2 border-primary/20">
                  <AvatarImage src={userData.profileImage || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                    {getInitials(userData.firstName, userData.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {getFullName()}
                  </h3>
                  {userData.profileType && (
                    <Badge variant="secondary" className="mt-1 capitalize">
                      {userData.profileType}
                    </Badge>
                  )}
                  {userData.company && (
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {userData.company.position ? `${userData.company.position} at ` : ''}
                      {userData.company.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Contact Actions */}
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-auto py-3" asChild>
                  <a href={`mailto:${userData.email}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </a>
                </Button>
                {userData.phone && (
                  <Button
                    variant="outline"
                    className="h-auto py-3 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                    asChild
                  >
                    <a
                      href={`https://wa.me/${formatPhoneForWhatsApp(userData.phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <WhatsAppIcon className="h-4 w-4 mr-2" />
                      WhatsApp
                    </a>
                  </Button>
                )}
              </div>

              <Separator />

              {/* Contact Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Contact Information
                </h4>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium text-gray-900 dark:text-white break-all">
                        {userData.email}
                      </p>
                    </div>
                  </div>

                  {userData.phone && (
                    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {userData.phone}
                        </p>
                      </div>
                    </div>
                  )}

                  {(userData.address || userData.city || userData.country) && (
                    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Address</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {[userData.address, userData.postalCode, userData.city, userData.country]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              {userData.stats && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Statistics
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                        <ShoppingBag className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                        <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
                          {userData.stats.totalOrders || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Orders</p>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                        <CreditCard className="h-5 w-5 mx-auto text-green-600 mb-1" />
                        <p className="text-lg font-bold text-green-700 dark:text-green-400">
                          {userData.stats.totalSpent ? `€${(userData.stats.totalSpent / 100).toFixed(0)}` : '€0'}
                        </p>
                        <p className="text-xs text-muted-foreground">Spent</p>
                      </div>
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                        <MessageSquare className="h-5 w-5 mx-auto text-purple-600 mb-1" />
                        <p className="text-lg font-bold text-purple-700 dark:text-purple-400">
                          {userData.stats.ticketsCreated || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Tickets</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Timeline */}
              {userData.createdAt && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Account
                    </h4>
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Member since</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {format(new Date(userData.createdAt), "MMMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Admin Actions */}
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </h4>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href={`/admin/users/${userData.id}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Full Profile
                    </a>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href={`/admin/orders?userId=${userData.id}`}>
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      View Orders
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </>
  )
}

export default UserProfileOverlay
