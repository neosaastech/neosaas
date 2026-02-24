'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Legacy Lago checkout page — redirects to the standard Stripe checkout.
 * Lago has been removed; all payments are now handled directly via Stripe.
 */
export default function CheckoutLagoRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/checkout')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground text-sm">Redirecting to checkout…</p>
    </div>
  )
}
