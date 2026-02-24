/**
 * Service API Configuration Repository
 * Manages CRUD operations for third-party service configurations
 * All sensitive data is encrypted before storage
 */

import { db } from '@/db';
import { serviceApiConfigs, serviceApiUsage } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { encrypt, decrypt } from '@/lib/email/utils/encryption';
import type {
  ServiceConfig,
  ServiceName,
  ServiceType,
  ServiceEnvironment,
  ServiceApiUsageRecord,
} from './types';

export class ServiceApiRepository {
  /**
   * Create or update a service configuration
   */
  async upsertConfig(config: ServiceConfig): Promise<{ id: string }> {
    // Encrypt the sensitive config data
    const encryptedConfig = await encrypt(JSON.stringify(config.config));

    // Check if config already exists
    const existing = await db
      .select()
      .from(serviceApiConfigs)
      .where(
        and(
          eq(serviceApiConfigs.serviceName, config.serviceName),
          eq(serviceApiConfigs.environment, config.environment)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing config
      await db
        .update(serviceApiConfigs)
        .set({
          serviceType: config.serviceType,
          isActive: config.isActive,
          isDefault: config.isDefault,
          config: encryptedConfig,
          metadata: config.metadata || null,
          updatedAt: new Date(),
        })
        .where(eq(serviceApiConfigs.id, existing[0].id));

      return { id: existing[0].id };
    } else {
      // Insert new config
      const result = await db
        .insert(serviceApiConfigs)
        .values({
          serviceName: config.serviceName,
          serviceType: config.serviceType,
          environment: config.environment,
          isActive: config.isActive,
          isDefault: config.isDefault,
          config: encryptedConfig,
          metadata: config.metadata || null,
        })
        .returning({ id: serviceApiConfigs.id });

      return { id: result[0].id };
    }
  }

  /**
   * Get a service configuration by name and environment
   */
  async getConfig(
    serviceName: ServiceName,
    environment: ServiceEnvironment = 'production'
  ): Promise<ServiceConfig | null> {
    const result = await db
      .select()
      .from(serviceApiConfigs)
      .where(
        and(
          eq(serviceApiConfigs.serviceName, serviceName),
          eq(serviceApiConfigs.environment, environment),
          eq(serviceApiConfigs.isActive, true)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const config = result[0];
    const decryptedConfig = await decrypt(config.config as string);

    return {
      id: config.id, // Include ID for logging purposes
      serviceName: config.serviceName as ServiceName,
      serviceType: config.serviceType as ServiceType,
      environment: config.environment as ServiceEnvironment,
      isActive: config.isActive,
      isDefault: config.isDefault,
      config: JSON.parse(decryptedConfig),
      metadata: config.metadata as Record<string, any> | undefined,
    } as ServiceConfig & { id: string };
  }

  /**
   * Get the default configuration for a service type
   */
  async getDefaultConfig(serviceType: ServiceType): Promise<ServiceConfig | null> {
    const result = await db
      .select()
      .from(serviceApiConfigs)
      .where(
        and(
          eq(serviceApiConfigs.serviceType, serviceType),
          eq(serviceApiConfigs.isDefault, true),
          eq(serviceApiConfigs.isActive, true)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const config = result[0];
    const decryptedConfig = await decrypt(config.config as string);

    return {
      id: config.id, // Include ID for logging purposes
      serviceName: config.serviceName as ServiceName,
      serviceType: config.serviceType as ServiceType,
      environment: config.environment as ServiceEnvironment,
      isActive: config.isActive,
      isDefault: config.isDefault,
      config: JSON.parse(decryptedConfig),
      metadata: config.metadata as Record<string, any> | undefined,
    } as ServiceConfig & { id: string };
  }

  /**
   * List all configurations for a service
   */
  async listConfigs(serviceName?: ServiceName): Promise<Array<Omit<ServiceConfig, 'config'> & { id: string }>> {
    const query = serviceName
      ? db.select().from(serviceApiConfigs).where(eq(serviceApiConfigs.serviceName, serviceName))
      : db.select().from(serviceApiConfigs);

    const results = await query;

    return results.map((config) => ({
      id: config.id,
      serviceName: config.serviceName as ServiceName,
      serviceType: config.serviceType as ServiceType,
      environment: config.environment as ServiceEnvironment,
      isActive: config.isActive,
      isDefault: config.isDefault,
      metadata: config.metadata as Record<string, any> | undefined,
    }));
  }

  /**
   * Delete a service configuration
   */
  async deleteConfig(id: string): Promise<void> {
    await db.delete(serviceApiConfigs).where(eq(serviceApiConfigs.id, id));
  }

  /**
   * Mark a configuration as tested
   */
  async markTested(id: string): Promise<void> {
    await db
      .update(serviceApiConfigs)
      .set({ lastTestedAt: new Date() })
      .where(eq(serviceApiConfigs.id, id));
  }

  /**
   * Track API usage
   */
  async trackUsage(usage: ServiceApiUsageRecord): Promise<void> {
    await db.insert(serviceApiUsage).values({
      configId: usage.configId,
      serviceName: usage.serviceName,
      operation: usage.operation,
      status: usage.status,
      statusCode: usage.statusCode,
      requestData: usage.requestData || null,
      responseData: usage.responseData || null,
      errorMessage: usage.errorMessage,
      responseTime: usage.responseTime,
      costEstimate: usage.costEstimate,
    });
  }

  /**
   * Get usage statistics for a service
   */
  async getUsageStats(configId: string, limit: number = 100) {
    return await db
      .select()
      .from(serviceApiUsage)
      .where(eq(serviceApiUsage.configId, configId))
      .orderBy(desc(serviceApiUsage.createdAt))
      .limit(limit);
  }
}

// Export singleton instance
export const serviceApiRepository = new ServiceApiRepository();
