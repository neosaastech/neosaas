/**
 * Service API Configuration Types
 * Defines type-safe interfaces for third-party service configurations
 */

// Service names supported by the platform
export type ServiceName = 'stripe' | 'paypal' | 'scaleway' | 'resend' | 'aws' | 'lago';

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

// Union type for all service configurations
export type ServiceConfig =
  | StripeConfig
  | PayPalConfig
  | ScalewayConfig
  | ResendConfig
  | AWSConfig
  | LagoConfig;

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
