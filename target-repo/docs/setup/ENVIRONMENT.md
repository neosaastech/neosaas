# ⚙️ Configuration des Variables d'Environnement

> **Date de création** : 19 février 2026  
> **Dernière mise à jour** : 19 février 2026  
> **Statut** : ✅ Documenté

---

## 📋 Variables Requises

### 🗄️ Base de Données (Neon PostgreSQL)

```env
# URL de connexion principale (pooler HTTP — utilisé par les Server Actions et API Routes)
DATABASE_URL='postgresql://<user>:<password>@<host-pooler>/<dbname>?sslmode=require&channel_binding=require'

# Pour les connexions directes (scripts, migrations, Drizzle Kit)
PGPASSWORD=<mot-de-passe-neon>
PGUSER=<utilisateur-pg>
```

> ⚠️ **Important** : `PGUSER=authenticator` est utilisé en développement — c'est l'utilisateur RLS (Row Level Security) de Neon. Les scripts de migration utilisent `neondb_owner`.

---

### 🔐 Authentification

```env
# Secret JWT (min. 32 caractères) — aussi utilisé pour chiffrer les clés API en BDD
NEXTAUTH_SECRET=<générer avec: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
```

---

### 🌐 URLs Publiques

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

### 🤖 IA / Anthropic (via Vercel AI Gateway)

NeoSaaS utilise Claude via la passerelle IA de Vercel (Vercel Copilot Platform).  
Le proxy Vercel expose l'API Anthropic sous l'URL Vercel Deployments.

```env
# Base URL du proxy Vercel → API Anthropic
ANTHROPIC_BASE_URL=https://api.vercel.com/v6/deployments?teamId=<team-id>

# Token d'authentification Vercel Copilot Platform (préfixe vcp_)
ANTHROPIC_AUTH_TOKEN=vcp_<token>
```

> 💡 **Note** : `ANTHROPIC_AUTH_TOKEN` avec préfixe `vcp_` est un jeton **Vercel Copilot Platform**, pas un jeton Anthropic natif. Il est transmis via l'en-tête `Authorization` au proxy Vercel.

---

### 📧 Email (choisir 1 provider minimum)

#### Option A — Resend (recommandé)

```env
RESEND_API_KEY=re_...
```

#### Option B — Scaleway TEM

```env
SCW_PROJECT_ID=<project-id>
SCW_SECRET_KEY=<secret-key>
SCW_REGION=fr-par
```

#### Option C — AWS SES

```env
AWS_SES_ACCESS_KEY=...
AWS_SES_SECRET_KEY=...
AWS_SES_REGION=eu-west-3
```

---

### 💳 Stripe (configuré depuis `/admin`)

Les credentials Stripe (clés API, webhook secret) sont stockés en base de données via le **Service API Manager** (`/admin/api`).  
Aucune variable d'environnement Stripe n'est requise localement.

> Voir : [STRIPE_INTEGRATION.md](../STRIPE_INTEGRATION.md)

---

### 🔑 OAuth GitHub / Google (configuré depuis `/admin`)

Les credentials OAuth sont stockés chiffrés en BDD via le **Service API Manager**.  
Aucune variable d'environnement OAuth n'est requise localement.

> Voir : [GITHUB_OAUTH_ARCHITECTURE_V3.md](../GITHUB_OAUTH_ARCHITECTURE_V3.md)

---

## 📁 Fichier Exemple

Le template se trouve dans :

```
config/env/env.local.exemple
```

```bash
cp config/env/env.local.exemple .env.local
```

---

## 🔒 Sécurité

| Variable | Stockage | Chiffrement |
|----------|----------|-------------|
| `DATABASE_URL` | `.env.local` | Non (connexion sécurisée SSL) |
| `NEXTAUTH_SECRET` | `.env.local` | Clé de chiffrement AES-256 |
| `ANTHROPIC_AUTH_TOKEN` | `.env.local` | Non (HTTPS) |
| Clés Stripe | BDD (`service_api_configs`) | AES-256-GCM |
| Clés OAuth | BDD (`service_api_configs`) | AES-256-GCM |

---

## 📦 Environnements

| Env | `DATABASE_URL` | `NEXTAUTH_URL` | Notes |
|-----|----------------|----------------|-------|
| **Local** | Neon pooler (eu-central-1) | `http://localhost:3000` | `PGUSER=authenticator` |
| **Preview Vercel** | Neon pooler | URL preview auto | Injecté via Vercel |
| **Production** | Neon pooler | `https://www.neosaas.tech` | Injecté via Vercel |

---

## 📅 Changelog

### [19 février 2026]
- **[NOUVEAU]** Création de ce fichier (était référencé dans `QUICK_START.md` mais absent)
- **Variables documentées** : `DATABASE_URL`, `PGPASSWORD`, `PGUSER`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, `NEXTAUTH_SECRET`, providers email
- **Impact** : Les développeurs ont maintenant un guide complet des variables d'environnement
