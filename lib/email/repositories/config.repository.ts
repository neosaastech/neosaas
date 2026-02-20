/**
 * Repository pour gérer les configurations des fournisseurs d'email
 * Utilise service_api_configs comme source de vérité pour Scaleway
 * DEPRECATED: email_provider_configs table will be removed in future version
 */

import { eq, not, and } from 'drizzle-orm';
import { db } from '@/db';
import { emailProviderConfigs } from '@/db/schema';
import type { EmailProvider, EmailProviderConfig } from '../types';
import { encrypt, decrypt } from '../utils/encryption';
import { serviceApiRepository } from '@/lib/services/repository';
import type { ServiceEnvironment, ScalewayConfig } from '@/lib/services/types';

export class EmailConfigRepository {
  /**
   * Récupérer la configuration d'un fournisseur
   * Pour Scaleway: récupère depuis service_api_configs
   * Pour autres: récupère depuis email_provider_configs (legacy)
   */
  async getConfig(
    provider: EmailProvider,
    environment: ServiceEnvironment = 'production'
  ): Promise<EmailProviderConfig | null> {
    try {
      // Scaleway utilise le gestionnaire centralisé de services
      if (provider === 'scaleway-tem') {
        return await this.getScalewayConfig(environment);
      }

      // Legacy: Autres providers (si présents)
      const result = await db
        .select()
        .from(emailProviderConfigs)
        .where(eq(emailProviderConfigs.provider, provider as string))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const config = result[0];
      const encryptedCredentials = (config.config as any)?.encrypted || '';
      if (!encryptedCredentials) {
        return null;
      }

      const decryptedCredentials = await decrypt(encryptedCredentials);
      const credentials = JSON.parse(decryptedCredentials);

      const providerConfig: EmailProviderConfig = {
        provider: config.provider as EmailProvider,
        isActive: config.isActive,
        isDefault: config.isDefault,
      };

      if (provider === 'aws-ses') {
        providerConfig.awsSes = credentials;
      } else if (provider === 'resend') {
        providerConfig.resend = credentials;
      }

      return providerConfig;
    } catch (error) {
      console.error('Failed to get email config:', error);
      return null;
    }
  }

  /**
   * Récupérer la configuration Scaleway depuis service_api_configs
   */
  private async getScalewayConfig(
    environment: ServiceEnvironment = 'production'
  ): Promise<EmailProviderConfig | null> {
    try {
      const serviceConfig = await serviceApiRepository.getConfig('scaleway', environment) as ScalewayConfig | null;

      if (!serviceConfig || !serviceConfig.isActive) {
        console.warn(`Scaleway config not found or inactive for environment: ${environment}`);
        return null;
      }

      // Mapper la config Scaleway vers le format email
      return {
        provider: 'scaleway-tem' as EmailProvider,
        isActive: serviceConfig.isActive,
        isDefault: serviceConfig.isDefault,
        scalewayTem: {
          projectId: serviceConfig.config.projectId,
          secretKey: serviceConfig.config.secretKey, // Token API pour TEM
          region: serviceConfig.metadata?.region || 'fr-par',
          plan: 'essential', // Par défaut
        },
      };
    } catch (error) {
      console.error('Failed to get Scaleway config from service API:', error);
      return null;
    }
  }

  /**
   * Récupérer toutes les configurations actives
   */
  async getAllConfigs(environment: ServiceEnvironment = 'production'): Promise<EmailProviderConfig[]> {
    try {
      const result: EmailProviderConfig[] = [];

      // Récupérer Scaleway depuis service_api_configs
      const scalewayConfig = await this.getScalewayConfig(environment);
      if (scalewayConfig) {
        result.push(scalewayConfig);
      }

      // Legacy: Récupérer autres providers depuis email_provider_configs
      const legacyConfigs = await db.select().from(emailProviderConfigs);

      for (const config of legacyConfigs) {
        // Skip Scaleway ONLY if already loaded from service_api_configs
        if (config.provider === 'scaleway-tem' && scalewayConfig) continue;

        const encryptedCredentials = (config.config as any)?.encrypted || '';
        if (!encryptedCredentials) continue;

        const decryptedCredentials = await decrypt(encryptedCredentials);
        const credentials = JSON.parse(decryptedCredentials);

        const providerConfig: EmailProviderConfig = {
          provider: config.provider as EmailProvider,
          isActive: config.isActive,
          isDefault: config.isDefault,
        };

        if (config.provider === 'aws-ses') {
          providerConfig.awsSes = credentials;
        } else if (config.provider === 'resend') {
          providerConfig.resend = credentials;
        } else if (config.provider === 'scaleway-tem') {
          providerConfig.scalewayTem = credentials;
        }

        result.push(providerConfig);
      }

      return result;
    } catch (error) {
      console.error('Failed to get all email configs:', error);
      return [];
    }
  }

  /**
   * Obtenir le fournisseur par défaut
   */
  async getDefaultProvider(environment: ServiceEnvironment = 'production'): Promise<EmailProviderConfig | null> {
    try {
      // Vérifier d'abord Scaleway dans service_api_configs
      const scalewayConfig = await this.getScalewayConfig(environment);
      if (scalewayConfig && scalewayConfig.isDefault) {
        return scalewayConfig;
      }

      // Legacy: Vérifier dans email_provider_configs
      const result = await db
        .select()
        .from(emailProviderConfigs)
        .where(
          and(
            eq(emailProviderConfigs.isDefault, true),
            eq(emailProviderConfigs.isActive, true)
          )
        )
        .limit(1);

      if (result.length === 0) {
        // Si aucun provider par défaut, retourner Scaleway s'il est actif
        return scalewayConfig;
      }

      const config = result[0];
      const encryptedCredentials = (config.config as any)?.encrypted || '';
      if (!encryptedCredentials) {
        return null;
      }

      const decryptedCredentials = await decrypt(encryptedCredentials);
      const credentials = JSON.parse(decryptedCredentials);

      const providerConfig: EmailProviderConfig = {
        provider: config.provider as EmailProvider,
        isActive: config.isActive,
        isDefault: config.isDefault,
      };

      if (config.provider === 'aws-ses') {
        providerConfig.awsSes = credentials;
      } else if (config.provider === 'resend') {
        providerConfig.resend = credentials;
      } else if (config.provider === 'scaleway-tem') {
        providerConfig.scalewayTem = credentials;
      }

      return providerConfig;
    } catch (error) {
      console.error('Failed to get default provider:', error);
      return null;
    }
  }

  /**
   * DEPRECATED: Sauvegarder une configuration
   * Pour Scaleway: utiliser l'API /api/services/scaleway
   * Cette méthode est conservée pour compatibilité legacy
   */
  async saveConfig(config: EmailProviderConfig): Promise<void> {
    if (config.provider === 'scaleway-tem') {
      throw new Error(
        'Pour configurer Scaleway, utilisez l\'API /api/services/scaleway ou l\'interface admin /admin/api'
      );
    }

    // Legacy: Sauvegarder dans email_provider_configs pour autres providers
    try {
      const credentials = JSON.stringify(
        config.awsSes || config.resend || {}
      );
      const encryptedCredentials = await encrypt(credentials);

      const configData = {
        provider: config.provider as string,
        isActive: config.isActive,
        isDefault: config.isDefault,
        config: { encrypted: encryptedCredentials } as any,
        updatedAt: new Date(),
      };

      const existing = await db
        .select()
        .from(emailProviderConfigs)
        .where(eq(emailProviderConfigs.provider, config.provider as string))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(emailProviderConfigs)
          .set(configData)
          .where(eq(emailProviderConfigs.provider, config.provider as string));
      } else {
        await db.insert(emailProviderConfigs).values({
          ...configData,
          createdAt: new Date(),
        });
      }

      if (config.isDefault) {
        await db
          .update(emailProviderConfigs)
          .set({ isDefault: false })
          .where(not(eq(emailProviderConfigs.provider, config.provider as string)));
      }
    } catch (error) {
      console.error('Failed to save email config:', error);
      throw error;
    }
  }

  /**
   * DEPRECATED: Supprimer la configuration d'un fournisseur
   */
  async deleteConfig(provider: EmailProvider): Promise<void> {
    if (provider === 'scaleway-tem') {
      throw new Error(
        'Pour supprimer la config Scaleway, utilisez l\'API /api/services/scaleway'
      );
    }

    try {
      await db
        .delete(emailProviderConfigs)
        .where(eq(emailProviderConfigs.provider, provider as string));
    } catch (error) {
      console.error('Failed to delete email config:', error);
      throw error;
    }
  }
}

// Export singleton
export const emailConfigRepository = new EmailConfigRepository();
