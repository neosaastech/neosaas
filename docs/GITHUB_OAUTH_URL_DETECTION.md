# 🌐 Détection Automatique de l'URL - Configuration GitHub OAuth

## Comment l'Application Récupère son URL

L'application **détecte automatiquement** son URL publique sans configuration manuelle supplémentaire. Voici comment :

### 1. Sources d'URL (par ordre de priorité)

```typescript
// Dans l'API Route
const siteUrl = process.env.NEXT_PUBLIC_APP_URL    // 1️⃣ Priorité haute
               || process.env.VERCEL_URL            // 2️⃣ Auto sur Vercel
               || request.headers.get("host");       // 3️⃣ Fallback
```

#### 1️⃣ **NEXT_PUBLIC_APP_URL** (Recommandé)

**Avantages** :
- ✅ URL stable et prévisible
- ✅ Fonctionne en production et preview
- ✅ Pas de surprise avec les URLs générées par Vercel

**Configuration** :
```bash
vercel env add NEXT_PUBLIC_APP_URL
# Collez : https://votre-domaine.com
```

**Quand l'utiliser** :
- Production avec domaine personnalisé
- Vous voulez contrôler l'URL exacte
- Recommandé pour tous les environnements

---

#### 2️⃣ **VERCEL_URL** (Automatique sur Vercel)

**Avantages** :
- ✅ Fourni automatiquement par Vercel
- ✅ Pas besoin de configuration
- ✅ S'adapte aux deployments de preview

**Formats** :
```
Production     : votre-projet.vercel.app
Preview        : votre-projet-git-branch-user.vercel.app
Development    : localhost:3000
```

**Quand l'utiliser** :
- Développement rapide
- Tests de preview
- Si vous n'avez pas de domaine personnalisé

**⚠️ Attention** :
- L'URL change à chaque preview
- Nécessite de reconfigurer GitHub OAuth pour chaque branche
- Pas recommandé pour la production

---

#### 3️⃣ **Header `host`** (Fallback)

**Fonctionnement** :
```typescript
const host = request.headers.get("host");
// Exemples :
// - localhost:3000
// - votre-domaine.com
// - staging.votre-domaine.com
```

**Quand c'est utilisé** :
- Ni `NEXT_PUBLIC_APP_URL` ni `VERCEL_URL` définis
- Développement local
- Serveur custom (non Vercel)

**⚠️ Limitations** :
- Peut ne pas avoir de protocole HTTPS
- Nécessite une transformation : `https://${host}`

---

## 2. Exemples par Environnement

### Production avec Domaine Personnalisé

**Recommandation** : Utilisez `NEXT_PUBLIC_APP_URL`

```bash
# .env.production ou Vercel Settings
NEXT_PUBLIC_APP_URL="https://neosaas.tech"
```

**Résultat** :
- OAuth App URL : `https://neosaas.tech`
- Callback URL : `https://neosaas.tech/api/auth/callback/github`

---

### Preview Deployments (Branches)

**Option 1 : URL dynamique Vercel** (pas besoin de config)
```bash
# Vercel fournit automatiquement
VERCEL_URL="neosaas-git-feature-branch.vercel.app"
```

**Résultat** :
- OAuth App URL : `https://neosaas-git-feature-branch.vercel.app`
- ⚠️ Nécessite de reconfigurer GitHub OAuth pour chaque branche

**Option 2 : Domaine de staging fixe** (recommandé)
```bash
NEXT_PUBLIC_APP_URL="https://staging.neosaas.tech"
```

**Résultat** :
- OAuth App URL : `https://staging.neosaas.tech`
- ✅ Configuration GitHub OAuth stable

---

### Développement Local

**Sans configuration** :
```bash
# Header host sera : localhost:3000
# URL détectée : https://localhost:3000 ❌ Ne fonctionnera pas pour OAuth
```

**Avec configuration** :
```bash
# .env.local
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Résultat** :
- OAuth App URL : `http://localhost:3000`
- ✅ Fonctionne pour les tests locaux

**⚠️ Note** : GitHub OAuth en local nécessite :
1. Une OAuth App configurée avec `http://localhost:3000/api/auth/callback/github`
2. Ou utiliser un tunnel (ngrok, Cloudflare Tunnel)

---

## 3. Configuration Recommandée

### Pour la Production

```bash
# Vercel Settings → Environment Variables
NEXT_PUBLIC_APP_URL="https://neosaas.tech"  # Production
```

### Pour le Staging

```bash
# Vercel Settings → Environment Variables → Preview
NEXT_PUBLIC_APP_URL="https://staging.neosaas.tech"  # Staging/Preview
```

### Pour le Développement

```bash
# .env.local (Ne jamais commiter)
NEXT_PUBLIC_APP_URL="http://localhost:3000"  # Local
```

---

## 4. Vérifier l'URL Détectée

### Via l'API

```bash
# L'URL sera automatiquement détectée
curl https://VOTRE-DOMAINE/api/admin/configure-github-oauth

# Exemple de réponse :
{
  "configured": true,
  "vercelConfigured": true,
  "clientId": "Iv1.8a..."
}
```

### Via les Logs Serveur

Lors de la configuration, les logs montrent l'URL utilisée :

```bash
vercel logs --follow

# Recherchez :
# 🔧 Création de l'OAuth App GitHub...
# URL détectée : https://neosaas.tech
# Callback URL : https://neosaas.tech/api/auth/callback/github
```

---

## 5. Problèmes Courants

### ❌ OAuth App créée avec URL de preview

**Symptôme** :
```
OAuth App URL : https://neosaas-git-feat.vercel.app
```

**Cause** : `NEXT_PUBLIC_APP_URL` non défini

**Solution** :
```bash
vercel env add NEXT_PUBLIC_APP_URL
# Collez : https://neosaas.tech

vercel deploy --prod
```

---

### ❌ URL avec `localhost` en production

**Symptôme** :
```
OAuth App URL : http://localhost:3000
```

**Cause** : Variable `.env.local` utilisée en production

**Solution** :
1. Ne jamais commiter `.env.local`
2. Définir `NEXT_PUBLIC_APP_URL` dans Vercel
3. Vérifier `.gitignore` :
```
.env.local
.env*.local
```

---

### ❌ Callback URL incorrecte

**Symptôme** :
```
redirect_uri_mismatch
```

**Cause** : URL configurée différente de l'URL d'exécution

**Solution** :
1. Vérifier l'URL dans GitHub OAuth App Settings
2. S'assurer que `NEXT_PUBLIC_APP_URL` correspond
3. Reconfigurer via `/admin/api-management`

---

## 6. Commandes de Vérification

### Voir les Variables d'Environnement

```bash
# Lister les variables Vercel
vercel env ls

# Voir une variable spécifique
vercel env pull .env.production
grep NEXT_PUBLIC_APP_URL .env.production
```

### Tester la Détection d'URL

```typescript
// Ajouter temporairement dans l'API Route
console.log('NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
console.log('VERCEL_URL:', process.env.VERCEL_URL);
console.log('Host header:', request.headers.get('host'));
```

### Curl avec Header Host

```bash
# Simuler un domaine différent
curl -H "Host: test.neosaas.tech" \
  https://neosaas.tech/api/admin/configure-github-oauth
```

---

## 7. Bonnes Pratiques

### ✅ À Faire

1. **Toujours définir `NEXT_PUBLIC_APP_URL`** en production
2. **Utiliser HTTPS** en production
3. **Séparer les environnements** (production, staging, local)
4. **Tester après chaque changement** d'URL
5. **Documenter** les URLs configurées

### ❌ À Éviter

1. **Ne pas** compter sur `VERCEL_URL` en production
2. **Ne pas** commiter `.env.local`
3. **Ne pas** utiliser des URLs temporaires
4. **Ne pas** oublier le protocole (`https://`)
5. **Ne pas** utiliser localhost en production

---

## 8. Résumé

| Environnement | Variable Recommandée | Exemple |
|---------------|----------------------|---------|
| **Production** | `NEXT_PUBLIC_APP_URL` | `https://neosaas.tech` |
| **Staging** | `NEXT_PUBLIC_APP_URL` | `https://staging.neosaas.tech` |
| **Preview** | `VERCEL_URL` (auto) | `project-git-branch.vercel.app` |
| **Local** | `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |

---

## 9. Migration depuis une URL Codée en Dur

Si vous aviez une URL codée en dur (ex: `https://neosaas.tech`), voici comment migrer :

### 1. Ajouter la Variable

```bash
vercel env add NEXT_PUBLIC_APP_URL
# Collez : https://neosaas.tech
```

### 2. Supprimer le Code en Dur

```typescript
// ❌ Avant
const baseUrl = "https://neosaas.tech";

// ✅ Après
const siteUrl = process.env.NEXT_PUBLIC_APP_URL 
               || process.env.VERCEL_URL 
               || request.headers.get("host");
const baseUrl = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
```

### 3. Redéployer

```bash
vercel deploy --prod
```

### 4. Vérifier

```bash
curl https://votre-domaine/api/admin/configure-github-oauth
```

---

**Date** : 21 janvier 2026  
**Version** : 1.0.0  
**Dernière mise à jour** : 21 janvier 2026
