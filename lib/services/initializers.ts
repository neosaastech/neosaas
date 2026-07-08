/**
 * Service Initializers
 * Initialize third-party service clients using stored configurations
 */

import { serviceApiRepository } from './repository';
import type {
  StripeConfig,
  PayPalConfig,
  ScalewayConfig,
  ResendConfig,
  AWSConfig,
  LagoConfig,
  ServiceEnvironment,
} from './types';

/**
 * Initialize Stripe client
 */
export async function initStripe(environment: ServiceEnvironment = 'production') {
  const config = await serviceApiRepository.getConfig('stripe', environment) as StripeConfig | null;

  if (!config) {
    throw new Error(`Stripe configuration not found for environment: ${environment}`);
  }

  if (!config.isActive) {
    throw new Error(`Stripe configuration is not active for environment: ${environment}`);
  }

  return {
    secretKey: config.config.secretKey,
    publishableKey: config.config.publishableKey,
    webhookSecret: config.config.webhookSecret,
    metadata: config.metadata,
  };
}

/**
 * Initialize PayPal client
 */
export async function initPayPal(environment: ServiceEnvironment = 'production') {
  const config = await serviceApiRepository.getConfig('paypal', environment) as PayPalConfig | null;

  if (!config) {
    throw new Error(`PayPal configuration not found for environment: ${environment}`);
  }

  if (!config.isActive) {
    throw new Error(`PayPal configuration is not active for environment: ${environment}`);
  }

  return {
    clientId: config.config.clientId,
    clientSecret: config.config.clientSecret,
    webhookId: config.config.webhookId,
    mode: config.metadata?.mode || 'live',
    metadata: config.metadata,
  };
}

/**
 * Initialize Scaleway client
 */
export async function initScaleway(environment: ServiceEnvironment = 'production') {
  const config = await serviceApiRepository.getConfig('scaleway', environment) as ScalewayConfig | null;

  if (!config) {
    throw new Error(`Scaleway configuration not found for environment: ${environment}`);
  }

  if (!config.isActive) {
    throw new Error(`Scaleway configuration is not active for environment: ${environment}`);
  }

  return {
    accessKey: config.config.accessKey,
    secretKey: config.config.secretKey,
    projectId: config.config.projectId,
    organizationId: config.config.organizationId,
    region: config.metadata?.region || 'fr-par',
    zone: config.metadata?.zone || 'fr-par-1',
    metadata: config.metadata,
  };
}

/**
 * Initialize Resend client
 */
export async function initResend(environment: ServiceEnvironment = 'production') {
  const config = await serviceApiRepository.getConfig('resend', environment) as ResendConfig | null;

  if (!config) {
    throw new Error(`Resend configuration not found for environment: ${environment}`);
  }

  if (!config.isActive) {
    throw new Error(`Resend configuration is not active for environment: ${environment}`);
  }

  return {
    apiKey: config.config.apiKey,
    domain: config.metadata?.domain,
    metadata: config.metadata,
  };
}

/**
 * Initialize AWS client
 */
export async function initAWS(environment: ServiceEnvironment = 'production') {
  const config = await serviceApiRepository.getConfig('aws', environment) as AWSConfig | null;

  if (!config) {
    throw new Error(`AWS configuration not found for environment: ${environment}`);
  }

  if (!config.isActive) {
    throw new Error(`AWS configuration is not active for environment: ${environment}`);
  }

  return {
    credentials: {
      accessKeyId: config.config.accessKeyId,
      secretAccessKey: config.config.secretAccessKey,
      sessionToken: config.config.sessionToken,
    },
    region: config.config.region,
    accountId: config.metadata?.accountId,
    services: config.metadata?.services || [],
    metadata: config.metadata,
  };
}

/**
 * Initialize Lago client
 */
export async function initLago(environment: ServiceEnvironment = 'production') {
  const config = await serviceApiRepository.getConfig('lago', environment) as LagoConfig | null;

  if (!config) {
    throw new Error(`Lago configuration not found for environment: ${environment}`);
  }

  if (!config.isActive) {
    throw new Error(`Lago configuration is not active for environment: ${environment}`);
  }

  return {
    apiKey: config.config.apiKey,
    apiUrl: config.config.apiUrl,
    metadata: config.metadata,
  };
}

/**
 * Initialize GitHub client — reuses the same "github_api" config already
 * saved from admin/api's "API Configuration (Server Integration)" panel
 * (app/api/admin/configure-github-api/route.ts), extended with `repo` /
 * `workflowFile` so the update mechanism
 * (app/api/admin/system/update/route.ts) can dispatch apply-update.yml on
 * this site's own repo without a second, separate credential entry.
 */
export async function initGithub(environment: ServiceEnvironment = 'production') {
  const config = await serviceApiRepository.getConfig('github_api', environment) as
    | { isActive: boolean; config: { personalAccessToken: string; repo?: string; workflowFile?: string } }
    | null;

  if (!config) {
    throw new Error(`GitHub configuration not found for environment: ${environment}`);
  }

  if (!config.isActive) {
    throw new Error(`GitHub configuration is not active for environment: ${environment}`);
  }

  if (!config.config.repo) {
    throw new Error(`Dépôt cible manquant — renseigne "repo" dans la configuration GitHub API (ex: neosaastech/neosaas-website)`);
  }

  return {
    token: config.config.personalAccessToken,
    repo: config.config.repo,
    workflowFile: config.config.workflowFile || 'apply-update.yml',
  };
}

/**
 * Test a service configuration
 */
export async function testServiceConnection(serviceName: string, environment: ServiceEnvironment = 'production'): Promise<{ success: boolean; message: string }> {
  try {
    switch (serviceName) {
      case 'stripe':
        await initStripe(environment);
        return { success: true, message: 'Stripe configuration is valid' };

      case 'paypal':
        await initPayPal(environment);
        return { success: true, message: 'PayPal configuration is valid' };

      case 'scaleway':
        await initScaleway(environment);
        return { success: true, message: 'Scaleway configuration is valid' };

      case 'resend':
        await initResend(environment);
        return { success: true, message: 'Resend configuration is valid' };

      case 'aws':
        await initAWS(environment);
        return { success: true, message: 'AWS configuration is valid' };

      case 'lago':
        await initLago(environment);
        return { success: true, message: 'Lago configuration is valid' };

      case 'github_api': {
        const gh = await initGithub(environment);
        // Real validation, not just presence: confirm the token can actually
        // see the target repo (catches expired/wrong-scope tokens and typos
        // in the repo name before an admin relies on it in production).
        const res = await fetch(`https://api.github.com/repos/${gh.repo}`, {
          headers: {
            Authorization: `Bearer ${gh.token}`,
            Accept: 'application/vnd.github+json',
          },
        });
        if (!res.ok) {
          return {
            success: false,
            message: `GitHub API a répondu ${res.status} pour ${gh.repo} — vérifie le token et le nom du dépôt`,
          };
        }
        return { success: true, message: `Accès confirmé à ${gh.repo}` };
      }

      default:
        return { success: false, message: `Unknown service: ${serviceName}` };
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
