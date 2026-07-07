/**
 * License Key Generator
 * Génère des clés de licence uniques pour les produits digitaux
 */

import crypto from 'crypto'

/**
 * Génère une clé de licence aléatoire au format standard
 * Format: XXXX-XXXX-XXXX-XXXX
 * 
 * @param segments - Nombre de segments (défaut: 4)
 * @param segmentLength - Longueur de chaque segment (défaut: 4)
 * @returns Clé de licence formatée
 */
export function generateLicenseKey(segments: number = 4, segmentLength: number = 4): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const keySegments: string[] = []

  for (let i = 0; i < segments; i++) {
    let segment = ''
    for (let j = 0; j < segmentLength; j++) {
      const randomIndex = crypto.randomInt(0, chars.length)
      segment += chars[randomIndex]
    }
    keySegments.push(segment)
  }

  return keySegments.join('-')
}

/**
 * Génère une clé de licence basée sur un template de produit
 * Remplace les 'X' par des caractères aléatoires
 * 
 * Exemples de templates :
 * - "PROD-XXXX-XXXX-XXXX" → "PROD-A3F2-9K7M-1B4N"
 * - "APP-XXX-XXX" → "APP-A3F-9K7"
 * - "XXXX-XXXX" → "A3F2-9K7M"
 * 
 * @param template - Template avec des X à remplacer
 * @returns Clé de licence générée selon le template
 */
export function generateLicenseKeyFromTemplate(template: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  
  return template.replace(/X/g, () => {
    const randomIndex = crypto.randomInt(0, chars.length)
    return chars[randomIndex]
  })
}

/**
 * Génère une clé de licence personnalisée pour un produit digital
 * Utilise le template du produit si disponible, sinon génère une clé standard
 * 
 * @param productTitle - Titre du produit (pour préfixe optionnel)
 * @param licenseKeyTemplate - Template optionnel défini dans le produit
 * @returns Clé de licence générée
 */
export function generateProductLicenseKey(
  productTitle: string,
  licenseKeyTemplate?: string | null
): string {
  // Si un template existe, l'utiliser
  if (licenseKeyTemplate && licenseKeyTemplate.includes('X')) {
    return generateLicenseKeyFromTemplate(licenseKeyTemplate)
  }

  // Sinon, générer une clé standard avec préfixe du produit
  // Extraire les 4 premières lettres du titre (sans espaces)
  const prefix = productTitle
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .substring(0, 4)
    .padEnd(4, 'X')

  return `${prefix}-${generateLicenseKey(3, 4)}`
}

/**
 * Valide le format d'une clé de licence
 * 
 * @param licenseKey - Clé à valider
 * @returns true si la clé est valide
 */
export function validateLicenseKey(licenseKey: string): boolean {
  // Format attendu: au moins 2 segments séparés par des tirets
  // Chaque segment contient uniquement des lettres majuscules et des chiffres
  const pattern = /^[A-Z0-9]+-[A-Z0-9]+(-[A-Z0-9]+)*$/
  return pattern.test(licenseKey)
}

/**
 * Génère un code d'activation court (pour produits simples)
 * Format: ABC123XY
 * 
 * @param length - Longueur du code (défaut: 8)
 * @returns Code d'activation court
 */
export function generateActivationCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, chars.length)
    code += chars[randomIndex]
  }
  
  return code
}
