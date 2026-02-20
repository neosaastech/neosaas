/**
 * Stripe Credential Resolver
 * Resolves Stripe credentials from service_api_configs or environment variables.
 * Credentials are pushed to Lago via /payment_providers — no direct Stripe SDK needed.
 */

import { serviceApiRepository } from '@/lib/services'
import type { StripeConfig } from '@/lib/services/types'

export interface StripeCredentials {
  secretKey: string
  publishableKey: string
  webhookSecret?: string
  isSandbox: boolean
}

/**
 * Resolve Stripe credentials from the service_api_configs table.
 * Tries sandbox/test environment first if sandbox=true, then production.
 */
export async function getStripeCredentials(sandbox: boolean = false): Promise<StripeCredentials | null> {
  const environments = sandbox
    ? (['sandbox', 'test', 'production'] as const)
    : (['production', 'sandbox', 'test'] as const)

  for (const env of environments) {
    try {
      const config = await serviceApiRepository.getConfig('stripe', env) as (StripeConfig & { id: string }) | null
      if (config?.config?.secretKey) {
        const isSandbox = config.config.secretKey.startsWith('sk_test_')
        // Handle both field names: admin UI stores "publicKey", type expects "publishableKey"
        const pubKey = config.config.publishableKey || (config.config as any).publicKey || ''
        return {
          secretKey: config.config.secretKey,
          publishableKey: pubKey,
          webhookSecret: config.config.webhookSecret,
          isSandbox,
        }
      }
    } catch {
      // Continue to next environment
    }
  }

  // Fallback: environment variables
  const envSecretKey = sandbox
    ? (process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY)
    : (process.env.STRIPE_SECRET_KEY || process.env.STRIPE_TEST_SECRET_KEY)

  if (envSecretKey) {
    return {
      secretKey: envSecretKey,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      isSandbox: envSecretKey.startsWith('sk_test_'),
    }
  }

  return null
}
