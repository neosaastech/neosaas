/**
 * GitHub OAuth Configuration Helper (Legacy Adapter)
 *
 * ⚠️ LEGACY FILE - À MIGRER vers lib/oauth/providers/github.ts
 * 
 * Ce fichier maintient la compatibilité avec les routes API existantes.
 * Les nouvelles implémentations doivent utiliser GitHubOAuthProvider.
 *
 * Migration path:
 * 1. Utiliser githubOAuthProvider.getConfiguration() à la place
 * 2. Supprimer ce fichier une fois toutes les routes migrées
 *
 * Architecture:
 * - Credentials stockés dans `service_api_configs` table (cryptés AES-256-GCM)
 * - Utilise serviceApiRepository pour décryptage automatique
 * - Pas de dépendance aux ENV variables
 * - Configuration centralisée dans l'admin
 */

import { serviceApiRepository } from "@/lib/services";

export interface GitHubOAuthConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  baseUrl: string;
  isActive: boolean;
}

/**
 * Récupère la configuration GitHub OAuth depuis la base de données
 * 
 * ⚠️ DEPRECATED: Utiliser githubOAuthProvider.getConfiguration() à la place
 * 
 * @param environment - Environnement ('production', 'preview', 'development')
 * @param requestUrl - URL de la requête pour détecter automatiquement le domaine
 * @returns Configuration OAuth ou null si non configuré
 */
export async function getGitHubOAuthConfig(
  environment: string = "production",
  requestUrl?: string
): Promise<GitHubOAuthConfig | null> {
  try {
    console.log(`🔍 [GitHub OAuth] Récupération de la configuration cryptée (env: ${environment})`);

    // Use serviceApiRepository to get and decrypt config automatically
    const config = await serviceApiRepository.getConfig("github", environment as any);

    if (!config) {
      console.warn(`⚠️ [GitHub OAuth] Aucune configuration trouvée pour l'environnement: ${environment}`);
      return null;
    }

    // Extract OAuth credentials from decrypted config
    const oauthConfig = config.config as { clientId: string; clientSecret: string };
    const metadata = config.metadata as { callbackUrl?: string; baseUrl?: string } | null;

    // Validation
    if (!oauthConfig?.clientId || !oauthConfig?.clientSecret) {
      console.error(`❌ [GitHub OAuth] Configuration invalide: clientId ou clientSecret manquant`);
      return null;
    }

    // Construct full absolute callback URL
    let callbackUrl = metadata?.callbackUrl || "/api/auth/oauth/github/callback";
    
    // Detect baseUrl from multiple sources (priority order)
    let baseUrl = metadata?.baseUrl || process.env.NEXT_PUBLIC_APP_URL || "";
    
    // Auto-detect from request URL if available (highest priority for production)
    if (requestUrl) {
      try {
        const url = new URL(requestUrl);
        const detectedBaseUrl = `${url.protocol}//${url.host}`;
        
        // Only use detected URL if it's not localhost (production/preview)
        if (!detectedBaseUrl.includes('localhost')) {
          baseUrl = detectedBaseUrl;
          console.log(`🌐 [GitHub OAuth] Auto-detected base URL from request: ${baseUrl}`);
        }
      } catch (e) {
        console.warn(`⚠️ [GitHub OAuth] Could not parse request URL: ${requestUrl}`);
      }
    }

    // If callbackUrl is relative, make it absolute
    if (callbackUrl.startsWith("/")) {
      if (!baseUrl) {
        console.error(`❌ [GitHub OAuth] Cannot construct absolute callback URL`);
        console.error(`   - callbackUrl (relative): ${callbackUrl}`);
        console.error(`   - baseUrl: ${baseUrl}`);
        console.error(`   - requestUrl: ${requestUrl || 'NOT PROVIDED'}`);
        console.error(`   - NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL || 'NOT SET'}`);
        console.error(`   ⚠️  SOLUTION: Set NEXT_PUBLIC_APP_URL environment variable`);
        console.error(`   Example: NEXT_PUBLIC_APP_URL=https://www.neosaas.tech`);
        return null;
      }
      callbackUrl = `${baseUrl}${callbackUrl}`;
    }

    // Validate that we have an absolute URL
    if (!callbackUrl.startsWith("http://") && !callbackUrl.startsWith("https://")) {
      console.error(`❌ [GitHub OAuth] Invalid callback URL: ${callbackUrl} - must be absolute URL`);
      console.error(`   - baseUrl: ${baseUrl}`);
      console.error(`   - metadata.callbackUrl: ${metadata?.callbackUrl || 'NOT SET'}`);
      console.error(`   - Please configure callback URL as FULL URL in /admin/api`);
      console.error(`   Example: https://www.neosaas.tech/api/auth/oauth/github/callback`);
      return null;
    }

    const result: GitHubOAuthConfig = {
      clientId: oauthConfig.clientId,
      clientSecret: oauthConfig.clientSecret,
      callbackUrl,
      baseUrl,
      isActive: config.isActive,
    };

    console.log(`✅ [GitHub OAuth] Configuration décryptée et chargée avec succès`);
    console.log(`   - Client ID: ${result.clientId.substring(0, 10)}...`);
    console.log(`   - Callback URL: ${result.callbackUrl}`);
    console.log(`   - Base URL: ${result.baseUrl}`);
    console.log(`   - Cryptage: AES-256-GCM ✓`);

    return result;
  } catch (error) {
    console.error(`❌ [GitHub OAuth] Erreur lors de la récupération de la configuration:`, error);
    return null;
  }
}

/**
 * Vérifie si GitHub OAuth est configuré et actif
 * 
 * ⚠️ DEPRECATED: Utiliser githubOAuthProvider.isEnabled() à la place
 * 
 * @returns true si configuré, false sinon
 */
export async function isGitHubOAuthEnabled(): Promise<boolean> {
  const config = await getGitHubOAuthConfig();
  return config !== null && config.isActive;
}
