"use client"

import { useState, useEffect } from "react"
import { loadStripe, type Stripe } from "@stripe/stripe-js"
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CreditCard, AlertCircle, User } from "lucide-react"

// ============================================================================
// Inner form: uses Stripe hooks (must be inside <Elements>)
// ============================================================================

interface CardFormInnerProps {
  clientSecret: string
  /** Called with the Stripe PaymentMethod ID once the card is confirmed */
  onSuccess: (paymentMethodId: string) => void
  onCancel: () => void
}

function CardFormInner({ clientSecret, onSuccess, onCancel }: CardFormInnerProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cardComplete, setCardComplete] = useState(false)
  /** Cardholder name — required for B2B compliance and holderName storage */
  const [holderName, setHolderName] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) return

    // Validate cardholder name
    if (!holderName.trim()) {
      setError("Cardholder name is required")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // billing_details.name is sent to Stripe so it appears on the payment method
      // (visible in Stripe Dashboard) and is stored locally in payment_methods.holder_name.
      const { error: confirmError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: holderName.trim(),
          },
        },
      })

      if (confirmError) {
        setError(confirmError.message || "Card setup failed")
      } else if (setupIntent?.payment_method) {
        // Extract the payment method ID (may be an object or a string)
        const pmId =
          typeof setupIntent.payment_method === "string"
            ? setupIntent.payment_method
            : setupIntent.payment_method.id
        onSuccess(pmId)
      } else {
        setError("Card confirmed but payment method ID is missing. Please sync manually.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Cardholder name — B2B: registered on behalf of the company */}
      <div className="space-y-1.5">
        <Label htmlFor="holder-name" className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" />
          Cardholder Name
          <span className="text-red-500">*</span>
        </Label>
        <Input
          id="holder-name"
          type="text"
          placeholder="Name as it appears on the card"
          value={holderName}
          onChange={(e) => setHolderName(e.target.value)}
          disabled={loading}
          required
          autoComplete="cc-name"
        />
        <p className="text-xs text-muted-foreground">
          This name is stored on the Stripe payment method for audit purposes.
        </p>
      </div>

      {/* Stripe card element */}
      <div className="space-y-1.5">
        <Label>Card Details</Label>
        <div className="rounded-lg border p-4 bg-white dark:bg-gray-950">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#1a1a1a",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  "::placeholder": {
                    color: "#9ca3af",
                  },
                },
                invalid: {
                  color: "#dc2626",
                },
              },
              hidePostalCode: false,
            }}
            onChange={(event) => {
              setCardComplete(event.complete)
              if (event.error) {
                setError(event.error.message)
              } else {
                setError(null)
              }
            }}
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={!stripe || !cardComplete || !holderName.trim() || loading}
          className="flex-1 bg-brand hover:bg-brand-hover text-white"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="mr-2 h-4 w-4" />
          )}
          {loading ? "Saving..." : "Save Card"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Your card details are securely processed by Stripe. We never store your full card number.
      </p>
    </form>
  )
}

// ============================================================================
// Wrapper: loads Stripe + Elements provider
// ============================================================================

interface StripeCardFormProps {
  clientSecret: string
  publishableKey: string
  /** Called with the confirmed Stripe PaymentMethod ID */
  onSuccess: (paymentMethodId: string) => void
  onCancel: () => void
}

export function StripeCardForm({ clientSecret, publishableKey, onSuccess, onCancel }: StripeCardFormProps) {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)

  useEffect(() => {
    setStripePromise(loadStripe(publishableKey))
  }, [publishableKey])

  if (!stripePromise) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <Elements stripe={stripePromise}>
      <CardFormInner
        clientSecret={clientSecret}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  )
}

// ============================================================================
// Auto-loading wrapper: fetches setup intent, confirms PM, saves to DB
// ============================================================================

interface StripeCardFormAutoProps {
  /** Called once the card is saved in the database (company-linked) */
  onSuccess?: () => void
  onCancel?: () => void
}

export function StripeCardFormAuto({ onSuccess, onCancel }: StripeCardFormAutoProps) {
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [publishableKey, setPublishableKey] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        // Import actions dynamically to avoid circular dependencies
        const { createCardSetupIntent } = await import('@/app/actions/stripe-payments')
        const { getStripeCredentials } = await import('@/lib/stripe')

        // Get Stripe credentials (publishable key for Elements)
        const credentials = await getStripeCredentials(false)
        if (!credentials) {
          throw new Error('Stripe not configured')
        }

        // Create a SetupIntent tied to the company's Stripe customer
        const result = await createCardSetupIntent()
        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to create setup intent')
        }

        setPublishableKey(credentials.publishableKey)
        setClientSecret(result.data.clientSecret)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize')
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  /**
   * Called by CardFormInner after Stripe confirms the setup.
   * We receive the PaymentMethod ID and persist it in our DB
   * under the user's company — this is the critical B2B link.
   */
  const handleSuccess = async (paymentMethodId: string) => {
    setConfirming(true)
    setError(null)
    try {
      const { confirmPaymentMethodAdded } = await import('@/app/actions/stripe-payments')
      const result = await confirmPaymentMethodAdded(paymentMethodId)
      if (!result.success) {
        setError(result.error || 'Failed to save card to your company account')
        return
      }
      // Card is now linked to the company — notify parent
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save card')
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
      </div>
    )
  }

  if (confirming) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Saving card to your company account...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-3 py-4">
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setError(null); setLoading(true) }}>
          Retry
        </Button>
      </div>
    )
  }

  if (!clientSecret || !publishableKey) {
    return null
  }

  return (
    <StripeCardForm
      clientSecret={clientSecret}
      publishableKey={publishableKey}
      onSuccess={handleSuccess}
      onCancel={onCancel || (() => {})}
    />
  )
}
