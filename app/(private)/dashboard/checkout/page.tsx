"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, CreditCard, Lock, Mail, ArrowLeft, ShoppingBag, ShoppingCart, ArrowRight, Loader2, Tag, X } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { getProductById, getCart, processCheckout, addToCart } from "@/app/actions/ecommerce"
import { validateCoupon } from "@/app/actions/coupons"
import { getStripePaymentMethods } from "@/app/actions/payments"
import { CheckoutConfirmationOverlay } from "@/components/checkout/checkout-confirmation-overlay"
import { useCart } from "@/contexts/cart-context"

const plans = [
  {
    id: "starter",
    name: "Starter Plan",
    price: 199,
    deliveryTime: "2-hour session",
    description: "Live walkthrough and setup assistance",
  },
  {
    id: "pro",
    name: "Pro Plan",
    price: 699,
    deliveryTime: "Multiple sessions",
    description: "In-depth onboarding and advanced configuration",
  },
  {
    id: "enterprise",
    name: "Enterprise Plan",
    price: 2999,
    deliveryTime: "Comprehensive support",
    description: "Full architecture review and optimization",
  },
  {
    id: "custom",
    name: "Custom Hourly",
    price: 120,
    deliveryTime: "Flexible scheduling",
    description: "Hourly consulting for specific needs",
    isHourly: true,
  },
]

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { clearCart, refreshCart } = useCart()
  const [cartItems, setCartItems] = useState<any[]>([])
  const [upsellProduct, setUpsellProduct] = useState<any | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [cartId, setCartId] = useState<string | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<"card" | "paypal">("card")

  // Payment config state
  const [paymentConfig, setPaymentConfig] = useState({
    stripeEnabled: false,
    paypalEnabled: false,
  })
  const [userInfo, setUserInfo] = useState<{
    name: string
    email: string
    company?: string
  } | null>(null)
  

  // États pour l'overlay de confirmation
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null)

  // États pour les coupons
  const [couponCode, setCouponCode] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string
    discountType: string
    discountValue: number
    discountAmount: number
  } | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)

  useEffect(() => {
    const moduleId = searchParams.get("module")
    const planId = searchParams.get("plan")

    const loadData = async () => {
      try {
        // Load payment configuration
        try {
          const configRes = await fetch('/api/admin/config')
          if (configRes.ok) {
            const config = await configRes.json()
            const stripeEnabled = config.stripe_enabled === 'true'
            const paypalEnabled = config.paypal_enabled === 'true'
            setPaymentConfig({ stripeEnabled, paypalEnabled })
            // Set default payment method based on config
            if (stripeEnabled) {
              setSelectedMethod('card')
            } else if (paypalEnabled) {
              setSelectedMethod('paypal')
            }
          }
        } catch (e) {
          console.log('[Checkout] Could not load payment config, using defaults')
        }

        // If module ID is present, add it to cart first
        if (moduleId) {
          const addResult = await addToCart(moduleId)
          if (!addResult.success) {
            toast.error("Failed to add item to cart")
          }
          // Continue to load cart...
        }

        if (planId) {
          const plan = plans.find((p) => p.id === planId)
          if (plan) {
            setCartItems([{
              ...plan,
              icon: Calendar,
              quantity: 1,
              currency: "EUR"
            }])
          }
        } else {
          // Load from server cart (for both normal cart access AND after adding module)
          const result = await getCart()
          if (result.success && result.data && result.data.items.length > 0) {
            setCartId(result.data.id)
            // Filter out any items that might have null/undefined products (defensive programming)
            const validItems = result.data.items.filter((item: any) =>
              item.product && item.product.id && item.product.title
            )

            if (validItems.length !== result.data.items.length) {
              console.warn('[Checkout] Filtered out invalid cart items', {
                total: result.data.items.length,
                valid: validItems.length
              })
            }

            const items = validItems.map((item: any) => ({
              id: item.product.id,
              name: item.product.title,
              price: item.product.price / 100,
              icon: ShoppingBag,
              deliveryTime: 'Instant Access',
              description: item.product.description,
              quantity: item.quantity,
              currency: item.product.currency,
              type: item.product.type, // Add product type
              vatRate: item.product.vatRate?.rate ?? 0 // Add VAT rate from product
            }))
            setCartItems(items)

            // Check for upsell (use validItems to avoid null product issues)
            const itemWithUpsell = validItems.find((item: any) => item.product?.upsellProduct)
            if (itemWithUpsell) {
              const upsell = itemWithUpsell.product.upsellProduct
              // Only show if not already in cart
              if (!items.find((i: any) => i.id === upsell.id)) {
                setUpsellProduct({
                  id: upsell.id,
                  name: upsell.title,
                  price: upsell.price / 100,
                  description: upsell.description,
                  currency: upsell.currency
                })
              }
            }
          } else {
            // Empty cart - don't redirect immediately, let user see the checkout page
            console.log('[Checkout] Cart is empty, but staying on page')
            // User can navigate back or add items
          }
        }
      } catch (error) {
        console.error("Failed to load checkout data", error)
        toast.error("Failed to load checkout details")
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Charger les informations utilisateur depuis plusieurs sources
    const loadUserInfo = async () => {
      // 1. Try localStorage first (cached)
      const profileData = localStorage.getItem("userProfile")
      if (profileData) {
        try {
          const profile = JSON.parse(profileData)
          if (profile.email) {
            setUserInfo({
              name: `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || profile.email,
              email: profile.email,
              company: profile.company || undefined,
            })
            return
          }
        } catch (error) {
          console.error("[Checkout] Failed to parse localStorage profile:", error)
        }
      }

      // 2. Try to fetch from API
      try {
        const res = await fetch('/api/user/profile')
        if (res.ok) {
          const data = await res.json()
          if (data.email) {
            setUserInfo({
              name: `${data.firstName || ""} ${data.lastName || ""}`.trim() || data.email,
              email: data.email,
              company: data.company || undefined,
            })
            // Cache in localStorage
            localStorage.setItem("userProfile", JSON.stringify(data))
            return
          }
        }
      } catch (error) {
        console.error("[Checkout] Failed to fetch profile from API:", error)
      }

      // 3. Fallback: Use minimal info (allow proceeding in dev mode)
      setUserInfo({
        name: "Utilisateur",
        email: "Non renseigné",
        company: undefined,
      })
    }

    loadUserInfo()
  }, [searchParams])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // No longer needed - user info is loaded automatically
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('[Checkout] handleSubmit called', { cartItemsCount: cartItems.length })

    setIsProcessing(true)

    const hasDigital = cartItems.some(item => item.type === 'digital')
    const hasPhysical = cartItems.some(item => item.type === 'physical')

    let processingMsg = "Processing your order..."
    if (hasDigital) {
      processingMsg = "Processing your digital order..."
    } else if (hasPhysical) {
      processingMsg = "Processing your order and preparing shipment..."
    }
    toast.loading(processingMsg, { id: 'checkout-processing' })

    try {
      if (!cartId) {
        toast.dismiss('checkout-processing')
        toast.warning("No active cart. Redirecting to cart...")
        router.push("/dashboard/cart")
        setIsProcessing(false)
        return
      }

      const result = await processCheckout(cartId, appliedCoupon?.code || undefined)

      if (result.success) {
        toast.dismiss('checkout-processing')
        console.log('[Checkout] ✅ Order completed successfully', { orderId: result.orderId })

        // Clear cart in context to update header
        clearCart()

        // Show confirmation overlay instead of redirecting
        // This keeps the user on the checkout page with an overlay
        setConfirmedOrderId(result.orderId)
        setShowConfirmation(true)
      } else {
        toast.dismiss('checkout-processing')
        console.error('[Checkout] ❌ Checkout failed:', result.error)
        
        // Specific error message if cart no longer exists
        if (result.error?.includes('Cart not found')) {
          toast.error("Your cart no longer exists. Please add your products to the cart again.")
          setTimeout(() => {
            router.push('/dashboard/cart')
          }, 2000)
        } else {
          toast.error(result.error || "Checkout error")
        }
      }
    } catch (error) {
      toast.dismiss('checkout-processing')
      console.error("Checkout error:", error)
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleAddUpsell = async () => {
    if (!upsellProduct) return
    
    try {
      const result = await addToCart(upsellProduct.id)
      if (result.success) {
        toast.success("Upsell added to cart")
        // Reload page to refresh cart
        window.location.reload()
      } else {
        toast.error("Failed to add upsell")
      }
    } catch (error) {
      toast.error("Failed to add upsell")
    }
  }

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return

    setCouponLoading(true)
    setCouponError(null)

    try {
      const productIds = cartItems.map(item => item.id)
      // Cart total in cents
      const cartTotalCents = Math.round(cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0) * 100)

      const result = await validateCoupon(couponCode.trim(), null, cartTotalCents, productIds)

      if (result.success && result.data) {
        setAppliedCoupon({
          code: result.data.coupon.code,
          discountType: result.data.coupon.discountType,
          discountValue: result.data.coupon.discountValue,
          discountAmount: result.data.discountAmount / 100 // Convert cents to currency
        })
        setCouponCode("")
        toast.success(`Coupon "${result.data.coupon.code}" applied!`)
      } else {
        setCouponError(result.error || "Invalid coupon")
      }
    } catch (error) {
      setCouponError("Failed to validate coupon")
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponError(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    )
  }

  // Afficher un message si le panier est vide au lieu de bloquer
  if (cartItems.length === 0) {
    return (
      <div className="container max-w-6xl py-10">
        <Link href="/dashboard" className="flex items-center text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-6 w-6" />
              Empty Cart
            </CardTitle>
            <CardDescription>
              Your cart is currently empty. Add products to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Link href="/dashboard" className="flex-1">
                <Button className="w-full">
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
              <Link href="/dashboard/cart" className="flex-1">
                <Button variant="outline" className="w-full">
                  View Cart
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0)
  const discount = appliedCoupon ? appliedCoupon.discountAmount : 0
  const subtotalAfterDiscount = Math.max(0, subtotal - discount)
  // Calculate tax based on product VAT rates (stored in basis points: 2000 = 20%)
  const tax = cartItems.reduce((acc, item) => {
    const itemTotal = item.price * item.quantity
    const vatRate = item.vatRate ?? 0
    // Divide by 10000 to convert basis points to decimal (2000 / 10000 = 0.20 = 20%)
    return acc + (itemTotal * vatRate / 10000)
  }, 0)
  const hasVat = cartItems.some(item => item.vatRate && item.vatRate > 0)
  const total = subtotalAfterDiscount + tax
  const currencySymbol = cartItems.length > 0 && cartItems[0].currency === 'USD' ? '$' : '€'

  return (
    <div className="container max-w-6xl py-10">
      <div className="flex items-center justify-between mb-6">
        <Link href="/dashboard" className="flex items-center text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
        <Link href="/dashboard/cart">
          <Button variant="outline" size="sm">
            <ShoppingCart className="mr-2 h-4 w-4" />
            View Cart
          </Button>
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Order Summary */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {cartItems.map((item, index) => (
                <div key={`${item.id}-${index}`} className="flex items-start space-x-4 mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{item.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.deliveryTime}</p>
                    <div className="flex justify-between mt-1">
                      <span className="text-sm text-muted-foreground">Qty: {item.quantity}</span>
                      <span className="font-medium">{currencySymbol}{item.price * item.quantity}</span>
                    </div>
                  </div>
                </div>
              ))}

              {upsellProduct && (
                <div className="mt-4 p-4 border border-dashed border-primary/50 rounded-lg bg-primary/5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-sm text-primary">Special Offer!</h4>
                      <p className="text-sm font-medium mt-1">{upsellProduct.name}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{upsellProduct.description}</p>
                      <p className="text-sm font-bold mt-2">{currencySymbol}{upsellProduct.price}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={handleAddUpsell} className="ml-2">
                      Add
                    </Button>
                  </div>
                </div>
              )}

              <Separator />

              {/* Coupon Code Input */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5" />
                  Coupon Code
                </Label>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-2.5 bg-green-50 border border-green-200 rounded-md dark:bg-green-950/30 dark:border-green-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">{appliedCoupon.code}</span>
                      <Badge variant="secondary" className="text-xs">
                        {appliedCoupon.discountType === 'percentage'
                          ? `-${appliedCoupon.discountValue}%`
                          : `-${currencySymbol}${(appliedCoupon.discountValue / 100).toFixed(2)}`
                        }
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                      onClick={handleRemoveCoupon}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter code..."
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase())
                        setCouponError(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleApplyCoupon()
                        }
                      }}
                      className="h-9 text-sm"
                      disabled={couponLoading}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="h-9 px-3 shrink-0"
                    >
                      {couponLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Apply"
                      )}
                    </Button>
                  </div>
                )}
                {couponError && (
                  <p className="text-xs text-red-500">{couponError}</p>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{currencySymbol}{subtotal.toFixed(2)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                    <span>Discount ({appliedCoupon.code})</span>
                    <span>-{currencySymbol}{discount.toFixed(2)}</span>
                  </div>
                )}
                {hasVat && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{currencySymbol}{tax.toFixed(2)}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{currencySymbol}{total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Checkout Form */}
        <div className="lg:col-span-2 order-1 lg:order-2">
          {/* Billing Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="mr-2 h-5 w-5" />
                Billing Information
              </CardTitle>
              <CardDescription>
                This information will be used for your invoice
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userInfo ? (
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Name</span>
                    <span className="font-medium">{userInfo.name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span className="font-medium">{userInfo.email}</span>
                  </div>
                  {userInfo.company && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-sm text-muted-foreground">Company</span>
                      <span className="font-medium">{userInfo.company}</span>
                    </div>
                  )}
                  <div className="mt-4">
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/dashboard/profile">
                        Edit My Information
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm">Loading information...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
              <CardDescription>
                Select your secure payment method
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center">
                    <Lock className="mr-2 h-4 w-4" />
                    Payment Method
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Stripe / Card */}
                    {paymentConfig.stripeEnabled && (
                      <div
                        className={`cursor-pointer border rounded-lg p-4 flex items-center space-x-4 transition-all ${selectedMethod === 'card' ? 'border-brand bg-brand/5 ring-1 ring-brand' : 'border-border hover:border-brand/50'}`}
                        onClick={() => setSelectedMethod('card')}
                      >
                        <CreditCard className={`h-6 w-6 ${selectedMethod === 'card' ? 'text-brand' : 'text-muted-foreground'}`} />
                        <div>
                          <p className="font-medium">Credit Card</p>
                          <p className="text-xs text-muted-foreground">Secure payment via Stripe</p>
                        </div>
                      </div>
                    )}

                    {/* PayPal */}
                    {paymentConfig.paypalEnabled && (
                      <div
                        className={`cursor-pointer border rounded-lg p-4 flex items-center space-x-4 transition-all ${selectedMethod === 'paypal' ? 'border-brand bg-brand/5 ring-1 ring-brand' : 'border-border hover:border-brand/50'}`}
                        onClick={() => setSelectedMethod('paypal')}
                      >
                        <svg className={`h-6 w-6 ${selectedMethod === 'paypal' ? 'text-[#003087]' : 'text-muted-foreground'}`} viewBox="0 0 24 24" fill="currentColor">
                          <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.946 5.438-3.158 7.12-6.594 7.12H10.5l-.962 6.032a.64.64 0 0 1-.632.537l-1.83.002v.002z" />
                        </svg>
                        <div>
                          <p className="font-medium">PayPal</p>
                          <p className="text-xs text-muted-foreground">PayPal account</p>
                        </div>
                      </div>
                    )}

                    {/* No payment methods enabled */}
                    {!paymentConfig.stripeEnabled && !paymentConfig.paypalEnabled && (
                      <div className="col-span-2 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800 dark:bg-yellow-950/30 dark:border-yellow-800 dark:text-yellow-200">
                        <p className="text-sm">
                          No payment method is configured.
                          Contact the administrator.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <div className="flex items-start gap-2">
                    <Lock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="font-medium mb-1">100% Secure Payment</p>
                      <p className="text-muted-foreground text-xs">
                        Your payment data is encrypted and secured.
                        We do not store any banking information.
                      </p>
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Pay {currencySymbol}{total.toFixed(2)}{appliedCoupon ? ` (${appliedCoupon.discountType === 'percentage' ? `-${appliedCoupon.discountValue}%` : 'discounted'})` : ''}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By clicking "Pay", you accept our terms and conditions of sale
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Checkout Confirmation Overlay */}
      {confirmedOrderId && (
        <CheckoutConfirmationOverlay
          orderId={confirmedOrderId}
          isOpen={showConfirmation}
          onClose={() => {
            setShowConfirmation(false)
            // Redirect to dashboard after closing
            router.push('/dashboard')
          }}
        />
      )}
    </div>
  )
}
