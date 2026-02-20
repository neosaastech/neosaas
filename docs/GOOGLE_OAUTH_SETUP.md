# Google OAuth Setup - Guide Complet

**Date de création** : 2026-01-23  
**Version** : 1.0  
**Status** : ✅ Ready for Configuration

---

## 🎯 Vue d'ensemble

Ce guide explique comment configurer Google OAuth pour permettre aux utilisateurs de se connecter avec leur compte Google. L'implémentation suit exactement la même architecture que GitHub OAuth, garantissant cohérence et sécurité.

---

## ✅ État d'avancement

| Composant | Status | Fichier |
|-----------|--------|---------|
| **Provider Google** | ✅ Implémenté | `lib/oauth/providers/google.ts` |
| **Route d'initiation** | ✅ Créée | `app/api/auth/oauth/google/route.ts` |
| **Route de callback** | ✅ Créée | `app/api/auth/oauth/google/callback/route.ts` |
| **Helper de config** | ✅ Créé | `lib/oauth/google-config.ts` |
| **Frontend login** | ✅ Prêt | Bouton apparaît automatiquement |
| **Frontend register** | ✅ Prêt | Bouton apparaît automatiquement |
| **Base de données** | ✅ Prête | Table `service_api_configs` |
| **API de config** | ✅ Supporte Google | `/api/auth/oauth/config` |

---

## 📋 Checklist de configuration

### 1. Configuration Google Cloud Console

#### Étape 1.1 : Créer un projet Google Cloud

1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)
2. Cliquer sur **"Select a project"** → **"New Project"**
3. Nom du projet : `NeoSaaS Production` (ou votre nom)
4. Cliquer sur **"Create"**
5. Sélectionner le projet nouvellement créé

#### Étape 1.2 : Activer Google+ API

1. Dans le menu latéral : **APIs & Services** → **Library**
2. Rechercher **"Google+ API"** ou **"Google Identity"**
3. Cliquer sur **"Enable"**
4. (Optionnel mais recommandé) Activer également **"Google People API"** pour récupérer plus d'infos

#### Étape 1.3 : Créer les credentials OAuth 2.0

1. Menu : **APIs & Services** → **Credentials**
2. Cliquer sur **"Create Credentials"** → **"OAuth 2.0 Client ID"**
3. Si demandé, configurer l'écran de consentement OAuth :
   - Type d'utilisateur : **External** (ou Internal si Google Workspace)
   - Nom de l'application : `NeoSaaS`
   - Email de support : votre email
   - Logo (optionnel)
   - Domaine autorisé : `neosaas.tech` (votre domaine)
   - Scopes : laisser par défaut
   - Sauvegarder
4. Revenir à **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type : **Web application**
6. Nom : `NeoSaaS Production OAuth`
7. **Authorized JavaScript origins** :
   ```
   https://www.neosaas.tech
   https://neosaas.tech
   ```
8. **Authorized redirect URIs** (⚠️ CRITIQUE - doit être EXACT) :
   ```
   https://www.neosaas.tech/api/auth/oauth/google/callback
   ```
9. Cliquer sur **"Create"**
10. **COPIER** le **Client ID** et le **Client Secret** (vous en aurez besoin)

#### Étape 1.4 : Configurer les scopes

Par défaut, les scopes suivants sont utilisés :
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`
- `openid`

Ces scopes permettent de :
- ✅ Récupérer l'email de l'utilisateur
- ✅ Récupérer le nom complet (prénom + nom)
- ✅ Récupérer l'avatar
- ✅ Vérifier l'identité (OpenID Connect)

---

### 2. Configuration NeoSaaS (Database)

#### Étape 2.1 : Accéder à l'admin

1. Se connecter à `/admin` avec un compte **admin**
2. Aller dans **API Configuration** (menu latéral)
3. Chercher la section **"Google OAuth Configuration"**

#### Étape 2.2 : Sauvegarder les credentials

1. **Client ID** : Coller la valeur copiée depuis Google Cloud Console
   - Format attendu : `1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com`
2. **Client Secret** : Coller le secret copié
   - Format attendu : chaîne alphanumérique aléatoire
3. **Callback URL** : Devrait être pré-rempli et en lecture seule
   - Valeur : `https://www.neosaas.tech/api/auth/oauth/google/callback`
   - ⚠️ **IMPORTANT** : Copier cette valeur et la coller EXACTEMENT dans Google Cloud Console
4. **Environment** : Sélectionner `production`
5. **Is Active** : Cocher ✅

#### Étape 2.3 : Tester la connexion

1. Cliquer sur **"Test Connection"**
2. Vérifier que le test est réussi ✅
3. Si échec, vérifier :
   - Client ID et Secret corrects
   - Pas d'espaces avant/après
   - Format valide

#### Étape 2.4 : Sauvegarder

1. Cliquer sur **"Save Configuration"**
2. Vérifier le message de succès
3. Les credentials sont automatiquement **cryptés AES-256-GCM** avant stockage
4. Stockage dans `service_api_configs` table

#### Étape 2.5 : Activer dans Admin Settings

1. Aller sur **`/admin/settings`**
2. Onglet **"Social Sharing & Links"**
3. Section **"Social Authentication"**
4. Activer le switch **Google OAuth** ✅
5. Vérifier le checkmark vert
6. Toast de confirmation "Google OAuth enabled"

> ⚠️ **IMPORTANT** : Le provider doit être **configuré** dans `/admin/api` ET **activé** dans `/admin/settings` pour que le bouton apparaisse sur login/register.

---

### 3. Vérification de la configuration

#### Étape 3.1 : Vérifier l'apparition du bouton

1. Se déconnecter (ou ouvrir navigation privée)
2. Aller sur `/auth/login`
3. **Vérifier** que le bouton **"Continue with Google"** apparaît
4. Même chose sur `/auth/register`

Si le bouton n'apparaît pas :
- Vérifier dans `/admin/settings` → "Social Authentication" → Switch Google activé ✅
- Vérifier dans `/admin/api` que `isActive = true`
- Vider le cache du navigateur
- Vérifier dans la console navigateur : `fetch('/api/auth/oauth/config')`
- La réponse doit contenir `"google": true`

#### Étape 3.2 : Tester le flow complet

1. Cliquer sur **"Continue with Google"**
2. **Attendu** : Redirection vers `accounts.google.com`
3. Choisir un compte Google
4. Autoriser l'accès (si demandé)
5. **Attendu** : Redirection vers `/dashboard`
6. **Vérifier** que vous êtes connecté

---

## 🔐 Sécurité

### Cryptage des credentials

✅ **Tous les credentials sont cryptés automatiquement**

**Algorithme** : AES-256-GCM  
**Clé de dérivation** : PBKDF2 avec 100,000 itérations  
**Source de la clé** : `NEXTAUTH_SECRET` (variable d'environnement)  
**Stockage** : Table `service_api_configs`, colonne `config` (Base64)

### Protection CSRF

✅ **State token aléatoire** généré à chaque requête  
✅ **Cookie httpOnly** avec le state  
✅ **Vérification** lors du callback

### Variables d'environnement

⚠️ **AUCUNE** variable d'environnement nécessaire pour Google OAuth  
✅ Tout est stocké en base de données (crypté)

Exception :
- `NEXTAUTH_SECRET` : Requis pour le cryptage (déjà configuré)
- `NEXT_PUBLIC_APP_URL` : Optionnel (détection automatique)

---

## 🧪 Tests requis

### Checklist de validation

- [ ] **Config sauvegardée** dans `/admin/api`
- [ ] **Callback URL** copié dans Google Cloud Console
- [ ] **Bouton "Continue with Google"** visible sur `/auth/login`
- [ ] **Bouton "Continue with Google"** visible sur `/auth/register`
- [ ] **Clic** redirige vers Google
- [ ] **Autorisation** fonctionne sans erreur
- [ ] **Retour** vers `/dashboard` après autorisation
- [ ] **Utilisateur créé** avec company dans la DB
- [ ] **Rôle "writer"** assigné (vérifier `user_roles` table)
- [ ] **PAS de droits admin** (impossible d'accéder `/admin/*`)
- [ ] **Reconnexion** fonctionne (utilisateur existant)
- [ ] **Liaison de compte** fonctionne (email existant)

### Tests avancés (optionnel)

- [ ] **Token refresh** fonctionne (si implémenté)
- [ ] **Déconnexion** puis reconnexion
- [ ] **Multiple accounts Google** pour le même email
- [ ] **Erreur redirect_uri_mismatch** : message clair affiché
- [ ] **Logs** dans `service_api_usage` table

---

## 🔄 Architecture technique

### Flow d'authentification

```
1. Utilisateur clique "Continue with Google"
   ↓
2. Requête GET /api/auth/oauth/google
   ↓
3. Génération state CSRF (UUID)
   ↓
4. Cookie "google_oauth_state" créé (httpOnly)
   ↓
5. Redirection vers accounts.google.com/o/oauth2/v2/auth
   + client_id
   + redirect_uri
   + scope
   + state
   ↓
6. Utilisateur autorise l'accès
   ↓
7. Google redirige vers /api/auth/oauth/google/callback?code=XXX&state=XXX
   ↓
8. Vérification state (protection CSRF)
   ↓
9. Échange code contre access_token
   POST https://oauth2.googleapis.com/token
   ↓
10. Récupération infos utilisateur
    GET https://www.googleapis.com/oauth2/v2/userinfo
    ↓
11. Vérification utilisateur en DB (par email)
    ↓
12. Si nouveau → Créer user + company + role "writer"
    Si existant → Lier compte Google
    ↓
13. Génération JWT token
    ↓
14. Cookie "auth-token" créé (httpOnly)
    ↓
15. Redirection vers /dashboard
```

### URLs Google OAuth 2.0

| Type | URL |
|------|-----|
| **Authorization** | `https://accounts.google.com/o/oauth2/v2/auth` |
| **Token Exchange** | `https://oauth2.googleapis.com/token` |
| **User Info** | `https://www.googleapis.com/oauth2/v2/userinfo` |
| **Revoke Token** | `https://oauth2.googleapis.com/revoke` (si implémenté) |

### Scopes par défaut

```typescript
[
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'openid',
]
```

### Réponse userinfo

```json
{
  "id": "1234567890",
  "email": "user@example.com",
  "verified_email": true,
  "name": "John Doe",
  "given_name": "John",
  "family_name": "Doe",
  "picture": "https://lh3.googleusercontent.com/..."
}
```

---

## 📊 Différences Google vs GitHub

| Aspect | GitHub | Google |
|--------|--------|--------|
| **Auth URL** | `github.com/login/oauth/authorize` | `accounts.google.com/o/oauth2/v2/auth` |
| **Token URL** | `github.com/login/oauth/access_token` | `oauth2.googleapis.com/token` |
| **User API** | `api.github.com/user` | `googleapis.com/oauth2/v2/userinfo` |
| **Email séparé** | ✅ Oui (`/user/emails`) | ❌ Non (inclus dans userinfo) |
| **Scopes** | `user:email` | `userinfo.email`, `userinfo.profile` |
| **Response type** | `code` | `code` |
| **Grant type** | `authorization_code` | `authorization_code` |
| **Refresh token** | ❌ Non | ✅ Oui (si `access_type=offline`) |
| **Token expiration** | ❌ Jamais | ✅ Oui (3600s) |

---

## 🐛 Troubleshooting

### Erreur : `redirect_uri_mismatch`

**Symptôme** : Erreur Google "Error 400: redirect_uri_mismatch"

**Cause** : L'URL de callback dans Google Cloud Console ne correspond pas exactement à celle envoyée

**Solution** :
1. Aller sur [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Sélectionner votre OAuth 2.0 Client ID
3. Vérifier que les **Authorized redirect URIs** contiennent EXACTEMENT :
   ```
   https://www.neosaas.tech/api/auth/oauth/google/callback
   ```
4. **Pas de slash final** `/`
5. **Protocol exact** `https://` (pas `http://`)
6. **Domaine exact** (avec ou sans `www.` selon votre config)
7. Sauvegarder et réessayer

---

### Erreur : Bouton Google n'apparaît pas

**Vérifications** :
1. Aller sur `/admin/api`
2. Vérifier que la section "Google OAuth Configuration" existe
3. Vérifier que `isActive = true` ✅
4. Vérifier que `environment = production`
5. Ouvrir console navigateur → `fetch('/api/auth/oauth/config')`
6. Vérifier que la réponse contient `"google": true`

Si toujours pas visible :
- Vider le cache : `Ctrl+Shift+Delete`
- Vérifier dans la DB : `SELECT * FROM service_api_configs WHERE service_name = 'google';`
- Vérifier les logs serveur : `[OAuth Config API]`

---

### Erreur : `no_email` après callback

**Symptôme** : Redirection vers `/auth/login?error=no_email`

**Cause** : Google n'a pas retourné l'email de l'utilisateur

**Solutions** :
1. Vérifier les scopes configurés incluent `userinfo.email`
2. Vérifier que l'utilisateur a un email vérifié sur Google
3. Vérifier les logs serveur pour voir la réponse de Google
4. Essayer avec un autre compte Google

---

### Erreur : `invalid_state`

**Symptôme** : Redirection vers `/auth/login?error=invalid_state`

**Cause** : Le state CSRF ne correspond pas (cookie expiré ou modifié)

**Solutions** :
1. Vider les cookies du navigateur
2. Réessayer la connexion
3. Vérifier que les cookies httpOnly sont autorisés
4. Vérifier la configuration `sameSite` des cookies

---

### Erreur : `config_missing`

**Symptôme** : Redirection vers `/auth/login?error=config_missing`

**Cause** : Aucune configuration Google trouvée en base de données

**Solutions** :
1. Aller sur `/admin/api`
2. Configurer Google OAuth (voir section 2)
3. Vérifier dans la DB : `SELECT * FROM service_api_configs WHERE service_name = 'google';`

---

## 📁 Fichiers créés/modifiés

### ✅ Nouveaux fichiers

| Fichier | Description |
|---------|-------------|
| `app/api/auth/oauth/google/route.ts` | Route d'initiation OAuth |
| `app/api/auth/oauth/google/callback/route.ts` | Route de callback OAuth |
| `lib/oauth/google-config.ts` | Helper de configuration (legacy) |
| `docs/GOOGLE_OAUTH_SETUP.md` | Ce document |

### ✅ Fichiers existants utilisés

| Fichier | Utilisation |
|---------|-------------|
| `lib/oauth/providers/google.ts` | Provider Google (déjà créé) |
| `lib/oauth/base-provider.ts` | Classe de base OAuth |
| `lib/oauth/types.ts` | Types TypeScript |
| `app/auth/login/page.tsx` | Frontend login (bouton auto) |
| `app/auth/register/page.tsx` | Frontend register (bouton auto) |
| `app/api/auth/oauth/config/route.ts` | API de config (supporte déjà Google) |
| `db/schema.ts` | Schéma DB (`service_api_configs`, `oauth_connections`) |
| `lib/services/service-api-repository.ts` | Repository pour cryptage/décryptage |

---

## 🎉 Résumé - Ordre d'implémentation

### Étape 1 : Google Cloud Console (externe)
- [x] Créer projet Google Cloud
- [x] Activer Google+ API
- [ ] Créer OAuth 2.0 Client ID
- [ ] Copier Client ID et Client Secret

### Étape 2 : NeoSaaS Admin (config)
- [ ] Aller sur `/admin/api`
- [ ] Sauvegarder credentials Google
- [ ] Aller sur `/admin/settings`
- [ ] Activer le switch Google OAuth ✅
- [ ] Copier Callback URL dans Google Cloud Console

### Étape 3 : Code (déjà fait ✅)
- [x] Provider Google créé
- [x] Route d'initiation créée
- [x] Route de callback créée
- [x] Helper de config créé

### Étape 4 : Tests
- [ ] S'inscrire via Google
- [ ] Vérifier company créée
- [ ] Vérifier rôle writer (pas admin)
- [ ] Vérifier connexion existante
- [ ] Vérifier liaison de compte

---

## 🔗 Liens utiles

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
- [NeoSaaS Admin API Config](/admin/api)
- [NeoSaaS Login Page](/auth/login)

---

## 📝 Notes importantes

### Frontend déjà prêt ✅
Le bouton "Continue with Google" apparaît **automatiquement** si :
- Config Google existe dans la DB
- `isActive = true`
- `environment = 'production'`

L'API `/api/auth/oauth/config` retourne déjà `google: true/false` dynamiquement.

### Architecture unifiée
Google OAuth suit **exactement** la même architecture que GitHub OAuth :
- Même base de données (`service_api_configs`)
- Même cryptage (AES-256-GCM)
- Même pattern de code (BaseOAuthProvider)
- Même gestion des erreurs
- Même logging (`service_api_usage`)

### Pas de variables d'environnement
Contrairement à d'autres implémentations, **aucune** variable d'environnement n'est requise pour Google OAuth. Tout est stocké en base de données et crypté automatiquement.

---

**Configuration terminée ?** ✅ Les utilisateurs peuvent maintenant se connecter avec Google !
