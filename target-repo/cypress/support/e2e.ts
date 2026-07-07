// ***********************************************************
// This file is processed and loaded automatically before your test files.
// This is a great place to put global configuration and behavior.
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Hide fetch/XHR requests from command log for cleaner output
const app = window.top
if (app && !app.document.head.querySelector('[data-hide-command-log-request]')) {
  const style = app.document.createElement('style')
  style.innerHTML =
    '.command-name-request, .command-name-xhr { display: none }'
  style.setAttribute('data-hide-command-log-request', '')
  app.document.head.appendChild(style)
}

// Global error handling
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test
  // for common non-critical errors
  if (
    err.message.includes('ResizeObserver loop') ||
    err.message.includes('Non-Error promise rejection')
  ) {
    return false
  }
  return true
})
