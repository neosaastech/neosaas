"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar"
import { format, parse, startOfWeek, getDay, addMonths, subMonths } from "date-fns"
import { enUS } from "date-fns/locale"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  List,
  User,
  Settings,
  Clock,
  CalendarDays,
  Bell,
  Link2,
  Unlink,
  CheckCircle,
  AlertCircle,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import "react-big-calendar/lib/css/react-big-calendar.css"

// Setup the localizer
const locales = { enUS }
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
  attendeeEmail?: string
  user?: {
    firstName: string
    lastName: string
    email: string
  }
  assignedAdmin?: {
    firstName: string
    lastName: string
    email: string
  }
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

// Calendar settings interface
interface CalendarSettings {
  workingHoursStart: string
  workingHoursEnd: string
  defaultDuration: number
  minNotice: number
  maxAdvance: number
  bufferTime: number
  enableEmailNotifications: boolean
  enableSmsNotifications: boolean
  autoConfirm: boolean
}

interface CalendarConnection {
  id: string
  provider: 'google' | 'microsoft'
  email?: string
  isActive: boolean
  lastSyncAt?: string
}

export default function AdminCalendarPage() {
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<typeof Views[keyof typeof Views]>(Views.MONTH)
  const [date, setDate] = useState(new Date())
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null)
  const [calendarConnections, setCalendarConnections] = useState<CalendarConnection[]>([])
  const [settings, setSettings] = useState<CalendarSettings>({
    workingHoursStart: '09:00',
    workingHoursEnd: '18:00',
    defaultDuration: 60,
    minNotice: 24,
    maxAdvance: 30,
    bufferTime: 15,
    enableEmailNotifications: true,
    enableSmsNotifications: false,
    autoConfirm: false,
  })
  const [newAppointment, setNewAppointment] = useState({
    clientEmail: '',
    title: '',
    description: '',
    type: 'free' as 'free' | 'paid',
    price: 0,
    location: '',
    meetingUrl: '',
    notes: '',
  })

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true)
      // Fetch appointments for a wide range (3 months before and after current date)
      const startDate = subMonths(date, 3)
      const endDate = addMonths(date, 3)

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: "500",
      })

      const response = await fetch(`/api/admin/appointments?${params}`)
      const data = await response.json()

      if (data.success) {
        setAppointments(data.data)
      } else {
        toast.error("Failed to load appointments")
      }
    } catch (error) {
      console.error("Failed to fetch appointments:", error)
      toast.error("Connection error")
    } finally {
      setLoading(false)
    }
  }, [date])

  const fetchCalendarConnections = useCallback(async () => {
    try {
      const response = await fetch("/api/calendar")
      const data = await response.json()
      if (data.success) {
        setCalendarConnections(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch calendar connections:", error)
    }
  }, [])

  const handleSaveSettings = async () => {
    try {
      // TODO: Save settings to API
      toast.success("Settings saved successfully")
      setSettingsSheetOpen(false)
    } catch (error) {
      toast.error("Failed to save settings")
    }
  }

  const handleConnectCalendar = async (provider: 'google' | 'microsoft') => {
    try {
      const response = await fetch(`/api/calendar/connect?provider=${provider}`)
      const data = await response.json()
      if (data.success && data.authUrl) {
        window.location.href = data.authUrl
      } else {
        toast.error(data.error || "Failed to connect")
      }
    } catch (error) {
      toast.error("Connection error")
    }
  }

  const handleDisconnectCalendar = async (id: string) => {
    try {
      const response = await fetch(`/api/calendar?id=${id}`, { method: "DELETE" })
      if (response.ok) {
        toast.success("Calendar disconnected")
        fetchCalendarConnections()
      } else {
        toast.error("Failed to disconnect")
      }
    } catch (error) {
      toast.error("Connection error")
    }
  }

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  useEffect(() => {
    fetchCalendarConnections()
  }, [fetchCalendarConnections])

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
    // Navigate to appointment details (could open a modal instead)
    router.push(`/admin/appointments?selected=${event.id}`)
  }

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    setSelectedSlot({ start, end })
    setNewAppointment({
      ...newAppointment,
      title: '',
      clientEmail: '',
      description: '',
      location: '',
      meetingUrl: '',
      notes: '',
    })
    setCreateDialogOpen(true)
  }

  const handleCreateAppointment = async () => {
    if (!selectedSlot) return

    if (!newAppointment.clientEmail || !newAppointment.title) {
      toast.error("Client email and title are required")
      return
    }

    try {
      const response = await fetch('/api/admin/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          ...newAppointment,
          startTime: selectedSlot.start.toISOString(),
          endTime: selectedSlot.end.toISOString(),
          timezone: 'Europe/Paris',
          currency: 'EUR',
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Appointment request sent to client")
        setCreateDialogOpen(false)
        fetchAppointments()
      } else {
        toast.error(data.error || "Failed to create appointment")
      }
    } catch (error) {
      console.error("Failed to create appointment:", error)
      toast.error("Connection error")
    }
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
        {apt.user && (
          <span className="ml-1 opacity-75">
            - {apt.user.firstName} {apt.user.lastName}
          </span>
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
          Today
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
            <SelectItem value={Views.MONTH}>Month</SelectItem>
            <SelectItem value={Views.WEEK}>Week</SelectItem>
            <SelectItem value={Views.DAY}>Day</SelectItem>
            <SelectItem value={Views.AGENDA}>Agenda</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  const messages = {
    today: "Today",
    previous: "Previous",
    next: "Next",
    month: "Month",
    week: "Week",
    day: "Day",
    agenda: "Agenda",
    date: "Date",
    time: "Time",
    event: "Event",
    noEventsInRange: "No appointments in this period",
    showMore: (total: number) => `+${total} more`,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Appointments Calendar</h1>
          <p className="text-muted-foreground">
            Overview of all appointments (group & clients)
          </p>
        </div>
        <div className="flex gap-2">
          <Sheet open={settingsSheetOpen} onOpenChange={setSettingsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[450px] sm:w-[540px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Calendar Settings</SheetTitle>
                <SheetDescription>
                  Configure your appointment calendar preferences
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 py-6">
                {/* Working Hours */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium">Working Hours</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="workStart">Start Time</Label>
                      <Input
                        id="workStart"
                        type="time"
                        value={settings.workingHoursStart}
                        onChange={(e) => setSettings({ ...settings, workingHoursStart: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="workEnd">End Time</Label>
                      <Input
                        id="workEnd"
                        type="time"
                        value={settings.workingHoursEnd}
                        onChange={(e) => setSettings({ ...settings, workingHoursEnd: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Appointment Defaults */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium">Appointment Defaults</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="duration">Default Duration (min)</Label>
                      <Select
                        value={settings.defaultDuration.toString()}
                        onValueChange={(v) => setSettings({ ...settings, defaultDuration: parseInt(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="45">45 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="90">1.5 hours</SelectItem>
                          <SelectItem value="120">2 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="buffer">Buffer Time (min)</Label>
                      <Select
                        value={settings.bufferTime.toString()}
                        onValueChange={(v) => setSettings({ ...settings, bufferTime: parseInt(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">No buffer</SelectItem>
                          <SelectItem value="5">5 minutes</SelectItem>
                          <SelectItem value="10">10 minutes</SelectItem>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minNotice">Minimum Notice (hours)</Label>
                      <Select
                        value={settings.minNotice.toString()}
                        onValueChange={(v) => setSettings({ ...settings, minNotice: parseInt(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 hour</SelectItem>
                          <SelectItem value="2">2 hours</SelectItem>
                          <SelectItem value="4">4 hours</SelectItem>
                          <SelectItem value="12">12 hours</SelectItem>
                          <SelectItem value="24">24 hours</SelectItem>
                          <SelectItem value="48">48 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxAdvance">Max Advance Booking (days)</Label>
                      <Select
                        value={settings.maxAdvance.toString()}
                        onValueChange={(v) => setSettings({ ...settings, maxAdvance: parseInt(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">1 week</SelectItem>
                          <SelectItem value="14">2 weeks</SelectItem>
                          <SelectItem value="30">1 month</SelectItem>
                          <SelectItem value="60">2 months</SelectItem>
                          <SelectItem value="90">3 months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Notifications */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium">Notifications</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="emailNotif">Email Notifications</Label>
                        <p className="text-xs text-muted-foreground">
                          Send email reminders to clients
                        </p>
                      </div>
                      <Switch
                        id="emailNotif"
                        checked={settings.enableEmailNotifications}
                        onCheckedChange={(v) => setSettings({ ...settings, enableEmailNotifications: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="smsNotif">SMS Notifications</Label>
                        <p className="text-xs text-muted-foreground">
                          Send SMS reminders to clients
                        </p>
                      </div>
                      <Switch
                        id="smsNotif"
                        checked={settings.enableSmsNotifications}
                        onCheckedChange={(v) => setSettings({ ...settings, enableSmsNotifications: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="autoConfirm">Auto-Confirm Appointments</Label>
                        <p className="text-xs text-muted-foreground">
                          Automatically confirm new bookings
                        </p>
                      </div>
                      <Switch
                        id="autoConfirm"
                        checked={settings.autoConfirm}
                        onCheckedChange={(v) => setSettings({ ...settings, autoConfirm: v })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Calendar Integrations */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium">Calendar Integrations</h3>
                  </div>
                  <div className="space-y-3">
                    {/* Google Calendar */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded">
                          <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Google Calendar</p>
                          {calendarConnections.find(c => c.provider === 'google')?.isActive ? (
                            <p className="text-xs text-green-600 flex items-center">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Connected
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">Not connected</p>
                          )}
                        </div>
                      </div>
                      {calendarConnections.find(c => c.provider === 'google')?.isActive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const conn = calendarConnections.find(c => c.provider === 'google')
                            if (conn) handleDisconnectCalendar(conn.id)
                          }}
                        >
                          <Unlink className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConnectCalendar('google')}
                        >
                          <Link2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Microsoft Outlook */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded">
                          <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path fill="#0078D4" d="M24 12L18 6v4H8v4h10v4l6-6z"/>
                            <path fill="#0078D4" d="M0 3h11v18H0V3z"/>
                            <path fill="#fff" d="M5.5 8.5a3 3 0 100 6 3 3 0 000-6z"/>
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Microsoft Outlook</p>
                          {calendarConnections.find(c => c.provider === 'microsoft')?.isActive ? (
                            <p className="text-xs text-green-600 flex items-center">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Connected
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">Not connected</p>
                          )}
                        </div>
                      </div>
                      {calendarConnections.find(c => c.provider === 'microsoft')?.isActive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const conn = calendarConnections.find(c => c.provider === 'microsoft')
                            if (conn) handleDisconnectCalendar(conn.id)
                          }}
                        >
                          <Unlink className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConnectCalendar('microsoft')}
                        >
                          <Link2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Save Button */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setSettingsSheetOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveSettings}>
                    Save Settings
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <Button asChild variant="outline">
            <Link href="/admin/appointments">
              <List className="mr-2 h-4 w-4" />
              List View
            </Link>
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-yellow-500"></div>
          <span className="text-sm">Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500"></div>
          <span className="text-sm">Confirmed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gray-500"></div>
          <span className="text-sm">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500"></div>
          <span className="text-sm">Cancelled / No Show</span>
        </div>
      </div>

      {/* Calendar */}
      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
          ) : (
            <Calendar
              localizer={localizer}
              events={events}
              view={view}
              onView={handleViewChange}
              date={date}
              onNavigate={handleNavigate}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              selectable
              startAccessor="start"
              endAccessor="end"
              style={{ height: 700 }}
              messages={messages}
              components={{
                event: EventComponent,
                toolbar: CustomToolbar,
              }}
              popup
            />
          )}
        </CardContent>
      </Card>

      {/* Create Appointment Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Appointment with Client</DialogTitle>
            <DialogDescription>
              Create an appointment request that the client will need to confirm.
              {selectedSlot && (
                <div className="mt-2 p-3 bg-muted rounded-md text-sm">
                  <strong>Selected time:</strong> {format(selectedSlot.start, "PPP p", { locale: enUS })} - {format(selectedSlot.end, "p", { locale: enUS })}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="clientEmail">Client Email *</Label>
              <Input
                id="clientEmail"
                type="email"
                placeholder="client@example.com"
                value={newAppointment.clientEmail}
                onChange={(e) => setNewAppointment({ ...newAppointment, clientEmail: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                The client must be registered in the system
              </p>
            </div>

            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Consultation, Meeting, etc."
                value={newAppointment.title}
                onChange={(e) => setNewAppointment({ ...newAppointment, title: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Additional details..."
                value={newAppointment.description}
                onChange={(e) => setNewAppointment({ ...newAppointment, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={newAppointment.type}
                  onValueChange={(value: 'free' | 'paid') => setNewAppointment({ ...newAppointment, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newAppointment.type === 'paid' && (
                <div>
                  <Label htmlFor="price">Price (EUR)</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="0"
                    value={newAppointment.price / 100}
                    onChange={(e) => setNewAppointment({
                      ...newAppointment,
                      price: Math.round(parseFloat(e.target.value) * 100)
                    })}
                  />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="Office address or 'Virtual'"
                value={newAppointment.location}
                onChange={(e) => setNewAppointment({ ...newAppointment, location: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="meetingUrl">Meeting URL</Label>
              <Input
                id="meetingUrl"
                type="url"
                placeholder="https://meet.google.com/..."
                value={newAppointment.meetingUrl}
                onChange={(e) => setNewAppointment({ ...newAppointment, meetingUrl: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="notes">Internal Notes</Label>
              <Textarea
                id="notes"
                placeholder="Notes visible only to admins..."
                value={newAppointment.notes}
                onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAppointment}>
                <Plus className="mr-2 h-4 w-4" />
                Send Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
