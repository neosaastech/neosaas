# Configuration Manuelle GitHub OAuth

> 📣 **Ce guide est toujours valide pour v3.0 !**
>
> ### Nouveautés v3.0 (2026-01-23) :
> - 🔐 **Cryptage automatique** AES-256-GCM lors de la sauvegarde
> - ✅ **Support multi-format** Client ID (Iv1., Ov1, Ov2, Ov23)
> - 📊 **Logging automatique** de toutes les opérations OAuth
> - 🎨 **UX améliorée** avec feedback visuel et messages clairs
>
> **[Voir Architecture v3.0 complète](./GITHUB_OAUTH_ARCHITECTURE_V3.md)**

---

## 🎯 Guide Rapide

> ⚠️ **Important** : L'API GitHub ne permet pas la création automatique d'OAuth Apps. La configuration doit être faite manuellement.

---

## 📋 Prérequis

- Accès administrateur au compte GitHub / Organisation
- Accès administrateur à l'interface NeoSaaS `/admin/api`
- URL de production ou de staging

---

## 🔧 Étape 1 : Créer l'OAuth App sur GitHub

### Pour une Organisation

1. **Aller sur la page OAuth Apps de l'organisation** :
   ```
   https://github.com/organizations/VOTRE_ORG/settings/applications
   ```
   Remplacer `VOTRE_ORG` par le nom de votre organisation (ex: `NEOMIA`)

2. **Cliquer sur "New OAuth App"**

3. **Remplir le formulaire** :

   | Champ | Valeur |
   |-------|--------|
   | **Application name** | `NeoSaaS Production` ou `NeoSaaS Staging` |
   | **Homepage URL** | `https://votre-domaine.com` |
   | **Authorization callback URL** | `https://votre-domaine.com/api/auth/oauth/github/callback` |
   | **Application description** (optionnel) | "OAuth authentication for NeoSaaS platform" |

   **Exemples** :
   - Production : `https://neosaas.com/api/auth/oauth/github/callback`
   - Staging : `https://staging.neosaas.com/api/auth/oauth/github/callback`

4. **Cliquer sur "Register application"**

### Pour un Compte Personnel

1. **Aller sur** : https://github.com/settings/developers

2. **Cliquer sur "OAuth Apps"** dans le menu latéral

3. **Cliquer sur "New OAuth App"**

4. Suivre les mêmes étapes que ci-dessus

---

## 🔑 Étape 2 : Récupérer les Credentials

1. **Client ID** :
   - Visible directement sur la page de l'app
   - Format : `Ov23liABC123XYZ` (exemple)
   - ✅ Peut être vu à tout moment

2. **Client Secret** :
   - ⚠️ **IMPORTANT** : Le secret n'est affiché qu'**UNE SEULE FOIS**
   - Cliquer sur **"Generate a new client secret"**
   - **Copier immédiatement** le secret généré
   - Le stocker temporairement dans un endroit sûr (gestionnaire de mots de passe)

### Format des Credentials

```
Client ID: Ov23liABC123XYZ
Client Secret: ghp_abc123def456ghi789jkl012mno345pqr678
```

---

## 💾 Étape 3 : Stocker en Base de Données

### Option A : Via l'Interface Admin (Recommandé)

1. **Se connecter à NeoSaaS** en tant qu'administrateur

2. **Aller sur** `/admin/api`

3. **Chercher "GitHub OAuth"** dans la liste des services

4. **Cliquer sur "Configurer"**

5. **Entrer les credentials** :
   - Coller le **Client ID**
   - Coller le **Client Secret**
   - Le **Callback URL** est généré automatiquement

6. **Cliquer sur "Enregistrer"**

7. **Vérifier** que le statut passe à "Actif" ✅

### Option B : Via SQL (Avancé)

Si l'interface admin n'est pas disponible, vous pouvez insérer directement en BDD :

```sql
INSERT INTO service_api_configs (
  service_name,
  service_type,
  environment,
  is_active,
  is_default,
  config,
  metadata,
  created_at,
  updated_at
) VALUES (
  'github',
  'oauth',
  'production', -- ou 'staging', 'development'
  true,
  true,
  jsonb_build_object(
    'clientId', 'VOTRE_CLIENT_ID',
    'clientSecret', 'VOTRE_CLIENT_SECRET'
  ),
  jsonb_build_object(
    'callbackUrl', 'https://votre-domaine.com/api/auth/oauth/github/callback',
    'baseUrl', 'https://votre-domaine.com',
    'createdVia', 'manual-sql'
  ),
  NOW(),
  NOW()
)
ON CONFLICT (service_name, environment)
DO UPDATE SET
  config = EXCLUDED.config,
  metadata = EXCLUDED.metadata,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
```

**Remplacer** :
- `VOTRE_CLIENT_ID` par le Client ID récupéré
- `VOTRE_CLIENT_SECRET` par le Client Secret récupéré
- `https://votre-domaine.com` par votre URL de production

---

## ✅ Étape 4 : Tester la Configuration

### Test 1 : Vérifier la Configuration en BDD

```sql
SELECT 
  service_name,
  environment,
  is_active,
  config->>'clientId' as client_id,
  metadata->>'callbackUrl' as callback_url,
  created_at
FROM service_api_configs
WHERE service_name = 'github'
  AND environment = 'production';
```

**Résultat attendu** :
```
service_name | environment | is_active | client_id       | callback_url                                    | created_at
-------------|-------------|-----------|-----------------|------------------------------------------------|-------------------
github       | production  | true      | Ov23liABC123XYZ | https://neosaas.com/api/auth/oauth/github/callback | 2026-01-12 10:30:00
```

### Test 2 : Accéder à la Page de Login

1. **Aller sur** `/auth/login`

2. **Vérifier** la présence du bouton **"Se connecter avec GitHub"**

3. **Cliquer** sur le bouton

4. **Vous devriez être redirigé** vers :
   ```
   https://github.com/login/oauth/authorize?
     client_id=Ov23liABC123XYZ&
     redirect_uri=https://votre-domaine.com/api/auth/oauth/github/callback&
     scope=read:user%20user:email&
     state=abc123...
   ```

5. **Autoriser l'application** sur GitHub

6. **Vous devriez être redirigé** vers votre dashboard NeoSaaS, connecté ✅

### Test 3 : Vérifier la Connexion en BDD

```sql
SELECT 
  u.email,
  oc.provider,
  oc.provider_user_id,
  oc.created_at
FROM oauth_connections oc
JOIN users u ON u.id = oc.user_id
WHERE oc.provider = 'github'
ORDER BY oc.created_at DESC
LIMIT 5;
```

---

## 🔍 Dépannage

### Erreur : "OAuth App not found"

**Cause** : L'OAuth App n'existe pas sur GitHub ou le Client ID est incorrect.

**Solution** :
1. Vérifier que l'OAuth App existe sur GitHub
2. Vérifier le Client ID dans `/admin/api`
3. Re-copier le Client ID si nécessaire

### Erreur : "Invalid client secret"

**Cause** : Le Client Secret est incorrect ou a expiré.

**Solution** :
1. Générer un nouveau Client Secret sur GitHub
2. Mettre à jour le secret dans `/admin/api`

### Erreur : "Redirect URI mismatch" ou "The redirect_uri is not associated with this application"

**Cause** : Le callback URL configuré dans l'OAuth App ne correspond pas à celui utilisé par NeoSaaS.

Cette erreur se produit quand :
- Le callback URL dans GitHub OAuth App est incomplet (ex: `https://neo-saas-website-no7ezxrr` au lieu de `https://neo-saas-website-no7ezxrr.vercel.app/api/auth/oauth/github/callback`)
- Le callback URL contient un slash `/` à la fin
- Le protocole est incorrect (HTTP au lieu de HTTPS)
- Le domaine est incorrect

**Solution** :
1. **Trouver votre callback URL complet** :
   - Option 1 : Aller sur `/admin/api`, sélectionner GitHub OAuth, et COPIER l'URL de callback affichée
   - Option 2 : Utiliser : `https://[VOTRE-DOMAINE-COMPLET]/api/auth/oauth/github/callback`

2. **Vérifier et corriger dans GitHub** :
   - Aller sur https://github.com/settings/developers
   - Cliquer sur votre OAuth App
   - Dans le champ "Authorization callback URL", coller **EXACTEMENT** l'URL complète
   - Il doit être **EXACTEMENT** : `https://votre-domaine-complet.com/api/auth/oauth/github/callback`
   - ⚠️ Pas de slash `/` à la fin
   - ⚠️ HTTPS obligatoire (sauf localhost)
   - ⚠️ Doit inclure le chemin complet `/api/auth/oauth/github/callback`

3. **Exemples de callback URL CORRECTS** :
   ```
   ✅ https://neosaas.com/api/auth/oauth/github/callback
   ✅ https://staging.neosaas.com/api/auth/oauth/github/callback
   ✅ https://neo-saas-website-no7ezxrr.vercel.app/api/auth/oauth/github/callback
   ✅ http://localhost:3000/api/auth/oauth/github/callback
   ```

4. **Exemples de callback URL INCORRECTS** :
   ```
   ❌ https://neosaas.com (pas de chemin)
   ❌ https://neo-saas-website-no7ezxrr (domaine incomplet)
   ❌ https://neosaas.com/api/auth/oauth/github/callback/ (slash à la fin)
   ❌ http://neosaas.com/api/auth/oauth/github/callback (HTTP au lieu de HTTPS)
   ```

5. **Sauvegarder les changements** sur GitHub et réessayer la connexion

### Erreur : "CSRF state mismatch"

**Cause** : Le cookie de session a expiré ou a été supprimé.

**Solution** :
1. Vider les cookies du navigateur
2. Réessayer la connexion
3. Vérifier que les cookies sont autorisés

---

## 📚 Ressources

- **Documentation GitHub OAuth** : https://docs.github.com/en/apps/oauth-apps/building-oauth-apps
- **Guide NeoSaaS OAuth (détaillé)** : [OAUTH_DATABASE_CONFIG.md](./OAUTH_DATABASE_CONFIG.md)
- **Implémentation technique** : [OAUTH_NO_ENV_IMPLEMENTATION.md](./OAUTH_NO_ENV_IMPLEMENTATION.md)

---

## 🔒 Sécurité

### Bonnes Pratiques

✅ **Stocker le Client Secret en sécurité** :
- Utiliser un gestionnaire de mots de passe
- Ne jamais commiter dans Git
- Ne jamais partager par email/Slack

✅ **Renouveler régulièrement** :
- Générer un nouveau Client Secret tous les 6-12 mois
- Mettre à jour dans NeoSaaS immédiatement

✅ **Restreindre l'accès** :
- Seuls les admins doivent avoir accès à `/admin/api`
- Utiliser des rôles RBAC pour limiter les accès

✅ **Monitoring** :
- Surveiller les connexions OAuth dans les logs
- Détecter les tentatives de connexion suspectes

---

## ✨ Prochaines Étapes

Après la configuration :

1. **Ajouter le bouton de connexion** dans [/auth/login](../app/(public)/auth/login/page.tsx)
2. **Tester en production** avec plusieurs utilisateurs
3. **Configurer les autres environnements** (staging, development)
4. **Documenter pour l'équipe** les procédures de maintenance

---

**Configuration terminée !** 🎉

Vous pouvez maintenant utiliser l'authentification GitHub sur NeoSaaS.
