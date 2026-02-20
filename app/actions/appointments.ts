'use server'

import { db } from "@/db"
import {
  appointments,
  appointmentSlots,
  appointmentExceptions,
  calendarConnections,
  products
} from "@/db/schema"
import { eq, and, desc, gte, lte, or, between } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"
import { z } from "zod"

// =============================================================================
// APPOINTMENTS
// =============================================================================

const appointmentSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  location: z.string().optional(),
  meetingUrl: z.string().url().optional().or(z.literal('')),
  startTime: z.string().or(z.date()),
  endTime: z.string().or(z.date()),
  timezone: z.string().default("Europe/Paris"),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']).default('pending'),
  type: z.enum(['free', 'paid']).default('free'),
  price: z.number().int().min(0).default(0),
  currency: z.string().default("EUR"),
  productId: z.string().uuid().optional().nullable(),
  attendeeEmail: z.string().email().optional(),
  attendeeName: z.string().optional(),
  attendeePhone: z.string().optional(),
  notes: z.string().optional(),
})

export async function getAppointments(options: {
  status?: string
  type?: string
  startDate?: Date
  endDate?: Date
  limit?: number
} = {}) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    const conditions = [eq(appointments.userId, user.userId)]

    if (options.status) {
      conditions.push(eq(appointments.status, options.status))
    }
    if (options.type) {
      conditions.push(eq(appointments.type, options.type))
    }
    if (options.startDate) {
      conditions.push(gte(appointments.startTime, options.startDate))
    }
    if (options.endDate) {
      conditions.push(lte(appointments.endTime, options.endDate))
    }

    const result = await db.query.appointments.findMany({
      where: and(...conditions),
      orderBy: [desc(appointments.startTime)],
      limit: options.limit,
      with: {
        product: true,
      },
    })

    return { success: true, data: result }
  } catch (error) {
    console.error("Failed to fetch appointments:", error)
    return { success: false, error: "Failed to fetch appointments" }
  }
}

export async function getAppointmentById(id: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    const appointment = await db.query.appointments.findFirst({
      where: and(
        eq(appointments.id, id),
        eq(appointments.userId, user.userId)
      ),
      with: {
        product: true,
      },
    })

    if (!appointment) {
      return { success: false, error: "Appointment not found" }
    }

    return { success: true, data: appointment }
  } catch (error) {
    console.error("Failed to fetch appointment:", error)
    return { success: false, error: "Failed to fetch appointment" }
  }
}

export async function createAppointment(data: z.infer<typeof appointmentSchema>) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    const validated = appointmentSchema.parse(data)

    // Convert string dates to Date objects
    const startTime = typeof validated.startTime === 'string'
      ? new Date(validated.startTime)
      : validated.startTime
    const endTime = typeof validated.endTime === 'string'
      ? new Date(validated.endTime)
      : validated.endTime

    // Validate times
    if (startTime >= endTime) {
      return { success: false, error: "End time must be after start time" }
    }

    // Check for overlapping appointments
    const overlapping = await db.query.appointments.findFirst({
      where: and(
        eq(appointments.userId, user.userId),
        or(
          eq(appointments.status, 'pending'),
          eq(appointments.status, 'confirmed')
        ),
        or(
          and(
            lte(appointments.startTime, startTime),
            gte(appointments.endTime, startTime)
          ),
          and(
            lte(appointments.startTime, endTime),
            gte(appointments.endTime, endTime)
          ),
          and(
            gte(appointments.startTime, startTime),
            lte(appointments.endTime, endTime)
          )
        )
      ),
    })

    if (overlapping) {
      return { success: false, error: "This time slot overlaps with an existing appointment" }
    }

    const [result] = await db.insert(appointments).values({
      userId: user.userId,
      title: validated.title,
      description: validated.description || null,
      location: validated.location || null,
      meetingUrl: validated.meetingUrl || null,
      startTime,
      endTime,
      timezone: validated.timezone,
      status: validated.status,
      type: validated.type,
      price: validated.price,
      currency: validated.currency,
      productId: validated.productId || null,
      attendeeEmail: validated.attendeeEmail || null,
      attendeeName: validated.attendeeName || null,
      attendeePhone: validated.attendeePhone || null,
      notes: validated.notes || null,
      isPaid: validated.type === 'free' ? true : false,
      paymentStatus: validated.type === 'free' ? 'paid' : 'pending',
    }).returning()

    revalidatePath("/dashboard/appointments")
    revalidatePath("/dashboard/calendar")

    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    console.error("Failed to create appointment:", error)
    return { success: false, error: "Failed to create appointment" }
  }
}

export async function updateAppointment(id: string, data: Partial<z.infer<typeof appointmentSchema>>) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    // Check if appointment exists and belongs to user
    const existing = await db.query.appointments.findFirst({
      where: and(
        eq(appointments.id, id),
        eq(appointments.userId, user.userId)
      ),
    })

    if (!existing) {
      return { success: false, error: "Appointment not found" }
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.location !== undefined) updateData.location = data.location
    if (data.meetingUrl !== undefined) updateData.meetingUrl = data.meetingUrl
    if (data.startTime !== undefined) {
      updateData.startTime = typeof data.startTime === 'string'
        ? new Date(data.startTime)
        : data.startTime
    }
    if (data.endTime !== undefined) {
      updateData.endTime = typeof data.endTime === 'string'
        ? new Date(data.endTime)
        : data.endTime
    }
    if (data.timezone !== undefined) updateData.timezone = data.timezone
    if (data.status !== undefined) updateData.status = data.status
    if (data.type !== undefined) updateData.type = data.type
    if (data.price !== undefined) updateData.price = data.price
    if (data.currency !== undefined) updateData.currency = data.currency
    if (data.productId !== undefined) updateData.productId = data.productId
    if (data.attendeeEmail !== undefined) updateData.attendeeEmail = data.attendeeEmail
    if (data.attendeeName !== undefined) updateData.attendeeName = data.attendeeName
    if (data.attendeePhone !== undefined) updateData.attendeePhone = data.attendeePhone
    if (data.notes !== undefined) updateData.notes = data.notes

    const [result] = await db.update(appointments)
      .set(updateData)
      .where(eq(appointments.id, id))
      .returning()

    revalidatePath("/dashboard/appointments")
    revalidatePath("/dashboard/calendar")

    return { success: true, data: result }
  } catch (error) {
    console.error("Failed to update appointment:", error)
    return { success: false, error: "Failed to update appointment" }
  }
}

export async function cancelAppointment(id: string, reason?: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    const existing = await db.query.appointments.findFirst({
      where: and(
        eq(appointments.id, id),
        eq(appointments.userId, user.userId)
      ),
    })

    if (!existing) {
      return { success: false, error: "Appointment not found" }
    }

    if (existing.status === 'cancelled') {
      return { success: false, error: "Appointment is already cancelled" }
    }

    const [result] = await db.update(appointments)
      .set({
        status: 'cancelled',
        cancellationReason: reason || null,
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, id))
      .returning()

    revalidatePath("/dashboard/appointments")
    revalidatePath("/dashboard/calendar")

    return { success: true, data: result }
  } catch (error) {
    console.error("Failed to cancel appointment:", error)
    return { success: false, error: "Failed to cancel appointment" }
  }
}

export async function confirmAppointment(id: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    const existing = await db.query.appointments.findFirst({
      where: and(
        eq(appointments.id, id),
        eq(appointments.userId, user.userId)
      ),
    })

    if (!existing) {
      return { success: false, error: "Appointment not found" }
    }

    // For paid appointments, check payment status
    if (existing.type === 'paid' && !existing.isPaid) {
      return { success: false, error: "Payment required before confirmation" }
    }

    const [result] = await db.update(appointments)
      .set({
        status: 'confirmed',
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, id))
      .returning()

    revalidatePath("/dashboard/appointments")
    revalidatePath("/dashboard/calendar")

    return { success: true, data: result }
  } catch (error) {
    console.error("Failed to confirm appointment:", error)
    return { success: false, error: "Failed to confirm appointment" }
  }
}

export async function completeAppointment(id: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    const existing = await db.query.appointments.findFirst({
      where: and(
        eq(appointments.id, id),
        eq(appointments.userId, user.userId)
      ),
    })

    if (!existing) {
      return { success: false, error: "Appointment not found" }
    }

    const [result] = await db.update(appointments)
      .set({
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, id))
      .returning()

    revalidatePath("/dashboard/appointments")
    revalidatePath("/dashboard/calendar")

    return { success: true, data: result }
  } catch (error) {
    console.error("Failed to complete appointment:", error)
    return { success: false, error: "Failed to complete appointment" }
  }
}

export async function deleteAppointment(id: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    const existing = await db.query.appointments.findFirst({
      where: and(
        eq(appointments.id, id),
        eq(appointments.userId, user.userId)
      ),
    })

    if (!existing) {
      return { success: false, error: "Appointment not found" }
    }

    await db.delete(appointments).where(eq(appointments.id, id))

    revalidatePath("/dashboard/appointments")
    revalidatePath("/dashboard/calendar")

    return { success: true }
  } catch (error) {
    console.error("Failed to delete appointment:", error)
    return { success: false, error: "Failed to delete appointment" }
  }
}

// =============================================================================
// APPOINTMENT SLOTS (Availability)
// =============================================================================

const slotSchema = z.object({
  id: z.string().uuid().optional(),
  productId: z.string().uuid().optional().nullable(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  duration: z.number().int().min(15).default(60),
  bufferBefore: z.number().int().min(0).default(0),
  bufferAfter: z.number().int().min(0).default(0),
  maxAppointments: z.number().int().min(1).default(1),
  isActive: z.boolean().default(true),
})

export async function getAppointmentSlots(productId?: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    const conditions = [eq(appointmentSlots.userId, user.userId)]

    if (productId) {
      conditions.push(eq(appointmentSlots.productId, productId))
    }

    const slots = await db.query.appointmentSlots.findMany({
      where: and(...conditions),
      orderBy: [appointmentSlots.dayOfWeek, appointmentSlots.startTime],
    })

    return { success: true, data: slots }
  } catch (error) {
    console.error("Failed to fetch appointment slots:", error)
    return { success: false, error: "Failed to fetch appointment slots" }
  }
}

export async function upsertAppointmentSlot(data: z.infer<typeof slotSchema>) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    const validated = slotSchema.parse(data)

    // Validate time range
    const [startHour, startMin] = validated.startTime.split(':').map(Number)
    const [endHour, endMin] = validated.endTime.split(':').map(Number)
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin

    if (startMinutes >= endMinutes) {
      return { success: false, error: "End time must be after start time" }
    }

    if (validated.id) {
      // Update existing slot
      const [result] = await db.update(appointmentSlots)
        .set({
          productId: validated.productId || null,
          dayOfWeek: validated.dayOfWeek,
          startTime: validated.startTime,
          endTime: validated.endTime,
          duration: validated.duration,
          bufferBefore: validated.bufferBefore,
          bufferAfter: validated.bufferAfter,
          maxAppointments: validated.maxAppointments,
          isActive: validated.isActive,
          updatedAt: new Date(),
        })
        .where(and(
          eq(appointmentSlots.id, validated.id),
          eq(appointmentSlots.userId, user.userId)
        ))
        .returning()

      return { success: true, data: result }
    } else {
      // Create new slot
      const [result] = await db.insert(appointmentSlots).values({
        userId: user.userId,
        productId: validated.productId || null,
        dayOfWeek: validated.dayOfWeek,
        startTime: validated.startTime,
        endTime: validated.endTime,
        duration: validated.duration,
        bufferBefore: validated.bufferBefore,
        bufferAfter: validated.bufferAfter,
        maxAppointments: validated.maxAppointments,
        isActive: validated.isActive,
      }).returning()

      return { success: true, data: result }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    console.error("Failed to save appointment slot:", error)
    return { success: false, error: "Failed to save appointment slot" }
  }
}

export async function deleteAppointmentSlot(id: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    await db.delete(appointmentSlots)
      .where(and(
        eq(appointmentSlots.id, id),
        eq(appointmentSlots.userId, user.userId)
      ))

    return { success: true }
  } catch (error) {
    console.error("Failed to delete appointment slot:", error)
    return { success: false, error: "Failed to delete appointment slot" }
  }
}

// =============================================================================
// APPOINTMENT EXCEPTIONS
// =============================================================================

const exceptionSchema = z.object({
  id: z.string().uuid().optional(),
  date: z.string().or(z.date()),
  isAvailable: z.boolean().default(false),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  reason: z.string().optional(),
})

export async function getAppointmentExceptions(startDate?: Date, endDate?: Date) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    const conditions = [eq(appointmentExceptions.userId, user.userId)]

    if (startDate) {
      conditions.push(gte(appointmentExceptions.date, startDate))
    }
    if (endDate) {
      conditions.push(lte(appointmentExceptions.date, endDate))
    }

    const exceptions = await db.query.appointmentExceptions.findMany({
      where: and(...conditions),
      orderBy: [appointmentExceptions.date],
    })

    return { success: true, data: exceptions }
  } catch (error) {
    console.error("Failed to fetch appointment exceptions:", error)
    return { success: false, error: "Failed to fetch appointment exceptions" }
  }
}

export async function createAppointmentException(data: z.infer<typeof exceptionSchema>) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    const validated = exceptionSchema.parse(data)

    const date = typeof validated.date === 'string'
      ? new Date(validated.date)
      : validated.date

    const [result] = await db.insert(appointmentExceptions).values({
      userId: user.userId,
      date,
      isAvailable: validated.isAvailable,
      startTime: validated.startTime || null,
      endTime: validated.endTime || null,
      reason: validated.reason || null,
    }).returning()

    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    console.error("Failed to create appointment exception:", error)
    return { success: false, error: "Failed to create appointment exception" }
  }
}

export async function deleteAppointmentException(id: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    await db.delete(appointmentExceptions)
      .where(and(
        eq(appointmentExceptions.id, id),
        eq(appointmentExceptions.userId, user.userId)
      ))

    return { success: true }
  } catch (error) {
    console.error("Failed to delete appointment exception:", error)
    return { success: false, error: "Failed to delete appointment exception" }
  }
}

// =============================================================================
// CALENDAR CONNECTIONS
// =============================================================================

export async function getCalendarConnections() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    const connections = await db.query.calendarConnections.findMany({
      where: eq(calendarConnections.userId, user.userId),
      columns: {
        id: true,
        provider: true,
        email: true,
        isActive: true,
        lastSyncAt: true,
        createdAt: true,
        // Exclude tokens for security
      },
    })

    return { success: true, data: connections }
  } catch (error) {
    console.error("Failed to fetch calendar connections:", error)
    return { success: false, error: "Failed to fetch calendar connections" }
  }
}

export async function deleteCalendarConnection(id: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    await db.delete(calendarConnections)
      .where(and(
        eq(calendarConnections.id, id),
        eq(calendarConnections.userId, user.userId)
      ))

    revalidatePath("/dashboard/calendar/settings")

    return { success: true }
  } catch (error) {
    console.error("Failed to delete calendar connection:", error)
    return { success: false, error: "Failed to delete calendar connection" }
  }
}

// =============================================================================
// APPOINTMENT STATISTICS
// =============================================================================

export async function getAppointmentStats() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Get all appointments for the current month
    const monthAppointments = await db.query.appointments.findMany({
      where: and(
        eq(appointments.userId, user.userId),
        gte(appointments.startTime, startOfMonth),
        lte(appointments.startTime, endOfMonth)
      ),
    })

    // Calculate stats
    const stats = {
      total: monthAppointments.length,
      pending: monthAppointments.filter(a => a.status === 'pending').length,
      confirmed: monthAppointments.filter(a => a.status === 'confirmed').length,
      completed: monthAppointments.filter(a => a.status === 'completed').length,
      cancelled: monthAppointments.filter(a => a.status === 'cancelled').length,
      paid: monthAppointments.filter(a => a.isPaid).length,
      unpaid: monthAppointments.filter(a => !a.isPaid && a.type === 'paid').length,
      totalRevenue: monthAppointments
        .filter(a => a.isPaid && a.type === 'paid')
        .reduce((sum, a) => sum + (a.price || 0), 0),
      upcoming: monthAppointments.filter(a =>
        a.status !== 'cancelled' &&
        a.status !== 'completed' &&
        new Date(a.startTime) > now
      ).length,
    }

    return { success: true, data: stats }
  } catch (error) {
    console.error("Failed to fetch appointment stats:", error)
    return { success: false, error: "Failed to fetch appointment stats" }
  }
}

// =============================================================================
// PUBLIC BOOKING (for external users)
// =============================================================================

export async function getPublicAvailableSlots(userId: string, productId: string, date: Date) {
  try {
    // Get user's availability settings
    const dayOfWeek = date.getDay()

    const slots = await db.query.appointmentSlots.findMany({
      where: and(
        eq(appointmentSlots.userId, userId),
        eq(appointmentSlots.dayOfWeek, dayOfWeek),
        eq(appointmentSlots.isActive, true),
        productId ? eq(appointmentSlots.productId, productId) : undefined
      ),
    })

    if (slots.length === 0) {
      return { success: true, data: [] }
    }

    // Check for exceptions on this date
    const startOfDay = new Date(date.setHours(0, 0, 0, 0))
    const endOfDay = new Date(date.setHours(23, 59, 59, 999))

    const exception = await db.query.appointmentExceptions.findFirst({
      where: and(
        eq(appointmentExceptions.userId, userId),
        between(appointmentExceptions.date, startOfDay, endOfDay)
      ),
    })

    if (exception && !exception.isAvailable) {
      return { success: true, data: [] }
    }

    // Get existing appointments for this date
    const existingAppointments = await db.query.appointments.findMany({
      where: and(
        eq(appointments.userId, userId),
        gte(appointments.startTime, startOfDay),
        lte(appointments.startTime, endOfDay),
        or(
          eq(appointments.status, 'pending'),
          eq(appointments.status, 'confirmed')
        )
      ),
    })

    // Generate available time slots
    const availableSlots: { startTime: Date; endTime: Date }[] = []

    for (const slot of slots) {
      const [startHour, startMin] = slot.startTime.split(':').map(Number)
      const [endHour, endMin] = slot.endTime.split(':').map(Number)

      let currentTime = new Date(date)
      currentTime.setHours(startHour, startMin, 0, 0)

      const slotEndTime = new Date(date)
      slotEndTime.setHours(endHour, endMin, 0, 0)

      while (currentTime < slotEndTime) {
        const appointmentEnd = new Date(currentTime.getTime() + slot.duration * 60000)

        if (appointmentEnd <= slotEndTime) {
          // Check if this slot is not taken
          const isAvailable = !existingAppointments.some(apt => {
            const aptStart = new Date(apt.startTime)
            const aptEnd = new Date(apt.endTime)
            return (
              (currentTime >= aptStart && currentTime < aptEnd) ||
              (appointmentEnd > aptStart && appointmentEnd <= aptEnd) ||
              (currentTime <= aptStart && appointmentEnd >= aptEnd)
            )
          })

          if (isAvailable && currentTime > new Date()) {
            availableSlots.push({
              startTime: new Date(currentTime),
              endTime: new Date(appointmentEnd),
            })
          }
        }

        // Move to next slot (including buffer)
        currentTime = new Date(currentTime.getTime() + (slot.duration + (slot.bufferAfter || 0)) * 60000)
      }
    }

    return { success: true, data: availableSlots }
  } catch (error) {
    console.error("Failed to fetch available slots:", error)
    return { success: false, error: "Failed to fetch available slots" }
  }
}
