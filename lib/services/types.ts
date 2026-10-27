/**
 * Service API Configuration Types
 * Defines type-safe interfaces for third-party service configurations
 */

// Service names supported by the platform
// github/google/facebook/microsoft (social login) and google-drive/dropbox/
// microsoft-sharepoint (document storage connectors) were wired into the
// admin/api picker (app/(private)/admin/api/page.tsx) without ever being
// added here -- serviceName was cast `as any` at every call site instead.
// Found live 2026-08-30: 'microsoft'/'facebook' were also missing from
// app/api/services/[service]/route.ts's validServices allowlist, so saving
// either would have silently failed with "Invalid service name" despite the
// picker letting you fill the form.
export type ServiceName =
  | 'stripe' | 'paypal' | 'scaleway' | 'resend' | 'aws' | 'lago'
  | 'github' | 'github_api' | 'google' | 'facebook' | 'microsoft'
  | 'google-drive' | 'dropbox' | 'microsoft-sharepoint';

// Service types categorization
export type ServiceType = 'payment' | 'email' | 'storage' | 'compute' | 'other';

// Environment types
export type ServiceEnvironment = 'production' | 'test' | 'sandbox';

// Base configuration interface
export interface BaseServiceConfig {
  serviceName: ServiceName;
  serviceType: ServiceType;
  environment: ServiceEnvironment;
  isActive: boolean;
  isDefault: boolean;
}

// Stripe configuration
export interface StripeConfig extends BaseServiceConfig {
  serviceName: 'stripe';
  serviceType: 'payment';
  config: {
    secretKey: string;
    publishableKey: string;
    webhookSecret?: string;
  };
  metadata?: {
    accountId?: string;
    currency?: string;
  };
}

// PayPal configuration
export interface PayPalConfig extends BaseServiceConfig {
  serviceName: 'paypal';
  serviceType: 'payment';
  config: {
    clientId: string;
    clientSecret: string;
    webhookId?: string;
  };
  metadata?: {
    mode?: 'sandbox' | 'live';
    currency?: string;
  };
}

// Scaleway configuration
export interface ScalewayConfig extends BaseServiceConfig {
  serviceName: 'scaleway';
  config: {
    accessKey: string;
    secretKey: string;
    projectId: string;
    organizationId?: string;
  };
  metadata?: {
    region?: string;
    zone?: string;
  };
}

// Resend configuration
export interface ResendConfig extends BaseServiceConfig {
  serviceName: 'resend';
  serviceType: 'email';
  config: {
    apiKey: string;
  };
  metadata?: {
    domain?: string;
  };
}

// AWS configuration
export interface AWSConfig extends BaseServiceConfig {
  serviceName: 'aws';
  config: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    sessionToken?: string;
  };
  metadata?: {
    accountId?: string;
    services?: string[]; // ['ses', 's3', 'lambda', etc.]
  };
}

// Lago configuration (billing)
export interface LagoConfig extends BaseServiceConfig {
  serviceName: 'lago';
  serviceType: 'payment';
  config: {
    apiKey: string;
    apiUrl: string;
  };
  metadata?: {
    organizationName?: string;
  };
}

// Shared shape for simple OAuth-style services (social login providers and
// document storage connectors alike) -- clientId/clientSecret is the whole
// story for all of them except Microsoft, which additionally needs a tenant.
export interface OAuthServiceConfig extends BaseServiceConfig {
  serviceName: 'github' | 'google' | 'facebook' | 'microsoft' | 'google-drive' | 'dropbox' | 'microsoft-sharepoint';
  serviceType: 'other';
  config: {
    clientId: string;
    clientSecret: string;
    tenant?: string; // microsoft/microsoft-sharepoint only, defaults to 'common'
  };
  metadata?: {
    redirectUri?: string;
  };
}

// Union type for all service configurations
export type ServiceConfig =
  | StripeConfig
  | PayPalConfig
  | ScalewayConfig
  | ResendConfig
  | AWSConfig
  | LagoConfig
  | OAuthServiceConfig;

// API Usage tracking
export interface ServiceApiUsageRecord {
  configId: string;
  serviceName: ServiceName;
  operation: string;
  status: 'success' | 'failed' | 'timeout';
  statusCode?: string;
  requestData?: Record<string, any>;
  responseData?: Record<string, any>;
  errorMessage?: string;
  responseTime?: number;
  costEstimate?: number;
}
