/**
 * Types et interfaces pour le système d'envoi d'emails multi-fournisseurs
 */

// =============================================================================
// ENUMS
// =============================================================================

export enum EmailProvider {
  AWS_SES = 'aws-ses',
  RESEND = 'resend',
  SCALEWAY_TEM = 'scaleway-tem',
}

export enum EmailDeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  BOUNCED = 'bounced',
}

export enum EmailEventType {
  OPENED = 'opened',
  CLICKED = 'clicked',
  BOUNCED = 'bounced',
  COMPLAINED = 'complained',
  DELIVERED = 'delivered',
}

// =============================================================================
// EMAIL MESSAGE
// =============================================================================

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export interface EmailMessage {
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  from?: string;
  fromName?: string;
  replyTo?: string;
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  attachments?: EmailAttachment[];
  tags?: string[];
  customHeaders?: Record<string, string>;
  /** DB template type (e.g. 'order_confirmation_digital'). When set the router
   *  fetches the template from `email_templates`, replaces {{variables}} with
   *  `data`, and uses the resolved HTML/text/subject. */
  template?: string;
  /** Variables to inject into the template (replaces {{key}} placeholders). */
  data?: Record<string, any>;
}

// =============================================================================
// PROVIDER CONFIGS
// =============================================================================

export interface AwsSesConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  method?: 'api' | 'smtp'; // API ou SMTP
  smtpHost?: string;
  smtpPort?: number;
}

export interface ResendConfig {
  apiKey: string;
}

export interface ScalewayTemConfig {
  projectId: string;
  secretKey: string;
  region?: string; // fr-par, nl-ams, pl-waw
  apiUrl?: string;
  plan?: 'essential' | 'scale';
  verifiedDomains?: string[]; // Domains verified in Scaleway TEM
}

export interface EmailProviderConfig {
  provider: EmailProvider;
  isActive: boolean;
  isDefault: boolean;
  awsSes?: AwsSesConfig;
  resend?: ResendConfig;
  scalewayTem?: ScalewayTemConfig;
}

// =============================================================================
// PROVIDER RESPONSE
// =============================================================================

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  provider: EmailProvider;
  error?: string;
  sentAt?: Date;
}

export interface ProviderConnectionStatus {
  provider: EmailProvider;
  isConnected: boolean;
  lastChecked: Date;
  error?: string;
  details?: {
    verifiedDomains?: string[];
    quotas?: {
      sent24h?: number;
      max24h?: number;
      maxPerSecond?: number;
    };
  };
}

// =============================================================================
// TEMPLATES
// =============================================================================

export interface EmailTemplateVariables {
  firstName?: string;
  lastName?: string;
  email?: string;
  companyName?: string;
  actionUrl?: string;
  siteName?: string;
  [key: string]: string | undefined;
}

export interface EmailTemplate {
  type: string;
  name: string;
  description?: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  htmlContent?: string;
  textContent?: string;
  isActive: boolean;
  provider?: EmailProvider;
}

// =============================================================================
// RETRY & ERROR HANDLING
// =============================================================================

export interface RetryOptions {
  maxRetries: number;
  retryDelayMs: number;
  exponentialBackoff: boolean;
  retryableErrors: string[];
}

export interface EmailError extends Error {
  code?: string;
  statusCode?: number;
  provider?: EmailProvider;
  isRetryable?: boolean;
}
