/**
 * Types communs pour l'authentification OAuth multi-providers
 * 
 * Ce fichier centralise les types utilisés par tous les providers OAuth
 * (GitHub, Google, Facebook, etc.)
 */

/**
 * Configuration OAuth générique pour tous les providers
 */
export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  baseUrl: string;
  isActive: boolean;
  provider: OAuthProvider;
}

/**
 * Providers OAuth supportés
 */
export type OAuthProvider = 'github' | 'google' | 'facebook' | 'microsoft' | 'linkedin';

/**
 * Structure des credentials OAuth stockés en DB (cryptés)
 */
export interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
}

/**
 * Métadonnées OAuth stockées en DB
 */
export interface OAuthMetadata {
  callbackUrl?: string;
  baseUrl?: string;
  scopes?: string[];
  additionalParams?: Record<string, string>;
}

/**
 * Informations d'entreprise retournées par les providers OAuth
 */
export interface OAuthCompanyInfo {
  name?: string | null;
  location?: string | null;
  website?: string | null;
  description?: string | null;
  department?: string | null;
  jobTitle?: string | null;
}

/**
 * Informations utilisateur retournées par les providers OAuth
 */
export interface OAuthUserInfo {
  id: string;
  email: string;
  name: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  provider: OAuthProvider;
  companyInfo?: OAuthCompanyInfo; // Informations sur l'entreprise de l'utilisateur
  raw?: any; // Données brutes du provider (pour accès champs spécifiques)
}

/**
 * Résultat de l'échange du code OAuth contre un access token
 */
export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
  tokenType?: string;
}

/**
 * Configuration de redirection OAuth
 */
export interface OAuthRedirectConfig {
  authorizationUrl: string;
  state: string;
  scope: string[];
  additionalParams?: Record<string, string>;
}
