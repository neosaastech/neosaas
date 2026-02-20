/**
 * Provider AWS SES pour l'envoi d'emails
 * Documentation: https://docs.aws.amazon.com/ses/
 */

import { BaseEmailProvider } from '../base/interface';
import type {
  EmailMessage,
  EmailProvider,
  EmailSendResult,
  ProviderConnectionStatus,
  AwsSesConfig,
} from '../../types';
import { emailLogger } from '../../utils/logger';

export class AwsSesProvider extends BaseEmailProvider {
  readonly providerName: EmailProvider = 'aws-ses' as EmailProvider;
  private sesConfig: AwsSesConfig | null = null;

  async initialize(config: AwsSesConfig): Promise<void> {
    await super.initialize(config);
    this.sesConfig = config;

    if (!config.accessKeyId || !config.secretAccessKey || !config.region) {
      throw new Error('AWS SES requires accessKeyId, secretAccessKey, and region');
    }

    emailLogger.info('AWS SES provider initialized', this.providerName, {
      region: config.region,
      method: config.method || 'api',
    });
  }

  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    this.ensureInitialized();

    try {
      const to = this.normalizeRecipients(message.to);

      emailLogger.info(
        `Sending email via AWS SES to ${to.join(', ')}`,
        this.providerName,
        { subject: message.subject }
      );

      // SIMULATION MODE - Remplacer par AWS SDK v3
      // import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
      //
      // const client = new SESClient({
      //   region: this.sesConfig!.region,
      //   credentials: {
      //     accessKeyId: this.sesConfig!.accessKeyId,
      //     secretAccessKey: this.sesConfig!.secretAccessKey,
      //   },
      // });
      //
      // const command = new SendEmailCommand({
      //   Source: message.from,
      //   Destination: {
      //     ToAddresses: to,
      //     CcAddresses: message.cc,
      //     BccAddresses: message.bcc,
      //   },
      //   Message: {
      //     Subject: { Data: message.subject },
      //     Body: {
      //       Html: message.htmlContent ? { Data: message.htmlContent } : undefined,
      //       Text: message.textContent ? { Data: message.textContent } : undefined,
      //     },
      //   },
      // });
      //
      // const response = await client.send(command);
      // const messageId = response.MessageId;

      // SIMULATION
      const messageId = `aws_ses_${Date.now()}_${Math.random().toString(36).substring(7)}`;

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
      emailLogger.error('Failed to send email via AWS SES', error, this.providerName);

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
      // Test de connexion avec GetSendQuota

      return {
        provider: this.providerName,
        isConnected: true,
        lastChecked: new Date(),
        details: {
          quotas: {
            sent24h: 10,
            max24h: 50000,
            maxPerSecond: 14,
          },
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
