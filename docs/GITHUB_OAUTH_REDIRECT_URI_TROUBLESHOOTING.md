# GitHub OAuth - Dépannage "redirect_uri not associated"

**Date**: 2026-01-23  
**Erreur**: `The redirect_uri is not associated with this application`  
**Statut**: 🔧 Guide de dépannage

---

## 🎯 Comprendre l'erreur

Cette erreur signifie que l'URL de callback (redirect_uri) que votre application envoie à GitHub **ne correspond PAS exactement** à celle configurée dans votre GitHub OAuth App.

### Pourquoi cette erreur se produit

GitHub compare **caractère par caractère** :
- ✅ `https://www.neosaas.tech/api/auth/oauth/github/callback` = `https://www.neosaas.tech/api/auth/oauth/github/callback`
- ❌ `https://neosaas.tech/api/auth/oauth/github/callback` ≠ `https://www.neosaas.tech/api/auth/oauth/github/callback` (www manquant)
- ❌ `https://www.neosaas.tech/api/auth/oauth/github/callback/` ≠ `https://www.neosaas.tech/api/auth/oauth/github/callback` (slash final)
- ❌ `http://www.neosaas.tech/api/auth/oauth/github/callback` ≠ `https://www.neosaas.tech/api/auth/oauth/github/callback` (http vs https)

---

## 🔍 Checklist de diagnostic

### Étape 1 : Vérifier la configuration GitHub OAuth App

1. **Allez sur** : https://github.com/settings/developers
2. **Cliquez sur votre OAuth App** (Client ID: `Ov23licqdRXt8oc0sqqQ`)
3. **Notez l'"Authorization callback URL"** configurée

### Étape 2 : Vérifier la configuration en base de données

1. **Connectez-vous à votre admin** : https://www.neosaas.tech/admin/api
2. **Section "GitHub OAuth Configuration"**
3. **Vérifiez les 3 valeurs** :
   ```
   Client ID: Ov23licqdRXt8oc0sqqQ
   Client Secret: 1899059a069decd1f582d05b3aac7159773c638b
   Callback URL: https://www.neosaas.tech/api/auth/oauth/github/callback
   ```

### Étape 3 : Vérifier les logs de l'application

Lors de l'initiation OAuth, votre application log l'URL utilisée. Recherchez dans les logs :

```
✅ [GitHub OAuth] Redirection vers GitHub
   - Client ID: Ov23licqdR...
   - Callback URL (redirect_uri): https://...
```

**Cette URL doit correspondre EXACTEMENT à celle configurée sur GitHub.**

---

## 🛠️ Solutions selon les cas

### Cas 1 : Le domaine est différent

**Symptôme** : Vous utilisez `neosaas.tech` mais l'app est déployée sur `www.neosaas.tech`

**Solution** :
1. Déterminez votre URL de production exacte
2. Allez sur GitHub : https://github.com/settings/developers
3. Modifiez l'"Authorization callback URL" pour qu'elle corresponde

**Ou inversement** :
1. Allez sur `/admin/api`
2. Modifiez le "Callback URL" pour correspondre à GitHub

### Cas 2 : Variable d'environnement manquante ou incorrecte

**Symptôme** : Le système construit l'URL à partir de `NEXT_PUBLIC_APP_URL`

**Vérification** :
```bash
# Vérifiez que cette variable existe et est correcte
echo $NEXT_PUBLIC_APP_URL
# Devrait afficher : https://www.neosaas.tech
```

**Solution si manquante sur Vercel** :
1. Allez sur : https://vercel.com/neosaastech/neosaas-website/settings/environment-variables
2. Ajoutez `NEXT_PUBLIC_APP_URL` = `https://www.neosaas.tech`
3. Redéployez l'application

### Cas 3 : Multiples domaines (preview vs production)

**Problème** : GitHub OAuth Apps n'acceptent qu'une seule callback URL

**Solution** : Créez **2 OAuth Apps séparées** :

| Environnement | GitHub OAuth App | Callback URL |
|---------------|------------------|--------------|
| **Production** | "NeoSaaS Production" | `https://www.neosaas.tech/api/auth/oauth/github/callback` |
| **Preview** | "NeoSaaS Preview" | `https://preview.neosaas.tech/api/auth/oauth/github/callback` |

Ensuite, configurez conditionnellement selon l'environnement.

---

## ✅ Test de validation

### Test manuel complet

1. **Videz les cookies** de votre navigateur
2. **Allez sur** : https://www.neosaas.tech/auth/login
3. **Cliquez sur** "Se connecter avec GitHub"
4. **Observez l'URL GitHub** :
   ```
   https://github.com/login/oauth/authorize?
     client_id=Ov23licqdRXt8oc0sqqQ&
     redirect_uri=https://www.neosaas.tech/api/auth/oauth/github/callback&
     scope=read:user%20user:email&
     state=...
   ```
5. **Vérifiez** que le `redirect_uri` dans l'URL correspond EXACTEMENT à celui configuré sur GitHub

### Commande de test (optionnel)

Si vous avez accès à la base de données, vérifiez la configuration :

```sql
SELECT 
  service_name,
  environment,
  config,
  metadata
FROM service_api_configs
WHERE service_name = 'github'
  AND environment = 'production';
```

Le `metadata.callbackUrl` doit être : `https://www.neosaas.tech/api/auth/oauth/github/callback`

---

## 🔧 Configuration correcte (Référence)

### Sur GitHub (https://github.com/settings/developers)

```
Application name: NeoSaaS (ou votre nom)
Homepage URL: https://www.neosaas.tech
Authorization callback URL: https://www.neosaas.tech/api/auth/oauth/github/callback

Client ID: Ov23licqdRXt8oc0sqqQ
Client secret: [Cliquez pour afficher]
```

### Dans votre base de données (via /admin/api)

```json
{
  "serviceName": "github",
  "environment": "production",
  "config": {
    "clientId": "Ov23licqdRXt8oc0sqqQ",
    "clientSecret": "1899059a069decd1f582d05b3aac7159773c638b"
  },
  "metadata": {
    "callbackUrl": "https://www.neosaas.tech/api/auth/oauth/github/callback",
    "baseUrl": "https://www.neosaas.tech"
  }
}
```

### Variables d'environnement (Vercel)

```env
NEXT_PUBLIC_APP_URL=https://www.neosaas.tech
NEXTAUTH_URL=https://www.neosaas.tech
```

---

## 🚨 Erreurs courantes

### 1. Slash final (`/`)

❌ **Incorrect** : `https://www.neosaas.tech/api/auth/oauth/github/callback/`  
✅ **Correct** : `https://www.neosaas.tech/api/auth/oauth/github/callback`

### 2. Présence/absence de `www`

Décidez d'une convention et utilisez-la **partout** :
- **Avec www** : `https://www.neosaas.tech`
- **Sans www** : `https://neosaas.tech`

### 3. HTTP vs HTTPS

En production, utilisez **TOUJOURS HTTPS** :
❌ `http://www.neosaas.tech`  
✅ `https://www.neosaas.tech`

### 4. Callback URL relative vs absolue

Dans la BDD, l'URL doit être **absolue** (commençant par `https://`) :
❌ `/api/auth/oauth/github/callback`  
✅ `https://www.neosaas.tech/api/auth/oauth/github/callback`

---

## 📊 Logs de débogage

Votre application log automatiquement les informations OAuth. Vérifiez dans les logs Vercel :

```bash
# Lors de l'initiation OAuth
🔐 [GitHub OAuth] Initiation de l'authentification
✅ [GitHub OAuth] Redirection vers GitHub
   - Client ID: Ov23licqdR...
   - Callback URL (redirect_uri): https://www.neosaas.tech/api/auth/oauth/github/callback
   - State: abc12345...
⚠️  [GitHub OAuth] IMPORTANT: This callback URL must EXACTLY match...

# Lors du callback
🔄 [GitHub OAuth Callback] Réception du callback
📋 [GitHub OAuth Callback] Configuration loaded:
   - Client ID: Ov23licqdR...
   - Callback URL: https://www.neosaas.tech/api/auth/oauth/github/callback
   - Expected callback: https://www.neosaas.tech/api/auth/oauth/github/callback
```

Si vous voyez un mismatch entre "Callback URL" et "Expected callback", c'est là qu'est le problème.

---

## 🎯 Action immédiate recommandée

### Scénario le plus probable

Vous utilisez probablement **Vercel Preview Deployments** et le système construit l'URL à partir du domaine de la preview au lieu du domaine de production.

**Solution rapide** :

1. Allez sur `/admin/api` sur votre **site de production** : `https://www.neosaas.tech/admin/api`
2. Dans "GitHub OAuth Configuration", remplissez :
   - **Callback URL** : `https://www.neosaas.tech/api/auth/oauth/github/callback` (URL COMPLÈTE)
3. Sauvegardez
4. Retestez

Cela forcera le système à utiliser cette URL absolue au lieu de la construire dynamiquement.

---

## 📞 Support supplémentaire

Si le problème persiste :

1. **Vérifiez les logs Vercel** : https://vercel.com/neosaastech/neosaas-website/logs
2. **Recherchez** : `[GitHub OAuth]` pour voir les URLs réellement utilisées
3. **Comparez** avec la configuration GitHub
4. **Documentez** les URLs exactes dans les deux endroits

---

## ✅ Validation finale

Une fois configuré correctement, vous devriez voir :

1. ✅ Redirection vers GitHub sans erreur
2. ✅ Page d'autorisation GitHub s'affiche
3. ✅ Après autorisation, redirection vers votre site
4. ✅ Connexion réussie

**Test en mode incognito** pour éviter les problèmes de cache.

---

## 📚 Ressources

- [GitHub OAuth Apps Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Architecture OAuth du projet](./ACTION_LOG.md#2026-01-23---github-oauth-complete-overhaul-encryption--ux--logging-)
- [Guide de configuration manuel](./GITHUB_OAUTH_MANUAL_SETUP.md)
