'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight, 
  Package,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { getCart, updateCartItemQuantity, removeFromCart } from '@/app/actions/ecommerce'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface CartItem {
  id: string
  productId: string
  quantity: number
  product: {
    id: string
    title: string
    description: string | null
    price: number
    currency: string
    imageUrl: string | null
    type: string
    vatRate?: {
      id: string
      rate: number
      name: string
      isActive: boolean
    } | null
  }
}

export default function CartPage() {
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [cartId, setCartId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    loadCart()
  }, [])

  const loadCart = async () => {
    console.log('[CartPage] 🛒 Loading cart')
    setLoading(true)
    
    try {
      const result = await getCart()
      
      if (result.success && result.data) {
        console.log('[CartPage] ✅ Cart loaded', {
          cartId: result.data.id,
          itemCount: result.data.items.length
        })

        setCartId(result.data.id)
        // Filter out any items with missing products (defensive programming)
        const validItems = (result.data.items as CartItem[]).filter(
          item => item.product && item.product.id && item.product.title
        )

        if (validItems.length !== result.data.items.length) {
          console.warn('[CartPage] ⚠️ Filtered out invalid cart items', {
            total: result.data.items.length,
            valid: validItems.length
          })
        }

        setCartItems(validItems)
      } else {
        console.log('[CartPage] ℹ️  Empty cart')
        setCartItems([])
      }
    } catch (error) {
      console.error('[CartPage] ❌ Failed to load cart:', error)
      toast.error('Error loading cart')
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (productId: string, newQuantity: number): Promise<void> => {
    if (newQuantity < 1) {
      return removeItem(productId)
    }
    
    console.log('[CartPage] 🔄 Updating quantity', { productId, newQuantity })
    setUpdating(productId)
    
    try {
      const result = await updateCartItemQuantity(productId, newQuantity)
      
      if (result.success) {
        toast.success('Quantity updated')
        await loadCart()
      } else {
        toast.error('Update error')
      }
    } catch (error) {
      console.error('[CartPage] ❌ Failed to update quantity:', error)
      toast.error('Update error')
    } finally {
      setUpdating(null)
    }
  }

  const removeItem = async (productId: string): Promise<void> => {
    console.log('[CartPage] 🗑️ Removing item', { productId })
    setUpdating(productId)
    
    try {
      const result = await removeFromCart(productId)
      
      if (result.success) {
        toast.success('Item removed from cart')
        await loadCart()
      } else {
        toast.error('Deletion error')
      }
    } catch (error) {
      console.error('[CartPage] ❌ Failed to remove item:', error)
      toast.error('Deletion error')
    } finally {
      setUpdating(null)
    }
  }

  const proceedToCheckout = () => {
    if (!cartId) {
      toast.error('Cart not found')
      return
    }
    
    console.log('[CartPage] ➡️  Proceeding to checkout', { cartId })
    router.push('/dashboard/checkout')
  }

  if (loading) {
    return (
      <div className="container max-w-6xl py-10">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
            <p className="text-muted-foreground">Loading cart...</p>
          </div>
        </div>
      </div>
    )
  }

  const subtotal = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0)

  // Calculate tax dynamically based on product VAT rates (stored in basis points: 2000 = 20%)
  const tax = cartItems.reduce((acc, item) => {
    const itemTotal = item.product.price * item.quantity
    const vatRate = item.product.vatRate?.rate ?? 0 // Use product VAT rate or 0 if not set
    // Divide by 10000 to convert basis points to decimal (2000 / 10000 = 0.20 = 20%)
    return acc + (itemTotal * vatRate / 10000)
  }, 0)

  // Check if any product has VAT configured
  const hasVat = cartItems.some(item => item.product.vatRate && item.product.vatRate.rate > 0)

  // Get average VAT rate for display (or most common) - convert from basis points to percentage
  const displayVatRate = hasVat
    ? (cartItems.find(item => item.product.vatRate?.rate)?.product.vatRate?.rate ?? 0) / 100
    : 0

  const total = subtotal + tax
  const currencySymbol = cartItems.length > 0 && cartItems[0].product.currency === 'USD' ? '$' : '€'

  return (
    <div className="container max-w-6xl py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Shopping Cart</h1>
        <p className="text-muted-foreground">
          {cartItems.length === 0 
            ? 'Your cart is empty' 
            : `${cartItems.length} item${cartItems.length > 1 ? 's' : ''} in your cart`
          }
        </p>
      </div>

      {cartItems.length === 0 ? (
        /* Empty Cart State */
        <Card>
          <CardContent className="pt-16 pb-16">
            <div className="text-center">
              <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Your cart is empty</h3>
              <p className="text-muted-foreground mb-6">
                Add products to start shopping
              </p>
              <Button asChild>
                <Link href="/dashboard">
                  Discover our products
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Cart with Items */
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      {item.product.imageUrl ? (
                        <img 
                          src={item.product.imageUrl} 
                          alt={item.product.title}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">{item.product.title}</h3>
                          {item.product.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {item.product.description}
                            </p>
                          )}
                          <Badge variant="outline" className="mt-2">
                            {item.product.type === 'digital' ? 'Digital' : 
                             item.product.type === 'service' ? 'Service' : 
                             'Product'}
                          </Badge>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-semibold text-lg">
                            {currencySymbol}{(item.product.price * item.quantity / 100).toFixed(2)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {currencySymbol}{(item.product.price / 100).toFixed(2)} × {item.quantity}
                          </p>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            disabled={updating === item.product.id || item.quantity <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const newQty = parseInt(e.target.value)
                              if (!isNaN(newQty) && newQty > 0) {
                                updateQuantity(item.product.id, newQty)
                              }
                            }}
                            className="w-16 text-center"
                            disabled={updating === item.product.id}
                          />
                          
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            disabled={updating === item.product.id}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeItem(item.product.id)}
                          disabled={updating === item.product.id}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Continue Shopping */}
            <Button variant="outline" asChild className="w-full">
              <Link href="/dashboard">
                Continue shopping
              </Link>
            </Button>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{currencySymbol}{(subtotal / 100).toFixed(2)}</span>
                  </div>
                  {hasVat && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">VAT ({displayVatRate}%)</span>
                      <span>{currencySymbol}{(tax / 100).toFixed(2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>{currencySymbol}{(total / 100).toFixed(2)}</span>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Instant delivery for digital products
                  </AlertDescription>
                </Alert>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={proceedToCheckout}
                >
                  Proceed to checkout
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Secure payment
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
