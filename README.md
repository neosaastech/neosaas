# NeoSaaS 🚀

> **Base technique officielle du projet `demo-rh`** — gestionnaire de documentation RH connecté à des APIs publiques et privées, développé par [Neomnia Studio](https://github.com/neomnia).

NeoSaaS est un boilerplate SaaS full-stack multi-tenant qui sert de socle au projet **demo-rh** : une plateforme centralisée permettant à toute équipe RH de créer, organiser, synchroniser et rechercher sa documentation interne, reliée à des sources de données légales (APIs publiques) et à ses outils RH (APIs privées).

---

## 🎯 Mission — demo-rh

**Problème résolu** : Les équipes RH gèrent leur documentation de façon fragmentée — Word, email, SharePoint, outils RH séparés — sans synchronisation avec le droit du travail en vigueur ni avec leurs SIRH.

**Solution** : Un gestionnaire de documentation RH unifié, connecté en temps réel à des APIs publiques (Légifrance, data.gouv.fr, INSEE) et privées (Zoho HR, Workable, BambooHR), avec recherche sémantique full-text et contrôle d'accès par rôle.

```
Utilisateur RH
     │
     ▼
┌─────────────────────────────────────────┐
│           Interface demo-rh             │
│   (Next.js 15 + shadcn/ui — NeoSaaS)   │
└────────────────┬────────────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
┌──────────────┐  ┌──────────────────────┐
│  APIs        │  │  APIs Privées        │
│  Publiques   │  │  (Zoho HR, Workable, │
│  (Légifrance │  │   BambooHR, Custom)  │
│  data.gouv,  │  └──────────────────────┘
│  URSSAF,     │
│  INSEE)      │
└──────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│  PostgreSQL + pgvector (NeoKube)        │
│  Documents · Versions · Audit log       │
└─────────────────────────────────────────┘
```

---

## ✨ Fonctionnalités

### Socle NeoSaaS
- 🔐 **Authentification complète** — sign-up, login, JWT + RBAC
- 🌐 **OAuth social** — GitHub, Google (config 100% base de données)
- 👥 **Multi-tenant** — rôles et permissions granulaires
- 💳 **Billing Stripe + Lago** — abonnements et facturation
- 📧 **Emails transactionnels** — Resend, Scaleway TEM, AWS SES
- 🎨 **UI moderne** — Tailwind CSS + shadcn/ui
- ⚙️ **API Manager** — configuration centralisée des services tiers

### Modules spécifiques demo-rh
- 📄 **doc-manager** — CRUD documents RH + versionning complet
- 🔌 **api-connector** — couche d'abstraction APIs publiques & privées
- 🔒 **access-control** — RBAC étendu + audit log horodaté
- 🔍 **search-engine** — recherche sémantique via pgvector
- 📤 **export-service** — export PDF, DOCX, JSON
- 🔔 **notification-service** — alertes mise à jour légale / expiration

---

## 🔌 APIs connectées

### Publiques
| API | Données | Auth |
|---|---|---|
| API Légifrance | Code du travail, textes juridiques | OAuth2 |
| data.gouv.fr | Conventions collectives, IDCC | Clé API |
| API URSSAF | Taux de cotisations, SMIC | Clé API |
| API INSEE | Établissements, NAF, SIREN | OAuth2 |

### Privées
| API | Données | Auth |
|---|---|---|
| Zoho HR | Employés, absences, contrats | OAuth2 |
| Workable | Candidatures, offres d'emploi | API Key |
| BambooHR | Fiches employés, congés | API Key |
| Custom Neomnia | Données internes studio | JWT Bearer |

---

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Initialise the database
pnpm db:push && pnpm db:seed

# Start the dev server
pnpm dev
```

Open http://localhost:3000

---

## 🛠️ Tech Stack

| Catégorie | Technologie |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 |
| Language | TypeScript 5.7 |
| Backend | FastAPI Python 3.12 async |
| Database | PostgreSQL / Neon + Drizzle ORM |
| Vector Search | pgvector |
| UI | Tailwind CSS 3.4 + shadcn/ui |
| Auth | JWT + OAuth (Google, GitHub, Microsoft) |
| Storage | S3-compatible (Scaleway) |
| Payments | Stripe + Lago |
| Email | Scaleway TEM / AWS SES / Resend |
| Infra | NeoKube (Kubernetes — Scaleway) |
| CI/CD | GitHub Actions |
| Package manager | pnpm |

---

## 📁 Documentation

Référence complète développeur : **[docs/PROJECT.md](./docs/PROJECT.md)**

| Sujet | Fichier |
|---|---|
| Quick start & setup | [docs/setup/QUICK_START.md](./docs/setup/QUICK_START.md) |
| Architecture | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) |
| Déploiement Vercel | [docs/deployment/VERCEL.md](./docs/deployment/VERCEL.md) |
| Statut projet | [docs/STATUS.md](./docs/STATUS.md) |
| **Cahier des charges demo-rh** | [Notion](https://www.notion.so/3663f68cf2b58191b9c0d403f06c23ad) |

---

## 🔐 Sécurité

> **Ne jamais committer `.env`** — contient des credentials sensibles.

- Chiffrement des credentials API en base (AES-256 via Vault)
- Audit log de toutes les actions sur les documents
- Rate limiting sur les appels APIs externes
- Tokens d'accès API expirables (TTL configurable)
- Validation des webhooks entrants (HMAC signature)
- Headers de sécurité enforced sur toutes les réponses (`next.config.ts`) :
  - `Strict-Transport-Security`
  - `Content-Security-Policy`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`

---

## 🗂️ Liens du projet

- **Dépôt demo-rh (privé)** : [github.com/neomnia/demo-rh](https://github.com/neomnia/demo-rh)
- **Template Frontend** : [neomnia/template-nextjs](https://github.com/neomnia/template-nextjs)
- **Template Backend** : [neomnia/template-fastapi](https://github.com/neomnia/template-fastapi)
- **GitOps NeoKube** : [neomnia/Kubinote-GitOps](https://github.com/neomnia/Kubinote-GitOps)
- **Cahier des charges** : [Notion — demo-rh](https://www.notion.so/3663f68cf2b58191b9c0d403f06c23ad)

---

> Projet développé par **Neomnia Studio** — *Muter pour survivre, coopérer pour grandir.*
