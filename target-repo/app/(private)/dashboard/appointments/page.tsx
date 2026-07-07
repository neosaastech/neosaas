"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import {
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Video,
  ChevronRight,
  Search,
  Filter,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  attendeeName?: string
  attendeeEmail?: string
}

const statusConfig = {
  pending: { label: "En attente", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  confirmed: { label: "Confirmé", color: "bg-green-100 text-green-800 border-green-300" },
  cancelled: { label: "Annulé", color: "bg-red-100 text-red-800 border-red-300" },
  completed: { label: "Terminé", color: "bg-gray-100 text-gray-800 border-gray-300" },
  no_show: { label: "Absent", color: "bg-red-100 text-red-800 border-red-300" },
}

export default function AppointmentsListPage() {
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/appointments?limit=100`)
      const data = await response.json()

      if (data.success) {
        setAppointments(data.data)
        setFilteredAppointments(data.data)
      } else {
        toast.error("Erreur lors du chargement des rendez-vous")
      }
    } catch (error) {
      console.error("Failed to fetch appointments:", error)
      toast.error("Erreur de connexion")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  // Filter appointments based on search and filters
  useEffect(() => {
    let result = appointments

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(apt =>
        apt.title.toLowerCase().includes(query) ||
        apt.attendeeName?.toLowerCase().includes(query) ||
        apt.attendeeEmail?.toLowerCase().includes(query) ||
        apt.description?.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter(apt => apt.status === statusFilter)
    }

    // Type filter
    if (typeFilter !== "all") {
      result = result.filter(apt => apt.type === typeFilter)
    }

    // Sort by date (most recent first)
    result = [...result].sort((a, b) =>
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )

    setFilteredAppointments(result)
  }, [appointments, searchQuery, statusFilter, typeFilter])

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(price / 100)
  }

  const groupAppointmentsByDate = (appointments: Appointment[]) => {
    const groups: Record<string, Appointment[]> = {}

    appointments.forEach(apt => {
      const dateKey = format(new Date(apt.startTime), "yyyy-MM-dd")
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(apt)
    })

    return groups
  }

  const groupedAppointments = groupAppointmentsByDate(filteredAppointments)
  const dateKeys = Object.keys(groupedAppointments).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  )

  // Get pending appointments that need user confirmation
  const pendingAppoint = appointments.filter(apt => apt.status === 'pending')

  const handleConfirmAppointment = async (appointmentId: string) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Rendez-vous confirmé !")
        fetchAppointments() // Refresh list
      } else {
        toast.error(data.error || "Échec de la confirmation")
      }
    } catch (error) {
      console.error("Failed to confirm appointment:", error)
      toast.error("Erreur de connexion")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Rendez-vous</h1>
          <p className="text-muted-foreground">
            Liste de tous vos rendez-vous
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/calendar">
              <CalendarIcon className="mr-2 h-4 w-4" />
              Calendrier
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/appointments/new">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau
            </Link>
          </Button>
        </div>
      </div>

      {/* Pending Confirmation Section */}
      {pendingAppoint.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              Rendez-vous en attente de confirmation
            </CardTitle>
            <CardDescription>
              Ces rendez-vous ont été demandés par l'équipe et nécessitent votre confirmation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingAppoint.map(apt => (
                <div key={apt.id} className="bg-white rounded-lg p-4 border border-yellow-200">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">{apt.title}</h4>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {format(new Date(apt.startTime), "PPP", { locale: fr })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(apt.startTime), "HH:mm")} - {format(new Date(apt.endTime), "HH:mm")}
                        </span>
                        {apt.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {apt.location}
                          </span>
                        )}
                      </div>
                      {apt.description && (
                        <p className="text-sm text-muted-foreground mt-2">{apt.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/dashboard/appointments/${apt.id}`)}
                      >
                        Détails
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleConfirmAppointment(apt.id)}
                      >
                        Confirmer
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par titre, participant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="confirmed">Confirmé</SelectItem>
                <SelectItem value="completed">Terminé</SelectItem>
                <SelectItem value="cancelled">Annulé</SelectItem>
                <SelectItem value="no_show">Absent</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="free">Gratuit</SelectItem>
                <SelectItem value="paid">Payant</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchAppointments}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {filteredAppointments.length} rendez-vous trouvé{filteredAppointments.length > 1 ? "s" : ""}
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Chargement des rendez-vous...</div>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Aucun rendez-vous</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                ? "Aucun rendez-vous ne correspond à vos critères de recherche."
                : "Vous n'avez pas encore de rendez-vous."}
            </p>
            {!searchQuery && statusFilter === "all" && typeFilter === "all" && (
              <Button asChild>
                <Link href="/dashboard/appointments/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un rendez-vous
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {dateKeys.map(dateKey => {
            const date = new Date(dateKey)
            const isToday = format(new Date(), "yyyy-MM-dd") === dateKey
            const isPast = date < new Date(format(new Date(), "yyyy-MM-dd"))

            return (
              <div key={dateKey}>
                <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${isPast ? "text-muted-foreground" : ""}`}>
                  <CalendarIcon className="h-4 w-4" />
                  {isToday ? "Aujourd'hui" : format(date, "EEEE d MMMM yyyy", { locale: fr })}
                  {isToday && <Badge variant="outline" className="ml-2">Aujourd'hui</Badge>}
                </h3>
                <div className="space-y-2">
                  {groupedAppointments[dateKey].map(apt => {
                    const status = statusConfig[apt.status]
                    const isPastAppointment = new Date(apt.endTime) < new Date()

                    return (
                      <Card
                        key={apt.id}
                        className={`transition-colors hover:bg-accent/50 cursor-pointer ${isPastAppointment ? "opacity-75" : ""}`}
                        onClick={() => router.push(`/dashboard/appointments/${apt.id}`)}
                      >
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                              {/* Time */}
                              <div className="text-sm font-medium whitespace-nowrap">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(apt.startTime), "HH:mm")}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(apt.endTime), "HH:mm")}
                                </div>
                              </div>

                              {/* Separator */}
                              <div className="h-8 w-px bg-border" />

                              {/* Content */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium truncate">{apt.title}</h4>
                                  <Badge variant="outline" className={`${status.color} text-xs shrink-0`}>
                                    {status.label}
                                  </Badge>
                                  {apt.type === "paid" && (
                                    <Badge variant={apt.isPaid ? "default" : "outline"} className="text-xs shrink-0">
                                      {apt.isPaid ? "Payé" : formatPrice(apt.price, apt.currency)}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                  {apt.attendeeName && (
                                    <span className="truncate">{apt.attendeeName}</span>
                                  )}
                                  {apt.location && (
                                    <span className="flex items-center gap-1 truncate">
                                      <MapPin className="h-3 w-3" />
                                      {apt.location}
                                    </span>
                                  )}
                                  {apt.meetingUrl && (
                                    <span className="flex items-center gap-1">
                                      <Video className="h-3 w-3" />
                                      Visio
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Arrow */}
                            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
