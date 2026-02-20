'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Calendar,
  Check,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Clock,
  CheckCircle2,
  Mail,
  Phone,
  CalendarCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AppointmentBooking } from '@/components/checkout/appointment-booking'
import { toast } from 'sonner'

interface OrderItem {
  id: string
  itemType: string
  itemId: string | null
  itemName: string
  itemDescription: string | null
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface Order {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  totalAmount: number
  currency: string
  createdAt: string
  items: OrderItem[]
}

interface BookedAppointment {
  itemId: string
  itemName: string
  startTime: string
  endTime: string
  timezone: string
  attendeeName: string
  attendeeEmail: string
}

interface ConfirmationData {
  appointmentId: string
  itemName: string
  startTime: string
  endTime: string
  attendeeName: string
  attendeeEmail: string
  emailSent: boolean
}

export default function BookAppointmentPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get('orderId')

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bookedAppointments, setBookedAppointments] = useState<Map<string, BookedAppointment>>(new Map())
  const [currentItemIndex, setCurrentItemIndex] = useState(0)
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [confirmationData, setConfirmationData] = useState<ConfirmationData | null>(null)

  // Filter appointment items
  const appointmentItems = order?.items.filter(item => item.itemType === 'appointment') || []
  const currentItem = appointmentItems[currentItemIndex]
  const allBooked = appointmentItems.length > 0 && bookedAppointments.size === appointmentItems.length

  useEffect(() => {
    async function fetchOrder() {
      if (!orderId) {
        setError('ID de commande manquant')
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`/api/orders/${orderId}`)
        const data = await res.json()

        if (data.success) {
          setOrder(data.order)

          // Check if there are appointment items
          const appointments = data.order.items.filter((item: OrderItem) => item.itemType === 'appointment')
          if (appointments.length === 0) {
            // No appointments to book, redirect to confirmation
            router.push(`/dashboard/checkout/confirmation?orderId=${orderId}`)
            return
          }
        } else {
          setError(data.error || 'Commande non trouvee')
        }
      } catch (err) {
        console.error('[BookAppointment] Error loading order:', err)
        setError('Erreur de connexion')
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId, router])

  const handleAppointmentBooked = async (data: {
    startTime: string
    endTime: string
    timezone: string
    attendeeEmail: string
    attendeeName: string
    attendeePhone?: string
    notes?: string
  }) => {
    if (!currentItem || !currentItem.itemId) return

    try {
      // Create the appointment via API
      console.log('[BookAppointment] Creating appointment for:', currentItem.itemName)
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: currentItem.itemId,
          title: currentItem.itemName,
          description: currentItem.itemDescription || '',
          startTime: data.startTime,
          endTime: data.endTime,
          timezone: data.timezone,
          attendeeEmail: data.attendeeEmail,
          attendeeName: data.attendeeName,
          attendeePhone: data.attendeePhone,
          notes: data.notes,
          price: currentItem.unitPrice,
          currency: order?.currency || 'EUR',
          type: 'paid', // Paid appointment from checkout
          status: 'confirmed',
          isPaid: true,
          syncToCalendar: true
        })
      })

      const result = await res.json()

      if (result.success) {
        const appointmentId = result.data?.id
        let emailSent = false

        // Send email notifications (client + admin)
        if (appointmentId) {
          console.log('[BookAppointment] Sending notifications for appointment:', appointmentId)
          try {
            const notifyRes = await fetch(`/api/appointments/${appointmentId}/notify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            })
            const notifyResult = await notifyRes.json()
            console.log('[BookAppointment] Notification result:', notifyResult)
            emailSent = notifyResult.success && notifyResult.results?.clientEmail?.success
          } catch (notifyErr) {
            console.error('[BookAppointment] Failed to send notifications:', notifyErr)
          }
        }

        // Record the booked appointment
        setBookedAppointments(prev => {
          const newMap = new Map(prev)
          newMap.set(currentItem.id, {
            itemId: currentItem.id,
            itemName: currentItem.itemName,
            startTime: data.startTime,
            endTime: data.endTime,
            timezone: data.timezone,
            attendeeName: data.attendeeName,
            attendeeEmail: data.attendeeEmail
          })
          return newMap
        })

        // Show confirmation dialog
        setConfirmationData({
          appointmentId: appointmentId || '',
          itemName: currentItem.itemName,
          startTime: data.startTime,
          endTime: data.endTime,
          attendeeName: data.attendeeName,
          attendeeEmail: data.attendeeEmail,
          emailSent
        })
        setConfirmationOpen(true)
      } else {
        toast.error(result.error || 'Erreur lors de la creation du rendez-vous')
      }
    } catch (err) {
      console.error('[BookAppointment] Error creating appointment:', err)
      toast.error('Erreur de connexion')
    }
  }

  const handleFinish = () => {
    router.push(`/dashboard/checkout/confirmation?orderId=${orderId}`)
  }

  const handleConfirmationClose = () => {
    setConfirmationOpen(false)
    setConfirmationData(null)

    // Move to next appointment or stay on success view
    if (currentItemIndex < appointmentItems.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
        <p className="text-muted-foreground">Chargement de votre commande...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {error}
              </h2>
              <p className="text-gray-600 mb-6">
                Impossible de charger les details de la commande.
              </p>
              <Link href="/dashboard">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour au dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // All appointments booked - show success
  if (allBooked) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 p-6">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Tous vos rendez-vous sont confirmes !</h1>
          <p className="text-white/80">Vous recevrez un email de confirmation pour chaque rendez-vous.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Recapitulatif de vos rendez-vous
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {appointmentItems.map((item) => {
              const booking = bookedAppointments.get(item.id)
              return (
                <div key={item.id} className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium">{item.itemName}</p>
                    {booking && (
                      <p className="text-sm text-gray-600">
                        {new Date(booking.startTime).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <div className="flex justify-center gap-4">
          <Link href="/dashboard/appointments">
            <Button variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              Voir mes rendez-vous
            </Button>
          </Link>
          <Button onClick={handleFinish} className="bg-brand hover:bg-[#B8860B]">
            Terminer
          </Button>
        </div>
      </div>
    )
  }

  // Show booking interface
  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Planifier vos rendez-vous</h1>
          <p className="text-muted-foreground">
            Commande {order?.orderNumber}
          </p>
        </div>
        <Badge variant="outline" className="text-base px-4 py-2">
          {currentItemIndex + 1} / {appointmentItems.length}
        </Badge>
      </div>

      {/* Progress */}
      {appointmentItems.length > 1 && (
        <div className="space-y-2">
          <div className="flex gap-2">
            {appointmentItems.map((item, idx) => (
              <div
                key={item.id}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  bookedAppointments.has(item.id)
                    ? 'bg-green-500'
                    : idx === currentItemIndex
                    ? 'bg-brand'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2 text-xs text-muted-foreground">
            {appointmentItems.map((item, idx) => (
              <div key={item.id} className="flex-1 text-center truncate">
                {bookedAppointments.has(item.id) && <Check className="w-3 h-3 inline mr-1 text-green-500" />}
                {item.itemName}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current appointment booking */}
      {currentItem && currentItem.itemId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {currentItem.itemName}
            </CardTitle>
            {currentItem.itemDescription && (
              <CardDescription>{currentItem.itemDescription}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <AppointmentBooking
              productId={currentItem.itemId}
              productTitle={currentItem.itemName}
              productPrice={currentItem.unitPrice}
              currency={order?.currency || 'EUR'}
              onBook={handleAppointmentBooked}
              onCancel={() => {
                if (bookedAppointments.size > 0) {
                  // Allow finishing early
                  handleFinish()
                } else {
                  router.push('/dashboard')
                }
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Skip option */}
      {bookedAppointments.size > 0 && (
        <div className="text-center">
          <Button variant="link" onClick={handleFinish}>
            Terminer sans planifier les autres rendez-vous
          </Button>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full">
              <CalendarCheck className="w-8 h-8 text-green-600" />
            </div>
            <DialogTitle className="text-center text-xl">
              Rendez-vous confirme !
            </DialogTitle>
            <DialogDescription className="text-center">
              Votre rendez-vous a ete enregistre avec succes.
            </DialogDescription>
          </DialogHeader>

          {confirmationData && (
            <div className="space-y-4 mt-4">
              {/* Appointment details */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-gray-900">{confirmationData.itemName}</h4>
                <p className="text-sm text-gray-600">
                  {new Date(confirmationData.startTime).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-sm text-gray-600">
                  {new Date(confirmationData.startTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })} - {new Date(confirmationData.endTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              {/* Next steps */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Prochaines etapes :</h4>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-brand/10 rounded-full flex items-center justify-center">
                    <Mail className="w-3.5 h-3.5 text-brand" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email de confirmation</p>
                    <p className="text-sm text-gray-600">
                      {confirmationData.emailSent
                        ? `Un email a ete envoye a ${confirmationData.attendeeEmail}`
                        : `Vous recevrez un email de confirmation a ${confirmationData.attendeeEmail}`
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-brand/10 rounded-full flex items-center justify-center">
                    <Phone className="w-3.5 h-3.5 text-brand" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Contact</p>
                    <p className="text-sm text-gray-600">
                      Un membre de notre equipe vous contactera pour confirmer les details de votre rendez-vous.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-brand/10 rounded-full flex items-center justify-center">
                    <Calendar className="w-3.5 h-3.5 text-brand" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Calendrier</p>
                    <p className="text-sm text-gray-600">
                      Retrouvez tous vos rendez-vous dans votre espace client, rubrique "Calendrier".
                    </p>
                  </div>
                </div>
              </div>

              {/* Action button */}
              <div className="flex justify-center pt-2">
                <Button
                  onClick={handleConfirmationClose}
                  className="bg-brand hover:bg-[#B8860B]"
                >
                  {currentItemIndex < appointmentItems.length - 1
                    ? 'Continuer vers le prochain rendez-vous'
                    : 'Voir le recapitulatif'
                  }
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
