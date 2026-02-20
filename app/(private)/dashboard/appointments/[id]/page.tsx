"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Video,
  User,
  Mail,
  Phone,
  DollarSign,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  ExternalLink,
  CreditCard,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

interface Appointment {
  id: string
  title: string
  description?: string
  location?: string
  meetingUrl?: string
  startTime: string
  endTime: string
  timezone: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  type: 'free' | 'paid'
  price: number
  currency: string
  isPaid: boolean
  paymentStatus?: string
  stripePaymentIntentId?: string
  attendeeEmail?: string
  attendeeName?: string
  attendeePhone?: string
  notes?: string
  cancellationReason?: string
  cancelledAt?: string
  googleEventId?: string
  microsoftEventId?: string
  createdAt: string
  updatedAt: string
}

const statusConfig = {
  pending: { label: "En attente", variant: "warning" as const, color: "text-yellow-600" },
  confirmed: { label: "Confirmé", variant: "success" as const, color: "text-green-600" },
  cancelled: { label: "Annulé", variant: "destructive" as const, color: "text-red-600" },
  completed: { label: "Terminé", variant: "secondary" as const, color: "text-gray-600" },
  no_show: { label: "Absent", variant: "destructive" as const, color: "text-red-600" },
}

export default function AppointmentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchAppointment = async () => {
    try {
      const response = await fetch(`/api/appointments/${params.id}`)
      const data = await response.json()

      if (data.success) {
        setAppointment(data.data)
      } else {
        toast.error("Rendez-vous non trouvé")
        router.push("/dashboard/appointments")
      }
    } catch (error) {
      console.error("Failed to fetch appointment:", error)
      toast.error("Erreur de connexion")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (params.id) {
      fetchAppointment()
    }
  }, [params.id])

  // Note: Confirmation is handled by admin only - clients cannot self-confirm

  const handleComplete = async () => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/appointments/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      })

      if (response.ok) {
        toast.success("Rendez-vous marqué comme terminé")
        fetchAppointment()
      } else {
        toast.error("Erreur lors de la mise à jour")
      }
    } catch (error) {
      toast.error("Erreur de connexion")
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/appointments/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      })

      if (response.ok) {
        toast.success("Rendez-vous annulé")
        fetchAppointment()
      } else {
        toast.error("Erreur lors de l'annulation")
      }
    } catch (error) {
      toast.error("Erreur de connexion")
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/appointments/${params.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Rendez-vous supprimé")
        router.push("/dashboard/appointments")
      } else {
        toast.error("Erreur lors de la suppression")
      }
    } catch (error) {
      toast.error("Erreur de connexion")
    } finally {
      setActionLoading(false)
    }
  }

  const handleInitiatePayment = async () => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/appointments/${params.id}/pay`, {
        method: "POST",
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Facture créée avec succès")
        fetchAppointment()
      } else {
        toast.error(data.error || "Erreur lors de la création de la facture")
      }
    } catch (error) {
      toast.error("Erreur de connexion")
    } finally {
      setActionLoading(false)
    }
  }

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(price / 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    )
  }

  if (!appointment) {
    return null
  }

  const status = statusConfig[appointment.status]
  const isPast = new Date(appointment.endTime) < new Date()
  const canModify = !isPast && appointment.status !== "cancelled" && appointment.status !== "completed"

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/appointments">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{appointment.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={status.variant === "warning" ? "outline" : status.variant}>
                {status.label}
              </Badge>
              {appointment.type === "paid" && (
                <Badge variant={appointment.isPaid ? "default" : "outline"}>
                  {appointment.isPaid ? "Payé" : "Non payé"}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {canModify && (
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer le rendez-vous ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Le rendez-vous sera également supprimé de vos calendriers connectés.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* Date & Time Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center justify-center bg-primary/10 rounded-lg p-4 min-w-[80px]">
              <span className="text-xs text-muted-foreground uppercase">
                {format(new Date(appointment.startTime), "MMM", { locale: fr })}
              </span>
              <span className="text-3xl font-bold">
                {format(new Date(appointment.startTime), "d")}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(appointment.startTime), "yyyy")}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span>
                  {format(new Date(appointment.startTime), "HH:mm")} - {format(new Date(appointment.endTime), "HH:mm")}
                </span>
                <span className="text-sm text-muted-foreground">({appointment.timezone})</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {format(new Date(appointment.startTime), "EEEE d MMMM yyyy", { locale: fr })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      {appointment.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{appointment.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Location */}
      {(appointment.location || appointment.meetingUrl) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Lieu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {appointment.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{appointment.location}</span>
              </div>
            )}
            {appointment.meetingUrl && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <span>Visioconférence</span>
                </div>
                <Button asChild size="sm">
                  <a href={appointment.meetingUrl} target="_blank" rel="noopener noreferrer">
                    Rejoindre <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Attendee */}
      {(appointment.attendeeName || appointment.attendeeEmail || appointment.attendeePhone) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Participant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {appointment.attendeeName && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{appointment.attendeeName}</span>
              </div>
            )}
            {appointment.attendeeEmail && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${appointment.attendeeEmail}`} className="hover:underline">
                  {appointment.attendeeEmail}
                </a>
              </div>
            )}
            {appointment.attendeePhone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${appointment.attendeePhone}`} className="hover:underline">
                  {appointment.attendeePhone}
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment */}
      {appointment.type === "paid" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Paiement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Montant</span>
              <span className="text-xl font-bold">{formatPrice(appointment.price, appointment.currency)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Statut</span>
              <Badge variant={appointment.isPaid ? "default" : "outline"}>
                {appointment.isPaid ? "Payé" : "En attente"}
              </Badge>
            </div>
            {appointment.stripePaymentIntentId && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Stripe Payment</span>
                <span className="font-mono text-sm">{appointment.stripePaymentIntentId}</span>
              </div>
            )}
            {!appointment.isPaid && canModify && (
              <Button
                onClick={handleInitiatePayment}
                disabled={actionLoading}
                className="w-full"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {appointment.stripePaymentIntentId ? "View payment" : "Create payment"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Calendar Sync */}
      {(appointment.googleEventId || appointment.microsoftEventId) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Synchronisation calendrier
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {appointment.googleEventId && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Google Calendar</span>
              </div>
            )}
            {appointment.microsoftEventId && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Microsoft Outlook</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {appointment.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes internes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{appointment.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Cancellation Info */}
      {appointment.status === "cancelled" && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Annulé
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {appointment.cancelledAt && (
              <p className="text-sm text-muted-foreground">
                Annulé le {format(new Date(appointment.cancelledAt), "d MMMM yyyy à HH:mm", { locale: fr })}
              </p>
            )}
            {appointment.cancellationReason && (
              <p className="text-muted-foreground">{appointment.cancellationReason}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {canModify && (
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {appointment.status === "pending" && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>En attente de confirmation par l'administrateur</span>
              </div>
            )}
            {appointment.status === "confirmed" && (
              <Button onClick={handleComplete} disabled={actionLoading}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Marquer comme terminé
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={actionLoading}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Annuler le rendez-vous
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Annuler le rendez-vous ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Le participant sera notifié de l'annulation. Cette action ne peut pas être annulée.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Retour</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground">
                    Annuler le rendez-vous
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Créé le {format(new Date(appointment.createdAt), "d MMMM yyyy à HH:mm", { locale: fr })}</p>
            <p>Dernière modification le {format(new Date(appointment.updatedAt), "d MMMM yyyy à HH:mm", { locale: fr })}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
