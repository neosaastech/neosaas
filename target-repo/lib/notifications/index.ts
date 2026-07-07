/**
 * Admin Notifications System
 *
 * Export notification functions for admin dashboard
 */

export {
  sendAdminNotification,
  notifyAdminNewOrder,
  notifyAdminNewAppointment,
  notifyAdminPhysicalProductsToShip,
  notifyClientProductShipped,
  notifyClientDigitalProductAccess,
  notifyAdminDigitalProductSale,
  // New notification types
  notifyAdminAppointmentValidation,
  notifyAdminDigitalSaleInfo,
  notifyAdminClientAction,
  notifyClientAlternativeAppointment,
} from './admin-notifications'
