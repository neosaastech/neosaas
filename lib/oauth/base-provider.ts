/**
 * Base OAuth Provider - Classe abstraite pour tous les providers OAuth
 * 
 * Cette classe fournit les fonctionnalités communes à tous les providers OAuth.
 * Chaque provider spécifique (GitHub, Google, etc.) hérite de cette classe.
 */

import { serviceApiRepository } from "@/lib/services";
import type { OAuthConfig, OAuthProvider, OAuthCredentials, OAuthMetadata } from "./types";

export abstract class BaseOAuthProvider {
  protected provider: OAuthProvider;
  
  constructor(provider: OAuthProvider) {
    this.provider = provider;
  }

  /**
   * Récupère la configuration OAuth depuis la base de données
   * Cette méthode est commune à tous les providers
   */
  protected async getConfig(
    environment: string = "production",
    requestUrl?: string
  ): Promise<OAuthConfig | null> {
    try {
      console.log(`🔍 [OAuth ${this.provider}] Récupération de la configuration cryptée (env: ${environment})`);

      // Récupérer la config depuis la DB (décryptage automatique)
      const config = await serviceApiRepository.getConfig(this.provider, environment as any);

      if (!config) {
        console.warn(`⚠️ [OAuth ${this.provider}] Aucune configuration trouvée pour l'environnement: ${environment}`);
        return null;
      }

      // Extraire les credentials OAuth
      const credentials = config.config as OAuthCredentials;
      const metadata = config.metadata as OAuthMetadata | null;

      // Validation
      if (!credentials?.clientId || !credentials?.clientSecret) {
        console.error(`❌ [OAuth ${this.provider}] Configuration invalide: clientId ou clientSecret manquant`);
        return null;
      }

      // Construire l'URL de callback
      const callbackPath = metadata?.callbackUrl || `/api/auth/oauth/${this.provider}/callback`;
      const baseUrl = this.detectBaseUrl(metadata?.baseUrl, requestUrl);
      
      const callbackUrl = this.constructCallbackUrl(callbackPath, baseUrl);
      
      if (!callbackUrl) {
        console.error(`❌ [OAuth ${this.provider}] Impossible de construire l'URL de callback`);
        return null;
      }

      const result: OAuthConfig = {
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        callbackUrl,
        baseUrl,
        isActive: config.isActive,
        provider: this.provider,
      };

      console.log(`✅ [OAuth ${this.provider}] Configuration chargée avec succès`);
      console.log(`   - Client ID: ${result.clientId.substring(0, 10)}...`);
      console.log(`   - Callback URL: ${result.callbackUrl}`);
      console.log(`   - Base URL: ${result.baseUrl}`);

      return result;
    } catch (error) {
      console.error(`❌ [OAuth ${this.provider}] Erreur lors de la récupération de la configuration:`, error);
      return null;
    }
  }

  /**
   * Détecte le baseUrl à utiliser (auto-détection ou depuis config)
   */
  protected detectBaseUrl(configBaseUrl?: string, requestUrl?: string): string {
    let baseUrl = configBaseUrl || process.env.NEXT_PUBLIC_APP_URL || "";
    
    // Auto-détection depuis l'URL de la requête (priorité pour production)
    if (requestUrl) {
      try {
        const url = new URL(requestUrl);
        const detectedBaseUrl = `${url.protocol}//${url.host}`;
        
        // Utiliser l'URL détectée si ce n'est pas localhost
        if (!detectedBaseUrl.includes('localhost')) {
          baseUrl = detectedBaseUrl;
          console.log(`🌐 [OAuth ${this.provider}] Auto-détection base URL: ${baseUrl}`);
        }
      } catch (e) {
        console.warn(`⚠️ [OAuth ${this.provider}] Impossible de parser l'URL: ${requestUrl}`);
      }
    }

    return baseUrl;
  }

  /**
   * Construit l'URL de callback complète
   */
  protected constructCallbackUrl(callbackPath: string, baseUrl: string): string | null {
    let callbackUrl = callbackPath;

    // Si le path est relatif, le rendre absolu
    if (callbackUrl.startsWith("/")) {
      if (!baseUrl) {
        console.error(`❌ [OAuth ${this.provider}] Impossible de construire l'URL de callback`);
        console.error(`   - callbackPath: ${callbackPath}`);
        console.error(`   - baseUrl: ${baseUrl}`);
        console.error(`   - NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL || 'NOT SET'}`);
        console.error(`   ⚠️  SOLUTION: Définir NEXT_PUBLIC_APP_URL`);
        return null;
      }
      callbackUrl = `${baseUrl}${callbackPath}`;
    }

    // Valider que c'est une URL absolue
    if (!callbackUrl.startsWith("http://") && !callbackUrl.startsWith("https://")) {
      console.error(`❌ [OAuth ${this.provider}] URL de callback invalide: ${callbackUrl}`);
      return null;
    }

    return callbackUrl;
  }

  /**
   * Génère un state CSRF sécurisé
   */
  protected generateState(): string {
    return crypto.randomUUID();
  }

  /**
   * Vérifie si le provider est activé
   */
  async isEnabled(environment: string = "production"): Promise<boolean> {
    const config = await this.getConfig(environment);
    return config !== null && config.isActive;
  }

  // Méthodes abstraites que chaque provider doit implémenter
  abstract getAuthorizationUrl(config: OAuthConfig, state: string): string;
  abstract getScopes(): string[];
}
