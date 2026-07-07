'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  getCompanyCards,
  removePaymentMethod,
  setDefaultCard,
  syncPaymentMethods,
} from '@/app/actions/stripe-payments'
import { AddPaymentMethodDialog } from '@/components/dashboard/add-payment-method-dialog'
import { CreditCard, Trash2, Star, RefreshCw, Calendar } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useUser } from '@/lib/contexts/user-context'

const WRITER_ROLES = ['writer', 'admin', 'super_admin']

type PaymentMethod = {
  id: string
  stripePaymentMethodId: string
  cardBrand: string | null
  cardLast4: string | null
  cardExpMonth: number | null
  cardExpYear: number | null
  isDefault: boolean
  isActive: boolean
  holderName: string | null
  createdAt: Date
  expiresAt: Date | null
}

export function PaymentMethodsManager() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
  const { toast } = useToast()
  const { hasRole } = useUser()
  const canManage = hasRole(WRITER_ROLES)

  const loadPaymentMethods = async () => {
    setLoading(true)
    const result = await getCompanyCards()

    if (result.success && result.data) {
      setPaymentMethods(result.data as PaymentMethod[])
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to load payment methods',
        variant: 'destructive',
      })
    }
    setLoading(false)
  }

  const handleSync = async () => {
    setSyncing(true)
    const result = await syncPaymentMethods()

    if (result.success) {
      toast({
        title: 'Sync Successful',
        description: `Updated ${result.data?.cardsAdded || 0} cards`,
      })
      await loadPaymentMethods()
    } else {
      toast({
        title: 'Sync Failed',
        description: result.error || 'Failed to sync payment methods',
        variant: 'destructive',
      })
    }
    setSyncing(false)
  }

  const handleSetDefault = async (paymentMethodId: string) => {
    const result = await setDefaultCard(paymentMethodId)

    if (result.success) {
      toast({
        title: 'Success',
        description: 'Default payment method updated',
      })
      await loadPaymentMethods()
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to set default card',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    if (!selectedMethod) return

    const result = await removePaymentMethod(selectedMethod)

    if (result.success) {
      toast({
        title: 'Success',
        description: 'Payment method removed',
      })
      await loadPaymentMethods()
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to remove payment method',
        variant: 'destructive',
      })
    }

    setDeleteDialogOpen(false)
    setSelectedMethod(null)
  }

  useEffect(() => {
    loadPaymentMethods()
  }, [])

  const getCardBrandIcon = (brand: string | null) => {
    if (!brand) return '💳'

    const brands: Record<string, string> = {
      visa: '💳',
      mastercard: '💳',
      amex: '💳',
      discover: '💳',
    }

    return brands[brand.toLowerCase()] || '💳'
  }

  const isExpired = (expiresAt: Date | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {canManage && (
          <div className="flex gap-2">
            <AddPaymentMethodDialog onSuccess={loadPaymentMethods} />
            <Button
              variant="outline"
              onClick={handleSync}
              disabled={syncing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              Sync with Stripe
            </Button>
          </div>
        )}
      </div>

      {paymentMethods.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="mb-4 h-12 w-12 text-gray-400" />
            <h3 className="text-lg font-semibold">No payment methods</h3>
            <p className="mt-2 text-sm text-gray-600">
              Add a payment method to start accepting payments
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {paymentMethods.map((method) => (
            <Card key={method.id} className={isExpired(method.expiresAt) ? 'border-red-200' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getCardBrandIcon(method.cardBrand)}</span>
                    <div>
                      <CardTitle className="text-lg capitalize">
                        {method.cardBrand || 'Card'}
                      </CardTitle>
                      <CardDescription>
                        •••• {method.cardLast4}
                      </CardDescription>
                    </div>
                  </div>
                  {method.isDefault && (
                    <Badge variant="default" className="gap-1">
                      <Star className="h-3 w-3" />
                      Default
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {method.holderName && (
                  <p className="text-sm text-gray-600">{method.holderName}</p>
                )}

                <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Expires {method.cardExpMonth}/{method.cardExpYear}
                  </span>
                  {isExpired(method.expiresAt) && (
                    <Badge variant="destructive" className="ml-2">
                      Expired
                    </Badge>
                  )}
                </div>
              </CardContent>

              {canManage && (
                <CardFooter className="flex gap-2">
                  {!method.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleSetDefault(method.stripePaymentMethodId)}
                    >
                      Set as Default
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedMethod(method.stripePaymentMethodId)
                      setDeleteDialogOpen(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove payment method?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the payment method from your company account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
