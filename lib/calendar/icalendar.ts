/**
 * iCalendar (.ics) File Generator
 * Generates RFC 5545 compliant iCalendar files for appointment bookings
 * These files can be imported into Google Calendar, Outlook, Apple Calendar, etc.
 */

/**
 * Generate a unique UID for the calendar event
 * Format: appointmentId@domain.com
 */
function generateEventUID(appointmentId: string): string {
  const domain = process.env.NEXT_PUBLIC_APP_URL 
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname 
    : 'neosaas.tech'
  
  return `${appointmentId}@${domain}`
}

/**
 * Format date to iCalendar format (YYYYMMDDTHHmmssZ)
 * Example: 2026-01-15T14:30:00Z -> 20260115T143000Z
 */
function formatICalDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const seconds = String(date.getUTCSeconds()).padStart(2, '0')
  
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
}

/**
 * Escape special characters for iCalendar format
 * - Newlines: \n
 * - Commas: \,
 * - Semicolons: \;
 * - Backslashes: \\
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')  // Backslash must be first
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/**
 * Fold long lines to 75 characters max (RFC 5545 requirement)
 * Lines longer than 75 chars should be split with CRLF + space
 */
function foldLine(line: string): string {
  if (line.length <= 75) return line
  
  const lines: string[] = []
  let currentLine = line.substring(0, 75)
  let remaining = line.substring(75)
  
  lines.push(currentLine)
  
  while (remaining.length > 0) {
    currentLine = ' ' + remaining.substring(0, 74) // Space prefix for continuation
    remaining = remaining.substring(74)
    lines.push(currentLine)
  }
  
  return lines.join('\r\n')
}

export interface ICalendarEventParams {
  appointmentId: string
  title: string
  description?: string
  location?: string
  meetingUrl?: string
  startTime: Date
  endTime: Date
  timezone?: string
  organizerEmail: string
  organizerName: string
  attendeeEmail?: string
  attendeeName?: string
}

/**
 * Generate an iCalendar (.ics) file content
 * 
 * @param params - Event parameters
 * @returns iCalendar file content as string
 * 
 * @example
 * ```typescript
 * const icsContent = generateICalendarFile({
 *   appointmentId: 'uuid-123',
 *   title: 'Consultation Stratégie',
 *   description: 'Session de consultation pour votre projet',
 *   location: 'Visioconférence',
 *   meetingUrl: 'https://meet.google.com/abc-defg-hij',
 *   startTime: new Date('2026-01-15T14:30:00Z'),
 *   endTime: new Date('2026-01-15T15:30:00Z'),
 *   timezone: 'Europe/Paris',
 *   organizerEmail: 'contact@neosaas.tech',
 *   organizerName: 'NeoSaaS Team',
 *   attendeeEmail: 'client@example.com',
 *   attendeeName: 'Jean Dupont'
 * })
 * 
 * // Save to file or attach to email
 * fs.writeFileSync('appointment.ics', icsContent)
 * ```
 */
export function generateICalendarFile(params: ICalendarEventParams): string {
  const {
    appointmentId,
    title,
    description,
    location,
    meetingUrl,
    startTime,
    endTime,
    timezone = 'Europe/Paris',
    organizerEmail,
    organizerName,
    attendeeEmail,
    attendeeName
  } = params

  // Generate timestamps
  const dtStart = formatICalDate(startTime)
  const dtEnd = formatICalDate(endTime)
  const dtStamp = formatICalDate(new Date()) // Current timestamp
  const uid = generateEventUID(appointmentId)

  // Build description with meeting URL if provided
  let eventDescription = description || title
  if (meetingUrl) {
    eventDescription += `\\n\\nLien de la réunion: ${meetingUrl}`
  }

  // Build location field
  let eventLocation = location || 'En ligne'
  
  // Escape special characters
  const escapedTitle = escapeICalText(title)
  const escapedDescription = escapeICalText(eventDescription)
  const escapedLocation = escapeICalText(eventLocation)

  // Build iCalendar content (RFC 5545 format)
  const icalLines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NeoSaaS//Appointment Booking//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapedTitle}`,
    `DESCRIPTION:${escapedDescription}`,
    `LOCATION:${escapedLocation}`,
    `ORGANIZER;CN=${escapeICalText(organizerName)}:mailto:${organizerEmail}`,
  ]

  // Add attendee if provided
  if (attendeeEmail && attendeeName) {
    icalLines.push(
      `ATTENDEE;CN=${escapeICalText(attendeeName)};RSVP=TRUE:mailto:${attendeeEmail}`
    )
  }

  // Add URL field if meeting URL is provided
  if (meetingUrl) {
    icalLines.push(`URL:${meetingUrl}`)
  }

  // Set status and sequence
  icalLines.push(
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'TRANSP:OPAQUE',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M', // Reminder 15 minutes before
    'ACTION:DISPLAY',
    `DESCRIPTION:Rappel: ${escapedTitle}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  )

  // Fold long lines and join with CRLF
  const foldedLines = icalLines.map(line => foldLine(line))
  return foldedLines.join('\r\n')
}

/**
 * Generate a filename for the .ics file
 * Format: appointment-{date}-{appointmentId}.ics
 * 
 * @example
 * ```typescript
 * const filename = generateICalendarFilename(
 *   'uuid-123',
 *   new Date('2026-01-15T14:30:00Z')
 * )
 * // Returns: 'appointment-2026-01-15-uuid-123.ics'
 * ```
 */
export function generateICalendarFilename(
  appointmentId: string,
  startTime: Date
): string {
  const dateStr = startTime.toISOString().split('T')[0] // YYYY-MM-DD
  const shortId = appointmentId.substring(0, 8) // First 8 chars of UUID
  
  return `appointment-${dateStr}-${shortId}.ics`
}
