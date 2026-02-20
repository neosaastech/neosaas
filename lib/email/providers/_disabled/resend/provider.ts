/**
 * Provider Resend pour l'envoi d'emails
 * Documentation: https://resend.com/docs
 */

import { BaseEmailProvider } from '../base/interface';
import type {
  EmailMessage,
  EmailProvider,
  EmailSendResult,
  ProviderConnectionStatus,
  ResendConfig,
} from '../../types';
import { EmailDeliveryStatus } from '../../types';
import { emailLogger } from '../../utils/logger';

export class ResendProvider extends BaseEmailProvider {
  readonly providerName: EmailProvider = 'resend' as EmailProvider;
  private apiKey: string = '';

  async initialize(config: ResendConfig): Promise<void> {
    await super.initialize(config);
    this.apiKey = config.apiKey;

    if (!this.apiKey) {
      throw new Error('Resend API key is required');
    }

    emailLogger.info('Resend provider initialized', this.providerName);
  }

  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    this.ensureInitialized();

    try {
      const to = this.normalizeRecipients(message.to);

      emailLogger.info(
        `Sending email to ${to.join(', ')}`,
        this.providerName,
        { subject: message.subject }
      );

      // SIMULATION MODE - Remplacer par la vraie implémentation
      // const response = await fetch('https://api.resend.com/emails', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${this.apiKey}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     from: message.from,
      //     to,
      //     subject: message.subject,
      //     html: message.htmlContent,
      //     text: message.textContent,
      //     cc: message.cc,
      //     bcc: message.bcc,
      //     tags: message.tags,
      //   }),
      // });
      //
      // const data = await response.json();

      // SIMULATION
      const messageId = `resend_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      emailLogger.info(
        `Email sent successfully: ${messageId}`,
        this.providerName
      );

      return {
        success: true,
        messageId,
        provider: this.providerName,
        sentAt: new Date(),
      };
    } catch (error: any) {
      emailLogger.error('Failed to send email', error, this.providerName);

      return {
        success: false,
        provider: this.providerName,
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  async testConnection(): Promise<ProviderConnectionStatus> {
    try {
      // SIMULATION MODE
      // const response = await fetch('https://api.resend.com/domains', {
      //   headers: { 'Authorization': `Bearer ${this.apiKey}` },
      // });

      return {
        provider: this.providerName,
        isConnected: true,
        lastChecked: new Date(),
        details: {
          verifiedDomains: ['example.com'], // Simulation
        },
      };
    } catch (error: any) {
      return {
        provider: this.providerName,
        isConnected: false,
        lastChecked: new Date(),
        error: error.message,
      };
    }
  }
}
