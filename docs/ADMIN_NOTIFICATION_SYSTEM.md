# Admin Notification System

## Overview

The admin notification system manages communications between the team and clients through an integrated chat system. Notifications are classified by event type (not grouped by user) with different levels of intervention.

---

## Notification Modes

Notifications are categorized into two modes:

### Interactive Mode
Requires admin assignment and action. Used for:
- **Orders** (purchases, payments)
- **Appointment validation** (physical/consulting)
- **Shipment required** (physical products)
- **Support tickets**

### Informative Mode
No assignment required - for tracking purposes only. Used for:
- **Profile changes** (name, email, avatar)
- **Profile type changes**
- **Password changes**
- **Digital sales** (auto-delivered)
- **System events**

```typescript
// All notifications include mode in metadata
metadata: {
  notificationMode: 'interactive' | 'informative',
  requiresAssignment: boolean
}
```

---

## Admin Menu Structure

### Support Menu (Admin Sidebar)

The admin sidebar includes a collapsible Support menu:

```
Admin
├── Business
├── Support               [Collapsible with icon]
│   ├── Support List      [/admin/chat]
│   └── Support Reply     [/admin/support/reply]
├── Appointments
├── Products
└── ...
```

---

### Notification Bell in Header

A notification bell icon is available in the admin header:
- Shows unread notification count (red badge)
- Dropdown with event-based filtering (All, Action Required, Orders, Appointments)
- Clicking a notification navigates to the relevant admin page
- Mark all as read functionality
- Polls for new notifications every 30 seconds

### Assignment Panel (Sheet)

Conversations can be assigned to administrators via a right-side panel:
- Quick self-assign button
- List of available administrators
- Click on "Unassigned" badge in conversation list to open panel directly
- Replaces the previous dialog for better UX

## Architecture

### Database Tables

```
chat_conversations     # Notification conversations
├── chat_messages      # Individual messages with metadata
└── metadata           # Notification type, action required, mode, etc.
```

### API Endpoints

```
GET  /api/admin/notifications           # Get notifications with filters
POST /api/admin/notifications/[id]/read # Mark single notification as read
POST /api/admin/notifications/read-all  # Mark all as read
```

**Query Parameters:**
- `type`: Filter by type (order, appointment, payment, user, support, system)
- `mode`: Filter by mode (interactive, informative)
- `unreadOnly`: Only show unread notifications
- `actionOnly`: Only show notifications requiring action
- `limit`: Maximum number of results

### Notification Types

| Type | Icon | Mode | Priority | Action Required |
|------|------|------|----------|-----------------|
| `appointment_validation` | 📦/👥 | Interactive | High | Yes - Validate/Propose/Reject |
| `shipment_required` | 📦 | Interactive | High | Yes - Ship |
| `order_payment` | 💳 | Interactive | Normal | Yes - Process |
| `support_ticket` | 💬 | Interactive | Normal | Yes - Respond |
| `digital_info` | 💻 | Informative | Low | No - Information only |
| `client_action` | 📌 | Informative | Low | No - Client tracking |
| `profile_change` | 👤 | Informative | Low | No - Profile update |
| `system_event` | ⚙️ | Informative | Low | No - System info |

---

## Notifications by Product Type

### 1. Physical Products (`physical`)

**Behavior:**
- Notification with **action required**
- Admin must validate delivery appointment
- If unavailable, can propose alternative
- Priority: **HIGH**

**Available actions:**
- ✅ Validate appointment
- 📅 Propose alternative
- ❌ Reject

```typescript
import { notifyAdminAppointmentValidation } from '@/lib/notifications/admin-notifications'

await notifyAdminAppointmentValidation({
  orderId: "uuid",
  orderNumber: "ORD-2026-001",
  appointmentId: "uuid",
  userId: "uuid",
  userEmail: "client@example.com",
  userName: "John Doe",
  productTitle: "Premium Package",
  productType: 'physical',
  proposedDate: new Date("2026-01-20T10:00:00"),
  proposedEndDate: new Date("2026-01-20T12:00:00"),
  attendeeName: "John Doe",
  attendeeEmail: "client@example.com"
})
```

---

### 2. Consulting Products (`consulting`)

**Behavior:**
- Notification with **action required**
- Admin must validate meeting slot
- Can propose alternative slots
- Priority: **HIGH**

**Available actions:**
- ✅ Validate appointment
- 📅 Propose alternative
- ❌ Reject

```typescript
await notifyAdminAppointmentValidation({
  // ... same parameters
  productType: 'consulting',
  productTitle: "Strategy Consultation",
})
```

---

### 3. Digital Products (`digital`)

**Behavior:**
- **Information only** notification
- No action required from admin
- Automatic delivery (URL/license key)
- Priority: **LOW**

```typescript
import { notifyAdminDigitalSaleInfo } from '@/lib/notifications/admin-notifications'

await notifyAdminDigitalSaleInfo({
  orderId: "uuid",
  orderNumber: "ORD-2026-002",
  userId: "uuid",
  userEmail: "client@example.com",
  userName: "John Doe",
  products: [
    { title: "E-Book Training", quantity: 1, price: 2900 }
  ],
  totalAmount: 2900,
  currency: "EUR",
  deliveryStatus: 'delivered'
})
```

---

## Assignment Policy

### Features

1. **Take over** - Admin can assign an unassigned conversation to themselves
2. **Remove assignment** - Assigned admin can unassign themselves
3. **Reassign** - Admin can reassign to another administrator
4. **Direct assign** - Click "Unassigned" badge to assign directly to any admin

### Admin Interface

```
┌─────────────────────────────────────────────────┐
│ Dropdown Menu                                    │
├─────────────────────────────────────────────────┤
│ 👤 Take over              (if unassigned)       │
│ 👥 Assign to another      (if unassigned)       │
│ ❌ Remove my assignment   (if assigned to me)   │
│ 👥 Reassign to another    (if assigned to me)   │
│ 👤 Take over conversation (if other admin)      │
│ ─────────────────────────────                   │
│ ℹ️ Assigned to: Admin Name                      │
│ ─────────────────────────────                   │
│ ❌ Close conversation                           │
└─────────────────────────────────────────────────┘
```

### Assignment API

```typescript
// Assign to self
POST /api/admin/chat/[id]/assign
{ "adminId": "my-user-id" }

// Assign to another admin
POST /api/admin/chat/[id]/assign
{ "adminId": "other-admin-id" }

// Remove assignment
POST /api/admin/chat/[id]/assign
{ "adminId": null }
```

---

## Message Timestamps

### Contextual Display

Timestamps display differently based on message date:

| Context | Format | Example |
|---------|--------|---------|
| Today | `HH:mm` | "14:30" |
| Yesterday | `Yesterday at HH:mm` | "Yesterday at 14:30" |
| This week | `EEEE at HH:mm` | "Monday at 14:30" |
| Older | `d MMM yyyy at HH:mm` | "15 Jan 2026 at 14:30" |

### Implementation

```typescript
const formatMessageTimestamp = (dateStr: string) => {
  const date = new Date(dateStr)
  if (isToday(date)) {
    return format(date, "HH:mm", { locale: fr })
  } else if (isYesterday(date)) {
    return `Yesterday at ${format(date, "HH:mm", { locale: fr })}`
  } else if (isThisWeek(date)) {
    return format(date, "EEEE 'at' HH:mm", { locale: fr })
  } else {
    return format(date, "d MMM yyyy 'at' HH:mm", { locale: fr })
  }
}
```

---

## Client Action Notifications

Track client activities (payments, profile updates, etc.):

```typescript
import { notifyAdminClientAction } from '@/lib/notifications/admin-notifications'

await notifyAdminClientAction({
  userId: "uuid",
  userEmail: "client@example.com",
  userName: "John Doe",
  actionType: 'payment',
  actionTitle: "Payment completed",
  actionDescription: "Client completed a payment of 99.00 EUR",
  metadata: {
    amount: 9900,
    currency: "EUR",
    orderId: "uuid"
  },
  priority: 'low'
})
```

### Available Action Types

| Type | Icon | Description |
|------|------|-------------|
| `payment` | 💳 | Payments made |
| `profile_update` | 👤 | Profile updates |
| `subscription` | 📋 | Subscription changes |
| `settings` | ⚙️ | Settings modifications |
| `support` | 💬 | Support requests |
| `other` | 📌 | Other actions |

---

## Appointment Validation Interface

### Chat Display

Notifications requiring action display with:
- Amber background for action required
- Icon based on type (📦 physical, 👥 consulting)
- Integrated action buttons

```
┌──────────────────────────────────────────────────────┐
│ 📦 Appointment validation required                   │
│                                                      │
│ Order: ORD-2026-001                                 │
│ Type: Physical product                               │
│ Service: Premium Package                             │
│                                                      │
│ 📅 Proposed appointment:                            │
│ • Date: Monday, January 20, 2026                    │
│ • Time: 10:00 - 12:00                               │
│                                                      │
│ 👤 Client:                                          │
│ • Name: John Doe                                    │
│ • Email: john@example.com                           │
│                                                      │
│ [✅ Validate] [📅 Propose alt.] [❌ Reject]         │
│                                                      │
│ Jan 15, 2026 at 09:30                               │
└──────────────────────────────────────────────────────┘
```

### Info Notifications (digital)

```
┌──────────────────────────────────────────────────────┐
│ ℹ️ Digital sale - ✅ Delivered automatically        │
│                                                      │
│ Order: ORD-2026-002                                 │
│ Client: John Doe (john@example.com)                 │
│ Amount: 29.00 EUR                                   │
│                                                      │
│ Products:                                           │
│ • E-Book Training x1 - 29.00 EUR                    │
│                                                      │
│ ✅ No action required                               │
│                                                      │
│ Jan 15, 2026 at 10:15                               │
└──────────────────────────────────────────────────────┘
```

---

## Badges in Conversation List

| Badge | Color | Meaning |
|-------|-------|---------|
| `Action` | Amber | Requires admin intervention |
| `Info` | Blue | Information only |
| `Unassigned` | Orange | No admin assigned (clickable) |
| Number | Red | Unread messages |

---

## Admin Support Pages

### Support List (`/admin/chat`)

Main support management page with:
- Conversation list with filtering
- Real-time refresh with visual feedback (spinning icon)
- Assignment management via Sheet panel
- Status and priority management

### Support Reply (`/admin/support/reply`)

Dedicated ticket reply interface:
- Left panel: Active tickets list
- Center: Conversation thread
- Right panel: Ticket details (Customer, Email, Ticket ID, Created, Status)
- Status management: In-Progress, Solved, On-Hold
- Reply with attachments support

---

## Client Action Tracking

The system tracks all significant client actions:

### Profile Updates

When users update their profile, a notification is sent:
- Changed fields are listed
- Email changes are highlighted
- Priority: Low (unless email changed)

### Password Changes

When users change their password:
- Via settings: Tracked as "Password Changed"
- Via recovery link: Tracked as "Password Reset"
- Priority: Normal

### Implementation Files

- `/api/profile/route.ts` - Profile updates
- `/api/profile/password/route.ts` - Password changes
- `/app/actions/auth.ts` - Password resets

---

## Files Modified

### Created
- `components/admin/notification-bell.tsx` - Bell dropdown component
- `app/api/admin/notifications/route.ts` - Notifications API
- `app/api/admin/notifications/[id]/read/route.ts` - Mark read API
- `app/api/admin/notifications/read-all/route.ts` - Mark all read API
- `app/(private)/admin/support/reply/page.tsx` - Support Reply page
- `docs/ADMIN_NOTIFICATION_SYSTEM.md` - This documentation

### Modified
- `components/layout/private-dashboard/header.tsx` - Added NotificationBell
- `components/layout/private-dashboard/sidebar.tsx` - Added collapsible Support menu with sub-items
- `app/(private)/admin/chat/page.tsx` - Improved UI, Sheet assignment panel, fixed Refresh button
- `app/(private)/dashboard/checkout/page.tsx` - Dynamic VAT calculation, conditional tax display
- `app/api/admin/notifications/route.ts` - Added mode filtering and stats
- `app/actions/ecommerce.ts` - Fixed orderItems.itemType to use actual product type
- `lib/notifications/admin-notifications.ts` - Added notification modes (interactive/informative), profile change notifications
- `lib/notifications/index.ts` - Exported new notification functions

---

## Dynamic VAT/Tax Calculation

### Checkout Page

The checkout page calculates VAT dynamically based on product configuration:

```typescript
// Extract VAT rate from each product
const items = validItems.map((item: any) => ({
  // ... other fields
  vatRate: item.product.vatRate?.rate ?? 0
}))

// Calculate tax dynamically
const tax = cartItems.reduce((acc, item) => {
  const itemTotal = item.price * item.quantity
  const vatRate = item.vatRate ?? 0
  return acc + (itemTotal * vatRate / 100)
}, 0)

// Only show tax if products have VAT configured
const hasVat = cartItems.some(item => item.vatRate && item.vatRate > 0)
```

### Behavior

| Product VAT Config | Tax Display |
|-------------------|-------------|
| No VAT rate set (0 or null) | Tax row hidden |
| VAT rate set (e.g., 20%) | Tax row shown with calculated amount |
| Mixed products | Tax calculated per product, total shown |

### Files

- `app/(private)/dashboard/checkout/page.tsx` - Checkout with dynamic VAT
- `app/(private)/dashboard/cart/page.tsx` - Cart with dynamic VAT
- `db/schema.ts` - Product VAT rate relation

---

## Troubleshooting

### Notifications not showing

1. **Check order item types**: Ensure `orderItems.itemType` uses actual product type (`digital`, `physical`, `appointment`) instead of generic `product`
2. **Verify notification API**: Check `/api/admin/notifications` response in browser dev tools
3. **Check conversation creation**: Notifications create chat conversations in the database

### Refresh button not working

- Button shows loading state (spinning icon) during refresh
- Toast notification confirms successful refresh
- Check browser console for errors

### Tax showing when no VAT configured

- Fixed in version 2.3.0
- Tax row only displays when `hasVat` is true
- Each product's VAT rate is checked individually

---

## Next Steps

1. **Email notifications** - Send email in addition to chat notification
2. **Push notifications** - Real-time via WebSocket
3. **Advanced filters** - Filter by notification type
4. **Dashboard** - Stats on notifications by type
5. **Automation** - Auto-validation for certain types

---

**Last updated:** 2026-01-15
**Version:** 3.1.0

---

## Changelog

### v3.1.0 (2026-01-15)
- Redesigned Support Reply page to match TailAdmin design
- Added ticket navigation with prev/next arrows and counter ("4 of 120")
- Replaced status dropdown with radio button style (In-Progress, Solved, On-Hold)
- Added contextual message timestamps (Today, Yesterday, This week, Older)
- Improved Ticket Details panel layout
- Fixed notification API error (null metadata handling)
- Added defensive try-catch blocks around database queries
- Fixed null/undefined metadata processing in notifications

### v3.0.0 (2026-01-15)
- Added notification modes: Interactive vs Informative
- Interactive mode requires assignment (orders, appointments, support)
- Informative mode for tracking only (profile changes, digital sales)
- Updated admin sidebar with collapsible Support menu
- Added Support List and Support Reply sub-items (TailAdmin style)
- Added `notifyAdminProfileChange` function for profile updates
- API now supports `mode` filter parameter
- Stats include mode breakdown (interactive/informative counts)

### v2.3.0
- Dynamic VAT calculation in checkout
- Conditional tax display based on product VAT configuration

### v2.2.0
- Added client action tracking
- Fixed Refresh button in Support List
- Added Support Reply page with Ticket Details panel
