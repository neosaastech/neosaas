import { db } from '@/db';
import { userApiKeys, userApiKeyUsage } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Génère une clé API sécurisée
 * Format: sk_[env]_[random]
 * @param env - Environnement (live, test)
 */
export function generateApiKey(env: 'live' | 'test' = 'live'): string {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `sk_${env}_${randomBytes}`;
}

/**
 * Hash une clé API pour stockage sécurisé
 * @param apiKey - La clé API à hasher
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Extrait le préfixe d'une clé API pour affichage
 * @param apiKey - La clé API complète
 * @returns Les 12 premiers caractères (ex: "sk_live_abc...")
 */
export function getApiKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, 12);
}

/**
 * Crée une nouvelle clé API pour un utilisateur
 */
export async function createApiKey(params: {
  userId: string;
  name: string;
  permissions?: string[];
  expiresAt?: Date;
}) {
  const apiKey = generateApiKey('live');
  const keyHash = hashApiKey(apiKey);
  const keyPrefix = getApiKeyPrefix(apiKey);

  const [newKey] = await db
    .insert(userApiKeys)
    .values({
      userId: params.userId,
      name: params.name,
      keyHash,
      keyPrefix,
      permissions: params.permissions || [],
      expiresAt: params.expiresAt,
      isActive: true,
    })
    .returning();

  // Retourne la clé en clair (à afficher UNE SEULE FOIS à l'utilisateur)
  return {
    ...newKey,
    key: apiKey, // Clé en clair - NE SERA JAMAIS STOCKÉE
  };
}

/**
 * Vérifie si une clé API est valide
 */
export async function verifyApiKey(apiKey: string) {
  const keyHash = hashApiKey(apiKey);

  const [key] = await db
    .select()
    .from(userApiKeys)
    .where(and(eq(userApiKeys.keyHash, keyHash), eq(userApiKeys.isActive, true)));

  if (!key) {
    return { valid: false, error: 'Invalid API key' };
  }

  // Vérifier l'expiration
  if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
    return { valid: false, error: 'API key expired' };
  }

  // Mettre à jour la dernière utilisation
  await db
    .update(userApiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(userApiKeys.id, key.id));

  return {
    valid: true,
    key,
  };
}

/**
 * Liste toutes les clés API d'un utilisateur
 */
export async function listUserApiKeys(userId: string) {
  return await db
    .select({
      id: userApiKeys.id,
      name: userApiKeys.name,
      keyPrefix: userApiKeys.keyPrefix,
      permissions: userApiKeys.permissions,
      isActive: userApiKeys.isActive,
      expiresAt: userApiKeys.expiresAt,
      lastUsedAt: userApiKeys.lastUsedAt,
      createdAt: userApiKeys.createdAt,
    })
    .from(userApiKeys)
    .where(eq(userApiKeys.userId, userId));
}

/**
 * Révoque (désactive) une clé API
 */
export async function revokeApiKey(keyId: string, userId: string) {
  const [revokedKey] = await db
    .update(userApiKeys)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(userApiKeys.id, keyId), eq(userApiKeys.userId, userId)))
    .returning();

  return revokedKey;
}

/**
 * Supprime définitivement une clé API
 */
export async function deleteApiKey(keyId: string, userId: string) {
  const [deletedKey] = await db
    .delete(userApiKeys)
    .where(and(eq(userApiKeys.id, keyId), eq(userApiKeys.userId, userId)))
    .returning();

  return deletedKey;
}

/**
 * Enregistre l'utilisation d'une clé API
 */
export async function logApiKeyUsage(params: {
  apiKeyId: string;
  endpoint: string;
  method: string;
  statusCode: string;
  ipAddress?: string;
  userAgent?: string;
  responseTime?: string;
}) {
  return await db.insert(userApiKeyUsage).values(params);
}

/**
 * Récupère les statistiques d'utilisation d'une clé API
 */
export async function getApiKeyUsageStats(apiKeyId: string, limit = 100) {
  return await db
    .select()
    .from(userApiKeyUsage)
    .where(eq(userApiKeyUsage.apiKeyId, apiKeyId))
    .orderBy(userApiKeyUsage.createdAt)
    .limit(limit);
}
