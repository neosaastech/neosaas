/**
 * Logger spécialisé pour le système d'email
 */

import { EmailProvider } from '../types';

export class EmailLogger {
  private prefix = '[EMAIL]';

  info(message: string, provider?: EmailProvider, metadata?: any) {
    const providerStr = provider ? `[${provider}]` : '';
    console.log(
      `${this.prefix}${providerStr} ${message}`,
      metadata ? JSON.stringify(metadata) : ''
    );
  }

  error(message: string, error?: Error | any, provider?: EmailProvider) {
    const providerStr = provider ? `[${provider}]` : '';
    console.error(
      `${this.prefix}${providerStr} ERROR: ${message}`,
      error?.message || error
    );
    if (error?.stack) {
      console.error(error.stack);
    }
  }

  warn(message: string, provider?: EmailProvider) {
    const providerStr = provider ? `[${provider}]` : '';
    console.warn(`${this.prefix}${providerStr} WARN: ${message}`);
  }

  debug(message: string, data?: any, provider?: EmailProvider) {
    if (process.env.NODE_ENV === 'development') {
      const providerStr = provider ? `[${provider}]` : '';
      console.log(
        `${this.prefix}${providerStr} DEBUG: ${message}`,
        data ? JSON.stringify(data, null, 2) : ''
      );
    }
  }
}

// Export singleton
export const emailLogger = new EmailLogger();
