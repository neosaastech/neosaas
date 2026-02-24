/**
 * Interface de base pour tous les providers d'email
 */

import type {
  EmailMessage,
  EmailProvider,
  EmailSendResult,
  ProviderConnectionStatus,
} from '../../types';

export interface IEmailProvider {
  readonly providerName: EmailProvider;

  /**
   * Initialiser le provider avec sa configuration
   */
  initialize(config: any): Promise<void>;

  /**
   * Envoyer un email
   */
  sendEmail(message: EmailMessage): Promise<EmailSendResult>;

  /**
   * Tester la connexion au provider
   */
  testConnection(): Promise<ProviderConnectionStatus>;

  /**
   * Valider une adresse email
   */
  validateEmail(email: string): boolean;
}

/**
 * Classe de base abstraite pour les providers
 */
export abstract class BaseEmailProvider implements IEmailProvider {
  abstract readonly providerName: EmailProvider;
  protected config: any;
  protected initialized: boolean = false;

  async initialize(config: any): Promise<void> {
    this.config = config;
    this.initialized = true;
  }

  abstract sendEmail(message: EmailMessage): Promise<EmailSendResult>;
  abstract testConnection(): Promise<ProviderConnectionStatus>;

  /**
   * Validation d'email basique
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Vérifier que le provider est initialisé
   */
  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(`Provider ${this.providerName} is not initialized`);
    }
  }

  /**
   * Normaliser les destinataires en tableau
   */
  protected normalizeRecipients(to: string | string[]): string[] {
    return Array.isArray(to) ? to : [to];
  }
}
