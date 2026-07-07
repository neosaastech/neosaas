# NeoSaaS — Developer Reference

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Architecture](#architecture)
5. [Database Schema](#database-schema)
6. [Getting Started](#getting-started)
7. [Available Scripts](#available-scripts)

---

## Overview

NeoSaaS is a full-stack multi-tenant SaaS boilerplate built with Next.js 15 App Router. It provides a production-ready foundation covering user management, e-commerce, appointment booking, customer support, Stripe payments, and a complete admin panel.

---

## Tech Stack

| Category | Technology |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 |
| Language | TypeScript 5.7 · **UI copy: English** |
| Database | PostgreSQL (Drizzle ORM) |
| UI | Tailwind CSS 3.4 + shadcn/ui (Radix UI) |
| Auth | JWT + OAuth (Google, GitHub, Microsoft, Facebook) |
| Payments | Stripe + Lago |
| Email | Multi-provider (Scaleway TEM, AWS SES, Resend) |
| Package manager | pnpm |
| Deployment | Vercel / Docker |
| E2E Testing | Cypress |

---

## Project Structure

```
Neosaas-app/
│
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Public auth routes
│   │   ├── login/
│   │   ├── register/
│   │   ├── recover-password/
│   │   ├── reset-password/
│   │   ├── verify/
│   │   └── accept-invite/
│   │
│   ├── (errors)/                 # Error pages
│   │   ├── 404/ 500/ 503/
│   │   ├── maintenance/
│   │   └── success/
│   │
│   ├── (private)/                # Protected routes (auth required)
│   │   ├── admin/                # Admin dashboard
│   │   │   ├── appointments/     # Appointment management
│   │   │   ├── products/         # Product catalog
│   │   │   ├── users/            # User management
│   │   │   ├── orders/           # Orders
│   │   │   ├── coupons/          # Discount codes
│   │   │   ├── invoices/         # Invoices
│   │   │   ├── mail/             # Email configuration
│   │   │   ├── chat/             # Support chat (admin)
│   │   │   ├── support/          # Support tickets
│   │   │   ├── api-management/   # API keys
│   │   │   ├── settings/         # Platform settings
│   │   │   ├── vat-rates/        # VAT rates
│   │   │   └── legal/            # Legal compliance
│   │   │
│   │   ├── dashboard/            # Client dashboard
│   │   │   ├── appointments/     # Client appointments
│   │   │   ├── checkout/         # Checkout flow
│   │   │   ├── checkout-lago/    # Lago checkout
│   │   │   ├── cart/             # Shopping cart
│   │   │   ├── chat/             # Support chat (client)
│   │   │   ├── company-management/
│   │   │   ├── profile/
│   │   │   ├── payment-methods/
│   │   │   ├── payments/
│   │   │   └── support/
│   │   │
│   │   └── onboarding/
│   │
│   ├── (public)/                 # Public pages
│   │   ├── book/[productId]/     # Appointment booking
│   │   ├── brand/
│   │   ├── configuration/        # Initial setup
│   │   ├── demo/
│   │   ├── docs/
│   │   ├── features/
│   │   ├── pricing/
│   │   ├── legal/
│   │   └── store/
│   │
│   ├── api/                      # REST API routes
│   │   ├── admin/                # Admin-only endpoints
│   │   │   ├── appointments/
│   │   │   ├── chat/
│   │   │   ├── email-templates/
│   │   │   ├── notifications/
│   │   │   ├── oauth/
│   │   │   ├── stripe/
│   │   │   ├── users/
│   │   │   ├── vat-rates/
│   │   │   └── payments/
│   │   │
│   │   ├── auth/                 # Authentication
│   │   │   ├── login/ logout/ register/
│   │   │   ├── me/
│   │   │   ├── oauth/
│   │   │   └── onboarding/
│   │   │
│   │   ├── appointments/         # Appointments (client)
│   │   │   ├── route.ts          # GET / POST
│   │   │   └── [id]/route.ts     # GET / PUT / DELETE
│   │   │
│   │   ├── checkout/
│   │   │   └── available-slots/
│   │   ├── chat/
│   │   ├── email/
│   │   ├── stripe/               # Stripe webhooks
│   │   ├── products/
│   │   ├── orders/
│   │   ├── services/
│   │   ├── llm/
│   │   └── health/
│   │
│   ├── actions/                  # Next.js Server Actions
│   │   ├── appointments.ts
│   │   ├── auth.ts
│   │   ├── ecommerce.ts
│   │   ├── payments.ts
│   │   ├── coupons.ts
│   │   └── admin-dashboard.ts
│   │
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── ui/                       # Base components (shadcn/ui)
│   ├── admin/                    # Admin-specific components
│   ├── layout/                   # Layout components
│   │   ├── dashboard/            # Admin dashboard header/sidebar
│   │   └── private-dashboard/    # Client dashboard header/sidebar
│   ├── checkout/                 # Checkout components
│   ├── chat/                     # Chat widget
│   ├── legal/                    # Cookie consent, ToS modal
│   └── common/                   # Shared utilities
│
├── lib/                          # Business logic & utilities
│   ├── auth/                     # Auth helpers (server-side)
│   │   ├── server.ts             # verifyAuth(), isAdmin()
│   │   └── admin-auth.ts
│   ├── auth.ts                   # getCurrentUser()
│   ├── oauth/                    # OAuth providers
│   ├── email/                    # Email router & providers
│   ├── checkout/                 # Checkout logic
│   ├── notifications/            # Admin & appointment notifications
│   ├── services/                 # Third-party service abstraction
│   ├── data/                     # Read-only data layer
│   ├── theme/                    # Theme CSS generation
│   ├── stripe-*.ts               # Stripe helpers
│   ├── config.ts
│   └── utils.ts
│
├── db/
│   ├── schema.ts                 # Drizzle schema (source of truth)
│   ├── index.ts                  # DB connection
│   └── migrate.ts
│
├── drizzle/                      # Generated SQL migration files
│   ├── 0000_oval_iron_man.sql
│   ├── 0001_stripe_product_sync.sql
│   ├── 0002_stripe_unification.sql
│   └── meta/_journal.json
│
├── scripts/                      # Admin & build scripts
├── contexts/                     # Global React contexts
├── hooks/                        # Custom React hooks
├── types/                        # Global TypeScript types
├── public/                       # Static assets
├── styles/                       # Global CSS
├── cypress/                      # E2E tests
│
├── vercel.json
├── drizzle.config.ts
├── next.config.mjs
├── tailwind.config.ts
└── .env.example
```

---

## Architecture

### Route Groups (Next.js App Router)

| Group | Purpose |
|---|---|
| `(auth)` | Auth pages, no protected layout |
| `(private)` | Requires valid session |
| `(public)` | Accessible without login |
| `(errors)` | Error pages |

### Data Flow

```
React Component
  ↓  Server Action or fetch()
Auth check (verifyAuth / getCurrentUser)
  ↓
Business logic (lib/)
  ↓
Drizzle ORM → PostgreSQL
  ↓
JSON response → state update
```

### Authentication

- Custom JWT (no NextAuth) via `jose`
- HttpOnly cookie sessions
- Social OAuth: Google, GitHub, Microsoft, Facebook
- RBAC with two scopes: `platform` (global admin) and `company` (tenant admin)
- Platform admins: `companyId = null` — Clients: `companyId` required

### Multi-tenancy

- `companies` table isolates tenants
- All user data, products, orders, and payments are scoped to a `companyId`
- Dual permission level: platform-wide and company-scoped

### Email

- `emailRouter` in `lib/email/index.ts` routes to the active provider
- Provider config stored encrypted in the database — switchable from the admin UI without redeployment

### Payments

- **Stripe**: one-time payments, subscriptions, webhooks
- **Lago**: usage-based billing (optional)
- Payment methods stored per company (PCI compliant — no sensitive card data in DB)

---

## Database Schema

### Main Tables

| Table | Description |
|---|---|
| `companies` | Tenant organizations |
| `subscriptions` | Stripe subscriptions per company |
| `payment_methods` | Stripe cards per company |
| `users` | Users (clients + admins) |
| `roles` | RBAC roles |
| `permissions` | Permissions per role |
| `user_roles` | User ↔ role mapping |
| `role_permissions` | Role ↔ permission mapping |
| `oauth_connections` | OAuth tokens per user |
| `products` | Products (physical, digital, appointment) |
| `orders` | Orders |
| `order_items` | Order line items |
| `coupons` | Discount codes |
| `coupon_usage` | Coupon usage tracking |
| `carts` | Shopping carts |
| `cart_items` | Cart items |
| `appointments` | Appointments (client ↔ admin) |
| `appointment_slots` | Availability slots |
| `appointment_exceptions` | Exceptions (blocked dates, vacations) |
| `chat_conversations` | Support conversations |
| `chat_messages` | Chat messages |
| `chat_quick_responses` | Admin quick replies |
| `email_provider_configs` | Email provider config (encrypted) |
| `email_templates` | Email templates |
| `email_send_history` | Send history |
| `service_api_configs` | Third-party service config (encrypted) |
| `user_api_keys` | User API keys |
| `llm_api_keys` | LLM API keys |
| `llm_usage_logs` | LLM usage tracking |
| `vat_rates` | VAT rates |
| `platform_config` | Platform settings (key/value) |
| `page_permissions` | Page access control |
| `tos_versions` | Terms of service versions |
| `user_tos_acceptances` | ToS acceptance records |
| `cookie_consents` | Cookie consent records |
| `system_logs` | System logs |

### Migrations

Migration files are generated by `drizzle-kit` into `drizzle/`. The migration journal is at `drizzle/meta/_journal.json`.

```bash
pnpm db:generate   # Generate a new migration file from schema changes
pnpm db:migrate    # Apply pending migrations
pnpm db:push       # Direct schema sync (development only)
pnpm db:studio     # Open Drizzle Studio (visual DB browser)
```

---

## Language

NeoSaaS is **English-first**. All navigation, page titles, forms, toasts, and user-facing API messages must be written in English.

- Policy: **[docs/LANGUAGE.md](./LANGUAGE.md)**
- Cursor rule: `.cursor/rules/english-ui.mdc`
- Client pages: use `usePageTitle()` from `@/hooks/use-page-title.ts` so the browser tab matches the `<h1>`

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- A PostgreSQL database (Neon recommended)
- A Stripe account

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local
# Fill in DATABASE_URL, JWT_SECRET, Stripe keys, etc.

# Push schema to database
pnpm db:push

# Seed base data (roles, permissions, VAT, platform config)
pnpm db:seed-base

# Seed email templates
pnpm seed:email-templates

# Start development server
pnpm dev
```

Open `http://localhost:3000`. For the initial admin account, navigate to `/configuration`.

---

## Available Scripts

```bash
# Development
pnpm dev                   # Start Next.js dev server

# Build
pnpm build                 # Production build (with DB migrations)
pnpm build:local           # Production build (without migrations)
pnpm start                 # Start production server

# Database
pnpm db:generate           # Generate migration file from schema
pnpm db:migrate            # Apply pending migrations
pnpm db:push               # Sync schema directly to DB (dev)
pnpm db:ensure             # Verify/add critical columns
pnpm db:verify             # Check schema vs DB consistency
pnpm db:reset              # Reset database (dev only)
pnpm db:seed               # Full seed with demo data
pnpm db:seed-base          # Seed roles, permissions, VAT, config
pnpm db:studio             # Open Drizzle Studio

# Seeding
pnpm seed:email-templates  # Seed email templates
pnpm seed:pages            # Sync page permissions

# Quality
pnpm check:email-config    # Verify email configuration
pnpm lint                  # Run ESLint

# Versioning
pnpm release:auto          # Automatic patch bump (ex: 1.0.1 -> 1.0.2)
pnpm version:patch         # Patch bump
pnpm version:minor         # Minor bump
pnpm version:major         # Major bump
```

## Release Automation

Official releases are managed through GitHub Actions using [release workflow](../.github/workflows/release.yml).

1. Open the Actions tab in GitHub.
2. Select workflow release.
3. Click Run workflow and choose bump type: patch, minor, or major.
4. The workflow bumps package.json, commits on main, creates tag vX.Y.Z, and then creates a GitHub Release with autogenerated notes.

Local version scripts remain available for development convenience, but the canonical release flow is the workflow.

---

## Changelog

### [2026-07-07]
- **Fix CI Docker build** : le `Dockerfile` bascule de `pnpm build` vers `pnpm build:local` pour eviter la dependance `DATABASE_URL` pendant le build image GitHub Actions.
- **Fix GHCR tagging** : normalisation en minuscules du nom d'image (`IMAGE_NAME_LOWER`) pour garantir la compatibilite registry.
- **Fichiers modifies** : `Dockerfile`, `.github/workflows/docker-image.yml`, `docs/PROJECT.md`, `STATUS.md`.
- **Impact** : pipeline Docker GitHub plus stable (build + push).

### [2026-07-07]
- **Stabilisation guard admin** : `useRequireAdmin` ne redirige plus vers login pour toute reponse non-OK; redirections strictes uniquement sur `401` (login) et `403` (dashboard).
- **Robustesse session client** : verification `/api/auth/me` avec `credentials: "include"` et `cache: "no-store"`.
- **Anti deconnexion intempestive** : en cas d'erreur transitoire (`5xx` / reseau), le guard conserve la navigation et s'appuie sur la protection serveur `requireAdmin` du layout.
- **Compatibilite pages admin** : le hook retourne aussi `user` pour les ecrans qui l'utilisent.
- **Fichiers modifies** : `lib/hooks/use-require-admin.ts`, `docs/PROJECT.md`, `STATUS.md`.

### [2026-07-07]
- **Preparation Docker production (v1.0.3)** : ajout d'un `Dockerfile` multi-stage, d'un `.dockerignore` et d'un `docker-compose.prod.yml` pour deploiement conteneurise.
- **Versionning release** : bump de `1.0.2` a `1.0.3` avant creation du tag.
- **Fichiers modifies** : `Dockerfile`, `.dockerignore`, `docker-compose.prod.yml`, `package.json`, `docs/PROJECT.md`, `STATUS.md`.
- **Impact** : paquet deploiement Docker pret pour push vers le depot cible.

### [2026-07-07]
- **Fix build/deploiement Next.js** : suppression d'un import client vers un module serveur (`lib/pages/template-variables.ts`) qui entrainait des erreurs `next/headers` et `pg` (`dns/fs/net`) pendant le build.
- **Stabilisation Turbopack** : ajout de `turbopack.root` dans `next.config.mjs` pour forcer la racine projet.
- **Registry client-safe** : ajout de `lib/layers/registry-client.ts` et bascule de `BlockEditor`/`BlockPreview` sur ce registry pour ne plus importer le bloc `blog-list` (DB) dans le bundle client.
- **Fix Stripe dashboard** : suppression d'un import client de `lib/stripe` dans `stripe-card-form.tsx`; initialisation Stripe via `createStripeSetupIntent` (server action) pour eviter le chainage DB/pg dans le bundle navigateur.
- **Fichiers modifies** : `components/admin/content/template-variables-hint.tsx`, `components/admin/content/block-editor.tsx`, `components/admin/content/block-preview.tsx`, `components/dashboard/stripe-card-form.tsx`, `lib/layers/registry-client.ts`, `next.config.mjs`, `docs/PROJECT.md`, `STATUS.md`.
- **Impact** : flux de variables template compatible client, build plus stable en environnement de deploiement.

### [2026-07-07]
- **Mise a jour mineure des dependances** : upgrade patch/minor uniquement pour renforcer la compatibilite des outils sans passer de major.
- **Fichiers modifies** : `package.json`, `docs/PROJECT.md`, `STATUS.md`.
- **Impact** : base de dependances plus stable, avec reduction du risque de regression immediate.
