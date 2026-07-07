'use client'

import { useState, useEffect } from 'react'
import { format, addDays, isSameDay, parseISO } from 'date-fns'
import { enUS } from 'date-fns/locale'
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  FileText,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimeSlot {
  startTime: string
  endTime: string
  available: boolean
}

interface AppointmentBookingProps {
  productId: string
  productTitle: string
  productPrice: number
  currency: string
  onBook: (data: {
    startTime: string
    endTime: string
    timezone: string
    attendeeEmail: string
    attendeeName: string
    attendeePhone?: string
    notes?: string
  }) => Promise<void>
  onCancel?: () => void
  initialAttendeeInfo?: {
    name?: string
    email?: string
    phone?: string
  }
  // Fast mode: auto-confirm if user data is available (default: true)
  fastMode?: boolean
}

// Simplified steps: just date and time selection in fast mode
type Step = 'select-date' | 'select-time' | 'fill-info' | 'confirm'

export function AppointmentBooking({
  productId,
  productTitle,
  productPrice,
  currency,
  onBook,
  onCancel,
  initialAttendeeInfo,
  fastMode = true
}: AppointmentBookingProps) {
  const [step, setStep] = useState<Step>('select-date')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slots, setSlots] = useState<Record<string, TimeSlot[]>>({})
  const [timezone, setTimezone] = useState('Europe/Paris')

  // Selection state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    attendeeName: initialAttendeeInfo?.name || '',
    attendeeEmail: initialAttendeeInfo?.email || '',
    attendeePhone: initialAttendeeInfo?.phone || '',
    notes: ''
  })

  // Track if user info is complete (for fast mode)
  const [userInfoLoaded, setUserInfoLoaded] = useState(false)

  // Load user profile
  useEffect(() => {
    async function loadUserProfile() {
      if (initialAttendeeInfo?.name && initialAttendeeInfo?.email) {
        setUserInfoLoaded(true)
        return
      }

      try {
        const storedProfile = localStorage.getItem('userProfile')
        if (storedProfile) {
          const profile = JSON.parse(storedProfile)
          const name = `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
          const email = profile.email || ''

          setFormData(prev => ({
            ...prev,
            attendeeName: prev.attendeeName || name,
            attendeeEmail: prev.attendeeEmail || email,
            attendeePhone: prev.attendeePhone || profile.phone || ''
          }))

          if (name && email) {
            setUserInfoLoaded(true)
          }
          return
        }

        const res = await fetch('/api/user/profile')
        if (res.ok) {
          const profile = await res.json()
          const name = `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
          const email = profile.email || ''

          setFormData(prev => ({
            ...prev,
            attendeeName: prev.attendeeName || name,
            attendeeEmail: prev.attendeeEmail || email,
            attendeePhone: prev.attendeePhone || profile.phone || ''
          }))

          if (name && email) {
            setUserInfoLoaded(true)
          }
        }
      } catch (err) {
        console.error('[AppointmentBooking] Failed to load user profile:', err)
      }
    }

    loadUserProfile()
  }, [initialAttendeeInfo])

  // Booking state
  const [booking, setBooking] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)

  // Week navigation
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  })

  // Fetch available slots
  useEffect(() => {
    async function fetchSlots() {
      setLoading(true)
      setError(null)
      try {
        const dateStr = weekStart.toISOString().split('T')[0]
        const res = await fetch(
          `/api/checkout/available-slots?productId=${productId}&date=${dateStr}&timezone=${timezone}`
        )
        const data = await res.json()

        if (data.success) {
          setSlots(data.data.slots)
          setTimezone(data.data.timezone)
        } else {
          setError(data.error || 'Failed to load available slots')
        }
      } catch (err) {
        setError('Connection error')
      } finally {
        setLoading(false)
      }
    }

    fetchSlots()
  }, [productId, weekStart, timezone])

  // Format price
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount / 100)
  }

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Get slots for selected date
  const slotsForDate = selectedDate
    ? slots[format(selectedDate, 'yyyy-MM-dd')] || []
    : []

  // Handle booking - called when user confirms
  const handleBook = async () => {
    if (!selectedSlot || !formData.attendeeName || !formData.attendeeEmail) {
      return
    }

    setBooking(true)
    setError(null)

    try {
      await onBook({
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        timezone,
        attendeeEmail: formData.attendeeEmail,
        attendeeName: formData.attendeeName,
        attendeePhone: formData.attendeePhone || undefined,
        notes: formData.notes || undefined
      })
      setBookingSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking error')
    } finally {
      setBooking(false)
    }
  }

  // Auto-book in fast mode when time slot is selected
  const handleTimeSlotSelect = async (slot: TimeSlot) => {
    setSelectedSlot(slot)

    // In fast mode with user info available, auto-confirm
    if (fastMode && userInfoLoaded && formData.attendeeName && formData.attendeeEmail) {
      setBooking(true)
      setError(null)

      try {
        await onBook({
          startTime: slot.startTime,
          endTime: slot.endTime,
          timezone,
          attendeeEmail: formData.attendeeEmail,
          attendeeName: formData.attendeeName,
          attendeePhone: formData.attendeePhone || undefined,
          notes: formData.notes || undefined
        })
        setBookingSuccess(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Booking error')
        setStep('fill-info') // Fall back to info form if error
      } finally {
        setBooking(false)
      }
    } else {
      // Normal mode: go to fill info step
      setStep('fill-info')
    }
  }

  // Success view - simplified
  if (bookingSuccess) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Appointment Confirmed!
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Your appointment has been booked. You will receive a confirmation email.
        </p>
        {selectedDate && selectedSlot && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
            <p className="font-medium">{productTitle}</p>
            <p className="text-gray-600 dark:text-gray-400">
              {format(selectedDate, 'EEEE, MMMM d, yyyy', { locale: enUS })}
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              {format(parseISO(selectedSlot.startTime), 'h:mm a')} -{' '}
              {format(parseISO(selectedSlot.endTime), 'h:mm a')}
            </p>
          </div>
        )}
        <button
          onClick={onCancel}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          Close
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-white">
        <h2 className="text-xl font-bold">{productTitle}</h2>
        <p className="text-white/80">
          {productPrice > 0 ? formatPrice(productPrice) : 'Free'}
        </p>
      </div>

      {/* Simplified Progress bar - 2 steps in fast mode */}
      <div className="flex border-b">
        {fastMode && userInfoLoaded ? (
          // Fast mode: only Date and Time steps
          <>
            <div
              className={cn(
                'flex-1 py-2 text-center text-sm transition-colors',
                step === 'select-date'
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'bg-green-50 dark:bg-green-900/20 text-green-600'
              )}
            >
              1. Date
            </div>
            <div
              className={cn(
                'flex-1 py-2 text-center text-sm transition-colors',
                step === 'select-time' || booking
                  ? 'bg-primary/10 text-primary font-medium'
                  : step === 'select-date'
                  ? 'text-gray-400'
                  : 'bg-green-50 dark:bg-green-900/20 text-green-600'
              )}
            >
              2. Time
            </div>
          </>
        ) : (
          // Normal mode: all 4 steps
          (['select-date', 'select-time', 'fill-info', 'confirm'] as Step[]).map(
            (s, i) => (
              <div
                key={s}
                className={cn(
                  'flex-1 py-2 text-center text-sm transition-colors',
                  step === s
                    ? 'bg-primary/10 text-primary font-medium'
                    : i < ['select-date', 'select-time', 'fill-info', 'confirm'].indexOf(step)
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-600'
                    : 'text-gray-400'
                )}
              >
                {i + 1}. {s === 'select-date' ? 'Date' : s === 'select-time' ? 'Time' : s === 'fill-info' ? 'Info' : 'Confirm'}
              </div>
            )
          )
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Select Date */}
        {step === 'select-date' && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Select a Date
            </h3>

            {/* Week navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setWeekStart(addDays(weekStart, -7))}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                disabled={weekStart <= new Date()}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-medium">
                {format(weekStart, 'MMM d', { locale: enUS })} -{' '}
                {format(addDays(weekStart, 6), 'MMM d, yyyy', { locale: enUS })}
              </span>
              <button
                onClick={() => setWeekStart(addDays(weekStart, 7))}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Days grid */}
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2" style={{ position: 'relative', zIndex: 50 }}>
                {weekDays.map((day) => {
                  const dateKey = format(day, 'yyyy-MM-dd')
                  const daySlots = slots[dateKey] || []
                  const hasAvailable = daySlots.some((s) => s.available)
                  const isPast = day < new Date()
                  const isSelected = selectedDate && isSameDay(day, selectedDate)
                  const isClickable = !isPast && hasAvailable

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (isClickable) {
                          setSelectedDate(day)
                          setStep('select-time')
                        }
                      }}
                      disabled={!isClickable}
                      style={{ pointerEvents: isClickable ? 'auto' : 'none' }}
                      className={cn(
                        'p-3 rounded-lg text-center transition-all cursor-pointer',
                        isSelected
                          ? 'bg-primary text-white'
                          : isClickable
                          ? 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                      )}
                    >
                      <div className="text-xs uppercase">
                        {format(day, 'EEE', { locale: enUS })}
                      </div>
                      <div className="text-lg font-bold">{format(day, 'd')}</div>
                      {isClickable && (
                        <div className="text-xs">
                          {daySlots.filter((s) => s.available).length} slots
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Time */}
        {step === 'select-time' && selectedDate && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Select a Time
              {booking && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {format(selectedDate, 'EEEE, MMMM d, yyyy', { locale: enUS })}
            </p>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" style={{ position: 'relative', zIndex: 50 }}>
              {slotsForDate.map((slot, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (slot.available && !booking) {
                      handleTimeSlotSelect(slot)
                    }
                  }}
                  disabled={!slot.available || booking}
                  style={{ pointerEvents: slot.available && !booking ? 'auto' : 'none' }}
                  className={cn(
                    'p-3 rounded-lg text-center transition-all cursor-pointer',
                    selectedSlot?.startTime === slot.startTime
                      ? 'bg-primary text-white'
                      : slot.available
                      ? 'bg-gray-50 dark:bg-gray-800 hover:bg-primary/10 text-gray-700 dark:text-gray-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed line-through'
                  )}
                >
                  {format(parseISO(slot.startTime), 'h:mm a')}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setSelectedDate(null)
                setStep('select-date')
              }}
              className="mt-4 text-primary hover:underline"
              disabled={booking}
            >
              ← Change date
            </button>
          </div>
        )}

        {/* Step 3: Fill Info (only if not in fast mode or user info missing) */}
        {step === 'fill-info' && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Your Information
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.attendeeName}
                    onChange={(e) =>
                      setFormData({ ...formData, attendeeName: e.target.value })
                    }
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary dark:bg-gray-800 dark:border-gray-700"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={formData.attendeeEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, attendeeEmail: e.target.value })
                    }
                    placeholder="john.doe@example.com"
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary dark:bg-gray-800 dark:border-gray-700"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone (optional)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.attendeePhone}
                    onChange={(e) =>
                      setFormData({ ...formData, attendeePhone: e.target.value })
                    }
                    placeholder="+1 555 123 4567"
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes (optional)
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Additional information..."
                    rows={3}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setStep('select-time')}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep('confirm')}
                disabled={!formData.attendeeName || !formData.attendeeEmail}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 'confirm' && selectedDate && selectedSlot && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Check className="w-5 h-5" />
              Confirmation
            </h3>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6 space-y-3">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Service:</span>
                <span className="ml-2 font-medium">{productTitle}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Date:</span>
                <span className="ml-2 font-medium">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy', { locale: enUS })}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Time:</span>
                <span className="ml-2 font-medium">
                  {format(parseISO(selectedSlot.startTime), 'h:mm a')} -{' '}
                  {format(parseISO(selectedSlot.endTime), 'h:mm a')}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Name:</span>
                <span className="ml-2 font-medium">{formData.attendeeName}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Email:</span>
                <span className="ml-2 font-medium">{formData.attendeeEmail}</span>
              </div>
              {formData.attendeePhone && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Phone:</span>
                  <span className="ml-2 font-medium">{formData.attendeePhone}</span>
                </div>
              )}
              <div className="pt-2 border-t dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400">Total:</span>
                <span className="ml-2 font-bold text-lg text-primary">
                  {productPrice > 0 ? formatPrice(productPrice) : 'Free'}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep('fill-info')}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                ← Edit
              </button>
              <button
                onClick={handleBook}
                disabled={booking}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {booking ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Booking...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Confirm Booking
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {onCancel && (
        <div className="border-t dark:border-gray-800 px-6 py-4 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
