# Configuration Automatique GitHub OAuth

## Vue d'ensemble

Ce module permet de configurer automatiquement l'authentification GitHub OAuth pour NeoSAS en utilisant uniquement une clé API GitHub (Personal Access Token). Le système crée automatiquement une OAuth App GitHub et met à jour les variables d'environnement Vercel sans intervention manuelle.

## Architecture

### Composants

1. **Front-End** : [app/(private)/admin/api/page.tsx](../app/%28private%29/admin/api/page.tsx)
   - Interface utilisateur intégrée dans la gestion des API
   - Formulaire dédié pour GitHub OAuth avec GitHub PAT
   - Affichage des notifications et du statut

2. **API Route** : [app/api/admin/configure-github-oauth/route.ts](../app/api/admin/configure-github-oauth/route.ts)
   - Validation de la clé GitHub
   - Création de l'OAuth App
   - Mise à jour des variables Vercel

3. **Middleware** : [lib/auth/admin-auth.ts](../lib/auth/admin-auth.ts)
   - Restriction d'accès aux administrateurs

4. **Types** : [types/github-config.ts](../types/github-config.ts)
   - Définitions TypeScript pour les requêtes/réponses

---

## Prérequis

### 1. Clé API GitHub (Personal Access Token)

#### Création du Token

1. Connectez-vous à GitHub
2. Allez sur [Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
3. Cliquez sur **"Generate new token (classic)"**
4. Configurez le token :
   - **Note** : `NeoSAS OAuth Configuration`
   - **Expiration** : Choisissez une durée appropriée (recommandé : 90 jours)
   - **Permissions** :
     - ✅ `admin:org` (Organization administration)
     - ✅ `write:org` (Write access to organization)
     - ✅ `read:user` (Read user profile data)
     - ✅ `user:email` (Access user email addresses)

5. Cliquez sur **"Generate token"**
6. **IMPORTANT** : Copiez le token immédiatement (vous ne pourrez plus le voir)

#### Format du Token

Le token commence par `ghp_` suivi de 36 caractères :
```
ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### 2. Configuration Vercel

#### A. Récupérer l'ID du Projet Vercel

**Méthode 1 : Via l'interface Vercel**
1. Allez sur [Vercel Dashboard](https://vercel.com/dashboard)
2. Sélectionnez votre projet
3. Allez dans **Settings → General**
4. Copiez le **Project ID**

**Méthode 2 : Via la CLI Vercel**
```bash
vercel project ls
```

#### B. Créer un Token API Vercel

1. Allez sur [Vercel Account Settings → Tokens](https://vercel.com/account/tokens)
2. Cliquez sur **"Create Token"**
3. Configurez le token :
   - **Name** : `NeoSAS GitHub OAuth Configuration`
   - **Scope** : Sélectionnez votre compte/équipe
   - **Expiration** : Choisissez une durée appropriée

4. Cliquez sur **"Create"**
5. Copiez le token (commence par `vercel_`)

#### C. Ajouter les Variables d'Environnement

Ajoutez ces variables à votre projet Vercel :

**Via l'interface Vercel :**
1. Projet → **Settings → Environment Variables**
2. Ajoutez :
   - `VERCEL_PROJECT_ID` : Votre ID de projet
   - `VERCEL_API_TOKEN` : Votre token API

**Via la CLI :**
```bash
vercel env add VERCEL_PROJECT_ID
# Saisissez l'ID du projet

vercel env add VERCEL_API_TOKEN
# Saisissez le token API
```

**Dans `.env.local` (développement uniquement) :**
```env
VERCEL_PROJECT_ID="prj_xxxxxxxxxxxxxxxxxxxx"
VERCEL_API_TOKEN="vercel_xxxxxxxxxxxxxxxxxxxxxxxx"

# Optionnel : Organisation GitHub (par défaut : NEOMIA)
GITHUB_ORG="NEOMIA"

# URL de votre application
NEXT_PUBLIC_APP_URL="https://neosaas.tech"
```

---

## Utilisation

### 1. Accéder à l'Interface

1. Connectez-vous en tant qu'administrateur
2. Allez sur `/admin/api`
3. Cliquez sur **"Add New API Configuration"**
4. Sélectionnez **"GitHub"** dans la liste des services

### 2. Configurer GitHub OAuth

1. Collez votre **Personal Access Token** GitHub dans le champ prévu
2. Cliquez sur **"Save"** (ou **"Test"** pour vérifier d'abord le token)
3. Le système va automatiquement :
   - Valider votre token GitHub
   - Créer l'OAuth App GitHub
   - Mettre à jour les variables Vercel
4. La page se rechargera automatiquement une fois terminé (2-5 secondes)

### 3. Vérification

Après le rechargement, les variables suivantes seront disponibles :
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

Vous pouvez vérifier en appelant :
```bash
curl https://votre-site.com/api/admin/configure-github-oauth
```

Réponse attendue :
```json
{
  "configured": true,
  "vercelConfigured": true,
  "clientId": "Iv1.8a..."
}
```

---

## Processus Technique

### Étapes Automatiques

1. **Validation GitHub** :
   - Appel à `https://api.github.com/user` avec le PAT
   - Vérification des permissions (`admin:org`, `write:org`)

2. **Création OAuth App** :
   - Tentative de création via GitHub Apps API
   - Si échec : création via OAuth Apps classiques
   - Récupération du `client_id` et `client_secret`

3. **Mise à jour Vercel** :
   - Suppression des variables existantes (si présentes)
   - Création des nouvelles variables (type: `encrypted`)
   - Cibles : `production`, `preview`, `development`

### Gestion des Erreurs

Le système gère automatiquement :
- ✅ Clé API GitHub invalide
- ✅ Permissions insuffisantes
- ✅ Quota API GitHub dépassé
- ✅ Erreurs réseau Vercel
- ✅ Variables d'environnement manquantes
- ✅ Organisations GitHub inexistantes

---

## Dépannage

### Erreur : "Clé API invalide"

**Cause** : Token expiré ou incorrect

**Solution** :
1. Vérifiez que le token commence par `ghp_`
2. Générez un nouveau token
3. Réessayez

### Erreur : "Permissions insuffisantes"

**Cause** : Le token n'a pas les scopes requis

**Solution** :
1. Allez sur [GitHub Settings → Tokens](https://github.com/settings/tokens)
2. Trouvez votre token
3. Vérifiez que `admin:org` et `write:org` sont cochés
4. Sinon, générez un nouveau token avec ces permissions

### Erreur : "Configuration Vercel manquante"

**Cause** : `VERCEL_PROJECT_ID` ou `VERCEL_API_TOKEN` non configurés

**Solution** :
1. Ajoutez les variables dans Vercel Settings
2. Redéployez l'application
3. Réessayez

### Erreur : "Impossible de créer l'OAuth App"

**Causes possibles** :
- Organisation GitHub incorrecte
- Quota API GitHub dépassé
- Nom d'application en conflit

**Solution** :
1. Vérifiez la variable `GITHUB_ORG`
2. Attendez quelques minutes (rate limit)
3. Si le problème persiste, supprimez les anciennes OAuth Apps sur GitHub

### L'authentification GitHub ne fonctionne pas après configuration

**Cause** : Variables d'environnement non rechargées

**Solution** :
1. Allez sur Vercel Dashboard
2. Déployez à nouveau (`Deployments → Redeploy`)
3. Ou attendez le prochain déploiement automatique

---

## Sécurité

### Bonnes Pratiques

1. **Rotation des Tokens** :
   - Changez les tokens tous les 90 jours
   - Révoquez les anciens tokens après rotation

2. **Accès Restreint** :
   - Seuls les administrateurs peuvent accéder à `/admin/api-management`
   - Les tokens sont chiffrés dans Vercel

3. **Logs** :
   - Tous les appels API sont loggés
   - Surveillez les erreurs dans Vercel Logs

4. **Variables d'Environnement** :
   - Ne commitez JAMAIS les tokens dans Git
   - Utilisez `.env.local` pour le développement
   - Ajoutez `.env.local` dans `.gitignore`

### Permissions Minimales

Le Personal Access Token nécessite uniquement :
- `admin:org` : Pour créer l'OAuth App
- `write:org` : Pour modifier les paramètres d'organisation

**Ne donnez PAS** :
- ❌ `repo` (accès aux repositories)
- ❌ `delete:org` (suppression d'organisation)
- ❌ `admin:public_key` (gestion des clés SSH)

---

## API Reference

### POST `/api/admin/configure-github-oauth`

Configure GitHub OAuth automatiquement.

**Authentification** : Admin uniquement

**Body** :
```json
{
  "githubPat": "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

**Réponse (Succès)** :
```json
{
  "success": true,
  "message": "Configuration GitHub OAuth terminée avec succès...",
  "details": {
    "oauthAppCreated": true,
    "vercelEnvUpdated": true
  }
}
```

**Réponse (Erreur)** :
```json
{
  "success": false,
  "error": "Message d'erreur détaillé",
  "details": {
    "oauthAppCreated": false,
    "vercelEnvUpdated": false
  }
}
```

### GET `/api/admin/configure-github-oauth`

Vérifie l'état de la configuration.

**Authentification** : Aucune

**Réponse** :
```json
{
  "configured": true,
  "vercelConfigured": true,
  "clientId": "Iv1.8a..."
}
```

---

## Migration Manuelle (Alternative)

Si vous préférez configurer manuellement :

1. **Créer l'OAuth App GitHub** :
   - Allez sur [GitHub Developer Settings](https://github.com/settings/developers)
   - Créez une nouvelle OAuth App
   - **Homepage URL** : `https://neosaas.tech`
   - **Callback URL** : `https://neosaas.tech/api/auth/callback/github`

2. **Ajouter les variables Vercel** :
   ```bash
   vercel env add GITHUB_CLIENT_ID
   # Collez le Client ID

   vercel env add GITHUB_CLIENT_SECRET
   # Collez le Client Secret
   ```

3. **Redéployer** :
   ```bash
   vercel deploy --prod
   ```

---

## Dépendances

### Packages NPM Requis

Les dépendances suivantes sont déjà incluses dans le projet :

- `next` : Framework Next.js
- Aucune dépendance externe supplémentaire (utilise `fetch` natif)

### Pas besoin d'installer `axios`

Le code utilise l'API `fetch` native de Node.js/Next.js, donc **aucune installation supplémentaire** n'est requise.

---

## Support

Pour toute question ou problème :

1. Vérifiez les logs Vercel : `Deployments → [Dernier Déploiement] → Logs`
2. Consultez les logs de l'API Route : Recherchez `[GITHUB OAUTH]`
3. Créez un ticket de support avec :
   - Message d'erreur complet
   - Logs pertinents (masquez les tokens)
   - Étapes de reproduction

---

## Changelog

### Version 1.0.0 (21 janvier 2026)
- ✅ Implémentation initiale
- ✅ Support GitHub Apps et OAuth Apps
- ✅ Intégration Vercel API
- ✅ Middleware d'authentification admin
- ✅ Interface utilisateur complète
- ✅ Documentation complète

---

## Références

- [GitHub OAuth Apps Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [GitHub API - Create OAuth App](https://docs.github.com/en/rest/apps/oauth-applications)
- [Vercel Environment Variables API](https://vercel.com/docs/rest-api/endpoints/environment-variables)
- [Next.js Authentication](https://nextjs.org/docs/authentication)
