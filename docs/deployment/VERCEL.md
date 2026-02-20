# 🚀 Déploiement Production

> **Guide complet pour déployer NeoSaaS sur Vercel**

---

## 🎯 Vue d'Ensemble

Ce guide couvre le déploiement complet de NeoSaaS sur Vercel avec :
- Base de données PostgreSQL (Neon/Supabase)
- Configuration automatique
- Variables d'environnement
- Domaine personnalisé

---

## 📋 Prérequis

- [ ] Compte Vercel ([créer](https://vercel.com/signup))
- [ ] Compte GitHub
- [ ] Base de données PostgreSQL production
- [ ] Credentials services (Email, OAuth, Lago)

---

## 🚀 Déploiement Express

### 1. Connecter Projet à Vercel

**Option A: Via Interface Web**

1. Aller sur https://vercel.com/new
2. Importer depuis GitHub : `neosaastech/neosaas-website`
3. Configure project (voir étape 2)
4. Deploy

**Option B: Via CLI**

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Déployer
vercel
```

### 2. Configuration Variables d'Environnement

**Dans Vercel Dashboard** → Project → Settings → Environment Variables

**Variables requises** :

```env
# Database — Neon (poolée pour l'app, directe pour les migrations)
DATABASE_URL=postgresql://neondb_owner:PASSWORD@ep-XXXX-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
DATABASE_URL_UNPOOLED=postgresql://neondb_owner:PASSWORD@ep-XXXX.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Auth
NEXTAUTH_SECRET=your-32-char-secret
NEXTAUTH_URL=https://your-domain.vercel.app

# Email (choisir 1)
RESEND_API_KEY=re_...
# ou
SCALEWAY_SECRET_KEY=...
SCALEWAY_PROJECT_ID=...

# Lago (optionnel)
LAGO_API_KEY=...
LAGO_API_URL=https://api.getlago.com
```

> **Neon — deux URLs nécessaires** :
> - `DATABASE_URL` : URL **poolée** (pgBouncer, port 5432) — utilisée par l'application Next.js
> - `DATABASE_URL_UNPOOLED` : URL **directe** (endpoint Neon, port 5432) — utilisée par les migrations Drizzle (DDL incompatible avec le pooler)
>
> Dans l'URL poolée, le hostname contient `-pooler`. Retirez `-pooler` pour obtenir l'URL directe.

> **Preview & Development** : Si `DATABASE_URL` est absente dans ces environnements, le build continue sans appliquer les migrations (warning non-bloquant). Ajoutez les variables pour activer les migrations sur ces environnements.

**Documentation complète** : [`ENVIRONMENT_VARIABLES.md`](./ENVIRONMENT_VARIABLES.md)

### 3. Déployer

```bash
# CLI
vercel --prod

# Ou via push GitHub (auto-deploy)
git push origin main
```

---

## ⚙️ Configuration Avancée

### Mise à jour automatique du schéma

**Par défaut** : Le schéma est mis à jour automatiquement à chaque build via `drizzle-kit push --force --verbose`.

**Comportement actuel** :
- `drizzle-kit push` compare `db/schema.ts` avec la base de données
- Les nouvelles tables/colonnes sont créées automatiquement
- Les données existantes sont **préservées**

**Configuration requise** dans `vercel.json` :
```json
{
  "buildCommand": "bash scripts/build-with-db.sh"
}
```

> **Note** : Sans `buildCommand`, Vercel peut bypasser `build-with-db.sh` et exécuter `next build` directement, empêchant la mise à jour du schéma.

### Domaine Personnalisé

1. Vercel Dashboard → Project → Settings → Domains
2. Ajouter domaine : `neosaas.tech`
3. Configurer DNS (A/CNAME records)
4. Attendre propagation (~5 min)

**Guide complet** : [`CUSTOM_DOMAIN.md`](./CUSTOM_DOMAIN.md)

### OAuth Callback URLs

⚠️ **Mettre à jour les callback URLs** après déploiement

**GitHub OAuth** :
- Old: `http://localhost:3000/api/auth/oauth/github/callback`
- New: `https://your-domain.vercel.app/api/auth/oauth/github/callback`

**Où mettre à jour** :
1. GitHub OAuth App settings
2. Admin → API Manager (NeoSaaS)

**Documentation** : [`../oauth/github/SETUP.md#callback-url`](../oauth/github/SETUP.md)

---

## 🔧 Build Configuration

### `vercel.json`

```json
{
  "buildCommand": "sh scripts/build-with-db.sh",
  "framework": "nextjs",
  "regions": ["cdg1"],
  "env": {
    "DATABASE_URL": "@database-url",
    "NEXTAUTH_SECRET": "@nextauth-secret"
  }
}
```

### Script `build-with-db.sh`

**Rôle** :
1. `drizzle-kit push --force --verbose` (met à jour le schéma depuis `db/schema.ts`)
2. Seed email templates
3. Sync page permissions
4. `next build`

**Source de vérité** : `db/schema.ts` — toute modification de schéma se fait uniquement dans ce fichier.

---

## 🧪 Tests Post-Déploiement

### Checklist

- [ ] ✅ Site accessible (https://your-domain.vercel.app)
- [ ] ✅ Connexion admin fonctionne
- [ ] ✅ Admin panel accessible
- [ ] ✅ OAuth GitHub fonctionne (si configuré)
- [ ] ✅ OAuth Google fonctionne (si configuré)
- [ ] ✅ Emails envoyés
- [ ] ✅ Database accessible

### Commandes Vérification

```bash
# Vérifier build
vercel logs

# Vérifier database
pnpm db:studio --url=$DATABASE_URL

# Tester endpoints
curl https://your-domain.vercel.app/api/health
```

---

## ❌ Problèmes Fréquents

### Erreur: `Build failed`

**Causes fréquentes** :
1. Variables ENV manquantes
2. Database inaccessible
3. Timeout build

**Solutions** :
- Vérifier logs : `vercel logs`
- Vérifier variables ENV
- Augmenter timeout build

**Doc** : [`../troubleshooting/DEPLOYMENT.md`](../troubleshooting/DEPLOYMENT.md)

### Erreur: `OAuth redirect_uri_mismatch`

**Cause** : Callback URL pas mise à jour

**Solution** :
1. GitHub OAuth App settings
2. Mettre URL production : `https://your-domain.vercel.app/api/auth/oauth/github/callback`
3. Sauvegarder

**Doc** : [`../oauth/github/TROUBLESHOOTING.md`](../oauth/github/TROUBLESHOOTING.md)

### Erreur: `Database connection timeout`

**Cause** : Firewall/Network

**Solutions** :
1. Vérifier whitelist IP Vercel
2. Utiliser connection pooling
3. Augmenter timeout

---

## 🔄 Déploiements Continus

### Auto-Deploy depuis GitHub

**Configuration** :
1. Vercel → Project → Settings → Git
2. Production Branch : `main`
3. Auto-deploy : `ON`

**Comportement** :
- Push sur `main` → Deploy production
- Push sur autre branche → Preview deploy

### Preview Deployments

Chaque PR GitHub = Preview deployment automatique

**URL** : `https://neosaas-pr-123.vercel.app`

**Avantage** : Tester avant merge

---

## 📊 Monitoring

### Logs

```bash
# Real-time
vercel logs --follow

# Derniers logs
vercel logs
```

### Analytics

Vercel Dashboard → Project → Analytics

**Métriques** :
- Requests
- Bandwidth
- Edge functions
- Build time

### Alerts

Vercel → Project → Settings → Notifications

**Configurer** :
- Build failures
- Deployment errors
- Performance issues

---

## 🔒 Sécurité Production

### Checklist Sécurité

- [ ] ✅ NEXTAUTH_SECRET changé (32+ chars)
- [ ] ✅ Admin password changé
- [ ] ✅ Database credentials sécurisés
- [ ] ✅ API keys en variables ENV
- [ ] ✅ HTTPS forcé
- [ ] ✅ CORS configuré
- [ ] ✅ Rate limiting activé

**Guide complet** : [`../guides/SECURITY.md`](../guides/SECURITY.md)

---

## 🎯 Prochaines Étapes

### Déploiement Complet ✅

Votre application est maintenant en production!

### Recommandations :

1. **Monitoring** → Configurer alerts
2. **Backups** → Database backups automatiques
3. **CDN** → Optimiser assets
4. **Performance** → Analyser Core Web Vitals

---

## 📚 Documentation Connexe

- **[ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)** - Toutes les variables
- **[DATABASE_RESET.md](./DATABASE_RESET.md)** - Configuration reset
- **[CUSTOM_DOMAIN.md](./CUSTOM_DOMAIN.md)** - Domaine personnalisé
- **[../troubleshooting/DEPLOYMENT.md](../troubleshooting/DEPLOYMENT.md)** - Dépannage

---

## 📞 Support

- **Vercel Docs** : https://vercel.com/docs
- **GitHub Issues** : [neosaastech/neosaas-website/issues](https://github.com/neosaastech/neosaas-website/issues)

---

**Déploiement réussi! 🎉**
