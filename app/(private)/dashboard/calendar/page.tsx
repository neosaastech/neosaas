"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar"
import { format, parse, startOfWeek, getDay, addMonths, subMonths } from "date-fns"
import { fr } from "date-fns/locale"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings,
  List,
  CalendarDays,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import "react-big-calendar/lib/css/react-big-calendar.css"

// Setup the localizer
const locales = { fr }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
})

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
}

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: Appointment
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  confirmed: "bg-green-100 text-green-800 border-green-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
  completed: "bg-gray-100 text-gray-800 border-gray-300",
  no_show: "bg-red-100 text-red-800 border-red-300",
}

export default function CalendarPage() {
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<typeof Views[keyof typeof Views]>(Views.MONTH)
  const [date, setDate] = useState(new Date())

  const fetchAppointments = useCallback(async () => {
    try {
      // Fetch appointments for a wide range (3 months before and after current date)
      const startDate = subMonths(date, 3)
      const endDate = addMonths(date, 3)

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: "500",
      })

      const response = await fetch(`/api/appointments?${params}`)
      const data = await response.json()

      if (data.success) {
        setAppointments(data.data)
      } else {
        toast.error("Erreur lors du chargement des rendez-vous")
      }
    } catch (error) {
      console.error("Failed to fetch appointments:", error)
      toast.error("Erreur de connexion")
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const events: CalendarEvent[] = useMemo(() => {
    return appointments
      .filter(apt => apt.status !== "cancelled")
      .map(apt => ({
        id: apt.id,
        title: apt.title,
        start: new Date(apt.startTime),
        end: new Date(apt.endTime),
        resource: apt,
      }))
  }, [appointments])

  const handleSelectEvent = (event: CalendarEvent) => {
    router.push(`/dashboard/appointments/${event.id}`)
  }

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    // Navigate to new appointment with pre-filled date/time
    const startDate = format(start, "yyyy-MM-dd")
    const startTime = format(start, "HH:mm")
    const endTime = format(end, "HH:mm")
    router.push(`/dashboard/appointments/new?date=${startDate}&start=${startTime}&end=${endTime}`)
  }

  const handleNavigate = (newDate: Date) => {
    setDate(newDate)
  }

  const handleViewChange = (newView: typeof Views[keyof typeof Views]) => {
    setView(newView)
  }

  // Custom event component
  const EventComponent = ({ event }: { event: CalendarEvent }) => {
    const apt = event.resource
    const statusClass = statusColors[apt.status] || statusColors.pending

    return (
      <div className={`px-1 py-0.5 rounded text-xs truncate border ${statusClass}`}>
        <span className="font-medium">{event.title}</span>
        {apt.attendeeName && (
          <span className="ml-1 opacity-75">- {apt.attendeeName}</span>
        )}
      </div>
    )
  }

  // Custom toolbar
  const CustomToolbar = ({ label, onNavigate, onView }: any) => (
    <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onNavigate("PREV")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          onClick={() => onNavigate("TODAY")}
        >
          Aujourd'hui
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onNavigate("NEXT")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-lg font-semibold ml-4">{label}</span>
      </div>

      <div className="flex items-center gap-2">
        <Select value={view as string} onValueChange={(v) => onView(v)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={Views.MONTH}>Mois</SelectItem>
            <SelectItem value={Views.WEEK}>Semaine</SelectItem>
            <SelectItem value={Views.DAY}>Jour</SelectItem>
            <SelectItem value={Views.AGENDA}>Agenda</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  const messages = {
    today: "Aujourd'hui",
    previous: "Précédent",
    next: "Suivant",
    month: "Mois",
    week: "Semaine",
    day: "Jour",
    agenda: "Agenda",
    date: "Date",
    time: "Heure",
    event: "Événement",
    noEventsInRange: "Aucun rendez-vous dans cette période",
    showMore: (total: number) => `+${total} autre(s)`,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendrier</h1>
          <p className="text-muted-foreground">
            Vue d'ensemble de vos rendez-vous
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/appointments">
              <List className="mr-2 h-4 w-4" />
              Liste
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/calendar/settings">
              <Settings className="mr-2 h-4 w-4" />
              Paramètres
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

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-yellow-200 border border-yellow-400" />
          <span className="text-sm">En attente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-200 border border-green-400" />
          <span className="text-sm">Confirmé</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gray-200 border border-gray-400" />
          <span className="text-sm">Terminé</span>
        </div>
      </div>

      {/* Calendar */}
      <Card>
        <CardContent className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="animate-pulse text-muted-foreground">Chargement du calendrier...</div>
            </div>
          ) : (
            <div className="h-[700px]">
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                view={view}
                date={date}
                onNavigate={handleNavigate}
                onView={handleViewChange}
                onSelectEvent={handleSelectEvent}
                onSelectSlot={handleSelectSlot}
                selectable
                messages={messages}
                components={{
                  event: EventComponent,
                  toolbar: CustomToolbar,
                }}
                formats={{
                  dateFormat: "d",
                  dayFormat: (date, culture, localizer) =>
                    localizer?.format(date, "EEEE d", culture) ?? "",
                  weekdayFormat: (date, culture, localizer) =>
                    localizer?.format(date, "EEE", culture) ?? "",
                  monthHeaderFormat: (date, culture, localizer) =>
                    localizer?.format(date, "MMMM yyyy", culture) ?? "",
                  dayHeaderFormat: (date, culture, localizer) =>
                    localizer?.format(date, "EEEE d MMMM", culture) ?? "",
                  dayRangeHeaderFormat: ({ start, end }, culture, localizer) =>
                    `${localizer?.format(start, "d MMM", culture)} - ${localizer?.format(end, "d MMM yyyy", culture)}`,
                  agendaDateFormat: (date, culture, localizer) =>
                    localizer?.format(date, "EEEE d MMMM", culture) ?? "",
                  agendaTimeFormat: (date, culture, localizer) =>
                    localizer?.format(date, "HH:mm", culture) ?? "",
                  agendaTimeRangeFormat: ({ start, end }, culture, localizer) =>
                    `${localizer?.format(start, "HH:mm", culture)} - ${localizer?.format(end, "HH:mm", culture)}`,
                }}
                culture="fr"
                popup
                step={30}
                timeslots={2}
                min={new Date(0, 0, 0, 7, 0, 0)}
                max={new Date(0, 0, 0, 21, 0, 0)}
                style={{ height: "100%" }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom styles for the calendar */}
      <style jsx global>{`
        .rbc-calendar {
          font-family: inherit;
        }
        .rbc-header {
          padding: 8px;
          font-weight: 500;
        }
        .rbc-today {
          background-color: hsl(var(--primary) / 0.1);
        }
        .rbc-event {
          background-color: transparent;
          border: none;
          padding: 0;
        }
        .rbc-event:focus {
          outline: none;
        }
        .rbc-event-content {
          overflow: hidden;
        }
        .rbc-selected {
          background-color: transparent !important;
        }
        .rbc-slot-selection {
          background-color: hsl(var(--primary) / 0.2);
        }
        .rbc-off-range-bg {
          background-color: hsl(var(--muted) / 0.5);
        }
        .rbc-month-view, .rbc-time-view, .rbc-agenda-view {
          border: 1px solid hsl(var(--border));
          border-radius: var(--radius);
        }
        .rbc-month-row, .rbc-day-slot, .rbc-time-header-content {
          border-color: hsl(var(--border));
        }
        .rbc-day-bg + .rbc-day-bg,
        .rbc-month-row + .rbc-month-row {
          border-color: hsl(var(--border));
        }
        .rbc-header + .rbc-header {
          border-color: hsl(var(--border));
        }
        .rbc-time-content {
          border-color: hsl(var(--border));
        }
        .rbc-timeslot-group {
          border-color: hsl(var(--border));
        }
        .rbc-time-slot {
          border-color: hsl(var(--border));
        }
        .rbc-current-time-indicator {
          background-color: hsl(var(--destructive));
        }
        .rbc-show-more {
          color: hsl(var(--primary));
          font-weight: 500;
        }
        .rbc-agenda-table {
          border-color: hsl(var(--border));
        }
        .rbc-agenda-table td,
        .rbc-agenda-table th {
          border-color: hsl(var(--border));
          padding: 8px 12px;
        }
        .rbc-agenda-empty {
          text-align: center;
          padding: 24px;
          color: hsl(var(--muted-foreground));
        }
      `}</style>
    </div>
  )
}
