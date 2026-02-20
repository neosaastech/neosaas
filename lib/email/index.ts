/**
 * Export centralisé pour le système d'envoi d'emails multi-fournisseurs
 */

// Types
export * from './types';

// Providers
export { IEmailProvider, BaseEmailProvider } from './providers/base/interface';
export { ScalewayTemProvider } from './providers/scaleway/provider';

// Services
export { EmailRouterService, emailRouter } from './services/email-router.service';

// Repositories
export { EmailConfigRepository, emailConfigRepository } from './repositories/config.repository';
export { EmailHistoryRepository, emailHistoryRepository } from './repositories/history.repository';
export { EmailTemplateRepository, emailTemplateRepository } from './repositories/template.repository';

// Utils
export { encrypt, decrypt, hash, maskSensitiveData } from './utils/encryption';
export { EmailLogger, emailLogger } from './utils/logger';
