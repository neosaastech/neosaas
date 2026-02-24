"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CreditCard, Lock, Mail, Calendar, CheckCircle2, Zap, Shield, TrendingUp, Info, ShoppingBag, Loader2 } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getProducts } from "@/app/actions/ecommerce"
import { ImpersonationBanner } from "@/components/admin/impersonation-banner"

import { useCart } from "@/contexts/cart-context"

export default function DashboardPage() {
  const router = useRouter()
  const [showProfileAlert, setShowProfileAlert] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const { addToCart } = useCart()

  useEffect(() => {
    const loadData = async () => {
      // Load user data
      const userStr = localStorage.getItem("user")
      if (userStr) {
        try {
          const user = JSON.parse(userStr)
          if (user.lastName === "User") {
            setShowProfileAlert(true)
          }
        } catch (e) {
          console.error("Error parsing user data", e)
        }
      }

      // Load products
      try {
        const result = await getProducts({ isPublished: true })
        if (result.success && result.data) {
          setProducts(result.data)
        }
      } catch (error) {
        console.error("Failed to load products", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  return (
    <div className="space-y-8">
      {/* Bandeau d'impersonnation admin */}
      <ImpersonationBanner />

      {showProfileAlert && (
        <Alert className="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
          <Info className="h-4 w-4" />
          <AlertTitle>Complete your profile</AlertTitle>
          <AlertDescription>
            Please complete your profile to personalize your account.{" "}
            <Link href="/dashboard/profile" className="underline font-medium hover:text-blue-600 dark:hover:text-blue-100">
              Go to Profile
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Hero Section - NeoSaaS Bronze theme */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-[#1A1A1A] to-brand p-8 text-white">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Welcome to your Dashboard</h1>
          <p className="text-white/90 max-w-2xl">
            Manage your services, track your usage, and explore our marketplace.
          </p>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/10 to-transparent" />
      </div>

      {/* Dynamic Products Section */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Available Offers</h2>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[300px] rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Card key={product.id} className="flex flex-col overflow-hidden">
                {/* Image du produit */}
                {product.imageUrl && (
                  <div className="relative w-full h-48 bg-gradient-to-br from-brand/10 to-[#1A1A1A]/5">
                    <img 
                      src={product.imageUrl} 
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="bg-brand/10 text-brand">
                      Offer
                    </Badge>
                    <span className="font-bold text-lg">{(product.price / 100).toFixed(2)} €</span>
                  </div>
                  <CardTitle className="mt-2">{product.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{product.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                      <span>Instant Access</span>
                    </div>
                    <div className="flex items-center">
                      <Shield className="mr-2 h-4 w-4 text-green-500" />
                      <span>Secure Payment</span>
                    </div>
                  </div>
                </CardContent>
                <div className="p-6 pt-0 mt-auto">
                  <Button 
                    className="w-full bg-[#1A1A1A] hover:bg-[#1A1A1A]/90"
                    onClick={async () => {
                      setPurchasing(product.id)
                      try {
                        await addToCart(product.id)
                        // Wait a brief moment for the cart to update
                        await new Promise(resolve => setTimeout(resolve, 500))
                        router.push('/dashboard/checkout')
                      } catch (error) {
                        console.error('[Dashboard] Failed to add to cart:', error)
                      } finally {
                        setPurchasing(null)
                      }
                    }}
                    disabled={purchasing === product.id}
                  >
                    {purchasing === product.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        Purchase Now
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border rounded-lg bg-muted/10 border-dashed">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4 mx-auto" />
            <h3 className="text-lg font-semibold">No offers available yet</h3>
            <p className="text-muted-foreground">Check back later for new products.</p>
          </div>
        )}
      </div>
    </div>
  )
}
