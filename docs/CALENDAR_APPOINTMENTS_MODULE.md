# Calendar & Appointments Module

## Overview

The Calendar & Appointments module provides a comprehensive appointment booking system integrated with external calendar services (Google Calendar, Microsoft Outlook) and the Lago billing system for paid appointments.

## Features

- **Appointment Management**: Create, update, and manage appointments (free and paid)
- **Calendar View**: Visual calendar interface with react-big-calendar (client & admin)
- **Admin Request System**: Admins can request appointments with clients (NEW ✨)
- **Client Confirmation**: Clients can confirm pending appointment requests (NEW ✨)
- **External Calendar Sync**: Bidirectional sync with Google Calendar and Microsoft Outlook
- **Payment Integration**: Lago integration for paid appointments
- **Availability Management**: Define available time slots and exceptions
- **GDPR Compliant**: Secure token storage with encryption

## Database Schema

### Tables

#### `appointments`
Main table for storing appointments.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| userId | UUID | Owner of the appointment |
| productId | UUID | Optional link to appointment product |
| assignedAdminId | UUID | Admin assigned to handle this appointment (NEW ✨) |
| title | TEXT | Appointment title |
| description | TEXT | Optional description |
| location | TEXT | Physical location |
| meetingUrl | TEXT | Virtual meeting link |
| startTime | TIMESTAMP | Start date/time |
| endTime | TIMESTAMP | End date/time |
| timezone | TEXT | Timezone (default: Europe/Paris) |
| status | TEXT | pending, confirmed, cancelled, completed, no_show |
| type | TEXT | free or paid |
| price | INTEGER | Price in cents |
| currency | TEXT | Currency code (EUR, USD, etc.) |
| isPaid | BOOLEAN | Payment status |
| lagoInvoiceId | TEXT | Lago invoice ID |
| googleEventId | TEXT | Google Calendar event ID |
| microsoftEventId | TEXT | Microsoft Outlook event ID |
| attendeeEmail | TEXT | External attendee email |
| attendeeName | TEXT | External attendee name |
| attendeePhone | TEXT | External attendee phone |
| notes | TEXT | Internal notes (admin only) |

#### `calendarConnections`
Stores OAuth tokens for external calendar services.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| userId | UUID | User who connected the calendar |
| provider | TEXT | google or microsoft |
| email | TEXT | Calendar account email |
| accessToken | TEXT | Encrypted access token |
| refreshToken | TEXT | Encrypted refresh token |
| expiresAt | TIMESTAMP | Token expiration |
| calendarId | TEXT | Primary calendar ID |
| isActive | BOOLEAN | Connection status |
| lastSyncAt | TIMESTAMP | Last sync timestamp |

#### `appointmentSlots`
Define available time slots for booking.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| userId | UUID | Owner |
| productId | UUID | Optional product-specific slot |
| dayOfWeek | INTEGER | 0 (Sunday) to 6 (Saturday) |
| startTime | TEXT | Start time (HH:mm format) |
| endTime | TEXT | End time (HH:mm format) |
| duration | INTEGER | Duration in minutes |
| bufferBefore | INTEGER | Buffer before appointment |
| bufferAfter | INTEGER | Buffer after appointment |
| maxAppointments | INTEGER | Max concurrent appointments |
| isActive | BOOLEAN | Slot active status |

#### `appointmentExceptions`
Override availability for specific dates.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| userId | UUID | Owner |
| date | TIMESTAMP | Specific date |
| isAvailable | BOOLEAN | false = blocked, true = extra availability |
| startTime | TEXT | Override start time |
| endTime | TEXT | Override end time |
| reason | TEXT | e.g., "Vacation", "Holiday" |

## API Endpoints

### Appointments

#### GET /api/appointments
List appointments for the authenticated user.

**Query Parameters:**
- `status`: Filter by status (pending, confirmed, etc.)
- `type`: Filter by type (free, paid)
- `startDate`: Filter from date (ISO string)
- `endDate`: Filter to date (ISO string)
- `limit`: Maximum results (default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Consultation",
      "startTime": "2024-01-15T10:00:00Z",
      "endTime": "2024-01-15T11:00:00Z",
      "status": "confirmed",
      "type": "paid",
      "price": 5000,
      "isPaid": true
    }
  ]
}
```

#### POST /api/appointments
Create a new appointment.

**Body:**
```json
{
  "title": "Consultation initiale",
  "description": "Description optionnelle",
  "startTime": "2024-01-15T10:00:00Z",
  "endTime": "2024-01-15T11:00:00Z",
  "timezone": "Europe/Paris",
  "type": "paid",
  "price": 5000,
  "currency": "EUR",
  "attendeeEmail": "client@example.com",
  "attendeeName": "Jean Dupont",
  "syncToCalendar": true
}
```

#### GET /api/appointments/[id]
Get a single appointment.

#### PUT /api/appointments/[id]
Update an appointment.
**Special Rules:**
- **Clients** can confirm their own pending appointments (status: `pending` → `confirmed`)
- **Admins** can update any appointment to any status
- Only admins can mark appointments as `completed`

**Client Confirmation Example:**
```json
PUT /api/appointments/abc123
{
  "status": "confirmed"
}
```


#### DELETE /api/appointments/[id]
Delete an appointment.

### Payment

#### POST /api/appointments/[id]/pay
Initiate payment for a paid appointment via Lago.

**Response:**
```json
{
  "success": true,
  "data": {
    "invoiceId": "lago_invoice_id",
    "invoiceNumber": "INV-2024-001",
    "amount": 5000,
    "currency": "EUR",
    "status": "draft"
  }
}
```

### Calendar Connections

#### GET /api/calendar
List connected calendars.

#### GET /api/calendar/connect?provider=google|microsoft
Get OAuth authorization URL.

#### DELETE /api/calendar?id=connection_id
Disconnect a calendar.

## Environment Variables

### Required for Google Calendar

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/calendar/callback/google
```

### Required for Microsoft Outlook

```env
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_REDIRECT_URI=https://yourdomain.com/api/calendar/callback/microsoft
```

### OAuth Setup

#### Google Calendar

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the Google Calendar API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URI: `https://yourdomain.com/api/calendar/callback/google`
6. Copy Client ID and Client Secret

#### Microsoft Outlook

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to Azure Active Directory > App registrations
3. Create a new registration
4. Add redirect URI: `https://yourdomain.com/api/calendar/callback/microsoft`
5. Create a client secret
6. Add API permissions:with pending confirmation section (NEW ✨) |
| `/dashboard/appointments/new` | Create new appointment |
| `/dashboard/appointments/[id]` | Appointment details |
| `/dashboard/calendar` | Calendar view (react-big-calendar) |
| `/dashboard/calendar/settings` | Calendar connections (Google/Microsoft) |
| `/dashboard/support` | Help center & FAQ |

### Appointments List Page (`/dashboard/appointments`) ✨ UPDATED

Full-featured list view of appointments with:

**Pending Confirmation Section (NEW):**
- Special yellow/gold card section at the top of the page
- Shows all appointments with `status: pending` that require client confirmation
- Each pending appointment displays:
  - Title and description
  - Date and time
  - Location (if specified)
  - Two action buttons:
    - **"Détails"** → View full appointment details
    - **"Confirmer"** → Confirm appointment (changes status to `confirmed`)
- Only visible when there are pending appointments
- Disappears after all appointments are confirmedfor managing their own appointments.

| Route | Description |
|-------|-------------|
| `/dashboard/appointments` | List view of appointments with search and filters |
| `/dashboard/appointments/new` | Create new appointment |
| `/dashboard/appointments/[id]` | Appointment details |
| `/dashboard/calendar` | Calendar view (react-big-calendar) |
| `/dashboard/calendar/settings` | Calendar connections (Google/Microsoft) |
| `/dashboard/support` | Help center & FAQ |

### Appointments List Page (`/dashboard/appointments`)

Full-featured list view of appointments with:

**Search & Filters:**
- Search by title, attendee name, email, or description
- Filter by status: pending, confirmed, completed, cancelled, no_show
- Filter by type: free, paid

**Display:**
- Appointments grouped by date
- Each appointment card shows:
  - Time range (start - end)
  - Title and status badge
  - Payment status (for paid appointments)
  - Attendee name
  - Location or video call indicator
- Click to navigate to appointment details

**Navigation:**
- "Calendrier" button → `/dashboard/calendar`
- "Nouveau" button → `/dashboard/appointments/new`

### Appointment Request Page (`/dashboard/appointments/new`)

Client-side appointment request form. This is a **request** that must be validated by admin.

**Form Fields:**
- **Title** (required): Subject of the appoinlist management |
| `/admin/appointments/calendar` | Admin calendar view with request creation (NEW ✨) |

### Admin Appointments List (`/admin/appointments`)

List view of all appointments across all users with:

**Features:**
- Search by title, client name, or email
- Filter by status and type
- View assigned admin for each appointment
- Export functionality
- Statistics cards (total, pending, confirmed, revenue, etc.)
- Action menu for each appointment:
  - View details
  - Confirm/assign admin
  - Cancel
  - Mark as completed/no-show

**Navigation:**
- "Calendar View" button → `/admin/appointments/calendar`

### Admin Calendar Page (`/admin/appointments/calendar`) ✨ NEW

Full calendar view for admins to visualize and manage all appointments.

**Library:** `react-big-calendar`

**Features:**
- **View all appointments** from all users (group-wide visibility)
- **Multiple views:** Month, Week, Day, Agenda
- **Color-coded status:**
  - 🟡 Yellow: Pending (awaiting client confirmation)
  - 🟢 Green: Confirmed
  - ⚪ Gray: Completed
  - 🔴 Red: Cancelled / No Show
- **Quick creation:** Click any time slot to open appointment request dialog
- **Event details:** Each event shows title and client name
- **Click events:** Navigate to appointment details

**Create Appointment Request Dialog:**

When clicking a time slot, opens a modal with:

**Required Fields:**
- **Client Email**: Must be a registered user in the system
- **Title**: Appointment subject

**Optional Fields:**
- **Description**: Detailed information
- **Type**: Free or Paid (with price input for paid)
- **Location**: Physical address or "Virtual"
- **Meeting URL**: Video conference link (Google Meet, Zoom, etc.)
- **Internal Notes**: Only visible to admins

**Behavior:**
1. Admin fills the form
2. System validates client email exists
3. Appointment created with:
   - `status: pending` (client must confirm)
   - `userId: <client_id>`
   - `assignedAdminId: <admin_id>` (auto-assigned to creator)
   - Pre-filled attendee info from client profile
4. Client receives notification (TODO: email)
5. Appointment appears in yellow on calendar

**Navigation:**
- "List View" button → `/admin/appointments`

**Custom Toolbar:**
- Previous/Next/Today navigation
- Current date display
- View selector (Month/Week/Day/Agenda)

**Use Cases:**
- Admin needs to schedule a consultation with a specific client
- Admin wants to propose multiple time slots to a client
- Admin wants to visualize team availability
- Admin needs to see all upcoming appointments at a glancet
- **Description**: Detailed explanation of the appointment purpose
- **Preferred Date/Time** (required): Client's preferred time slot
- **Timezone**: Client's timezone
- **Location** (optional): Physical address or video conference link
- **Notes**: Additional information for the admin

**Automatic Behavior:**
- Type is always set to `free` (admin can change to `paid` if needed)
- Status is always set to `pending` (waiting for admin confirmation)
- No payment options shown to client
- No attendee information required (admin manages this)

**User Flow:**
1. Client fills the request form
2. System creates appointment with `status: pending`, `type: free`
3. Admin receives notification in chat
4. Admin reviews, configures payment if needed, and confirms/rejects
5. Client is notified of the decision

### Admin Routes

Routes accessible only to administrators for managing all appointments across the platform.

| Route | Description |
|-------|-------------|
| `/admin/appointments` | Admin appointments management |

### Admin API Endpoints

#### GET /api/admin/appointments
List all appointments across all users (admin only).

**Query Parameters:**
- `status`: Filter by status
- `

## User Flows

### Flow 1: Admin Requests Appointment with Client ✨ NEW

**Scenario:** Admin needs to schedule a consultation with a client.

1. **Admin** navigates to `/admin/appointments/calendar`
2. **Admin** clicks on a time slot (e.g., Jan 20, 2026 at 10:00 AM)
3. **System** opens "Request Appointment with Client" dialog with pre-filled times
4. **Admin** fills form:
   - Client Email: `jean.dupont@example.com`
   - Title: `Technical Consultation`
   - Description: `Discuss project architecture`
   - Type: `Free`
   - Location: `Paris Office`
   - Meeting URL: `https://meet.google.com/xyz`
   - Notes: `VIP client - prepare demo`
5. **Admin** clicks "Send Request"
6. **System** validates:
   - ✅ Client exists in database
   - ✅ Time slot is not overlapping
   - ✅ All required fields present
7. **System** creates appointment:
   ```json
   {
     "userId": "<jean_dupont_id>",
     "assignedAdminId": "<admin_id>",
     "status": "pending",
     "title": "Technical Consultation",
     "attendeeEmail": "jean.dupont@example.com",
     "attendeeName": "Jean Dupont",
     ...
   }
   ```
8. **System** shows success toast: "Appointment request sent to client"
9. **Calendar** refreshes, shows yellow event
10. **Client** receives notification (TODO: email implementation)

### Flow 2: Client Confirms Appointment Request ✨ NEW

**Scenario:** Client receives appointment request from admin and needs to confirm.

1. **Client** logs in and navigates to `/dashboard/appointments`
2. **System** displays yellow card at top:
   > 🕐 **Rendez-vous en attente de confirmation**
   > 
   > Ces rendez-vous ont été demandés par l'équipe et nécessitent votre confirmation
3. **Card** shows appointment details:
   - Title: Technical Consultation
   - Date: Tuesday, January 20, 2026
   - Time: 10:00 - 11:00
   - Location: Paris Office
   - Description: Discuss project architecture
4. **Client** reviews and clicks "Confirmer"
5. **System** calls `PUT /api/appointments/{id}` with `{ status: "confirmed" }`
6. **API** validates:
   - ✅ User owns this appointment
   - ✅ Appointment is in `pending` status
   - ✅ User has permission to confirm
7. **System** updates appointment:
   ```json
   {
     "status": "confirmed",
     "updatedAt": "2026-01-15T14:30:00Z"
   }
   ```
8. **System** shows success toast: "Rendez-vous confirmé !"
9. **Page** refreshes, yellow card disappears
10. **Admin calendar** updates, shows green event

### Flow 3: Client Views Appointments in Calendar

**Scenario:** Client wants visual overview of all appointments.

1. **Client** navigates to `/dashboard/calendar`
2. **System** fetches appointments for date range (3 months before/after)
3. **Calendar** displays:
   - Green events for confirmed appointments
   - Yellow events for pending requests
   - Gray events for completed
4. **Client** can:
   - Switch views (Month/Week/Day/Agenda)
   - Navigate dates (Previous/Next/Today)
   - Click event → Navigate to `/dashboard/appointments/{id}`
   - Click time slot → Navigate to `/dashboard/appointments/new` with pre-filled time

### Flow 4: Admin Monitors All Appointments

**Scenario:** Admin needs to see team schedule and client appointments.

1. **Admin** navigates to `/admin/appointments/calendar`
2. **Calendar** shows **all appointments** from all users
3. **Visual indicators:**
   - Event title + client name
   - Color by status
   - Time duration
4. **Admin** can:
   - See who is assigned to each appointment
   - Create new requests by clicking slots
   - Click events to view/edit details
   - Switch between calendar and list viewstype`: Filter by type
- `startDate`: Filter from date
- `endDate`: Filter to date
- `limit`: Maximum results (default: 100)

**RespoassignedAdmin": {
        "id": "admin_uuid",
        "firstName": "Admin",
        "lastName": "Name",
    Test Admin Request Creation ✨ NEW

```bash
curl -X POST http://localhost:3000/api/admin/appointments \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=admin_token" \
  -d '{
    "action": "create",
    "clientEmail": "client@example.com",
    "title": "Test Consultation",
    "description": "Testing admin request feature",
    "startTime": "2026-01-20T10:00:00Z",
    "endTime": "2026-01-20T11:00:00Z",
    "type": "free",
    "location": "Office",
    "notes": "Test appointment"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "new_uuid",
    "status": "pending",
    "title": "Test Consultation",
    ...
  },
  "message": "Appointment request sent to client"
}
```Admin Request Issues ✨ NEW

**Error: "Client not found with this email"**
- **Cause**: Email doesn't exist in users table
- **Solution**: Verify email is correct, client must be registered first

**Error: "Missing required fields"**
- **Cause**: clientEmail, title, startTime, or endTime missing
- **Solution**: Include all required fields in request body

**Pending appointments not showing for client**
- **Cause**: Status filter or UI issue
- **Solution**: Check status is `pending`, refresh page, check console for errors

### Client Confirmation Issues ✨ NEW

**Error: "You can only confirm your own pending appointments"**
- **Cause**: Either appointment doesn't belong to user or status is not `pending`
- **Solution**: Verify appointment ownership and status

**Confirm button doesn't work**
- **Cause**: API error or network issue
- **Solution**: Check browser console, verify authentication, check API logs

### OAuth Errors

- **state_expired**: User took too long, restart OAuth flow
- **invalid_state**: State verification failed, check encryption
- **access_denied**: User denied permissions

### Sync Issues

- Check token expiration and refresh logic
- Verify calendar permissions
- Check API rate limits

### Payment Issues

- Verify Lago API key configuration
- Check customer exists in Lago
- Review webhook configuration

## Changelog

### January 7, 2026 ✨ NEW FEATURES

**Admin Request System:**
- ✅ Admins can request appointments with clients via calendar interface
- ✅ POST `/api/admin/appointments` with action `create`
- ✅ New page `/admin/appointments/calendar` with full calendar view
- ✅ Dialog-based appointment request form
- ✅ Automatic assignment of requesting admin

**Client Confirmation:**
- ✅ Clients can confirm pending appointments
- ✅ PUT `/api/appointments/{id}` now allows client confirmation
- ✅ Special pending confirmation section in `/dashboard/appointments`
- ✅ Visual yellow/gold card for pending appointments
- ✅ One-click confirmation button

**Calendar Enhancements:**
- ✅ Admin calendar view shows all users' appointments
- ✅ Color-coded status indicators
- ✅ Click slot to create appointment request
- ✅ Navigation between list and calendar views

**Security Updates:**
- ✅ Enhanced permission checks for appointment confirmation
- ✅ Clients can only confirm own pending appointments
- ✅ Admins retain full control over all appointments

**Files Modified:**
- `app/api/admin/appointments/route.ts` - Added create action
- `app/api/appointments/[id]/route.ts` - Updated confirmation logic
- `app/(private)/admin/appointments/page.tsx` - Added calendar link
- `app/(private)/dashboard/appointments/page.tsx` - Added confirmation section

**Files Created:**
- `app/(private)/admin/appointments/calendar/page.tsx` - New admin calendar
- `docs/ADMIN_APPOINTMENT_REQUEST_SYSTEM.md` - Implementation guide
    "status": "confirmed",
    "updatedAt": "2026-01-15T14:30:00Z",
    ...
  }
}
```

**Error Cases:**
```bash
# Client tries to confirm someone else's appointment
# Expected: 404 Appointment not found

# Client tries to confirm already confirmed appointment
# Expected: 403 You can only confirm your own pending appointments
```

###     "email": "admin@example.com"
      },
      "product": { ... },
      "status": "confirmed",
      "startTime": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### POST /api/admin/appointments (action: create) ✨ NEW
Create an appointment request for a client.

**Request Body:**
```json
{
  "action": "create",
  "clientEmail": "client@example.com",
  "title": "Technical Consultation",
  "description": "Discussion about the project",
  "startTime": "2026-01-20T10:00:00Z",
  "endTime": "2026-01-20T11:00:00Z",
  "timezone": "Europe/Paris",
  "type": "free",
  "price": 0,
  "currency": "EUR",
  "location": "Paris Office",
  "meetingUrl": "https://meet.google.com/abc-defg-hij",
  "notes": "VIP client - prepare documentation"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "new_appointment_uuid",
    "userId": "client_uuid",
    "assignedAdminId": "admin_uuid",
    "status": "pending",
    "title": "Technical Consultation",
    ...
  },
  "message": "Appointment request sent to client"
}
```

**Behavior:**
- Client must exist in the database (searched by email)
- Appointment is created with `status: pending`
- Client needs to confirm the appointment
- Admin who created it is automatically assigned (`assignedAdminId`)

**Error Responses:**
- `400`: Missing required fields (clientEmail, title, startTime, endTime)
- `404`: Client not found with provided email   "id": "uuid",
      "title": "Consultation",
      "user": {
        "id": "user_uuid",
        "firstName": "Jean",
        "lastName": "Dupont",
        "email": "jean@example.com"
      },
      "product": { ... },
      "status": "confirmed",
      "startTime": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### POST /api/admin/appointments (action: stats)
Get appointment statistics for the current month.

**Request Body:**
```json
{
  "action": "stats"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 45,
    "pending": 5,
    "confirmed": 20,
    "completed": 15,
    "cancelled": 3,
    "noShow": 2,
    "paidAppointments": 30,
    "unpaidAppointments": 5,
    "totalRevenue": 150000,
    "unpaidAmount": 25000
  }
}
```

## Support Page

The client dashboard includes a Support/Help Center page (`/dashboard/support`) with:

### Features
- **FAQ Section**: Accordion-based frequently asked questions in French
- **Quick Actions**:
  - Documentation link
  - Live chat button
  - Email contact (support@neosaas.com)
- **Contact Form**: Submit support tickets with category selection
- **Tips Section**: Helpful guidance for users

### Categories for Support Tickets
- Question générale (General question)
- Facturation / Paiement (Billing/Payment)
- Rendez-vous (Appointments)
- Problème technique (Technical issue)
- Mon compte (Account)
- Autre (Other)

## Navigation Structure

### Client Sidebar (navItems)
```typescript
const navItems = [
  { name: "Overview", href: "/dashboard", icon: Home },
  { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  { name: "Appointments", href: "/dashboard/appointments", icon: CalendarDays },
  { name: "Payments", href: "/dashboard/payments", icon: CreditCard },
  { name: "Company Management", href: "/dashboard/company-management", icon: Building2 },
  { name: "Profile", href: "/dashboard/profile", icon: User },
  { name: "Support", href: "/dashboard/support", icon: HelpCircle },
]
```

### Admin Sidebar (adminItems)
```typescript
const adminItems = [
  { name: "Dashboard", href: "/admin", icon: Shield },
  { name: "Appointments", href: "/admin/appointments", icon: CalendarDays },
  { name: "Products", href: "/admin/products", icon: ShoppingBag },
  { name: "Organization", href: "/admin/users", icon: Users },
  { name: "Parameters", href: "/admin/settings", icon: Settings },
  { name: "API Management", href: "/admin/api", icon: Key },
  { name: "Mail Management", href: "/admin/mail", icon: Mail },
  { name: "Legal & Compliance", href: "/admin/legal", icon: FileText },
]
```

## Server Actions

Located in `app/actions/appointments.ts`:

- `getAppointments()` - Fetch appointments
- `getAppointmentById()` - Get single appointment
- `createAppointment()` - Create appointment
- `updateAppointment()` - Update appointment
- `cancelAppointment()` - Cancel appointment
- `confirmAppointment()` - Confirm appointment
- `completeAppointment()` - Mark as completed
- `deleteAppointment()` - Delete appointment
- `getAppointmentSlots()` - Get availability slots
- `upsertAppointmentSlot()` - Create/update slot
- `getAppointmentExceptions()` - Get exceptions
- `createAppointmentException()` - Create exception
- `getCalendarConnections()` - Get connected calendars
- `getAppointmentStats()` - Get statistics
- `getPublicAvailableSlots()` - Get available slots (for booking)

## Calendar Sync Utilities

Located in `lib/calendar/`:

### Google Calendar (`google.ts`)

- `getGoogleAuthUrl()` - Generate OAuth URL
- `exchangeGoogleCode()` - Exchange code for tokens
- `refreshGoogleToken()` - Refresh access token
- `createGoogleEvent()` - Create calendar event
- `updateGoogleEvent()` - Update calendar event
- `deleteGoogleEvent()` - Delete calendar event
- `getGoogleEvents()` - Fetch calendar events

### Microsoft Outlook (`microsoft.ts`)

- `getMicrosoftAuthUrl()` - Generate OAuth URL
- `exchangeMicrosoftCode()` - Exchange code for tokens
- `refreshMicrosoftToken()` - Refresh access token
- `createMicrosoftEvent()` - Create calendar event
- `updateMicrosoftEvent()` - Update calendar event
- `deleteMicrosoftEvent()` - Delete calendar event
- `getMicrosoftEvents()` - Fetch calendar events

### Sync Service (`sync.ts`)

- `getValidAccessToken()` - Get valid token (auto-refresh)
- `syncAppointmentToCalendars()` - Sync to external calendars
- `deleteAppointmentFromCalendars()` - Delete from external calendars
- `storeCalendarConnection()` - Store OAuth connection
- `disconnectCalendar()` - Remove connection

## Security

### Token Encryption

All OAuth tokens are encrypted using AES-256-GCM before storage:

```typescript
import { encrypt, decrypt } from '@/lib/email/utils/encryption'

// Encrypt before storing
const encryptedToken = await encrypt(accessToken)

// Decrypt when needed
const accessToken = await decrypt(encryptedToken)
```

### State Parameter

OAuth flows use encrypted state parameters to prevent CSRF attacks:

```typescript
const stateData = JSON.stringify({
  userId: user.userId,
  timestamp: Date.now(),
})
const state = await encrypt(stateData)
```

## Lago Integration

Paid appointments integrate with Lago for invoicing:

1. User creates a paid appointment
2. User clicks "Create Invoice"
3. System calls Lago API to create invoice
4. Invoice ID stored in appointment
5. Payment status updated on webhook

### Webhook Handler

The Lago webhook at `/api/lago-webhook` handles payment confirmations and updates the appointment payment status.

## Testing

### Create a Test Appointment

```bash
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=your_token" \
  -d '{
    "title": "Test Appointment",
    "startTime": "2024-01-15T10:00:00Z",
    "endTime": "2024-01-15T11:00:00Z",
    "type": "free"
  }'
```

### Test Calendar Connection

1. Navigate to `/dashboard/calendar/settings`
2. Click "Connect" for Google or Microsoft
3. Complete OAuth flow
4. Verify connection appears as active

## Dependencies

```bash
npm install react-big-calendar date-fns googleapis @azure/msal-react
```

Note: `googleapis` is optional if only using fetch-based implementation.

## Troubleshooting

### OAuth Errors

- **state_expired**: User took too long, restart OAuth flow
- **invalid_state**: State verification failed, check encryption
- **access_denied**: User denied permissions

### Sync Issues

- Check token expiration and refresh logic
- Verify calendar permissions
- Check API rate limits

### Payment Issues

- Verify Lago API key configuration
- Check customer exists in Lago
- Review webhook configuration
