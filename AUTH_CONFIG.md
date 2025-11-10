# Configuration Auth.js pour NeoSaasApp

## Variables d'environnement requises

Ajoutez ces variables dans votre projet Vercel ou dans `.env.local` :

\`\`\`env
# Auth.js Core
AUTH_SECRET="your-random-secret-key-here"  # Générez avec: openssl rand -base64 32
AUTH_URL="http://localhost:3000"           # En dev, changez pour production

# Google OAuth
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# GitHub OAuth (optionnel)
AUTH_GITHUB_ID="your-github-client-id"
AUTH_GITHUB_SECRET="your-github-client-secret"
\`\`\`

## Configuration Google OAuth

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Activez l'API Google+ 
4. Allez dans "Identifiants" → "Créer des identifiants" → "ID client OAuth 2.0"
5. Configurez l'écran de consentement OAuth
6. Type d'application : Application Web
7. Origines JavaScript autorisées :
   - `http://localhost:3000` (dev)
   - `https://votre-domaine.com` (production)
8. URI de redirection autorisés :
   - `http://localhost:3000/api/auth/callback/google` (dev)
   - `https://votre-domaine.com/api/auth/callback/google` (production)
9. Copiez le "Client ID" et "Client Secret"

## Configuration GitHub OAuth

1. Allez sur [GitHub Developer Settings](https://github.com/settings/developers)
2. Cliquez sur "New OAuth App"
3. Remplissez :
   - Application name: NeoSaasApp
   - Homepage URL: `http://localhost:3000` ou votre domaine
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Créez l'application et copiez le "Client ID"
5. Générez un "Client Secret"

## Installation

\`\`\`bash
npm install next-auth@beta @auth/drizzle-adapter --legacy-peer-deps
\`\`\`

## Architecture

- **Auth.js v5** : Gestion OAuth (Google, GitHub)
- **API personnalisée** : Email/mot de passe (`/api/auth/login`, `/api/auth/register`)
- **Drizzle ORM** : Stockage unifié dans Neon PostgreSQL
- **Sessions** : Gérées par Auth.js avec cookies sécurisés

## Schéma de base de données

Les tables nécessaires sont déjà dans `lib/db/schema.ts` :
- `users` : Utilisateurs (OAuth + email/password)
- `accounts` : Comptes OAuth liés
- `sessions` : Sessions actives
- `verification` : Tokens de vérification email

## Déploiement sur Vercel

1. Ajoutez toutes les variables d'environnement dans Vercel
2. Changez `AUTH_URL` pour votre domaine de production
3. Mettez à jour les URLs de callback OAuth dans Google/GitHub
4. Redéployez l'application

## Sécurité

- Les mots de passe email/password sont hashés avec SHA-256
- Auth.js gère automatiquement la protection CSRF
- Les sessions utilisent des cookies HTTP-only
- Les tokens OAuth sont stockés de manière sécurisée
