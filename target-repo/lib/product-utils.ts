/**
 * Utilities for product price formatting
 * v5.0 - System with 3 categories: physical, digital, appointment
 *        + Payment types: one_time, hourly, subscription
 */

export interface Product {
  type: 'physical' | 'digital' | 'appointment' | 'standard' | 'free' | 'consulting' // v4.0 + legacy support
  price: number // in cents
  hourlyRate?: number | null // in cents
  currency: string
  isFree?: boolean // v4.0 - Free is now an attribute, not a type
  // v5.0 - Payment type
  paymentType?: 'one_time' | 'hourly' | 'subscription' | null
  subscriptionPriceWeekly?: number | null // in cents
  subscriptionPriceMonthly?: number | null // in cents
  subscriptionPriceYearly?: number | null // in cents
}

/**
 * Formats product price according to its type and payment type
 * - Physical: Unit price (e.g.: "99.00€")
 * - Free (legacy) or isFree: "Free"
 * - Appointment hourly: Hourly rate (e.g.: "150€/h") or "On quote"
 * - Subscription: "From X€/m" (lowest available period)
 * - One-time: Unit price
 */
export function formatProductPrice(product: Product): string {
  const currencySymbol = product.currency === 'EUR' ? '€' : '$'

  // v4.0 - Check isFree attribute first
  if (product.isFree) {
    return 'Free'
  }

  // v5.0 - Check subscription payment type
  if (product.paymentType === 'subscription') {
    return formatSubscriptionPrice(product)
  }

  // v5.0 - Check hourly payment type
  if (product.paymentType === 'hourly') {
    if (product.hourlyRate && product.hourlyRate > 0) {
      const hourlyAmount = (product.hourlyRate / 100).toFixed(2)
      return `${hourlyAmount}${currencySymbol}/h`
    }
    return 'On quote'
  }

  switch (product.type) {
    case 'free': // Legacy support
      return 'Free'

    case 'appointment':
    case 'consulting': // Legacy support
      if (product.hourlyRate && product.hourlyRate > 0) {
        const hourlyAmount = (product.hourlyRate / 100).toFixed(2)
        return `${hourlyAmount}${currencySymbol}/h`
      }
      return 'On quote'

    case 'digital':
    case 'standard':
    default:
      const amount = (product.price / 100).toFixed(2)
      return `${amount}${currencySymbol}`
  }
}

/**
 * Formats subscription price showing the available periods
 * Returns the most common period or a "from X" format
 */
export function formatSubscriptionPrice(product: Product): string {
  const currencySymbol = product.currency === 'EUR' ? '€' : '$'

  // Prioritize monthly, then yearly, then weekly
  if (product.subscriptionPriceMonthly) {
    const monthly = (product.subscriptionPriceMonthly / 100).toFixed(2)
    return `${monthly}${currencySymbol}/mo`
  }
  if (product.subscriptionPriceYearly) {
    const yearly = (product.subscriptionPriceYearly / 100).toFixed(2)
    return `${yearly}${currencySymbol}/yr`
  }
  if (product.subscriptionPriceWeekly) {
    const weekly = (product.subscriptionPriceWeekly / 100).toFixed(2)
    return `${weekly}${currencySymbol}/wk`
  }

  return 'Subscription'
}

/**
 * Gets all subscription prices formatted
 */
export function getSubscriptionPrices(product: Product): { period: string; label: string; price: number; formatted: string }[] {
  const currencySymbol = product.currency === 'EUR' ? '€' : '$'
  const prices: { period: string; label: string; price: number; formatted: string }[] = []

  if (product.subscriptionPriceWeekly) {
    const amount = product.subscriptionPriceWeekly / 100
    prices.push({ period: 'weekly', label: 'Weekly', price: amount, formatted: `${amount.toFixed(2)}${currencySymbol}/wk` })
  }
  if (product.subscriptionPriceMonthly) {
    const amount = product.subscriptionPriceMonthly / 100
    prices.push({ period: 'monthly', label: 'Monthly', price: amount, formatted: `${amount.toFixed(2)}${currencySymbol}/mo` })
  }
  if (product.subscriptionPriceYearly) {
    const amount = product.subscriptionPriceYearly / 100
    prices.push({ period: 'yearly', label: 'Yearly', price: amount, formatted: `${amount.toFixed(2)}${currencySymbol}/yr` })
  }

  return prices
}

/**
 * Gets the numeric price to display (avoid duplicates)
 * Returns null if the price should not be displayed numerically
 */
export function getProductDisplayPrice(product: Product): number | null {
  // v5.0 - Handle subscription
  if (product.paymentType === 'subscription') {
    if (product.subscriptionPriceMonthly) return product.subscriptionPriceMonthly / 100
    if (product.subscriptionPriceYearly) return product.subscriptionPriceYearly / 100
    if (product.subscriptionPriceWeekly) return product.subscriptionPriceWeekly / 100
    return null
  }

  switch (product.type) {
    case 'free':
      return 0

    case 'appointment':
      // For appointments, we return the hourly rate if it exists
      return product.hourlyRate ? product.hourlyRate / 100 : null

    case 'digital':
    case 'standard':
    default:
      return product.price / 100
  }
}

/**
 * Checks if the product has a valid price to display
 */
export function hasValidPrice(product: Product): boolean {
  if (product.type === 'free') return true
  if (product.paymentType === 'subscription') {
    return !!(product.subscriptionPriceWeekly || product.subscriptionPriceMonthly || product.subscriptionPriceYearly)
  }
  if (product.type === 'appointment') return !!product.hourlyRate
  return product.price > 0
}

/**
 * Obtient le label du prix (ex: "Prix", "Taux horaire", "Free")
 */
export function getPriceLabel(product: Product): string {
  if (product.paymentType === 'subscription') return 'Subscription'
  if (product.paymentType === 'hourly') return 'Hourly rate'

  switch (product.type) {
    case 'free':
      return 'Free'
    case 'appointment':
      return 'Hourly rate'
    case 'digital':
      return 'Digital price'
    case 'standard':
    default:
      return 'Price'
  }
}

/**
 * Gets the payment type display label
 */
export function getPaymentTypeLabel(paymentType: string | null | undefined): string {
  switch (paymentType) {
    case 'subscription':
      return 'Subscription'
    case 'hourly':
      return 'Hourly'
    case 'one_time':
    default:
      return 'One-time'
  }
}
