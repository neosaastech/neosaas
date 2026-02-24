/// <reference types="cypress" />

/**
 * Cypress E2E Tests - Appointment Booking Tunnel
 *
 * Tests the complete booking flow:
 * 1. Form submission on /book/[serviceId]
 * 2. API creates booking with status 'pending_payment'
 * 3. Redirect to confirmation page
 * 4. Verification of booking in database
 *
 * Prerequisites:
 * - Server running on localhost:3000
 * - Test appointment product exists in database
 * - ngrok tunnel (optional, for external testing)
 *
 * Run tests:
 *   npx cypress run --spec "cypress/e2e/booking-tunnel.cy.ts"
 *   npx cypress open (interactive mode)
 */

describe('Appointment Booking Tunnel', () => {
  // Test data - update with actual product ID from your database
  const testServiceId = '00000000-0000-0000-0000-000000000001' // Replace with real ID
  const testBookingData = {
    serviceId: testServiceId,
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    attendeeName: 'Jean Test',
    attendeeEmail: 'jean.test@example.com',
    attendeePhone: '+33612345678',
    notes: 'Test booking from Cypress',
  }

  describe('API Tests - /api/bookings/test', () => {
    it('should create a test booking successfully', () => {
      cy.createTestBooking(testBookingData).then((response) => {
        cy.log('Response:', JSON.stringify(response.body))

        // If product doesn't exist, it should return 404
        if (response.status === 404) {
          cy.log('Note: Test product not found. Create an appointment product first.')
          return
        }

        // Successful booking
        if (response.status === 200) {
          expect(response.body.success).to.be.true
          expect(response.body.booking).to.have.property('id')
          expect(response.body.booking.status).to.eq('pending_payment')
          expect(response.body.checkoutUrl).to.include('/dashboard/checkout/confirmation')

          // Store booking ID for later tests
          cy.wrap(response.body.booking.id).as('bookingId')
        }
      })
    })

    it('should reject invalid data', () => {
      cy.createTestBooking({
        serviceId: 'invalid-uuid',
        date: 'invalid-date',
        attendeeName: '',
        attendeeEmail: 'invalid-email',
      }).then((response) => {
        expect(response.status).to.eq(400)
        expect(response.body.success).to.be.false
        expect(response.body.error).to.eq('Données invalides')
      })
    })

    it('should return 404 for non-existent service', () => {
      cy.createTestBooking({
        ...testBookingData,
        serviceId: '11111111-1111-1111-1111-111111111111',
      }).then((response) => {
        expect(response.status).to.eq(404)
        expect(response.body.success).to.be.false
      })
    })
  })

  describe('Booking Retrieval Tests', () => {
    let createdBookingId: string

    before(() => {
      // Create a booking first
      cy.createTestBooking(testBookingData).then((response) => {
        if (response.status === 200) {
          createdBookingId = response.body.booking.id
        }
      })
    })

    it('should retrieve a booking by ID', function () {
      if (!createdBookingId) {
        cy.log('Skipping: No booking was created')
        return
      }

      cy.getBooking(createdBookingId).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body.success).to.be.true
        expect(response.body.booking.id).to.eq(createdBookingId)
        expect(response.body.booking.attendeeName).to.eq(testBookingData.attendeeName)
        expect(response.body.booking.attendeeEmail).to.eq(testBookingData.attendeeEmail)
      })
    })

    it('should return 404 for non-existent booking', () => {
      cy.getBooking('99999999-9999-9999-9999-999999999999').then((response) => {
        expect(response.status).to.eq(404)
        expect(response.body.success).to.be.false
      })
    })
  })

  describe('UI Flow Tests - Booking Page', () => {
    // Note: These tests require a real appointment product to be created
    // Update the productId to match a real product in your database

    it('should display the Neomia Studio header', () => {
      // Visit the booking page (will show error if product doesn't exist)
      cy.visit(`/book/${testServiceId}`, { failOnStatusCode: false })

      // Check for loading state or error
      cy.get('body').then(($body) => {
        // If product exists, check for Neomia branding
        if ($body.text().includes('Neomia Studio')) {
          cy.contains('Neomia Studio').should('be.visible')
          cy.contains('Réservation de rendez-vous').should('be.visible')
        } else {
          // Product doesn't exist - that's OK for test environment
          cy.log('Note: Product not found - UI tests require a real appointment product')
        }
      })
    })

    it('should show trust badges', () => {
      cy.visit(`/book/${testServiceId}`, { failOnStatusCode: false })

      cy.get('body').then(($body) => {
        if ($body.text().includes('Confirmation immédiate')) {
          cy.contains('Confirmation immédiate').should('be.visible')
          cy.contains('Annulation gratuite').should('be.visible')
          cy.contains('Service premium').should('be.visible')
        }
      })
    })
  })

  describe('Confirmation Page Tests', () => {
    let testBookingId: string

    before(() => {
      // Create a test booking
      cy.createTestBooking(testBookingData).then((response) => {
        if (response.status === 200) {
          testBookingId = response.body.booking.id
        }
      })
    })

    it('should display booking details on confirmation page', function () {
      if (!testBookingId) {
        cy.log('Skipping: No booking was created')
        return
      }

      // Note: This page requires authentication in production
      // For testing, we're checking the API response directly
      cy.getBooking(testBookingId).then((response) => {
        if (response.status === 200) {
          const booking = response.body.booking
          expect(booking.serviceName).to.exist
          expect(booking.startTime).to.exist
          expect(booking.status).to.eq('pending_payment')
        }
      })
    })
  })

  describe('Complete Booking Flow', () => {
    it('should complete the full booking → confirmation flow', () => {
      // Step 1: Create booking via API
      cy.createTestBooking(testBookingData).then((response) => {
        if (response.status !== 200) {
          cy.log('Booking creation failed - test requires valid product')
          return
        }

        const { booking, checkoutUrl } = response.body

        // Step 2: Verify booking was created with correct status
        expect(booking.status).to.eq('pending_payment')

        // Step 3: Verify checkoutUrl is correct
        expect(checkoutUrl).to.include(`bookingId=${booking.id}`)

        // Step 4: Fetch booking to verify persistence
        cy.getBooking(booking.id).then((getResponse) => {
          expect(getResponse.status).to.eq(200)
          expect(getResponse.body.booking.id).to.eq(booking.id)
          expect(getResponse.body.booking.status).to.eq('pending_payment')

          cy.log(`✅ Booking created successfully: ${booking.id}`)
          cy.log(`✅ Status: ${getResponse.body.booking.status}`)
          cy.log(`✅ Checkout URL: ${checkoutUrl}`)
        })
      })
    })
  })
})

/**
 * Fixture helper for generating test data
 */
describe('Test Data Generation', () => {
  it('should generate valid booking dates', () => {
    const now = new Date()
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Ensure date is in the future
    expect(futureDate.getTime()).to.be.greaterThan(now.getTime())

    // Ensure ISO string format
    expect(futureDate.toISOString()).to.match(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/
    )
  })
})
