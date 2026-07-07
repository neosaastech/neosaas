/// <reference types="cypress" />

// ***********************************************
// Custom commands for appointment booking tests
// ***********************************************

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Create a test booking via API
       * @example cy.createTestBooking({ serviceId: 'uuid', ... })
       */
      createTestBooking(data: {
        serviceId: string
        date: string
        attendeeName: string
        attendeeEmail: string
        attendeePhone?: string
        notes?: string
      }): Chainable<any>

      /**
       * Get a booking by ID
       * @example cy.getBooking('uuid')
       */
      getBooking(bookingId: string): Chainable<any>

      /**
       * Login as test user (if auth is required)
       * @example cy.login()
       */
      login(email?: string, password?: string): Chainable<void>

      /**
       * Verify booking status in database via API
       * @example cy.verifyBookingStatus('uuid', 'pending_payment')
       */
      verifyBookingStatus(
        bookingId: string,
        expectedStatus: 'pending_payment' | 'confirmed' | 'cancelled'
      ): Chainable<void>
    }
  }
}

// Create a test booking
Cypress.Commands.add('createTestBooking', (data) => {
  return cy.request({
    method: 'POST',
    url: '/api/bookings/test',
    body: data,
    failOnStatusCode: false,
  })
})

// Get a booking by ID
Cypress.Commands.add('getBooking', (bookingId) => {
  return cy.request({
    method: 'GET',
    url: `/api/bookings/test?id=${bookingId}`,
    failOnStatusCode: false,
  })
})

// Login command (simplified for testing)
Cypress.Commands.add('login', (email = 'admin@exemple.com', password = 'admin123') => {
  cy.session([email, password], () => {
    cy.request({
      method: 'POST',
      url: '/api/auth/login',
      body: { email, password },
      failOnStatusCode: false,
    })
  })
})

// Verify booking status
Cypress.Commands.add('verifyBookingStatus', (bookingId, expectedStatus) => {
  cy.getBooking(bookingId).then((response) => {
    expect(response.status).to.eq(200)
    expect(response.body.success).to.be.true
    expect(response.body.booking.status).to.eq(expectedStatus)
  })
})

export {}
