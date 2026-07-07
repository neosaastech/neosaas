"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  MapPin,
  Calendar,
  Edit,
  Loader2,
  User,
  ShoppingBag,
  CreditCard,
  MessageSquare,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  History,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { useRequireAdmin } from "@/lib/hooks/use-require-admin"
import { UserEditSheet } from "@/components/admin/user-edit-sheet"

// WhatsApp icon as SVG component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
)

interface UserData {
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
  position?: string
  isActive: boolean
  emailVerified?: boolean
  createdAt: string
  updatedAt?: string
  company?: {
    id: string
    name: string
    email?: string
    phone?: string
    siret?: string
    vatNumber?: string
    address?: string
    city?: string
    zipCode?: string
  } | null
  stats?: {
    totalOrders: number
    totalSpent: number
    ticketsCreated: number
  }
  recentOrders?: Array<{
    id: string
    orderNumber: string
    totalAmount: number
    status: string
    createdAt: string
  }>
}

interface HistoryItem {
  action: string
  description: string
  status: string
  createdAt: string
  type: string
  severity: string
}

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string
  const { isChecking, isAdmin } = useRequireAdmin()

  const [userData, setUserData] = useState<UserData | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditSheet, setShowEditSheet] = useState(false)

  useEffect(() => {
    if (isAdmin && userId) {
      loadUserData()
    }
  }, [isAdmin, userId])

  const loadUserData = async () => {
    setLoading(true)
    try {
      // Fetch user data
      const userResponse = await fetch(`/api/admin/users/${userId}`)
      const userData = await userResponse.json()

      if (userData.success) {
        setUserData(userData.data)
      } else {
        toast.error(userData.error || "User not found")
        router.push("/admin/users")
        return
      }

      // Fetch user history
      const historyResponse = await fetch(`/api/admin/users/${userId}/history`)
      const historyData = await historyResponse.json()

      if (historyData.success) {
        setHistory(historyData.history || [])
      }
    } catch (error) {
      console.error("Failed to load user data:", error)
      toast.error("Failed to load user data")
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase()
  }

  const getFullName = () => {
    if (!userData) return ''
    return `${userData.firstName} ${userData.lastName}`.trim()
  }

  const formatPhoneForWhatsApp = (phone?: string) => {
    if (!phone) return ''
    return phone.replace(/[^\d+]/g, '')
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'succeeded':
      case 'verified':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'pending':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  if (isChecking || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAdmin) return null

  if (!userData) {
    return (
      <div className="container max-w-6xl py-10">
        <div className="text-center">
          <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-semibold mb-2">User not found</h2>
          <p className="text-muted-foreground mb-6">The user you're looking for doesn't exist or has been deleted.</p>
          <Button asChild>
            <Link href="/admin/users">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Users
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/users">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Profile</h1>
            <p className="text-sm text-muted-foreground">
              Home &gt; Users &gt; {getFullName()}
            </p>
          </div>
        </div>
        <Button onClick={() => setShowEditSheet(true)} className="bg-brand hover:bg-brand-hover">
          <Edit className="h-4 w-4 mr-2" />
          Edit Profile
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Profile Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 border-4 border-primary/20">
                  <AvatarImage src={userData.profileImage || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                    {getInitials(userData.firstName, userData.lastName)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="mt-4 text-xl font-semibold">{getFullName()}</h2>
                <p className="text-sm text-muted-foreground">{userData.email}</p>

                <div className="flex items-center gap-2 mt-3">
                  <Badge variant={userData.isActive ? "default" : "secondary"}>
                    {userData.isActive ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Active
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        Inactive
                      </>
                    )}
                  </Badge>
                  {userData.profileType && (
                    <Badge variant="outline" className="capitalize">
                      <Shield className="h-3 w-3 mr-1" />
                      {userData.profileType}
                    </Badge>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-2 w-full mt-6">
                  <Button variant="outline" size="sm" asChild>
                    <a href={`mailto:${userData.email}`}>
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </a>
                  </Button>
                  {userData.phone && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-600 hover:text-green-700"
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
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium break-all">{userData.email}</p>
                </div>
              </div>

              {userData.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{userData.phone}</p>
                  </div>
                </div>
              )}

              {(userData.address || userData.city || userData.country) && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="font-medium">
                      {[userData.address, userData.postalCode, userData.city, userData.country]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                </div>
              )}

              {userData.position && (
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-xs text-muted-foreground">Position</p>
                    <p className="font-medium">{userData.position}</p>
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-xs text-muted-foreground">Member since</p>
                  <p className="font-medium">
                    {format(new Date(userData.createdAt), "MMMM d, yyyy", { locale: enUS })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Info */}
          {userData.company && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Company
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-semibold text-lg">{userData.company.name}</p>
                  {userData.company.email && (
                    <p className="text-sm text-muted-foreground">{userData.company.email}</p>
                  )}
                </div>

                {userData.company.siret && (
                  <div>
                    <p className="text-xs text-muted-foreground">SIRET</p>
                    <p className="font-mono text-sm">{userData.company.siret}</p>
                  </div>
                )}

                {userData.company.vatNumber && (
                  <div>
                    <p className="text-xs text-muted-foreground">VAT Number</p>
                    <p className="font-mono text-sm">{userData.company.vatNumber}</p>
                  </div>
                )}

                {(userData.company.address || userData.company.city) && (
                  <div>
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="text-sm">
                      {[userData.company.address, userData.company.zipCode, userData.company.city]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                )}

                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href={`/admin/users?company=${userData.company.id}`}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Company Details
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Stats and Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
                    <ShoppingBag className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold">{userData.stats?.totalOrders || 0}</p>
                  <p className="text-sm text-muted-foreground">Orders</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3">
                    <CreditCard className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-2xl font-bold">
                    €{((userData.stats?.totalSpent || 0) / 100).toFixed(0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3">
                    <MessageSquare className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="text-2xl font-bold">{userData.stats?.ticketsCreated || 0}</p>
                  <p className="text-sm text-muted-foreground">Tickets</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for Orders and History */}
          <Card>
            <Tabs defaultValue="orders">
              <CardHeader>
                <TabsList>
                  <TabsTrigger value="orders">
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Recent Orders
                  </TabsTrigger>
                  <TabsTrigger value="history">
                    <History className="h-4 w-4 mr-2" />
                    Activity History
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent>
                <TabsContent value="orders" className="mt-0">
                  {userData.recentOrders && userData.recentOrders.length > 0 ? (
                    <div className="space-y-3">
                      {userData.recentOrders.map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                              <ShoppingBag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="font-medium">{order.orderNumber}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(order.createdAt), "MMM d, yyyy 'at' HH:mm", { locale: enUS })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">€{((order.totalAmount || 0) / 100).toFixed(2)}</p>
                            <Badge className={getStatusColor(order.status)} variant="secondary">
                              {order.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      <Button variant="outline" className="w-full mt-4" asChild>
                        <Link href={`/admin/orders?userId=${userData.id}`}>
                          View All Orders
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No orders yet</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="history" className="mt-0">
                  <ScrollArea className="h-[400px] pr-4">
                    {history.length > 0 ? (
                      <div className="space-y-3">
                        {history.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                          >
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                              item.severity === 'error' ? 'bg-red-100 dark:bg-red-900/30' :
                              item.severity === 'success' ? 'bg-green-100 dark:bg-green-900/30' :
                              item.severity === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                              'bg-blue-100 dark:bg-blue-900/30'
                            }`}>
                              {item.type === 'order' && <ShoppingBag className="h-4 w-4" />}
                              {item.type === 'payment' && <CreditCard className="h-4 w-4" />}
                              {item.type === 'account' && <User className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium text-sm">{item.action}</p>
                                <Badge className={getStatusColor(item.status)} variant="secondary">
                                  {item.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(item.createdAt), "MMM d, yyyy 'at' HH:mm", { locale: enUS })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p>No activity history</p>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" asChild>
                  <Link href={`/admin/orders?userId=${userData.id}`}>
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    View All Orders
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/admin/support?userId=${userData.id}`}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Support Tickets
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/admin/chat?userId=${userData.id}`}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Start Chat
                  </Link>
                </Button>
                <Button variant="outline" onClick={() => setShowEditSheet(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Sheet */}
      {showEditSheet && (
        <UserEditSheet
          user={userData}
          companies={userData.company ? [userData.company] : []}
          open={showEditSheet}
          onOpenChange={setShowEditSheet}
          onSave={() => {
            loadUserData()
            setShowEditSheet(false)
          }}
        />
      )}
    </div>
  )
}
