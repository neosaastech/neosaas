# Testing Guide - Appointment Booking Tunnel

## Overview

This document describes how to test the appointment booking tunnel for Neomia Studio.

## Architecture

### Isolated Test Endpoint

The `/api/bookings/test` endpoint provides an isolated way to create bookings **without** depending on:
- Lago payment system
- External calendar sync
- Email notifications (optional)

This allows testing the core booking flow independently.

### Booking Statuses

| Status | Description |
|--------|-------------|
| `pending_payment` | Booking created, awaiting payment |
| `confirmed` | Payment received, booking confirmed |
| `cancelled` | Booking cancelled |

## Prerequisites

1. **Local development server**
   ```bash
   pnpm dev
   ```

2. **Database setup**
   ```bash
   pnpm db:push
   pnpm db:seed
   ```

3. **Create a test appointment product** (via admin panel or database):
   - Type: `appointment`
   - isPublished: `true`
   - Note the product UUID

## Running Tests

### Install Cypress (if not installed)

```bash
pnpm add -D cypress
```

### Interactive Mode

```bash
npx cypress open
```

### Headless Mode

```bash
npx cypress run --spec "cypress/e2e/booking-tunnel.cy.ts"
```

### With ngrok (for external testing)

1. Install ngrok: https://ngrok.com/download

2. Start tunnel:
   ```bash
   ngrok http 3000
   ```

3. Run tests with tunnel URL:
   ```bash
   CYPRESS_BASE_URL=https://your-ngrok-url.ngrok.io npx cypress run
   ```

## API Testing

### Create a Test Booking

```bash
curl -X POST http://localhost:3000/api/bookings/test \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "YOUR_PRODUCT_UUID",
    "date": "2024-01-20T10:00:00Z",
    "attendeeName": "Jean Test",
    "attendeeEmail": "jean@test.com",
    "attendeePhone": "+33612345678",
    "notes": "Test booking"
  }'
```

**Response:**
```json
{
  "success": true,
  "booking": {
    "id": "uuid",
    "status": "pending_payment",
    "serviceName": "Consultation",
    "startTime": "2024-01-20T10:00:00.000Z",
    "endTime": "2024-01-20T11:00:00.000Z",
    "price": 5000,
    "currency": "EUR"
  },
  "checkoutUrl": "/dashboard/checkout/confirmation?bookingId=uuid"
}
```

### Get a Booking

```bash
curl http://localhost:3000/api/bookings/test?id=YOUR_BOOKING_UUID
```

### Simulate Payment

```bash
curl -X POST http://localhost:3000/api/checkout/simulate-payment \
  -H "Content-Type: application/json" \
  -d '{"appointmentId": "YOUR_BOOKING_UUID"}'
```

## Drizzle Studio Verification

View booking data directly in the database:

```bash
pnpm db:studio
```

Then check the `appointments` table for:
- `status`: Should be `pending`
- `payment_status`: Should be `pending`
- `is_paid`: Should be `false`

After simulating payment:
- `status`: Should be `confirmed`
- `payment_status`: Should be `paid`
- `is_paid`: Should be `true`

## Test Scenarios

### 1. Happy Path - Complete Booking Flow

1. Visit `/book/{productId}`
2. Select date and time
3. Fill in attendee information
4. Confirm booking
5. Verify redirect to confirmation page
6. Check booking status is `pending_payment`

### 2. Invalid Data Handling

- Empty name → Validation error
- Invalid email → Validation error
- Non-existent product → 404 error
- Non-appointment product → 400 error

### 3. Payment Simulation

1. Create booking (status: `pending_payment`)
2. Call simulate-payment endpoint
3. Verify status changes to `confirmed`

### 4. Cancellation

1. Create booking
2. Cancel via UI or API
3. Verify status changes to `cancelled`

## Environment Variables

For Cypress tests:

```env
CYPRESS_BASE_URL=http://localhost:3000
CYPRESS_API_URL=http://localhost:3000/api
```

## Troubleshooting

### "Service non trouvé" Error

- Ensure the product exists in the database
- Verify the product type is `appointment`
- Check `isPublished` is `true`

### Authentication Issues

The test endpoint supports both authenticated and guest users. For protected routes, ensure you have a valid session.

### Database Connection

Check your `DATABASE_URL` environment variable:
```bash
echo $DATABASE_URL
```

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Run Cypress Tests
  uses: cypress-io/github-action@v6
  with:
    start: pnpm dev
    wait-on: 'http://localhost:3000'
    spec: cypress/e2e/booking-tunnel.cy.ts
```

## Files Reference

| File | Purpose |
|------|---------|
| `/app/api/bookings/test/route.ts` | Test booking API endpoint |
| `/app/(public)/book/[productId]/page.tsx` | Public booking page with Neomia branding |
| `/app/(private)/dashboard/checkout/confirmation/page.tsx` | Booking confirmation page |
| `/app/(public)/pricing/page.tsx` | Pricing page with dynamic products |
| `/app/(public)/store/page.tsx` | Store page with product catalog |
| `/app/(private)/dashboard/checkout/page.tsx` | Checkout flow with cart management |
| `/cypress/e2e/booking-tunnel.cy.ts` | E2E test suite |
| `/cypress/support/commands.ts` | Custom Cypress commands |

## Order Tunnel Flow

### From Pricing Page
1. User visits `/pricing`
2. Clicks "Get started" or "Acheter maintenant" on a product
3. Product is added to cart via `addToCart()` server action
4. User is redirected to `/dashboard/checkout`
5. Checkout displays cart items with totals
6. For appointment products, user must select a time slot
7. Payment is processed and order confirmed

### From Store Page
1. User visits `/store`
2. Browses products by type (appointment, free, digital)
3. Clicks action button:
   - Appointment → redirects to `/book/{productId}`
   - Free → redirects to `/docs`
   - Other → adds to cart and redirects to checkout

### Empty Cart Handling
- Checkout page displays a friendly message when cart is empty
- Links to `/store` and `/dashboard/cart` are provided
- No automatic redirects that break the flow

## Changelog

### 2026-01-05
- **Fixed**: `/pricing` page 500 error - converted from Server to Client component
- **Fixed**: Missing `Check` and `Info` icon imports in pricing page
- **Fixed**: Added `handlePurchase` function for adding products to cart
- **Fixed**: `/store` page buttons now functional with proper routing
- **Added**: Dynamic products section in pricing page
- **Added**: Loading states with Loader2 spinner
- **Improved**: Empty cart UX in checkout page

### Previous
- Implemented isolated booking tunnel with Neomia Studio branding
- Created Cypress E2E test suite
- Added test booking API endpoint

## Support

For issues with the booking system, check:
1. Server logs for `[TestBooking]` prefix
2. Database via Drizzle Studio
3. Network tab in browser dev tools
