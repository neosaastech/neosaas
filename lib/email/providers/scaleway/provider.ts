/**
 * Provider Scaleway TEM (Transactional Email) pour l'envoi d'emails
 * Documentation: https://www.scaleway.com/en/docs/managed-services/transactional-email/
 */

import { BaseEmailProvider } from '../base/interface';
import type {
  EmailMessage,
  EmailProvider,
  EmailSendResult,
  ProviderConnectionStatus,
  ScalewayTemConfig,
} from '../../types';
import { emailLogger } from '../../utils/logger';

export class ScalewayTemProvider extends BaseEmailProvider {
  readonly providerName: EmailProvider = 'scaleway-tem' as EmailProvider;
  private temConfig: ScalewayTemConfig | null = null;

  async initialize(config: ScalewayTemConfig): Promise<void> {
    await super.initialize(config);
    this.temConfig = config;

    if (!config.projectId || !config.secretKey) {
      throw new Error('Scaleway TEM requires projectId and secretKey');
    }

    emailLogger.info('Scaleway TEM provider initialized', this.providerName, {
      plan: config.plan || 'essential',
    });
  }

  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    this.ensureInitialized();

    try {
      const to = this.normalizeRecipients(message.to);

      emailLogger.info(
        `Sending email via Scaleway TEM to ${to.join(', ')}`,
        this.providerName,
        { subject: message.subject, from: message.from }
      );

      // Vérifier que le domaine d'envoi est vérifié (si configuré)
      // message.from peut être "Name <email@domain.com>" ou juste "email@domain.com"
      // On extrait l'email pour le check de domaine
      const fromEmail = message.from.includes('<') 
        ? message.from.match(/<([^>]+)>/)?.[1] || message.from
        : message.from;

      const fromDomain = fromEmail.split('@')[1];
      const verifiedDomains = this.temConfig!.verifiedDomains || [];

      if (verifiedDomains.length > 0 && !verifiedDomains.includes(fromDomain)) {
        const error = `Domain "${fromDomain}" is not verified in Scaleway TEM. Verified domains: ${verifiedDomains.join(', ')}`;
        emailLogger.error(error, null, this.providerName);

        return {
          success: false,
          provider: this.providerName,
          error,
        };
      }

      const region = this.temConfig!.region || 'fr-par';
      const apiUrl = this.temConfig!.apiUrl || 'https://api.scaleway.com/transactional-email/v1alpha1';

      // Préparer le payload selon les spécifications de l'API Scaleway TEM
      const payload: any = {
        from: {
          email: fromEmail,
          ...(message.fromName && { name: message.fromName }),
        },
        to: to.map(email => ({ email })),
        subject: message.subject,
        project_id: this.temConfig!.projectId,
      };

      // Ajouter le contenu HTML et/ou texte
      if (message.htmlContent) {
        payload.html = message.htmlContent;
      }
      if (message.textContent) {
        payload.text = message.textContent;
      }

      // Ajouter CC et BCC si présents
      if (message.cc && message.cc.length > 0) {
        payload.cc = message.cc.map(email => ({ email }));
      }
      if (message.bcc && message.bcc.length > 0) {
        payload.bcc = message.bcc.map(email => ({ email }));
      }

      // Ajouter ReplyTo si présent
      if (message.replyTo) {
        if (!payload.additional_headers) {
          payload.additional_headers = [];
        }
        payload.additional_headers.push({
          key: 'Reply-To',
          value: message.replyTo,
        });
      }

      // Log payload for debugging (excluding full content to avoid log spam, but keeping structure)
      emailLogger.info('Scaleway TEM Payload structure:', this.providerName, {
        ...payload,
        html: payload.html ? '(content present)' : undefined,
        text: payload.text ? '(content present)' : undefined
      });

      const response = await fetch(`${apiUrl}/regions/${region}/emails`, {
        method: 'POST',
        headers: {
          'X-Auth-Token': this.temConfig!.secretKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Log raw error data for debugging
        emailLogger.error(
          `Scaleway API Raw Error Response: ${JSON.stringify(errorData)}`,
          null,
          this.providerName
        );

        let errorMessage = errorData.message || errorData.error || response.statusText;

        // Gestion détaillée de l'erreur de domaine non vérifié
        if (errorData.type === 'invalid_arguments' && errorData.details) {
          const domainError = errorData.details.find(
            (d: any) => d.argument_name === 'from.email' && d.reason === 'constraint'
          );

          if (domainError) {
            errorMessage = `Email must be sent from a verified domain. Current domain: ${fromDomain}. ${domainError.help_message || 'Please verify your domain in Scaleway console.'}`;
          }
        }

        emailLogger.error(
          `Scaleway API error: ${response.status} - ${errorMessage}`,
          new Error(JSON.stringify(errorData)),
          this.providerName
        );
        throw new Error(`Scaleway API error: ${response.status} ${errorMessage}`);
      }

      const data = await response.json();
      // L'API Scaleway retourne un tableau d'emails avec leurs IDs
      const messageId = data.emails?.[0]?.message_id || data.id || `scaleway_tem_${Date.now()}`;

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
      emailLogger.error('Failed to send email via Scaleway TEM', error, this.providerName);

      return {
        success: false,
        provider: this.providerName,
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  async testConnection(): Promise<ProviderConnectionStatus> {
    try {
      const region = this.temConfig!.region || 'fr-par';
      const apiUrl = this.temConfig!.apiUrl || 'https://api.scaleway.com/transactional-email/v1alpha1';

      // Test connection by listing domains
      const response = await fetch(`${apiUrl}/regions/${region}/domains?project_id=${this.temConfig!.projectId}`, {
        method: 'GET',
        headers: {
          'X-Auth-Token': this.temConfig!.secretKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Scaleway API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const verifiedDomains = data.domains
        ? data.domains
            .filter((d: any) => d.status === 'checked')
            .map((d: any) => d.name)
        : this.temConfig!.verifiedDomains || [];

      return {
        provider: this.providerName,
        isConnected: true,
        lastChecked: new Date(),
        details: {
          verifiedDomains,
          quotas: {
            sent24h: data.statistics?.sent_count || 0,
            max24h: this.temConfig?.plan === 'scale' ? 100000 : 1000,
          },
        },
      };
    } catch (error: any) {
      emailLogger.error('Failed to test Scaleway TEM connection', error, this.providerName);

      return {
        provider: this.providerName,
        isConnected: false,
        lastChecked: new Date(),
        error: error.message,
        details: {
          verifiedDomains: this.temConfig?.verifiedDomains || [],
        },
      };
    }
  }
}
