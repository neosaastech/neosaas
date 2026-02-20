"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import {
  Calendar,
  Plus,
  Clock,
  MapPin,
  Video,
  User,
  DollarSign,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  Mail,
  Phone,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface AdminUser {
  id: string
  firstName: string
  lastName: string
  email: string
}

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
  attendeeEmail?: string
  attendeeName?: string
  attendeePhone?: string
  notes?: string
  assignedAdminId?: string
  assignedAdmin?: AdminUser
  user?: {
    firstName: string
    lastName: string
    email: string
  }
  createdAt: string
}

const statusConfig = {
  pending: { label: "Pending", variant: "warning" as const, icon: AlertCircle, color: "text-yellow-600" },
  confirmed: { label: "Confirmed", variant: "success" as const, icon: CheckCircle, color: "text-green-600" },
  cancelled: { label: "Cancelled", variant: "destructive" as const, icon: XCircle, color: "text-red-600" },
  completed: { label: "Completed", variant: "secondary" as const, icon: CheckCircle, color: "text-gray-600" },
  no_show: { label: "No Show", variant: "destructive" as const, icon: XCircle, color: "text-red-600" },
}

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [appointmentToConfirm, setAppointmentToConfirm] = useState<Appointment | null>(null)
  const [selectedAdminId, setSelectedAdminId] = useState<string>("")

  const fetchAppointments = async () => {
    try {
      // Admin endpoint to get ALL appointments
      const params = new URLSearchParams({ limit: "100" })
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (typeFilter !== "all") params.set("type", typeFilter)

      const response = await fetch(`/api/admin/appointments?${params}`)
      const data = await response.json()

      if (data.success) {
        setAppointments(data.data)
      } else {
        // Fallback to regular endpoint for testing
        const fallbackResponse = await fetch(`/api/appointments?${params}`)
        const fallbackData = await fallbackResponse.json()
        if (fallbackData.success) {
          setAppointments(fallbackData.data)
        } else {
          toast.error("Failed to load appointments")
        }
      }
    } catch (error) {
      console.error("Failed to fetch appointments:", error)
      toast.error("Connection error")
    } finally {
      setLoading(false)
    }
  }

  const fetchAdminUsers = async () => {
    try {
      const response = await fetch('/api/admin/users/admins')
      const data = await response.json()
      if (data.success) {
        setAdminUsers(data.data)
      }
    } catch (error) {
      console.error("Failed to fetch admin users:", error)
    }
  }

  useEffect(() => {
    fetchAppointments()
    fetchAdminUsers()
  }, [statusFilter, typeFilter])

  const handleStatusChange = async (id: string, newStatus: string, assignedAdminId?: string) => {
    try {
      const body: Record<string, unknown> = { status: newStatus }
      if (assignedAdminId) {
        body.assignedAdminId = assignedAdminId
      }

      const response = await fetch(`/api/appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        toast.success(`Status updated: ${statusConfig[newStatus as keyof typeof statusConfig]?.label}`)
        fetchAppointments()
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to update")
      }
    } catch (error) {
      toast.error("Connection error")
    }
  }

  const openConfirmDialog = (appointment: Appointment) => {
    setAppointmentToConfirm(appointment)
    setSelectedAdminId(appointment.assignedAdminId || "none")
    setConfirmDialogOpen(true)
  }

  const handleConfirmWithAdmin = async () => {
    if (!appointmentToConfirm) return

    // Convert "none" to undefined for the API
    const adminId = selectedAdminId === "none" ? undefined : selectedAdminId
    await handleStatusChange(appointmentToConfirm.id, "confirmed", adminId)
    setConfirmDialogOpen(false)
    setAppointmentToConfirm(null)
    setSelectedAdminId("none")
  }

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(price / 100)
  }

  const filteredAppointments = appointments.filter(apt => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      apt.title.toLowerCase().includes(query) ||
      apt.attendeeName?.toLowerCase().includes(query) ||
      apt.attendeeEmail?.toLowerCase().includes(query) ||
      apt.user?.firstName.toLowerCase().includes(query) ||
      apt.user?.lastName.toLowerCase().includes(query)
    )
  })

  // Stats
  const stats = {
    total: appointments.length,
    pending: appointments.filter(a => a.status === 'pending').length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
    totalRevenue: appointments
      .filter(a => a.isPaid && a.type === 'paid')
      .reduce((sum, a) => sum + (a.price || 0), 0),
    unpaidAmount: appointments
      .filter(a => !a.isPaid && a.type === 'paid')
      .reduce((sum, a) => sum + (a.price || 0), 0),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Appointment Management</h1>
          <p className="text-muted-foreground">
            Manage all platform appointments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/appointments/calendar">
              <Calendar className="mr-2 h-4 w-4" />
              Calendar View
            </Link>
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats.totalRevenue, "EUR")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unpaid</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatPrice(stats.unpaidAmount, "EUR")}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="no_show">No Show</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Appointments Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No appointments</p>
              <p className="text-muted-foreground">
                No appointments match your criteria
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Attendee</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.map((appointment) => {
                  const status = statusConfig[appointment.status]
                  const StatusIcon = status.icon

                  return (
                    <TableRow key={appointment.id}>
                      <TableCell>
                        <div className="font-medium">
                          {format(new Date(appointment.startTime), "d MMM yyyy", { locale: enUS })}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(appointment.startTime), "HH:mm")} - {format(new Date(appointment.endTime), "HH:mm")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{appointment.title}</div>
                        {appointment.location && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {appointment.location}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {appointment.user ? (
                          <div>
                            <div className="font-medium">
                              {appointment.user.firstName} {appointment.user.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {appointment.user.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {appointment.attendeeName ? (
                          <div>
                            <div className="font-medium">{appointment.attendeeName}</div>
                            {appointment.attendeeEmail && (
                              <div className="text-sm text-muted-foreground">
                                {appointment.attendeeEmail}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {appointment.assignedAdmin ? (
                          <div>
                            <div className="font-medium">
                              {appointment.assignedAdmin.firstName} {appointment.assignedAdmin.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {appointment.assignedAdmin.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm italic">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={appointment.type === "paid" ? "default" : "secondary"}>
                          {appointment.type === "paid" ? formatPrice(appointment.price, appointment.currency) : "Free"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant === "warning" ? "outline" : status.variant}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {appointment.type === "paid" ? (
                          <Badge variant={appointment.isPaid ? "default" : "destructive"}>
                            {appointment.isPaid ? "Paid" : "Unpaid"}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedAppointment(appointment)
                              setDetailsOpen(true)
                            }}>
                              View details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {appointment.status === "pending" && (
                              <DropdownMenuItem onClick={() => openConfirmDialog(appointment)}>
                                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                Confirm and assign
                              </DropdownMenuItem>
                            )}
                            {appointment.status === "confirmed" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, "completed")}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark as completed
                              </DropdownMenuItem>
                            )}
                            {appointment.status !== "cancelled" && appointment.status !== "completed" && (
                              <>
                                <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, "no_show")}>
                                  <XCircle className="mr-2 h-4 w-4 text-orange-500" />
                                  Mark as no show
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleStatusChange(appointment.id, "cancelled")}
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Cancel
                                </DropdownMenuItem>
                              </>
                            )}
                            {appointment.attendeeEmail && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                  <a href={`mailto:${appointment.attendeeEmail}`}>
                                    <Mail className="mr-2 h-4 w-4" />
                                    Send email
                                  </a>
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedAppointment?.title}</DialogTitle>
            <DialogDescription>
              Appointment details
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {format(new Date(selectedAppointment.startTime), "EEEE d MMMM yyyy", { locale: enUS })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium">
                    {format(new Date(selectedAppointment.startTime), "HH:mm")} - {format(new Date(selectedAppointment.endTime), "HH:mm")}
                  </p>
                </div>
              </div>

              {selectedAppointment.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p>{selectedAppointment.description}</p>
                </div>
              )}

              {(selectedAppointment.location || selectedAppointment.meetingUrl) && (
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  {selectedAppointment.location && <p>{selectedAppointment.location}</p>}
                  {selectedAppointment.meetingUrl && (
                    <Button asChild variant="link" className="p-0 h-auto">
                      <a href={selectedAppointment.meetingUrl} target="_blank" rel="noopener noreferrer">
                        <Video className="mr-2 h-4 w-4" />
                        Video call link
                      </a>
                    </Button>
                  )}
                </div>
              )}

              {(selectedAppointment.attendeeName || selectedAppointment.attendeeEmail) && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">External attendee</p>
                  <div className="bg-muted p-3 rounded-lg space-y-1">
                    {selectedAppointment.attendeeName && (
                      <p className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {selectedAppointment.attendeeName}
                      </p>
                    )}
                    {selectedAppointment.attendeeEmail && (
                      <p className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {selectedAppointment.attendeeEmail}
                      </p>
                    )}
                    {selectedAppointment.attendeePhone && (
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {selectedAppointment.attendeePhone}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {selectedAppointment.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Internal notes</p>
                  <p className="bg-muted p-3 rounded-lg">{selectedAppointment.notes}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                {selectedAppointment.status === "pending" && (
                  <Button onClick={() => {
                    setDetailsOpen(false)
                    openConfirmDialog(selectedAppointment)
                  }}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirm and assign
                  </Button>
                )}
                {selectedAppointment.attendeeEmail && (
                  <Button variant="outline" asChild>
                    <a href={`mailto:${selectedAppointment.attendeeEmail}`}>
                      <Mail className="mr-2 h-4 w-4" />
                      Contact
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog with Admin Assignment */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm appointment</DialogTitle>
            <DialogDescription>
              Confirm the appointment and assign it to an administrator
            </DialogDescription>
          </DialogHeader>
          {appointmentToConfirm && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="font-medium">{appointmentToConfirm.title}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(appointmentToConfirm.startTime), "EEEE, MMMM d, yyyy 'at' HH:mm", { locale: enUS })}
                </p>
                {appointmentToConfirm.attendeeName && (
                  <p className="text-sm text-muted-foreground">
                    Attendee: {appointmentToConfirm.attendeeName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Assign to an administrator</label>
                <Select value={selectedAdminId} onValueChange={setSelectedAdminId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an administrator (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not assigned</SelectItem>
                    {adminUsers.map((admin) => (
                      <SelectItem key={admin.id} value={admin.id}>
                        {admin.firstName} {admin.lastName} ({admin.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The assigned administrator will be responsible for this appointment
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmWithAdmin}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirm
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
