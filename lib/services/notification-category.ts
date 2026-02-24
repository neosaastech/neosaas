/**
 * Notification Category Service
 * Determines the category of a notification based on its subject/type
 */

export type NotificationCategory = 'info' | 'action' | 'urgent'

// Regex patterns for urgent notifications (require immediate attention)
const URGENT_PATTERNS = [
  /payment\.?failed/i,
  /paiement\s+(échoué|refusé)/i, // French
  /security\.?alert/i,
  /alerte\s+sécurité/i, // French
  /urgent/i,
]

// Regex patterns for action notifications (require response/action)
const ACTION_PATTERNS = [
  // Orders
  /order\.?physical/i,
  /order\.?digital/i,
  /order\.?subscription/i,
  /commande\s+(physique|digitale|abonnement)/i, // French
  /new\s+order/i,
  /nouvelle\s+commande/i, // French
  // Support
  /support\.?(request|new)/i,
  /new\s+support/i,
  /demande\s+de?\s+support/i, // French
  /nouveau\s+ticket/i, // French
  // Contact
  /contact\.?form/i,
  /formulaire\s+de?\s+contact/i, // French
  // Quotes & Refunds
  /quote\.?request/i,
  /demande\s+de?\s+devis/i, // French
  /refund\.?request/i,
  /demande\s+de?\s+remboursement/i, // French
  // Generic action keywords
  /\[order\]/i,
  /\[support\]/i,
  /shipment\s+required/i,
  /expédition\s+requise/i, // French
]

// Regex patterns for info notifications (passive, no chat)
const INFO_PATTERNS = [
  // Profile updates
  /profile\.?updated/i,
  /profile\s+updated?/i,
  /profil\s+(mis\s+à\s+jour|modifié)/i, // French
  /update.*profile/i,
  /mise\s+à\s+jour.*profil/i, // French
  // User events
  /user\.?(logged[_\s]?in|registered)/i,
  /utilisateur\s+(connecté|inscrit)/i, // French
  /connexion/i, // French: login
  /inscription/i, // French: registration
  // Password & Security
  /password\.?(changed|updated|reset)/i,
  /mot\s+de\s+passe\s+(changé|modifié|réinitialisé)/i, // French
  // Email
  /email\.?(verified|updated|changed)/i,
  /email\s+(vérifié|modifié)/i, // French
  // Settings
  /settings\.?(updated|changed)/i,
  /paramètres\s+(mis\s+à\s+jour|modifiés)/i, // French
  // Subscription renewals (automatic, no action)
  /subscription\.?(renewed|activated)/i,
  /abonnement\s+(renouvelé|activé)/i, // French
  // Payment success (info only)
  /payment\.?success/i,
  /paiement\s+(réussi|accepté)/i, // French
  // Order completion (info only)
  /order\.?(completed|shipped|delivered)/i,
  /commande\s+(terminée|expédiée|livrée)/i, // French
  // Digital delivery (auto-processed)
  /digital\s+sale/i,
  /vente\s+digitale/i, // French
  /digital\s+product\s+delivery/i,
  // System notifications
  /\[system\]/i,
  /\[info\]/i,
  /ℹ️/,
]

/**
 * Determines the notification category based on subject
 * Uses regex patterns for flexible matching (dots, spaces, underscores)
 * @param subject - The notification subject/type
 * @returns The notification category: 'info', 'action', or 'urgent'
 */
export function determineCategory(subject: string): NotificationCategory {
  const normalizedSubject = subject.trim()

  // Check urgent patterns first (highest priority)
  if (URGENT_PATTERNS.some(pattern => pattern.test(normalizedSubject))) {
    return 'urgent'
  }

  // Check info patterns (before action, to correctly categorize passive notifications)
  if (INFO_PATTERNS.some(pattern => pattern.test(normalizedSubject))) {
    return 'info'
  }

  // Check action patterns
  if (ACTION_PATTERNS.some(pattern => pattern.test(normalizedSubject))) {
    return 'action'
  }

  // Default to 'action' for unknown patterns (safer to assume action required)
  return 'action'
}

/**
 * Configuration for category display
 */
export const categoryConfig = {
  info: {
    label: 'Info',
    labelFr: 'Information',
    icon: 'Info',
    color: 'gray',
    badgeClass: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    description: 'Notification passive - Aucune action requise',
    hasChat: false,
  },
  action: {
    label: 'Action Required',
    labelFr: 'Action requise',
    icon: 'AlertCircle',
    color: 'blue',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    description: 'Action requise - Chat disponible',
    hasChat: true,
  },
  urgent: {
    label: 'Urgent',
    labelFr: 'Urgent',
    icon: 'AlertTriangle',
    color: 'red',
    badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    description: 'Priorité élevée - Traitement immédiat',
    hasChat: true,
  },
}

/**
 * Checks if a category should have chat functionality
 */
export function categoryHasChat(category: NotificationCategory): boolean {
  return categoryConfig[category]?.hasChat ?? true
}

/**
 * Get all subjects that match a specific category
 */
export function getSubjectsForCategory(category: NotificationCategory): string[] {
  switch (category) {
    case 'urgent':
      return URGENT_PATTERNS
    case 'action':
      return ACTION_PATTERNS
    case 'info':
      return INFO_PATTERNS
    default:
      return []
  }
}
