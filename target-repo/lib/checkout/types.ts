/**
 * Types pour le tunnel d'achat
 * v4.0 - Système à 3 catégories de produits
 */

// Product Types - v4.0
// 'physical' = produit physique (envoi postal avec tracking)
// 'digital' = produit numérique (téléchargement instantané + code/licence)
// 'appointment' = rendez-vous/consultation (réservation de créneau)
// Legacy types (backward compatibility):
// 'standard' = anciennement produit standard (migrer vers physical ou digital)
// 'free' = anciennement produit gratuit (utiliser isFree: true maintenant)
// 'consulting' = anciennement consulting (renommé en appointment)
export type ProductType = 'physical' | 'digital' | 'appointment' | 'standard' | 'free' | 'consulting'

// Appointment Mode - for appointment products (renamed from ConsultingMode)
export type AppointmentMode = 'packaged' | 'hourly'
export type ConsultingMode = AppointmentMode // Legacy alias

// Shipping Address for physical products
export interface ShippingAddress {
  name: string
  street: string
  city: string
  postalCode: string
  country: string
  phone?: string
  instructions?: string // Special delivery instructions
}

export interface CheckoutItem {
  productId: string
  productTitle: string
  productType: ProductType
  quantity: number
  unitPrice: number
  totalPrice: number
  isFree?: boolean
  // Physical product fields
  requiresShipping?: boolean
  weight?: number
  // Digital product fields
  fileUrl?: string
  licenseKey?: string
  // Consulting product fields
  appointmentMode?: ConsultingMode
  hourlyRate?: number
  metadata?: Record<string, any>
}

export interface AppointmentBookingData {
  productId: string
  startTime: Date
  endTime: Date
  timezone: string
  attendeeEmail: string
  attendeeName: string
  attendeePhone?: string
  notes?: string
}

export interface CheckoutSession {
  id: string
  userId: string
  userEmail: string
  items: CheckoutItem[]
  appointmentData?: AppointmentBookingData
  shippingAddress?: ShippingAddress // For physical products
  totalAmount: number
  currency: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded'
  createdAt: Date
  completedAt?: Date
}

export interface CheckoutResult {
  success: boolean
  orderId?: string
  appointmentId?: string
  invoiceId?: string
  paymentUrl?: string
  downloadUrl?: string // For digital products
  licenseKey?: string // For digital products
  shippingStatus?: string // For physical products
  error?: string
  requiresPayment?: boolean
  testMode?: boolean
}

export interface LagoTestModeResult {
  success: boolean
  invoiceId: string
  invoiceNumber: string
  amount: number
  currency: string
  status: 'draft' | 'pending' | 'paid'
  testMode: true
  message: string
}

export interface TeamNotification {
  type: 'physical_product_purchase' | 'digital_product_purchase' | 'consulting_booking' | 'appointment_booking' | 'new_order'
  orderId: string
  orderNumber: string
  customerEmail: string
  customerName: string
  items: {
    name: string
    type: ProductType
    quantity: number
    price: number
    isFree?: boolean
  }[]
  totalAmount: number
  currency: string
  // For physical products
  shippingAddress?: ShippingAddress
  requiresShipping?: boolean
  // For consulting/appointment products
  appointmentDetails?: {
    startTime: Date
    endTime: Date
    timezone: string
    appointmentMode?: ConsultingMode
    hourlyRate?: number
    notes?: string
  }
  // For digital products
  digitalProductDetails?: {
    downloadUrl?: string
    licenseKey?: string
  }
}

// Shipping status for physical products
export type ShippingStatus = 'pending' | 'processing' | 'shipped' | 'delivered'

// Shipping carriers
export type ShippingCarrier = 'colissimo' | 'chronopost' | 'ups' | 'dhl' | 'fedex' | 'other'

export interface ShippingUpdate {
  orderId: string
  status: ShippingStatus
  trackingNumber?: string
  carrier?: ShippingCarrier
  estimatedDelivery?: Date
  notes?: string
}
