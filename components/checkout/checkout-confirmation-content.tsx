'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Check,
  User,
  Mail,
  CreditCard,
  ExternalLink,
  ShoppingBag,
  Package,
  Home,
  Download,
  Key,
  Copy,
  CheckCircle,
  Truck,
  FileText,
  Sparkles,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { format } from 'date-fns'

// Shared interfaces - exported for use by wrapper components
export interface OrderItem {
  id: string
  itemName: string
  itemDescription?: string
  quantity: number
  unitPrice: number
  totalPrice: number
  metadata?: {
    productType?: string
    digitalDeliveryType?: 'url' | 'license' | 'both' | string | null
    downloadUrl?: string | null
    generatedLicenseKey?: string | null
    licenseInstructions?: string | null
  }
}

export interface Order {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  totalAmount: number
  currency?: string
  createdAt: string
  items?: OrderItem[]
}

interface CheckoutConfirmationContentProps {
  order: Order
  isVisible?: boolean
  variant?: 'overlay' | 'page'
}

export function CheckoutConfirmationContent({
  order,
  isVisible = true,
  variant = 'page'
}: CheckoutConfirmationContentProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Copy license key to clipboard
  const copyToClipboard = useCallback((text: string, productName: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(productName)
    setTimeout(() => setCopiedKey(null), 2000)
  }, [])

  // Format price
  const formatPrice = useCallback((amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount / 100)
  }, [])

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Confirmed</Badge>
      case 'pending_payment':
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Pending</Badge>
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Cancelled</Badge>
      case 'shipped':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Shipped</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  // Detect product types
  const hasDigital = order.items?.some(item => item.metadata?.productType === 'digital') || false
  const hasPhysical = order.items?.some(item => item.metadata?.productType === 'physical') || false
  const productTypeCount = [hasDigital, hasPhysical].filter(Boolean).length
  const isMixed = productTypeCount > 1

  // Determine header style based on product type
  let headerTitle = "Order Confirmed!"
  let headerSubtitle = "Thank you for your purchase"
  let HeaderIcon = Check
  let headerGradient = "from-green-500 to-emerald-600"

  if (hasDigital && !isMixed) {
    headerTitle = "Digital Products Ready!"
    headerSubtitle = "Instant access to your downloads"
    HeaderIcon = Download
    headerGradient = "from-blue-500 to-indigo-600"
  } else if (hasPhysical && !isMixed) {
    headerTitle = "Order Confirmed!"
    headerSubtitle = "Your package will be prepared and shipped"
    HeaderIcon = Package
    headerGradient = "from-purple-500 to-violet-600"
  }

  return (
    <>
      {/* Animated sparkle effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-20 left-1/4 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
          <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
        </div>
        <div className={`absolute top-32 right-1/4 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
        </div>
        <div className={`absolute top-24 right-1/3 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
          <Sparkles className="w-5 h-5 text-green-400 animate-pulse" />
        </div>
      </div>

      <div className="min-h-screen flex flex-col">
        {/* Success Header */}
        <div className={`bg-gradient-to-r ${headerGradient} transition-all duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="max-w-3xl mx-auto px-4 py-12 text-center text-white">
            <div className={`w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 transition-all duration-500 delay-200 ${isVisible ? 'scale-100' : 'scale-0'}`}>
              <HeaderIcon className="w-10 h-10" />
            </div>
            <h1 className={`text-3xl md:text-4xl font-bold mb-3 transition-all duration-500 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              {headerTitle}
            </h1>
            <p className={`text-white/90 text-lg transition-all duration-500 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              {headerSubtitle}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-muted/30">
          <div className={`max-w-3xl mx-auto px-4 py-8 space-y-6 transition-all duration-700 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

            {/* Order Info Card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="w-5 h-5" />
                      Order {order.orderNumber}
                    </CardTitle>
                    <CardDescription>
                      {format(new Date(order.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                    </CardDescription>
                  </div>
                  {getStatusBadge(order.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Contextual message based on product type */}
                {hasDigital && !isMixed && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
                    <Download className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-blue-800 dark:text-blue-200 font-medium">Digital Products Available!</p>
                      <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
                        Your download links and license keys are available below. A confirmation email has also been sent.
                      </p>
                    </div>
                  </div>
                )}

                {hasPhysical && !isMixed && (
                  <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4 flex items-start gap-3">
                    <Truck className="w-6 h-6 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-purple-800 dark:text-purple-200 font-medium">Order Being Prepared!</p>
                      <p className="text-purple-700 dark:text-purple-300 text-sm mt-1">
                        Your order will be prepared within 24-48 hours. You'll receive a tracking number by email once shipped.
                      </p>
                    </div>
                  </div>
                )}

                {isMixed && (
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-green-800 dark:text-green-200 font-medium">Mixed Order Confirmed!</p>
                      <p className="text-green-700 dark:text-green-300 text-sm mt-1">
                        Your order contains multiple product types. Check the details below and your email for specifics.
                      </p>
                    </div>
                  </div>
                )}

                {!hasDigital && !hasPhysical && (
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-green-800 dark:text-green-200 font-medium">Order Received Successfully</p>
                      <p className="text-green-700 dark:text-green-300 text-sm mt-1">
                        A confirmation email has been sent to you.
                      </p>
                    </div>
                  </div>
                )}

                {/* Order Items */}
                {order.items && order.items.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h3 className="font-medium flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4" />
                        Order Items
                      </h3>
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-3 border-b last:border-b-0">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{item.itemName}</p>
                              {item.metadata?.productType === 'digital' && (
                                <Badge variant="outline" className="text-xs">Digital</Badge>
                              )}
                              {item.metadata?.productType === 'physical' && (
                                <Badge variant="outline" className="text-xs">Physical</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                          </div>
                          <p className="font-medium">{formatPrice(item.totalPrice, order.currency)}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Digital Products Section */}
                {order.items && order.items.filter(item => item.metadata?.productType === 'digital').length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="font-medium flex items-center gap-2">
                        <Download className="w-5 h-5 text-blue-500" />
                        Your Digital Products
                      </h3>

                      {order.items
                        .filter(item => item.metadata?.productType === 'digital')
                        .map((item, idx) => {
                          const deliveryType = item.metadata?.digitalDeliveryType || 'license'
                          const hasUrl = !!item.metadata?.downloadUrl
                          const hasLicense = !!item.metadata?.generatedLicenseKey

                          return (
                          <div key={idx} className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-5 space-y-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-semibold text-lg">{item.itemName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {hasUrl && hasLicense && 'Download + License Key'}
                                  {hasUrl && !hasLicense && 'Download Link'}
                                  {!hasUrl && hasLicense && 'License Key'}
                                  {' - Instant Access'}
                                </p>
                              </div>
                              <Badge className="bg-green-500 text-white">Ready</Badge>
                            </div>

                            {/* Download URL */}
                            {item.metadata?.downloadUrl && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium flex items-center gap-2">
                                  <Download className="w-4 h-4" />
                                  Download Link
                                </p>
                                <a
                                  href={item.metadata.downloadUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-background border rounded-lg hover:bg-muted transition-colors group"
                                >
                                  <ExternalLink className="w-4 h-4 text-primary" />
                                  <span className="font-medium group-hover:underline">
                                    Download {item.itemName}
                                  </span>
                                </a>
                              </div>
                            )}

                            {/* License Key */}
                            {item.metadata?.generatedLicenseKey && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium flex items-center gap-2">
                                  <Key className="w-4 h-4" />
                                  License Key
                                </p>
                                <div className="flex items-center gap-2">
                                  <code className="flex-1 px-4 py-3 bg-white dark:bg-background border rounded-lg font-mono text-sm font-semibold">
                                    {item.metadata.generatedLicenseKey}
                                  </code>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => copyToClipboard(item.metadata!.generatedLicenseKey!, item.itemName)}
                                    className="shrink-0"
                                  >
                                    {copiedKey === item.itemName ? (
                                      <>
                                        <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                                        Copied!
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-4 h-4 mr-1" />
                                        Copy
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* License Instructions */}
                            {item.metadata?.licenseInstructions && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium">Activation Instructions</p>
                                <div className="px-4 py-3 bg-white dark:bg-background border rounded-lg text-sm whitespace-pre-wrap">
                                  {item.metadata.licenseInstructions}
                                </div>
                              </div>
                            )}
                          </div>
                        )})}
                    </div>
                  </>
                )}


                {/* Total */}
                {order.totalAmount > 0 && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between bg-muted rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium">Total</span>
                      </div>
                      <span className="text-2xl font-bold text-primary">
                        {formatPrice(order.totalAmount, order.currency)}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Email Notification */}
            <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground">
                A confirmation email with all details has been sent to your email address.
              </p>
            </div>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/dashboard" className="flex-1">
                    <Button className="w-full" size="lg">
                      <Home className="w-4 h-4 mr-2" />
                      Back to Dashboard
                    </Button>
                  </Link>
                  <Link href="/dashboard" className="flex-1">
                    <Button variant="outline" className="w-full" size="lg">
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      Continue Shopping
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
