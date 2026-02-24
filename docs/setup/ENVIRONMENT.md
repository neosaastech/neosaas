# ⚙️ Configuration des Variables d'Environnement — NeoSaaS Tech

> **Dernière mise à jour** : 23 février 2026
> **Statut** : ✅ Documenté

---

## 📋 Variables Requises

### 🗄️ Base de Données (PostgreSQL)

```env
# URL de connexion principale (pooler recommandé pour les requêtes applicatives)
DATABASE_URL=postgresql://<user>:<password>@<host>/<dbname>?sslmode=require

# Pour les connexions directes (migrations Drizzle Kit) — optionnel
DATABASE_URL_UNPOOLED=postgresql://<user>:<password>@<host-direct>/<dbname>?sslmode=require
```

> Compatible avec Neon, Supabase, Railway, ou tout PostgreSQL standard.

---

### 🔐 Authentification

```env
# Secret JWT (min. 32 caractères) — aussi utilisé pour chiffrer les clés API en BDD
NEXTAUTH_SECRET=<générer avec: openssl rand -base64 32>
```

---

### 🌐 URL Publique

```env
NEXT_PUBLIC_APP_URL=https://votre-domaine.com
# En local : http://localhost:3000
```

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

---

### 🔑 OAuth GitHub / Google (configuré depuis `/admin`)

Les credentials OAuth sont stockés chiffrés en BDD via le **Service API Manager**.
Aucune variable d'environnement OAuth n'est requise localement.

---

### 📬 Emails de contact (optionnel)

```env
CONTACT_EMAIL=support@votre-domaine.com
ADMIN_EMAIL=admin@votre-domaine.com
```

---

## 📁 Fichier de Template

```bash
cp .env.example .env
# ou
cp config/env/env.local.exemple .env.local
```

---

## 🔒 Sécurité

| Variable | Stockage | Chiffrement |
|----------|----------|-------------|
| `DATABASE_URL` | `.env` | Non (connexion SSL) |
| `NEXTAUTH_SECRET` | `.env` | Clé de chiffrement AES-256 |
| Clés Stripe | BDD (`service_api_configs`) | AES-256-GCM |
| Clés OAuth | BDD (`service_api_configs`) | AES-256-GCM |

> Ne commitez jamais votre fichier `.env` dans Git. Il est listé dans `.gitignore`.

---

## 📦 Environnements

| Env | `DATABASE_URL` | `NEXT_PUBLIC_APP_URL` | Notes |
|-----|----------------|----------------------|-------|
| **Local** | PostgreSQL local ou Neon | `http://localhost:3000` | Fichier `.env` |
| **Staging** | PostgreSQL staging | URL de staging | Variables injectées par l'hébergeur |
| **Production** | PostgreSQL production | `https://votre-domaine.com` | Variables injectées par l'hébergeur |
