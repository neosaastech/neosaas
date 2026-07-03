"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Loader2, Calendar, ShoppingBag, Package, FileDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getProducts, addToCart } from "@/app/actions/ecommerce"
import { toast } from "sonner"
import * as Icons from "lucide-react"

export default function PricingPage() {
  const router = useRouter()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isLoading, setIsLoading] = useState<string | null>(null)

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const { data } = await getProducts({ isPublished: true })
        setProducts(data || [])
      } catch (error) {
        console.error("Failed to load products:", error)
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [])

  const handlePurchase = async (productId: string) => {
    setIsLoading(productId)
    try {
      const result = await addToCart(productId)
      if (result.success) {
        toast.success("Product added to cart")
        router.push("/dashboard/checkout")
      } else {
        toast.error(result.error || "Error adding to cart")
      }
    } catch (error) {
      console.error("Purchase error:", error)
      toast.error("An error occurred")
    } finally {
      setIsLoading(null)
    }
  }

  // Get icon component for product type
  const getProductIcon = (product: any) => {
    // Try to get custom icon from product
    if (product.icon && (Icons as any)[product.icon]) {
      const IconComponent = (Icons as any)[product.icon]
      return <IconComponent className="h-6 w-6 text-brand" />
    }
    // Default icons based on type
    switch (product.type) {
      case 'appointment':
        return <Calendar className="h-6 w-6 text-brand" />
      case 'digital':
        return <FileDown className="h-6 w-6 text-brand" />
      case 'physical':
        return <Package className="h-6 w-6 text-brand" />
      default:
        return <ShoppingBag className="h-6 w-6 text-brand" />
    }
  }

  // Parse features from product
  const getProductFeatures = (product: any): string[] => {
    if (!product.features) return []
    if (Array.isArray(product.features)) {
      return product.features
    }
    if (typeof product.features === 'object') {
      return product.features.focusAreas || product.features.features || []
    }
    return []
  }

  // Get button text based on product type
  const getButtonText = (product: any) => {
    if (product.isFree) return "Free access"
    switch (product.type) {
      case 'appointment':
        return "Book appointment"
      case 'digital':
        return "Buy now"
      case 'physical':
        return "Order now"
      default:
        return "Buy now"
    }
  }

  // Format price display
  const formatPrice = (product: any) => {
    const currency = product.currency === 'USD' ? '$' : '€'

    if (product.isFree) {
      return { price: "Free", suffix: "", paymentLabel: "" }
    }

    // Subscription pricing
    if (product.paymentType === 'subscription') {
      if (product.subscriptionPriceMonthly) {
        return {
          price: `${currency}${(product.subscriptionPriceMonthly / 100).toFixed(0)}`,
          suffix: "/mo",
          paymentLabel: "subscription"
        }
      }
      if (product.subscriptionPriceYearly) {
        return {
          price: `${currency}${(product.subscriptionPriceYearly / 100).toFixed(0)}`,
          suffix: "/yr",
          paymentLabel: "subscription"
        }
      }
      if (product.subscriptionPriceWeekly) {
        return {
          price: `${currency}${(product.subscriptionPriceWeekly / 100).toFixed(0)}`,
          suffix: "/wk",
          paymentLabel: "subscription"
        }
      }
      return { price: "Subscription", suffix: "", paymentLabel: "subscription" }
    }

    // Hourly rate
    if (product.paymentType === 'hourly' || (product.hourlyRate && product.hourlyRate > 0)) {
      return {
        price: `${currency}${(product.hourlyRate / 100).toFixed(0)}`,
        suffix: "/hour",
        paymentLabel: "hourly"
      }
    }

    // One-time payment
    if (product.price && product.price > 0) {
      return {
        price: `${currency}${(product.price / 100).toFixed(0)}`,
        suffix: product.type === 'appointment' ? "/session" : "",
        paymentLabel: "one_time"
      }
    }

    return { price: "On request", suffix: "", paymentLabel: "" }
  }

  if (loading) {
    return (
      <div className="container py-12 md:py-24">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      </div>
    )
  }

  return (
    <div className="container py-12 md:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          Our Offers
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Discover our products and services to accelerate your project.
        </p>
      </div>

      {/* Products Grid */}
      {products.length > 0 ? (
        <div className="mx-auto mt-16 grid max-w-6xl gap-8 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const features = getProductFeatures(product)
            const { price, suffix, paymentLabel } = formatPrice(product)

            return (
              <Card
                key={product.id}
                className={`flex flex-col border-2 relative ${
                  product.isFeatured ? 'border-[#22C55E]' : ''
                }`}
              >
                {product.isFeatured && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-[#22C55E] text-white">Popular</Badge>
                  </div>
                )}

                {product.isFree && (
                  <div className="absolute -top-4 right-4">
                    <Badge className="bg-brand text-white">Free</Badge>
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
                      {getProductIcon(product)}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl">{product.title}</CardTitle>
                      {product.subtitle && (
                        <p className="text-sm text-muted-foreground mt-1">{product.subtitle}</p>
                      )}
                    </div>
                  </div>

                  {product.description && (
                    <CardDescription className="mt-4">
                      {product.description}
                    </CardDescription>
                  )}

                  <div className="mt-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">{price}</span>
                      {suffix && (
                        <span className="text-muted-foreground text-sm">{suffix}</span>
                      )}
                    </div>
                    {paymentLabel && !product.isFree && (
                      <span className={`inline-block mt-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        paymentLabel === 'subscription'
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                          : paymentLabel === 'hourly'
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {paymentLabel === 'subscription' ? 'Recurring subscription' : paymentLabel === 'hourly' ? 'Hourly rate' : 'One-time payment'}
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col">
                  {/* Features list */}
                  {features.length > 0 && (
                    <div className="space-y-2 mb-6">
                      <p className="text-sm font-semibold">Included:</p>
                      <ul className="space-y-2 text-sm">
                        {features.map((feature: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Purchase button - always at bottom */}
                  <div className="mt-auto">
                    <Button
                      className={`w-full ${
                        product.isFeatured
                          ? 'bg-[#22C55E] hover:bg-[#22C55E]/90'
                          : 'bg-brand hover:bg-[#B26B27]'
                      }`}
                      onClick={() => handlePurchase(product.id)}
                      disabled={isLoading === product.id}
                    >
                      {isLoading === product.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        getButtonText(product)
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="mx-auto mt-16 max-w-2xl text-center">
          <Card className="p-8">
            <div className="flex flex-col items-center gap-4">
              <ShoppingBag className="h-12 w-12 text-muted-foreground" />
              <h2 className="text-xl font-semibold">No offers available</h2>
              <p className="text-muted-foreground">
                Our offers will be available soon. Check back later.
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
