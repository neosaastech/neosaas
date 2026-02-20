# Règles d'activation OAuth - Connexion sociale GitHub/Google

**Date:** 2026-01-23  
**Système:** OAuth Configuration Management  
**Pages affectées:** `/auth/login`, `/auth/register`

## Vue d'ensemble

Les boutons de connexion sociale (GitHub, Google) apparaissent **dynamiquement** sur les pages login et register en fonction de la configuration administrative dans la base de données.

## Architecture du système

```
┌─────────────────────────────────────────────────────────────┐
│         Admin > API Management (/admin/api)                 │
│  📝 Configuration GitHub/Google OAuth                       │
│  - Client ID, Client Secret                                 │
│  - Environment (production/development)                     │
│  - isActive toggle (ON/OFF)                                 │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    │ Sauvegarde dans DB
                    ▼
┌─────────────────────────────────────────────────────────────┐
│              Database: service_api_configs                   │
│  Table: service_api_configs                                 │
│  - serviceName: "github" | "google"                         │
│  - serviceType: "oauth"                                     │
│  - isActive: boolean                                        │
│  - environment: "production" | "development"                │
│  - config: { clientId, clientSecret } (encrypted)           │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    │ API call
                    ▼
┌─────────────────────────────────────────────────────────────┐
│         API: GET /api/auth/oauth/config                     │
│  Retourne la liste des providers ACTIFS uniquement          │
│  Filtres:                                                   │
│  - serviceType = 'oauth'                                    │
│  - isActive = true                                          │
│  - environment = 'production'                               │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    │ Response JSON
                    ▼
┌─────────────────────────────────────────────────────────────┐
│     Frontend: Login & Register pages                        │
│  Appel API au chargement de la page:                        │
│  useEffect(() => fetch('/api/auth/oauth/config'))           │
│                                                             │
│  Affichage conditionnel:                                    │
│  {oauthConfig.github && <Button>GitHub</Button>}            │
│  {oauthConfig.google && <Button>Google</Button>}            │
└─────────────────────────────────────────────────────────────┘
```

## Règles d'apparition des boutons OAuth

### ✅ Conditions pour qu'un bouton apparaisse

Un bouton de connexion sociale (GitHub ou Google) apparaît **SI ET SEULEMENT SI** toutes ces conditions sont remplies :

| Condition | Description | Requis |
|-----------|-------------|--------|
| **Config existe** | Une entrée existe dans `service_api_configs` pour ce provider | ✅ OUI |
| **Service Type** | `serviceType = 'oauth'` | ✅ OUI |
| **Provider actif** | `isActive = true` | ✅ OUI |
| **Environment** | `environment = 'production'` | ✅ OUI |
| **Client ID renseigné** | `config.clientId` non vide | ✅ OUI |
| **Client Secret renseigné** | `config.clientSecret` non vide | ✅ OUI |

### ❌ Le bouton n'apparaît PAS si

- Aucune config n'existe dans la base de données
- `isActive = false` (toggle OFF dans l'admin)
- `environment = 'development'` (seulement production)
- `serviceType ≠ 'oauth'`
- Client ID ou Client Secret manquants/vides

## Droits d'accès et permissions

### Page Admin API (/admin/api)

**Accès requis :** Administrateur uniquement

| Action | Permission requise | Middleware | Notes |
|--------|-------------------|-----------|-------|
| **Voir la page** | Admin | `useRequireAdmin` hook | Redirect si non-admin |
| **Créer config OAuth** | Admin | `/api/services/github` POST | Encryption AES-256-GCM |
| **Modifier config** | Admin | `/api/services/github` POST | Overwrite existing |
| **Activer/Désactiver** | Admin | `isActive` toggle | Immediate effect |
| **Supprimer config** | Admin | `/api/services/github` DELETE | Cascade soft delete |
| **Tester config** | Admin | `/api/services/github/test` POST | Validation GitHub API |

### API OAuth Config (/api/auth/oauth/config)

**Accès public** : Aucune authentification requise

| Action | Permission | Notes |
|--------|-----------|-------|
| **GET config** | Public | Retourne SEULEMENT les providers actifs |
| **Credentials** | Jamais exposés | Client ID/Secret JAMAIS envoyés au frontend |

**Sécurité** :
- ✅ Pas d'authentification nécessaire (public endpoint)
- ✅ Ne retourne JAMAIS les credentials (Client ID/Secret)
- ✅ Retourne uniquement `{ github: boolean, google: boolean }`
- ✅ Cache désactivé (`dynamic = 'force-dynamic'`)

### Pages Login & Register

**Accès public** : Aucune authentification requise

| Action | Permission | Notes |
|--------|-----------|-------|
| **Charger la page** | Public | Accessible sans login |
| **Appeler OAuth config API** | Public | Fetch au chargement |
| **Cliquer sur bouton OAuth** | Public | Redirect vers provider |

## Workflow d'activation

### Étape 1 : Configuration Admin

1. Admin se connecte à `/admin/api`
2. Ouvre la section "🔐 OAuth Configuration (User Authentication)"
3. Entre les credentials :
   - **Client ID** : De l'application OAuth GitHub/Google
   - **Client Secret** : Secret de l'application OAuth
   - **Callback URL** : Automatiquement généré (copier-coller dans GitHub/Google)
4. Clique sur "Save Configuration"

**Backend** :
- Validation des credentials (format Client ID)
- Encryption AES-256-GCM
- Sauvegarde dans `service_api_configs`
- `isActive = true` par défaut
- `environment = 'production'`

### Étape 2 : Propagation automatique

**Immédiat** (pas de cache) :
1. API `/api/auth/oauth/config` retourne le nouveau provider
2. Pages login/register rechargent la config au prochain visit
3. Bouton OAuth apparaît automatiquement

**Délai** : < 1 seconde (dynamique, no cache)

### Étape 3 : Désactivation

**Pour désactiver temporairement** :
1. Admin va sur `/admin/api`
2. Édite la config GitHub/Google
3. Change `isActive` à `false` (ou supprime la config)
4. Sauvegarde

**Effet** : Boutons disparaissent immédiatement sur login/register

## Scénarios d'utilisation

### Scénario 1 : Activer GitHub OAuth pour la première fois

**Actions admin** :
```
1. Créer OAuth App sur GitHub.com
2. Copier Client ID et Client Secret
3. Aller sur /admin/api
4. Section "GitHub OAuth Configuration"
5. Coller Client ID et Client Secret
6. Copier Callback URL et l'ajouter dans GitHub OAuth App
7. Cliquer "Save Configuration"
```

**Résultat** :
- ✅ Bouton "Continue with GitHub" apparaît sur `/auth/login`
- ✅ Bouton "Continue with GitHub" apparaît sur `/auth/register`
- ✅ Utilisateurs peuvent se connecter avec GitHub

### Scénario 2 : Désactiver temporairement Google OAuth

**Actions admin** :
```
1. Aller sur /admin/api
2. Trouver la config Google OAuth
3. Cliquer "Edit"
4. Changer isActive à false
5. Sauvegarder
```

**Résultat** :
- ❌ Bouton "Continue with Google" disparaît
- ✅ Utilisateurs existants avec Google peuvent toujours se connecter
- ❌ Nouveaux utilisateurs ne peuvent PAS s'inscrire avec Google

### Scénario 3 : Tester en développement

**Configuration** :
- Créer une config avec `environment = 'development'`

**Résultat** :
- ❌ Boutons n'apparaissent PAS en production
- ✅ Peut être testé en local avec override manuel
- ✅ Sécurité : production isolée de dev

## API de configuration

### GET /api/auth/oauth/config

**Request** :
```http
GET /api/auth/oauth/config HTTP/1.1
Host: neosaas.com
```

**Response (GitHub actif)** :
```json
{
  "github": true,
  "google": false
}
```

**Response (Aucun provider actif)** :
```json
{
  "github": false,
  "google": false
}
```

**Headers** :
- `Cache-Control: no-cache, no-store, must-revalidate`
- `Pragma: no-cache`
- `Expires: 0`

**Code source** : `app/api/auth/oauth/config/route.ts`

### Logique de filtrage

```typescript
const oauthConfigs = await db
  .select({
    serviceName: serviceApiConfigs.serviceName,
    isActive: serviceApiConfigs.isActive,
  })
  .from(serviceApiConfigs)
  .where(
    and(
      eq(serviceApiConfigs.serviceType, 'oauth'),    // Type OAuth uniquement
      eq(serviceApiConfigs.isActive, true),          // Actif uniquement
      eq(serviceApiConfigs.environment, 'production') // Production uniquement
    )
  );
```

## Checklist de vérification

### Pour activer un provider OAuth

- [ ] OAuth App créée sur GitHub/Google
- [ ] Client ID obtenu
- [ ] Client Secret obtenu
- [ ] Callback URL copié depuis `/admin/api`
- [ ] Callback URL ajouté dans GitHub/Google OAuth App
- [ ] Credentials sauvegardés dans `/admin/api`
- [ ] `isActive = true`
- [ ] `environment = 'production'`
- [ ] Test : bouton apparaît sur `/auth/login`
- [ ] Test : bouton apparaît sur `/auth/register`
- [ ] Test : clic redirige vers GitHub/Google
- [ ] Test : autorisation et retour vers l'app
- [ ] Test : utilisateur créé/connecté automatiquement

### Pour désactiver un provider OAuth

- [ ] Aller sur `/admin/api`
- [ ] Trouver la config du provider
- [ ] Éditer et mettre `isActive = false` OU
- [ ] Supprimer la configuration complètement
- [ ] Vérifier : bouton disparaît sur `/auth/login`
- [ ] Vérifier : bouton disparaît sur `/auth/register`

## Dépannage

### Le bouton n'apparaît pas sur login/register

**Vérifications** :
1. ✅ Config existe dans DB ? `SELECT * FROM service_api_configs WHERE serviceName = 'github'`
2. ✅ `isActive = true` ?
3. ✅ `environment = 'production'` ?
4. ✅ `serviceType = 'oauth'` ?
5. ✅ API retourne le provider ? `GET /api/auth/oauth/config`
6. ✅ Console browser : `oauthConfig` a la bonne valeur ?

**Solution** :
- Si config manquante → Créer via `/admin/api`
- Si `isActive = false` → Mettre à true
- Si environment = dev → Changer en production
- Si API ne retourne pas le provider → Vérifier logs backend

### Le bouton apparaît mais le clic ne fait rien

**Cause** : Bug corrigé dans [OAUTH_REGISTER_PAGE_FIX.md](../troubleshooting/OAUTH_REGISTER_PAGE_FIX.md)

**Vérification** :
- États de chargement présents ? `isGithubLoading`, `isGoogleLoading`
- Toast apparaît ? "Redirecting to GitHub..."
- Console errors ?

**Solution** : Appliquer le fix du document OAUTH_REGISTER_PAGE_FIX.md

### Les credentials ne fonctionnent pas

**Vérifications** :
1. ✅ Client ID correct ? Format : `Iv1.xxxxxxxxx` ou `Ov2xxxxxxxxx`
2. ✅ Client Secret correct ?
3. ✅ Callback URL identique entre NeoSaaS et GitHub/Google ?
4. ✅ OAuth App enabled sur GitHub/Google ?

**Test** : Utiliser le bouton "Verify Key" dans `/admin/api`

## Fichiers concernés

### Frontend
- `app/auth/login/page.tsx` - Page login avec boutons OAuth
- `app/auth/register/page.tsx` - Page register avec boutons OAuth
- `app/(private)/admin/api/page.tsx` - Configuration admin OAuth

### Backend
- `app/api/auth/oauth/config/route.ts` - API config publique
- `app/api/auth/oauth/github/route.ts` - Redirect GitHub
- `app/api/auth/oauth/google/route.ts` - Redirect Google
- `app/api/auth/oauth/github/callback/route.ts` - Callback GitHub
- `app/api/auth/oauth/google/callback/route.ts` - Callback Google

### Database
- `db/schema.ts` - Table `service_api_configs`
- Champ `serviceName`: "github" | "google"
- Champ `serviceType`: "oauth"
- Champ `isActive`: boolean
- Champ `environment`: "production" | "development"

## Nouvelles règles (version 2.0)

### Règle 1 : Activation par défaut

Quand un admin sauvegarde une config OAuth :
- ✅ `isActive = true` par défaut
- ✅ `environment = 'production'` par défaut
- ✅ Boutons apparaissent immédiatement

### Règle 2 : Cache désactivé

L'API `/api/auth/oauth/config` :
- ✅ `dynamic = 'force-dynamic'`
- ✅ `revalidate = 0`
- ✅ Headers no-cache
- ✅ Changements immédiats (< 1s)

### Règle 3 : Sécurité credentials

- ✅ Client ID/Secret JAMAIS envoyés au frontend
- ✅ Encryption AES-256-GCM en base de données
- ✅ API publique retourne uniquement `true/false`
- ✅ Credentials visibles uniquement pour admin

### Règle 4 : Permissions granulaires

| Action | User | Admin |
|--------|------|-------|
| Voir boutons OAuth | ✅ | ✅ |
| Cliquer sur OAuth | ✅ | ✅ |
| Voir config OAuth | ❌ | ✅ |
| Modifier config | ❌ | ✅ |
| Activer/Désactiver | ❌ | ✅ |
| Supprimer config | ❌ | ✅ |

## Résumé

**En bref** : Les boutons GitHub/Google OAuth sur login/register apparaissent automatiquement quand un admin configure les credentials dans `/admin/api` et que `isActive = true` + `environment = 'production'`.

**Contrôle** : L'admin a un contrôle total via le toggle `isActive` pour activer/désactiver instantanément les connexions sociales sans toucher au code.

**Sécurité** : Les credentials ne quittent jamais le backend, sont encryptés en base, et l'API publique ne retourne qu'un boolean.

---

**Documentation connexe** :
- [OAuth Architecture v3](./OAUTH_ARCHITECTURE.md)
- [OAuth Register Page Fix](../troubleshooting/OAUTH_REGISTER_PAGE_FIX.md)
- [GitHub OAuth Integration](../GITHUB_API_INTEGRATION.md)
