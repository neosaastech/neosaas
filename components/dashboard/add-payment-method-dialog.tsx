'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import { StripeCardFormAuto } from '@/components/dashboard/stripe-card-form'

interface AddPaymentMethodDialogProps {
  onSuccess?: () => void
}

export function AddPaymentMethodDialog({ onSuccess }: AddPaymentMethodDialogProps) {
  const [open, setOpen] = useState(false)

  const handleSuccess = () => {
    setOpen(false)
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Payment Method
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Payment Method</DialogTitle>
          <DialogDescription>
            Add a new card to your <strong>company account</strong>. The card will be linked to
            your company and accessible to all authorized members. Your card details are securely
            processed by Stripe.
          </DialogDescription>
        </DialogHeader>
        <StripeCardFormAuto onSuccess={handleSuccess} onCancel={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
