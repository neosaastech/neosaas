/**
 * Types pour la configuration GitHub OAuth
 */

export interface GitHubConfigRequest {
  // Mode 1: Validation PAT uniquement (retourne instructions)
  githubPat?: string;
  
  // Mode 2: Enregistrement credentials OAuth directs
  clientId?: string;
  clientSecret?: string;
  environment?: 'production' | 'preview' | 'development';
}

export interface GitHubConfigResponse {
  success: boolean;
  message?: string;
  error?: string;
  details?: {
    oauthAppCreated?: boolean;
    vercelEnvUpdated?: boolean;
    credentialsStored?: boolean;
    instructions?: Record<string, string>;
  };
}

export interface GitHubOAuthApp {
  id: number;
  client_id: string;
  client_secret: string;
  name: string;
  url: string;
  callback_url: string;
}

export interface GitHubUser {
  login: string;
  id: number;
  email: string;
  name: string;
  scopes?: string[];
}

export interface VercelEnvVariable {
  type: 'plain' | 'encrypted' | 'secret';
  key: string;
  value: string;
  target: ('production' | 'preview' | 'development')[];
  gitBranch?: string;
  id?: string;
}

export interface VercelEnvResponse {
  created: {
    key: string;
    value: string;
    target: string[];
  };
}

export interface GitHubConfigError {
  step: 'validation' | 'oauth_creation' | 'vercel_update';
  error: string;
  details?: any;
}
