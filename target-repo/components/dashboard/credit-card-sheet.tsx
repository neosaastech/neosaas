"use client"

import { useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Check, CreditCard, Loader2, Plus, Star, Trash2 } from "lucide-react"
import {
  createStripeSetupIntent,
  deleteStripePaymentMethod,
  setDefaultPaymentMethod,
} from "@/app/actions/payments"
import { confirmPaymentMethodAdded } from "@/app/actions/stripe-payments"
import { StripeCardForm } from "@/components/dashboard/stripe-card-form"
import { toast } from "sonner"
import { useUser } from "@/lib/contexts/user-context"

const WRITER_ROLES = ['writer', 'admin', 'super_admin']

// ============================================================================
// Card brand SVG logos
// ============================================================================

function VisaLogo({ className = "w-10 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#1A1F71" />
      <path d="M19.5 21H17L18.8 11H21.3L19.5 21Z" fill="white" />
      <path d="M28.5 11.2C28 11 27.1 10.8 26 10.8C23.5 10.8 21.7 12.1 21.7 14C21.7 15.4 23 16.2 23.9 16.7C24.9 17.2 25.2 17.5 25.2 17.9C25.2 18.5 24.5 18.8 23.8 18.8C22.8 18.8 22.3 18.7 21.5 18.3L21.2 18.2L20.9 20.2C21.5 20.5 22.6 20.7 23.8 20.7C26.5 20.7 28.2 19.4 28.2 17.4C28.2 16.3 27.5 15.5 26.1 14.8C25.3 14.3 24.8 14 24.8 13.5C24.8 13.1 25.3 12.7 26.2 12.7C27 12.7 27.6 12.9 28.1 13.1L28.3 13.2L28.5 11.2Z" fill="white" />
      <path d="M32.5 11H30.5C29.9 11 29.4 11.2 29.2 11.8L25.5 21H28.2L28.7 19.5H32L32.3 21H34.7L32.5 11ZM29.5 17.5L30.7 14L31.5 17.5H29.5Z" fill="white" />
      <path d="M16.5 11L14 17.9L13.7 16.4C13.2 14.8 11.7 13 10 12.2L12.3 21H15L19 11H16.5Z" fill="white" />
      <path d="M12.5 11H8.2L8.2 11.2C11.5 12 13.7 14 14.5 16.4L13.7 11.8C13.5 11.2 13 11 12.5 11Z" fill="#F9A533" />
    </svg>
  )
}

function MastercardLogo({ className = "w-10 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#252525" />
      <circle cx="19" cy="16" r="8" fill="#EB001B" />
      <circle cx="29" cy="16" r="8" fill="#F79E1B" />
      <path d="M24 10.3C25.9 11.8 27.1 13.8 27.1 16C27.1 18.2 25.9 20.2 24 21.7C22.1 20.2 20.9 18.2 20.9 16C20.9 13.8 22.1 11.8 24 10.3Z" fill="#FF5F00" />
    </svg>
  )
}

function AmexLogo({ className = "w-10 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#006FCF" />
      <path d="M8 13L10.5 8H13L15.5 13H13.5L13 12H10.5L10 13H8ZM11.8 9.5L11 11H12.5L11.8 9.5Z" fill="white" />
      <text x="8" y="23" fill="white" fontSize="7" fontWeight="bold" fontFamily="Arial">AMEX</text>
    </svg>
  )
}

function GenericCardLogo({ className = "w-10 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#6B7280" />
      <rect x="6" y="8" width="10" height="7" rx="1" fill="#9CA3AF" />
      <rect x="6" y="20" width="20" height="2" rx="1" fill="#9CA3AF" />
      <rect x="6" y="24" width="14" height="2" rx="1" fill="#9CA3AF" />
    </svg>
  )
}

function getCardBrandLogo(brand: string, className?: string) {
  switch (brand.toLowerCase()) {
    case 'visa':
      return <VisaLogo className={className} />
    case 'mastercard':
    case 'master_card':
    case 'mc':
      return <MastercardLogo className={className} />
    case 'amex':
    case 'american_express':
    case 'americanexpress':
      return <AmexLogo className={className} />
    default:
      return <GenericCardLogo className={className} />
  }
}

function formatBrandName(brand: string): string {
  switch (brand.toLowerCase()) {
    case 'visa': return 'Visa'
    case 'mastercard':
    case 'master_card':
    case 'mc': return 'Mastercard'
    case 'amex':
    case 'american_express':
    case 'americanexpress': return 'American Express'
    default: return brand.charAt(0).toUpperCase() + brand.slice(1)
  }
}

// ============================================================================
// Types
// ============================================================================

export interface PaymentCard {
  id: string
  brand: string
  last4: string
  exp_month: number
  exp_year: number
  is_default: boolean
}

interface CreditCardSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cards: PaymentCard[]
  onRefresh: () => void
}

// ============================================================================
// Component
// ============================================================================

export function CreditCardSheet({ open, onOpenChange, cards, onRefresh }: CreditCardSheetProps) {
  const [showCardForm, setShowCardForm] = useState(false)
  const [setupData, setSetupData] = useState<{ clientSecret: string; publishableKey: string } | null>(null)
  const [isLoadingSetup, setIsLoadingSetup] = useState(false)
  const [isSavingCard, setIsSavingCard] = useState(false)
  const [deletingCard, setDeletingCard] = useState<string | null>(null)
  const [settingDefault, setSettingDefault] = useState<string | null>(null)
  const { hasRole } = useUser()
  const canManage = hasRole(WRITER_ROLES)

  const handleAddCard = async () => {
    setIsLoadingSetup(true)
    try {
      const response = await createStripeSetupIntent()
      if (response.success && response.clientSecret && response.publishableKey) {
        setSetupData({
          clientSecret: response.clientSecret,
          publishableKey: response.publishableKey,
        })
        setShowCardForm(true)
      } else {
        toast.error(response.error || "Could not initialize card setup")
      }
    } catch {
      toast.error("Failed to initialize card setup")
    } finally {
      setIsLoadingSetup(false)
    }
  }

  const handleCardSaved = async (paymentMethodId: string) => {
    // Persist the card in our DB, linked to the company
    setIsSavingCard(true)
    try {
      const result = await confirmPaymentMethodAdded(paymentMethodId)
      if (!result.success) {
        toast.error(result.error || "Failed to save card to your company account")
        return
      }
      setShowCardForm(false)
      setSetupData(null)
      toast.success("Card saved to your company account!")
      onRefresh()
    } catch {
      toast.error("Failed to save card")
    } finally {
      setIsSavingCard(false)
    }
  }

  const handleCancelForm = () => {
    setShowCardForm(false)
    setSetupData(null)
  }

  const handleDeleteCard = async (cardId: string) => {
    setDeletingCard(cardId)
    try {
      const response = await deleteStripePaymentMethod(cardId)
      if (response.success) {
        toast.success("Card removed")
        onRefresh()
      } else {
        toast.error(response.error || "Failed to remove card")
      }
    } catch {
      toast.error("Failed to remove card")
    } finally {
      setDeletingCard(null)
    }
  }

  const handleSetDefault = async (cardId: string) => {
    setSettingDefault(cardId)
    try {
      const response = await setDefaultPaymentMethod(cardId)
      if (response.success) {
        toast.success("Default card updated")
        onRefresh()
      } else {
        toast.error(response.error || "Failed to set default card")
      }
    } catch {
      toast.error("Failed to set default card")
    } finally {
      setSettingDefault(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(value) => {
      if (!value) {
        setShowCardForm(false)
        setSetupData(null)
      }
      onOpenChange(value)
    }}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Methods
          </SheetTitle>
          <SheetDescription>
            Manage your credit and debit cards
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Add Card Section — writer and above only */}
          {canManage && (
            <>
              {showCardForm && setupData ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Add a new card</p>
                  {isSavingCard ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Saving card to your company account…
                    </div>
                  ) : (
                    <StripeCardForm
                      clientSecret={setupData.clientSecret}
                      publishableKey={setupData.publishableKey}
                      onSuccess={handleCardSaved}
                      onCancel={handleCancelForm}
                    />
                  )}
                </div>
              ) : (
                <Button
                  onClick={handleAddCard}
                  disabled={isLoadingSetup}
                  className="w-full bg-brand hover:bg-brand-hover text-white"
                >
                  {isLoadingSetup ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Add a Card
                </Button>
              )}
              <Separator />
            </>
          )}

          {/* Card List */}
          {cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No cards saved</p>
              <p className="text-xs text-muted-foreground max-w-[240px]">
                Add a credit or debit card to make payments faster.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                {cards.length} card{cards.length > 1 ? 's' : ''} saved
              </p>

              {cards.map((card) => (
                <div
                  key={card.id}
                  className="flex items-center gap-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                >
                  {/* Brand Logo */}
                  <div className="flex-shrink-0">
                    {getCardBrandLogo(card.brand, "w-12 h-8")}
                  </div>

                  {/* Card Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {formatBrandName(card.brand)}
                      </span>
                      {card.is_default && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">
                          <Star className="w-3 h-3 mr-0.5 fill-current" />
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">
                      **** **** **** {card.last4}
                    </p>
                    {card.exp_month > 0 && card.exp_year > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Expires {String(card.exp_month).padStart(2, '0')}/{card.exp_year}
                      </p>
                    )}
                  </div>

                  {/* Actions — writer and above only */}
                  {canManage && (
                    <div className="flex flex-col gap-1">
                      {!card.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleSetDefault(card.id)}
                          disabled={settingDefault === card.id}
                        >
                          {settingDefault === card.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3 mr-1" />
                          )}
                          Default
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                        onClick={() => handleDeleteCard(card.id)}
                        disabled={deletingCard === card.id}
                      >
                        {deletingCard === card.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3 mr-1" />
                        )}
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <Separator />

          {/* Refresh */}
          <Button
            variant="ghost"
            onClick={() => { onRefresh(); toast.info("Refreshing...") }}
            className="w-full"
            size="sm"
          >
            Refresh Card List
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ============================================================================
// Inline card display for the payments page
// ============================================================================

export function CreditCardItem({
  card,
  onSetDefault,
  isSettingDefault = false,
}: {
  card: PaymentCard
  onSetDefault?: () => void
  isSettingDefault?: boolean
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border-2 hover:border-brand transition-colors p-5 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
      <div className="flex items-start justify-between mb-6">
        <div className="flex-shrink-0">
          {getCardBrandLogo(card.brand, "w-14 h-9")}
        </div>
        {card.is_default && (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs dark:bg-green-900 dark:text-green-200">
            <Check className="w-3 h-3 mr-1" />
            Default
          </Badge>
        )}
      </div>

      <p className="font-mono text-lg tracking-widest text-foreground mb-4">
        **** **** **** {card.last4}
      </p>

      <div className="flex items-center justify-between text-sm">
        <div>
          <p className="text-xs text-muted-foreground uppercase">Card</p>
          <p className="font-medium">{formatBrandName(card.brand)}</p>
        </div>
        {card.exp_month > 0 && card.exp_year > 0 && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase">Expires</p>
            <p className="font-medium">{String(card.exp_month).padStart(2, '0')}/{card.exp_year}</p>
          </div>
        )}
      </div>

      {onSetDefault && (
        <div className="mt-4 pt-3 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={onSetDefault}
            disabled={isSettingDefault}
          >
            {isSettingDefault ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
            ) : (
              <Star className="h-3 w-3 mr-1.5" />
            )}
            Set as default
          </Button>
        </div>
      )}
    </div>
  )
}
