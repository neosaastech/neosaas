/**
 * Google OAuth Configuration Helper (Legacy Adapter)
 *
 * ⚠️ LEGACY FILE - À MIGRER vers lib/oauth/providers/google.ts
 * 
 * Ce fichier maintient la compatibilité avec les routes API existantes.
 * Les nouvelles implémentations doivent utiliser GoogleOAuthProvider.
 *
 * Migration path:
 * 1. Utiliser googleOAuthProvider.getConfiguration() à la place
 * 2. Supprimer ce fichier une fois toutes les routes migrées
 *
 * Architecture:
 * - Credentials stockés dans `service_api_configs` table (cryptés AES-256-GCM)
 * - Utilise serviceApiRepository pour décryptage automatique
 * - Pas de dépendance aux ENV variables
 * - Configuration centralisée dans l'admin
 */

import { serviceApiRepository } from "@/lib/services";

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  baseUrl: string;
  isActive: boolean;
}

/**
 * Récupère la configuration Google OAuth depuis la base de données
 * 
 * ⚠️ DEPRECATED: Utiliser googleOAuthProvider.getConfiguration() à la place
 * 
 * @param environment - Environnement ('production', 'preview', 'development')
 * @param requestUrl - URL de la requête pour détecter automatiquement le domaine
 * @returns Configuration OAuth ou null si non configuré
 */
export async function getGoogleOAuthConfig(
  environment: string = "production",
  requestUrl?: string
): Promise<GoogleOAuthConfig | null> {
  try {
    console.log(`🔍 [Google OAuth] Récupération de la configuration cryptée (env: ${environment})`);

    // Use serviceApiRepository to get and decrypt config automatically
    const config = await serviceApiRepository.getConfig("google", environment as any);

    if (!config) {
      console.warn(`⚠️ [Google OAuth] Aucune configuration trouvée pour l'environnement: ${environment}`);
      return null;
    }

    // Extract OAuth credentials from decrypted config
    const oauthConfig = config.config as { clientId: string; clientSecret: string };
    const metadata = config.metadata as { callbackUrl?: string; baseUrl?: string } | null;

    // Validation
    if (!oauthConfig?.clientId || !oauthConfig?.clientSecret) {
      console.error(`❌ [Google OAuth] Configuration invalide: clientId ou clientSecret manquant`);
      return null;
    }

    // Construct full absolute callback URL
    let callbackUrl = metadata?.callbackUrl || "/api/auth/oauth/google/callback";
    
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
          console.log(`🌐 [Google OAuth] Auto-detected base URL from request: ${baseUrl}`);
        }
      } catch (e) {
        console.warn(`⚠️ [Google OAuth] Could not parse request URL: ${requestUrl}`);
      }
    }

    // If callbackUrl is relative, make it absolute
    if (callbackUrl.startsWith("/")) {
      if (!baseUrl) {
        console.error(`❌ [Google OAuth] Cannot construct absolute callback URL`);
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

    // Validate callbackUrl is absolute
    if (!callbackUrl.startsWith("http://") && !callbackUrl.startsWith("https://")) {
      console.error(`❌ [Google OAuth] Callback URL must be absolute (http:// or https://): ${callbackUrl}`);
      return null;
    }

    const result: GoogleOAuthConfig = {
      clientId: oauthConfig.clientId,
      clientSecret: oauthConfig.clientSecret,
      callbackUrl,
      baseUrl,
      isActive: config.isActive,
    };

    console.log(`✅ [Google OAuth] Configuration loaded successfully`);
    console.log(`   - Client ID: ${result.clientId.substring(0, 10)}...`);
    console.log(`   - Callback URL: ${result.callbackUrl}`);
    console.log(`   - Base URL: ${result.baseUrl}`);
    console.log(`   - Is Active: ${result.isActive}`);

    return result;
  } catch (error) {
    console.error(`❌ [Google OAuth] Error loading configuration:`, error);
    return null;
  }
}

/**
 * Valide la configuration Google OAuth
 * 
 * @param config - Configuration à valider
 * @returns true si valide, false sinon
 */
export function validateGoogleOAuthConfig(config: GoogleOAuthConfig | null): boolean {
  if (!config) {
    console.error("❌ [Google OAuth] Configuration is null");
    return false;
  }

  if (!config.clientId || config.clientId.length < 10) {
    console.error("❌ [Google OAuth] Invalid clientId");
    return false;
  }

  if (!config.clientSecret || config.clientSecret.length < 10) {
    console.error("❌ [Google OAuth] Invalid clientSecret");
    return false;
  }

  if (!config.callbackUrl || !config.callbackUrl.startsWith("http")) {
    console.error("❌ [Google OAuth] Invalid callbackUrl");
    return false;
  }

  if (!config.isActive) {
    console.warn("⚠️ [Google OAuth] Configuration exists but is not active");
    return false;
  }

  return true;
}
