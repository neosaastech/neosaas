/**
 * API Route: Available Appointment Slots
 * GET /api/checkout/available-slots?productId=xxx&date=2024-01-15
 *
 * Returns available time slots for booking an appointment product
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { products, appointmentSlots, appointmentExceptions, appointments } from '@/db/schema'
import { eq, and, gte, lte, not } from 'drizzle-orm'

interface TimeSlot {
  startTime: string // ISO datetime
  endTime: string // ISO datetime
  available: boolean
}

interface SlotConfig {
  startTime: string
  endTime: string
  duration: number
  bufferBefore: number
  bufferAfter: number
  maxAppointments: number
}

// Default slots when none configured in DB (weekdays 9:00-18:00)
const DEFAULT_SLOTS: Record<number, SlotConfig[]> = {
  0: [], // Sunday - closed
  1: [{ startTime: '09:00', endTime: '18:00', duration: 60, bufferBefore: 0, bufferAfter: 15, maxAppointments: 1 }], // Monday
  2: [{ startTime: '09:00', endTime: '18:00', duration: 60, bufferBefore: 0, bufferAfter: 15, maxAppointments: 1 }], // Tuesday
  3: [{ startTime: '09:00', endTime: '18:00', duration: 60, bufferBefore: 0, bufferAfter: 15, maxAppointments: 1 }], // Wednesday
  4: [{ startTime: '09:00', endTime: '18:00', duration: 60, bufferBefore: 0, bufferAfter: 15, maxAppointments: 1 }], // Thursday
  5: [{ startTime: '09:00', endTime: '18:00', duration: 60, bufferBefore: 0, bufferAfter: 15, maxAppointments: 1 }], // Friday
  6: [], // Saturday - closed
}

/**
 * Generate time slots for a given day based on availability rules
 */
function generateTimeSlots(
  date: Date,
  slots: typeof appointmentSlots.$inferSelect[],
  exceptions: typeof appointmentExceptions.$inferSelect[],
  existingAppointments: typeof appointments.$inferSelect[],
  duration: number = 60,
  useDefaultSlots: boolean = false
): TimeSlot[] {
  const dayOfWeek = date.getDay()
  const dateStr = date.toISOString().split('T')[0]
  const now = new Date()

  // Check for exceptions on this date
  const dayException = exceptions.find(e => {
    const exceptionDate = new Date(e.date).toISOString().split('T')[0]
    return exceptionDate === dateStr
  })

  // If the day is blocked
  if (dayException && !dayException.isAvailable) {
    return []
  }

  // Get slots for this day of week from DB
  const daySlots = slots.filter(s => s.dayOfWeek === dayOfWeek && s.isActive)

  // If exception provides override times, use those
  let effectiveSlots: SlotConfig[]

  if (dayException?.isAvailable && dayException.startTime && dayException.endTime) {
    effectiveSlots = [{
      startTime: dayException.startTime,
      endTime: dayException.endTime,
      duration: duration,
      bufferBefore: 0,
      bufferAfter: 0,
      maxAppointments: 1
    }]
  } else if (daySlots.length > 0) {
    effectiveSlots = daySlots.map(s => ({
      startTime: s.startTime,
      endTime: s.endTime,
      duration: s.duration,
      bufferBefore: s.bufferBefore || 0,
      bufferAfter: s.bufferAfter || 0,
      maxAppointments: s.maxAppointments || 1
    }))
  } else if (useDefaultSlots) {
    // Use default slots when no slots configured in DB
    effectiveSlots = DEFAULT_SLOTS[dayOfWeek] || []
  } else {
    effectiveSlots = []
  }

  if (effectiveSlots.length === 0) {
    return []
  }

  const generatedSlots: TimeSlot[] = []

  for (const slot of effectiveSlots) {
    // Parse start and end times
    const [startHour, startMin] = slot.startTime.split(':').map(Number)
    const [endHour, endMin] = slot.endTime.split(':').map(Number)

    const slotStartMinutes = startHour * 60 + startMin
    const slotEndMinutes = endHour * 60 + endMin
    const slotDuration = slot.duration

    // Generate slots
    let currentMinutes = slotStartMinutes

    while (currentMinutes + slotDuration <= slotEndMinutes) {
      const slotStart = new Date(date)
      slotStart.setHours(Math.floor(currentMinutes / 60), currentMinutes % 60, 0, 0)

      const slotEnd = new Date(slotStart)
      slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration)

      // Skip slots in the past (for today)
      if (slotStart <= now) {
        currentMinutes += slotDuration + slot.bufferAfter
        continue
      }

      // Check if this slot conflicts with existing appointments
      const isConflicting = existingAppointments.some(appt => {
        const apptStart = new Date(appt.startTime)
        const apptEnd = new Date(appt.endTime)

        // Check for overlap
        return (
          appt.status !== 'cancelled' &&
          slotStart < apptEnd &&
          slotEnd > apptStart
        )
      })

      generatedSlots.push({
        startTime: slotStart.toISOString(),
        endTime: slotEnd.toISOString(),
        available: !isConflicting
      })

      // Move to next slot (including buffer)
      currentMinutes += slotDuration + slot.bufferAfter
    }
  }

  return generatedSlots
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const dateStr = searchParams.get('date')
    const timezone = searchParams.get('timezone') || 'Europe/Paris'

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'productId required' },
        { status: 400 }
      )
    }

    // Verify product exists and is of type appointment
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId)
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    if (product.type !== 'appointment') {
      return NextResponse.json(
        { success: false, error: 'This product does not support bookings' },
        { status: 400 }
      )
    }

    // Parse date or use today
    const targetDate = dateStr ? new Date(dateStr) : new Date()
    targetDate.setHours(0, 0, 0, 0)

    // Get date range for the week (or month if requested)
    const rangeStart = new Date(targetDate)
    const rangeEnd = new Date(targetDate)
    rangeEnd.setDate(rangeEnd.getDate() + 7) // Get slots for the next 7 days

    // Get all slots for this product (or global slots if none specific)
    const slots = await db.query.appointmentSlots.findMany({
      where: and(
        eq(appointmentSlots.isActive, true),
        // Either product-specific or null (global)
      )
    })

    // Determine if we should use default slots (when no slots configured)
    const useDefaultSlots = slots.length === 0

    // Get exceptions in the date range
    const exceptions = await db.query.appointmentExceptions.findMany({
      where: and(
        gte(appointmentExceptions.date, rangeStart),
        lte(appointmentExceptions.date, rangeEnd)
      )
    })

    // Get existing appointments in the date range
    const existingAppointments = await db.query.appointments.findMany({
      where: and(
        gte(appointments.startTime, rangeStart),
        lte(appointments.startTime, rangeEnd),
        not(eq(appointments.status, 'cancelled'))
      )
    })

    // Generate slots for each day in the range
    const availableSlots: Record<string, TimeSlot[]> = {}

    for (let d = new Date(rangeStart); d < rangeEnd; d.setDate(d.getDate() + 1)) {
      const dayKey = d.toISOString().split('T')[0]
      availableSlots[dayKey] = generateTimeSlots(
        new Date(d),
        slots,
        exceptions,
        existingAppointments,
        60, // Default 1 hour duration
        useDefaultSlots
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        productId,
        productTitle: product.title,
        productPrice: product.hourlyRate || product.price,
        currency: product.currency,
        timezone,
        slots: availableSlots,
        usingDefaultSlots: useDefaultSlots
      }
    })

  } catch (error) {
    console.error('[API Available Slots] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching available slots' },
      { status: 500 }
    )
  }
}
