'use client'

import { useEffect, useState } from 'react'
import {
  Loader2,
  AlertCircle,
  X,
  Home
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { CheckoutConfirmationContent, Order } from './checkout-confirmation-content'

interface CheckoutConfirmationOverlayProps {
  orderId: string | undefined
  isOpen: boolean
  onClose: () => void
}

export function CheckoutConfirmationOverlay({ orderId, isOpen, onClose }: CheckoutConfirmationOverlayProps) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  // Fetch order data
  useEffect(() => {
    async function fetchData() {
      if (!orderId || !isOpen) {
        return
      }

      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/orders/${orderId}`)
        const data = await res.json()

        if (data.success) {
          setOrder(data.order)
          // Trigger entrance animation
          setTimeout(() => setIsVisible(true), 100)
        } else {
          setError(data.error || 'Order not found')
        }
      } catch (err) {
        console.error('[ConfirmationOverlay] Failed to fetch order:', err)
        // Create fallback order for display
        setOrder({
          id: orderId,
          orderNumber: `ORD-${orderId.slice(0, 8).toUpperCase()}`,
          status: 'completed',
          paymentStatus: 'pending',
          totalAmount: 0,
          createdAt: new Date().toISOString(),
          items: []
        })
        setTimeout(() => setIsVisible(true), 100)
      }

      setLoading(false)
    }

    fetchData()
  }, [orderId, isOpen])

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setIsVisible(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  // Loading state - fullscreen overlay
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your order...</p>
        </div>
      </div>
    )
  }

  // Error state - fullscreen overlay
  if (error && !order) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-destructive/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={onClose}>
                  <X className="w-4 h-4 mr-2" />
                  Close
                </Button>
                <Link href="/dashboard">
                  <Button>
                    <Home className="w-4 h-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!order) return null

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      {/* Close button */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 z-[60] p-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-lg"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Shared content component */}
      <CheckoutConfirmationContent
        order={order}
        isVisible={isVisible}
        variant="overlay"
      />
    </div>
  )
}
