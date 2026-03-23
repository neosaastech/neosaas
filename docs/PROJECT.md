# NeoSaaS — Documentation Projet

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Stack technique](#stack-technique)
3. [Structure du projet](#structure-du-projet)
4. [Architecture & patterns](#architecture--patterns)
5. [Base de données](#base-de-données)
6. [Déploiement](#déploiement)
7. [Variables d'environnement](#variables-denvironnement)
8. [Scripts disponibles](#scripts-disponibles)

---

## Vue d'ensemble

NeoSaaS est une plateforme SaaS multi-tenant full-stack construite avec Next.js 15. Elle couvre la gestion des utilisateurs, l'e-commerce, la prise de rendez-vous, le support client, les paiements Stripe et l'administration complète.

---

## Stack technique

| Catégorie | Technologie |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 |
| Langage | TypeScript 5.7 |
| Base de données | PostgreSQL (Neon serverless) |
| ORM | Drizzle ORM |
| UI | Tailwind CSS 3.4 + shadcn/ui (Radix UI) |
| Authentification | JWT custom + OAuth (Google, GitHub, Microsoft, Facebook) |
| Paiement | Stripe + Lago |
| Email | Scaleway TEM (principal), AWS SES, Resend |
| Gestionnaire de paquets | pnpm |
| Déploiement | Vercel (principal) / Docker (GHCR) |
| Tests E2E | Cypress |

---

## Structure du projet

```
Neosaas-app/
│
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Routes publiques d'authentification
│   │   ├── login/
│   │   ├── register/
│   │   ├── recover-password/
│   │   ├── reset-password/
│   │   ├── verify/
│   │   └── accept-invite/
│   │
│   ├── (errors)/                 # Pages d'erreur
│   │   ├── 404/
│   │   ├── 500/
│   │   ├── 503/
│   │   ├── maintenance/
│   │   └── success/
│   │
│   ├── (private)/                # Routes protégées (authentification requise)
│   │   ├── admin/                # Tableau de bord administrateur
│   │   │   ├── page.tsx          # Dashboard principal admin
│   │   │   ├── appointments/     # Gestion des rendez-vous
│   │   │   ├── products/         # Gestion des produits
│   │   │   ├── users/            # Gestion des utilisateurs
│   │   │   ├── orders/           # Gestion des commandes
│   │   │   ├── coupons/          # Codes de réduction
│   │   │   ├── invoices/         # Factures
│   │   │   ├── mail/             # Configuration email
│   │   │   ├── chat/             # Chat support admin
│   │   │   ├── support/          # Tickets support
│   │   │   ├── api-management/   # Clés API
│   │   │   ├── settings/         # Paramètres plateforme
│   │   │   ├── vat-rates/        # Taux de TVA
│   │   │   └── legal/            # Conformité légale
│   │   │
│   │   ├── dashboard/            # Tableau de bord client
│   │   │   ├── page.tsx          # Vue principale
│   │   │   ├── appointments/     # Rendez-vous du client
│   │   │   ├── checkout/         # Tunnel d'achat
│   │   │   ├── checkout-lago/    # Tunnel d'achat Lago
│   │   │   ├── cart/             # Panier
│   │   │   ├── chat/             # Chat support client
│   │   │   ├── company-management/ # Gestion de l'entreprise
│   │   │   ├── profile/          # Profil utilisateur
│   │   │   ├── payment-methods/  # Moyens de paiement
│   │   │   ├── payments/         # Historique paiements
│   │   │   └── support/          # Tickets support client
│   │   │
│   │   └── onboarding/           # Flux d'onboarding
│   │
│   ├── (public)/                 # Pages publiques
│   │   ├── book/[productId]/     # Réservation d'un rendez-vous
│   │   ├── brand/                # Page brand
│   │   ├── configuration/        # Configuration initiale
│   │   ├── demo/                 # Démo
│   │   ├── docs/                 # Documentation publique
│   │   ├── features/             # Fonctionnalités
│   │   ├── pricing/              # Tarifs
│   │   ├── legal/                # Mentions légales / CGV
│   │   └── store/                # Boutique
│   │
│   ├── api/                      # Routes API (REST)
│   │   ├── admin/                # APIs admin uniquement
│   │   │   ├── appointments/     # CRUD rendez-vous (admin)
│   │   │   ├── chat/             # Messages chat
│   │   │   ├── email-templates/  # Templates email
│   │   │   ├── notifications/    # Notifications admin
│   │   │   ├── oauth/            # Config OAuth providers
│   │   │   ├── stripe/           # Actions Stripe (admin)
│   │   │   ├── users/            # Gestion utilisateurs
│   │   │   ├── vat-rates/        # CRUD taux TVA
│   │   │   └── payments/         # Paiements (admin)
│   │   │
│   │   ├── auth/                 # Authentification
│   │   │   ├── login/
│   │   │   ├── logout/
│   │   │   ├── register/
│   │   │   ├── me/               # Utilisateur courant
│   │   │   ├── oauth/            # Login social
│   │   │   └── onboarding/
│   │   │
│   │   ├── appointments/         # Rendez-vous (client)
│   │   │   ├── route.ts          # GET/POST rendez-vous
│   │   │   └── [id]/route.ts     # GET/PUT/DELETE par ID
│   │   │
│   │   ├── checkout/             # Paiement
│   │   │   └── available-slots/  # Créneaux disponibles
│   │   ├── chat/                 # Messagerie
│   │   ├── email/                # Envoi d'emails
│   │   ├── stripe/               # Webhooks Stripe
│   │   ├── products/             # Catalogue produits
│   │   ├── orders/               # Commandes
│   │   ├── services/             # Services API
│   │   ├── llm/                  # Intégration LLM
│   │   ├── health/               # Healthcheck
│   │   └── debug/                # Debug (dev only)
│   │
│   ├── actions/                  # Server Actions Next.js
│   │   ├── appointments.ts       # Actions rendez-vous & créneaux
│   │   ├── auth.ts               # Actions authentification
│   │   ├── ecommerce.ts          # Actions e-commerce
│   │   ├── payments.ts           # Actions paiement
│   │   ├── coupons.ts            # Actions coupons
│   │   └── admin-dashboard.ts    # Actions dashboard admin
│   │
│   ├── layout.tsx                # Layout racine
│   ├── page.tsx                  # Page d'accueil
│   └── not-found.tsx
│
├── components/                   # Composants React réutilisables
│   ├── ui/                       # Composants de base (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── calendar.tsx          # Sélecteur de date (shadcn)
│   │   ├── dialog.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   └── [50+ composants]
│   │
│   ├── admin/                    # Composants spécifiques admin
│   │   ├── dashboard-stats.tsx
│   │   ├── dashboard-invoices.tsx
│   │   ├── dashboard-payments.tsx
│   │   ├── admin-alerts.tsx
│   │   ├── users-table.tsx
│   │   ├── admin-live-chat.tsx
│   │   └── notification-bell.tsx
│   │
│   ├── layout/                   # Composants de mise en page
│   │   ├── site-header.tsx
│   │   ├── site-footer.tsx
│   │   ├── main-nav.tsx
│   │   ├── dashboard/            # Header/sidebar dashboard admin
│   │   ├── private-dashboard/    # Header/sidebar dashboard client
│   │   └── docs/                 # Navigation documentation
│   │
│   ├── checkout/                 # Composants tunnel d'achat
│   │   ├── appointment-booking.tsx
│   │   ├── appointment-modal.tsx
│   │   └── checkout-confirmation-*.tsx
│   │
│   ├── chat/                     # Widget de chat
│   │   ├── chat-widget.tsx
│   │   └── chat-widget-wrapper.tsx
│   │
│   ├── legal/                    # Composants légaux
│   │   ├── cookie-consent.tsx
│   │   └── tos-modal.tsx
│   │
│   └── common/                   # Utilitaires partagés
│       ├── theme-provider.tsx
│       ├── theme-toggle.tsx
│       └── dynamic-theme-provider.tsx
│
├── lib/                          # Bibliothèques et logique métier
│   ├── auth/                     # Authentification serveur
│   │   ├── server.ts             # verifyAuth(), isAdmin()
│   │   └── admin-auth.ts
│   ├── auth.ts                   # getCurrentUser(), JWT
│   │
│   ├── oauth/                    # Providers OAuth
│   │   ├── providers/
│   │   │   ├── google.ts
│   │   │   ├── github.ts
│   │   │   ├── microsoft.ts
│   │   │   └── facebook.ts
│   │   └── oauth-user-service.ts
│   │
│   ├── email/                    # Système email multi-provider
│   │   ├── index.ts              # emailRouter
│   │   ├── providers/scaleway/
│   │   ├── repositories/
│   │   ├── services/
│   │   └── types/
│   │
│   ├── checkout/                 # Logique tunnel d'achat
│   │   ├── index.ts
│   │   ├── types.ts
│   │   └── lago-test-mode.ts
│   │
│   ├── notifications/            # Notifications
│   │   ├── admin-notifications.ts
│   │   └── appointment-notifications.ts
│   │
│   ├── services/                 # Abstraction services tiers
│   │   ├── index.ts
│   │   ├── repository.ts
│   │   └── types.ts
│   │
│   ├── data/                     # Couche données (lecture)
│   │   ├── admin-dashboard.ts
│   │   ├── invoices.ts
│   │   └── payments.ts
│   │
│   ├── theme/                    # Gestion des thèmes
│   │   └── generate-css.ts
│   │
│   ├── stripe-*.ts               # Helpers Stripe
│   ├── config.ts                 # Configuration globale
│   ├── utils.ts                  # Utilitaires généraux
│   └── contexts/
│       └── user-context.tsx      # Context utilisateur React
│
├── db/                           # Base de données
│   ├── schema.ts                 # Schéma Drizzle (source de vérité)
│   ├── index.ts                  # Connexion DB (Neon + Drizzle)
│   ├── migrate.ts                # Runner de migrations
│   └── setup/
│       ├── database-setup.sql    # SQL setup initial
│       └── full-reset.sql        # Reset complet
│
├── drizzle/                      # Fichiers de migration générés
│   ├── 0000_oval_iron_man.sql    # Schéma initial
│   ├── 0001_stripe_product_sync.sql
│   ├── 0002_stripe_unification.sql
│   └── meta/
│       └── _journal.json         # Journal des migrations
│
├── scripts/                      # Scripts d'administration
│   ├── build-with-db.sh          # Script de build Vercel (migrations + next build)
│   ├── migrate.ts                # Applique les migrations SQL
│   ├── db-migrate-safe.sh        # Migration sécurisée (GitHub Actions)
│   ├── db-ensure-columns.ts      # Vérifie/ajoute les colonnes critiques
│   ├── db-verify-schema.ts       # Vérification du schéma
│   ├── db-connectivity-test.ts   # Test de connexion HTTP (Neon)
│   ├── seed-database.ts          # Seed complet
│   ├── seed-base-data.ts         # Seed données de base (rôles, TVA, config)
│   ├── seed-email-templates.ts   # Seed templates email
│   ├── sync-pages.ts             # Sync permissions de pages
│   ├── reset-db.ts               # Reset base de données
│   └── fix-*.ts / test-*.ts      # Scripts de maintenance
│
├── .github/workflows/
│   ├── docker-image.yml          # Build & push image Docker (GHCR)
│   └── db-migrate.yml            # Migrations automatiques CI
│
├── contexts/                     # Contexts React globaux
│   ├── cart-context.tsx
│   └── platform-config-context.tsx
│
├── hooks/                        # Hooks React custom
│   ├── use-mobile.ts
│   └── use-toast.ts
│
├── types/                        # Types TypeScript globaux
│   ├── index.ts
│   ├── theme-config.ts
│   └── github-config.ts
│
├── config/                       # Configuration applicative
│   ├── env/
│   └── seo/
│
├── public/                       # Assets statiques
├── styles/                       # CSS global
├── cypress/                      # Tests E2E
│
├── vercel.json                   # Configuration déploiement Vercel
├── drizzle.config.ts             # Configuration Drizzle ORM
├── next.config.mjs               # Configuration Next.js
├── tailwind.config.ts
├── tsconfig.json
└── .env.example                  # Template des variables d'environnement
```

---

## Architecture & patterns

### Routage Next.js App Router

Les routes sont organisées par groupes de layout (parenthèses) :

- `(auth)` — pages d'authentification sans layout protégé
- `(private)` — pages nécessitant une session valide
- `(public)` — pages accessibles sans connexion
- `(errors)` — pages d'erreur

### Flux de données

```
Composant React (client)
  ↓  Server Action  ou  fetch API route
Vérification auth (verifyAuth / getCurrentUser)
  ↓
Logique métier (lib/)
  ↓
Drizzle ORM → PostgreSQL (Neon)
  ↓
Réponse JSON → mise à jour état
```

### Authentification

- JWT custom (sans NextAuth) via `jose`
- Sessions stockées en cookie HttpOnly
- OAuth social pour Google, GitHub, Microsoft, Facebook
- RBAC : rôles + permissions par scope (company / platform)
- Admins sans company, clients avec company obligatoire

### Multi-tenant

- Table `companies` : isolation des clients B2B
- Utilisateurs liés à une company via `companyId`
- Admins plateforme : `companyId = null`
- Permissions à double niveau : plateforme et company

### Email multi-provider

- `emailRouter` dans `lib/email/index.ts` route vers le provider actif
- Provider principal : Scaleway TEM
- Providers alternatifs : AWS SES, Resend (désactivés par défaut)
- Configuration chiffrée en base via `serviceApiConfigs`

### Paiement

- Stripe : paiements unitaires, abonnements, webhooks
- Lago : facturation usage-based
- Moyens de paiement stockés par company (PCI compliant — côté Stripe)

---

## Base de données

### Connexion

```typescript
// db/index.ts
DATABASE_URL          // URL poolée (Neon connection pooler)
DATABASE_URL_UNPOOLED // URL directe (pour migrations)
```

**Important** : les migrations requièrent `DATABASE_URL_UNPOOLED` avec le rôle `neondb_owner`. Le rôle `authenticator` n'a pas les droits `CREATE`/`ALTER`.

### Schéma — Tables principales

| Table | Description |
|---|---|
| `companies` | Entreprises clientes (tenant) |
| `subscriptions` | Abonnements Stripe par company |
| `payment_methods` | Cartes Stripe par company |
| `users` | Utilisateurs (clients + admins) |
| `roles` | Rôles RBAC |
| `permissions` | Permissions par rôle |
| `user_roles` | Association user ↔ role |
| `role_permissions` | Association role ↔ permission |
| `oauth_connections` | Tokens OAuth par utilisateur |
| `products` | Produits (physique, digital, rendez-vous) |
| `orders` | Commandes |
| `order_items` | Lignes de commande |
| `coupons` | Codes de réduction |
| `coupon_usage` | Usage des coupons |
| `carts` | Paniers |
| `cart_items` | Articles du panier |
| `appointments` | Rendez-vous (client ↔ admin) |
| `appointment_slots` | Créneaux de disponibilité |
| `appointment_exceptions` | Exceptions (vacances, blocages) |
| `chat_conversations` | Conversations support |
| `chat_messages` | Messages |
| `chat_quick_responses` | Réponses rapides admin |
| `email_provider_configs` | Config providers email (chiffrée) |
| `email_templates` | Templates d'email |
| `email_send_history` | Historique d'envoi |
| `service_api_configs` | Config services tiers (chiffrée) |
| `user_api_keys` | Clés API utilisateurs |
| `llm_api_keys` | Clés LLM |
| `llm_usage_logs` | Logs d'usage LLM |
| `vat_rates` | Taux de TVA |
| `platform_config` | Configuration plateforme (clé/valeur) |
| `page_permissions` | Permissions d'accès aux pages |
| `tos_versions` | Versions CGU |
| `user_tos_acceptances` | Acceptation CGU |
| `cookie_consents` | Consentements cookies |
| `system_logs` | Logs système |

### Migrations

Les fichiers SQL de migration sont générés par `drizzle-kit` dans le dossier `drizzle/`. Le journal de suivi est dans `drizzle/meta/_journal.json`.

Commandes :

```bash
pnpm db:generate    # Génère un nouveau fichier de migration depuis db/schema.ts
pnpm db:migrate     # Applique les migrations en attente
pnpm db:push        # Synchronisation directe (dev uniquement)
pnpm db:studio      # Interface visuelle Drizzle Studio
```

---

## Déploiement

### Vercel (production)

**Configuration** (`vercel.json`) :

```json
{
  "buildCommand": "bash scripts/build-with-db.sh",
  "installCommand": "pnpm install --no-frozen-lockfile --reporter=append-only",
  "framework": "nextjs"
}
```

**Séquence de build** (`scripts/build-with-db.sh`) :

1. Test de connectivité HTTP vers Neon (port 443 uniquement — TCP bloqué sur Vercel)
2. Vérification des colonnes critiques (`db-ensure-columns.ts`)
3. Application des migrations SQL (`scripts/migrate.ts`)
4. Seeding données de base : rôles, permissions, TVA, config (`db:seed-base`)
5. Seeding templates email (`seed:email-templates`)
6. Seeding permissions de pages (`seed:pages`)
7. Compilation Next.js (`next build`)

> **Note** : sur Vercel, seule la connexion HTTP (port 443) vers Neon est disponible. La connexion TCP directe (port 5432 / ports custom Neon) est bloquée. `drizzle-kit push` (TCP) est donc réservé à GitHub Actions.

**Variables Vercel requises** :

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | URL poolée Neon (`neondb_owner`) |
| `DATABASE_URL_UNPOOLED` | URL directe Neon (pour migrations) |
| `NEXT_PUBLIC_APP_URL` | URL publique de l'application |
| `JWT_SECRET` | Secret signature JWT |
| `STRIPE_SECRET_KEY` | Clé Stripe serveur |
| `STRIPE_WEBHOOK_SECRET` | Secret webhook Stripe |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clé publique Stripe |

Variables optionnelles selon les features activées : email providers, OAuth providers, Lago, S3/Scaleway Object Storage.

**Sauter les migrations** (si gérées par GitHub Actions) :

```
SKIP_DB_MIGRATIONS=true
# ou
DB_MIGRATIONS_STRATEGY=github-actions
```

---

### Docker

**Workflow** : `.github/workflows/docker-image.yml`

- Déclenché sur push vers `main` ou `docker`, ou manuellement
- Build multi-plateforme (`linux/amd64`)
- Publication sur GitHub Container Registry (GHCR)
- Tag automatique : `sha-<commit>`, `<branch>`, `latest` (sur `main`)
- Cache de build via GitHub Actions cache

Image publiée :
```
ghcr.io/<organisation>/<repo>/web:latest
```

---

### GitHub Actions — Migrations automatiques

**Workflow** : `.github/workflows/db-migrate.yml`

Déclenché automatiquement lors d'un push sur `main`, `preview`, `dev`, `claude/**` si les fichiers suivants sont modifiés :

- `db/schema.ts`
- `drizzle/**`
- `scripts/migrate.ts`
- `scripts/db-ensure-columns.ts`
- `drizzle.config.ts`

**Séquence** :

1. `bash scripts/db-migrate-safe.sh` — migration via `drizzle-kit push` (connexion TCP directe)
2. `pnpm db:seed-base` — rôles, permissions, TVA, config plateforme
3. `pnpm seed:email-templates` — templates email
4. `pnpm seed:pages` — permissions des pages

**Secrets GitHub requis** :

| Secret | Description |
|---|---|
| `DATABASE_URL_UNPOOLED` | URL directe Neon (rôle `neondb_owner`) |
| `DATABASE_URL` | URL poolée Neon (fallback) |

---

## Variables d'environnement

Consulter `.env.example` pour la liste complète. Les variables critiques :

```bash
# Base de données (Neon PostgreSQL)
DATABASE_URL=postgresql://neondb_owner:PASSWORD@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://neondb_owner:PASSWORD@ep-xxx.region.aws.neon.tech/neondb?sslmode=require

# Application
NEXT_PUBLIC_APP_URL=https://monapp.com
JWT_SECRET=<secret-32-chars-minimum>

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## Scripts disponibles

```bash
# Développement
pnpm dev                  # Serveur de développement Next.js

# Build
pnpm build                # Build production avec migrations (Vercel)
pnpm build:local          # Build production sans migrations (local)

# Base de données
pnpm db:generate          # Génère les fichiers de migration depuis le schéma
pnpm db:migrate           # Applique les migrations en attente
pnpm db:push              # Sync directe schéma → DB (dev)
pnpm db:ensure            # Vérifie/ajoute les colonnes critiques
pnpm db:verify            # Vérifie la cohérence schéma/DB
pnpm db:reset             # Remet la base à zéro
pnpm db:seed              # Seed complet (dev)
pnpm db:seed-base         # Seed données de base (rôles, TVA, config)
pnpm db:studio            # Drizzle Studio (interface visuelle)

# Seeding spécifique
pnpm seed:email-templates # Seed templates d'email
pnpm seed:pages           # Sync permissions de pages

# Vérification
pnpm check:email-config   # Vérifie la configuration email
pnpm lint                 # ESLint

# Production
pnpm start                # Démarre le serveur Next.js en mode production
```
