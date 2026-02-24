"use client"

import { Button } from "@/components/ui/button"
import { Check, Info, Download } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import * as Icons from "lucide-react"
import { cn } from "@/lib/utils"

import { addToCart } from "@/app/actions/ecommerce"
import { toast } from "sonner"

interface Product {
  id: string
  title: string
  subtitle?: string | null
  description?: string | null
  price: number
  hourlyRate?: number | null
  features?: unknown
  type?: string | null
  icon?: string | null
  currency?: string | null
  fileUrl?: string | null
  outlookEventTypeId?: string | null
  paymentType?: string | null
  subscriptionPriceWeekly?: number | null
  subscriptionPriceMonthly?: number | null
  subscriptionPriceYearly?: number | null
}

export function PricingGrid({ products }: { products: Product[] }) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handlePurchase = async (product: Product) => {
    // Handle Free Product Redirection
    if (product.price === 0) {
      if (product.fileUrl) {
        window.location.href = product.fileUrl
        return
      }
      // Fallback for free product with no URL
      toast.info("This is a free product. Please contact us for access.")
      return
    }

    setLoadingId(product.id)
    
    // Check if user is logged in (simplified check via localStorage)
    const isAuthenticated = localStorage.getItem("userProfile")

    if (isAuthenticated) {
      try {
        // Add to cart immediately
        const result = await addToCart(product.id)
        if (result.success) {
          router.push("/dashboard/checkout")
        } else {
          // Fallback: If server add fails (e.g. auth issue), redirect to checkout with param
          // The protected page will handle auth redirection if needed
          router.push(`/dashboard/checkout?module=${product.id}`)
        }
      } catch (error) {
        console.error(error)
        // Fallback on error
        router.push(`/dashboard/checkout?module=${product.id}`)
      } finally {
        setLoadingId(null)
      }
    } else {
      // Redirect to register, then to checkout (which will handle adding to cart via query param if needed, 
      // but ideally we should pass the product ID to be added after login)
      router.push(`/auth/register?redirect=/dashboard/checkout?module=${product.id}`)
    }
  }

  return (
    <div className="mx-auto mt-16 grid max-w-6xl gap-8 md:grid-cols-2 lg:grid-cols-4">
      {products.map((product) => {
        const Icon = product.icon && (Icons as any)[product.icon] ? (Icons as any)[product.icon] : null
        
        // Handle features structure (legacy array or new object)
        let focusAreas: string[] = []
        let deliverables: string[] = []
        
        if (Array.isArray(product.features)) {
          focusAreas = product.features as string[]
        } else if (typeof product.features === 'object' && product.features !== null) {
          const f = product.features as { focusAreas?: string[], deliverables?: string[] }
          focusAreas = f.focusAreas || []
          deliverables = f.deliverables || []
        }

        const isFree = product.price === 0 && !product.hourlyRate
        const hasHourlyRate = !!product.hourlyRate && product.hourlyRate > 0
        const isSubscription = product.paymentType === 'subscription'
        const isPro = product.title === "Pro"
        const currencySymbol = product.currency === 'EUR' ? '€' : '$'

        // Determine subscription display price
        let subscriptionPrice: number | null = null
        let subscriptionSuffix = ''
        if (isSubscription) {
          if (product.subscriptionPriceMonthly) {
            subscriptionPrice = product.subscriptionPriceMonthly / 100
            subscriptionSuffix = '/mo'
          } else if (product.subscriptionPriceYearly) {
            subscriptionPrice = product.subscriptionPriceYearly / 100
            subscriptionSuffix = '/yr'
          } else if (product.subscriptionPriceWeekly) {
            subscriptionPrice = product.subscriptionPriceWeekly / 100
            subscriptionSuffix = '/wk'
          }
        }

        // Determine payment label
        const paymentLabel = isFree ? '' : isSubscription ? 'subscription' : hasHourlyRate || product.paymentType === 'hourly' ? 'hourly' : 'one_time'

        return (
          <div 
            key={product.id} 
            data-slot="card"
            className={cn(
              "bg-card text-card-foreground gap-6 rounded-xl py-6 shadow-sm flex flex-col border-2",
              isPro ? "border-[#22C55E] relative" : ""
            )}
          >
            {isPro && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span data-slot="badge" className="inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 bg-[#22C55E] text-white">
                  Most popular
                </span>
              </div>
            )}

            <div data-slot="card-header" className="@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {Icon && (
                    <div className="h-12 w-12 rounded-full bg-brand/20 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-brand" />
                    </div>
                  )}
                  <div>
                    <div data-slot="card-title" className="font-semibold text-2xl">{product.title}</div>
                    <div data-slot="card-description" className="text-muted-foreground text-sm mt-1">{product.subtitle}</div>
                  </div>
                </div>
                {isFree && (
                  <span data-slot="badge" className="inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 bg-brand text-white">
                    FREE
                  </span>
                )}
              </div>

              {/* Priorité : Abonnement > Taux horaire > Prix standard > Gratuit */}
              <div className="mt-6">
                {isSubscription && subscriptionPrice !== null ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      {currencySymbol}{subscriptionPrice}
                    </span>
                    <span className="text-lg text-muted-foreground">{subscriptionSuffix}</span>
                  </div>
                ) : hasHourlyRate ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      {currencySymbol}{product.hourlyRate! / 100}
                    </span>
                    <span className="text-lg text-muted-foreground">/h</span>
                  </div>
                ) : !isFree ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      {currencySymbol}{product.price / 100}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">Free</span>
                  </div>
                )}
                {paymentLabel && (
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
            </div>

            <div data-slot="card-content" className="px-6 flex-1 space-y-4">
              {!isFree ? (
                <button 
                  data-slot="button"
                  className={cn(
                    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] h-9 px-4 py-2 w-full",
                    isPro 
                      ? "bg-[#22C55E] hover:bg-[#22C55E]/90 text-primary-foreground shadow-xs" 
                      : "border shadow-xs hover:bg-accent hover:text-accent-foreground bg-transparent"
                  )}
                  onClick={() => handlePurchase(product)}
                  disabled={loadingId === product.id}
                >
                  {loadingId === product.id ? "Processing..." : "Get started"}
                </button>
              ) : (
                 <p className="text-muted-foreground">{product.description}</p>
              )}

              {focusAreas.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Possible focus areas:</p>
                  <ul className="space-y-2 text-sm">
                    {focusAreas.map((feature: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {deliverables.length > 0 && (
                <div className="space-y-2 pt-4 border-t">
                  <p className="text-sm font-semibold">You'll receive:</p>
                  <ul className="space-y-2 text-sm">
                    {deliverables.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {isFree && (
              <div data-slot="card-footer" className="flex items-center px-6 [.border-t]:pt-6">
                <button 
                  onClick={() => handlePurchase(product)}
                  data-slot="button" 
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all h-10 rounded-md px-6 w-full bg-brand hover:bg-[#B26B27] text-primary-foreground"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Access Now
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
