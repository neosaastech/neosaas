/**
 * OAuth Provider Registry
 * 
 * Point d'entrée centralisé pour tous les providers OAuth
 * Facilite l'ajout de nouveaux providers
 */

import { githubOAuthProvider } from "./providers/github";
import { googleOAuthProvider } from "./providers/google";
import type { OAuthProvider } from "./types";
import type { BaseOAuthProvider } from "./base-provider";

/**
 * Registry de tous les providers OAuth disponibles
 */
export const oauthProviders: Record<OAuthProvider, BaseOAuthProvider> = {
  github: githubOAuthProvider,
  google: googleOAuthProvider,
  // Ajouter ici les futurs providers
  facebook: null as any, // À implémenter
  microsoft: null as any, // À implémenter
  linkedin: null as any, // À implémenter
};

/**
 * Récupère un provider OAuth par son nom
 */
export function getOAuthProvider(provider: OAuthProvider): BaseOAuthProvider {
  const oauthProvider = oauthProviders[provider];
  
  if (!oauthProvider) {
    throw new Error(`Provider OAuth non supporté: ${provider}`);
  }
  
  return oauthProvider;
}

/**
 * Liste tous les providers OAuth disponibles (implémentés)
 */
export function getAvailableProviders(): OAuthProvider[] {
  return Object.entries(oauthProviders)
    .filter(([_, provider]) => provider !== null)
    .map(([name, _]) => name as OAuthProvider);
}

/**
 * Vérifie si un provider est disponible
 */
export function isProviderAvailable(provider: string): provider is OAuthProvider {
  return provider in oauthProviders && oauthProviders[provider as OAuthProvider] !== null;
}
