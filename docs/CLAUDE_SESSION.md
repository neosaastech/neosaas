# Session de Développement — NeoSaaS Tech

> **Dernière mise à jour** : 23 février 2026
> **Objectif** : Documentation des modifications apportées au projet lors de cette session

---

## Résumé du Projet

**NeoSaaS Tech** est une plateforme SaaS full-stack clé-en-main construite sur Next.js 15 (App Router).

### Fonctionnalités incluses

- Authentification JWT + OAuth (GitHub, Google) — configuré via l'admin
- Paiements Stripe Direct — géré via `/admin/api`
- Emails multi-provider (Resend, Scaleway TEM, AWS SES)
- Tableau de bord admin complet
- Réservation de rendez-vous + calendrier
- Gestion RGPD (consentements, export, suppression)
- SEO basique (Open Graph, sitemap, robots.txt)
- Gestion des réseaux sociaux (liens configurables)

---

## Stack Technique

| Couche | Technologie |
|--------|-------------|
| **Framework** | Next.js 15 (App Router) + React 19 |
| **Base de données** | PostgreSQL + Drizzle ORM |
| **UI** | Tailwind CSS + shadcn/ui (40+ composants) |
| **Auth** | JWT (httpOnly cookies) + OAuth modulaire |
| **Paiements** | Stripe Direct v20 |
| **Emails** | Resend / Scaleway TEM / AWS SES |
| **Package manager** | pnpm |

---

## Variables d'Environnement Minimales

> Documentation complète : [`setup/ENVIRONMENT.md`](./setup/ENVIRONMENT.md)

```env
DATABASE_URL=postgresql://<user>:<password>@<host>/<dbname>?sslmode=require
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXT_PUBLIC_APP_URL=https://votre-domaine.com
RESEND_API_KEY=re_...
```

---

## Architecture

```
app/
├── (public)/      # Routes publiques (landing, pricing, docs, demo)
├── (private)/     # Routes protégées (dashboard, admin, onboarding)
├── (errors)/      # Pages d'erreur (404, 500, 503)
├── auth/          # Login, Register, OAuth callback, Reset password
└── api/           # API Routes

db/schema.ts       # Schéma Drizzle ORM
lib/auth.ts        # Helpers JWT & session
lib/oauth/         # Providers OAuth modulaires
```

---

## Commandes Utiles

```bash
pnpm dev            # Serveur de développement
pnpm build          # Build production
pnpm db:push        # Appliquer le schéma
pnpm db:seed        # Données par défaut
pnpm db:studio      # Interface visuelle BDD
pnpm db:hard-reset  # Reset complet
```

**Premier accès admin** : `admin@exemple.com` / `admin`

---

## Modifications de cette Session

### 23 février 2026 — Nettoyage et documentation

**Supprimé :**
- Page `/brand` (app et liens de navigation)
- Fichiers docs Vercel-spécifiques (VERCEL_SETUP.md, VERCEL_IMMEDIATE_SETUP.md, VERCEL_CLI_SETUP.md, VERCEL-SETUP.md, deployment/VERCEL.md)
- Données sensibles de développement des fichiers de documentation (credentials, IDs de session, noms de branches internes)

**Ajouté :**
- `docs/deployment/DEPLOYMENT.md` : guide de déploiement générique (PaaS, VPS, Docker)
- `app/(public)/docs/installation/page.tsx` : refonte complète avec 9 étapes, ENV par catégorie, section "Étapes suivantes développeur" (pages backend, Stripe, ACL)
- `app/(public)/docs/page.tsx` : stack mis à jour (JWT, Stripe Direct, Next.js 15), modules détaillés

**Mis à jour :**
- `docs/setup/ENVIRONMENT.md` : suppression des références Vercel et données de session
- `docs/guides/TROUBLESHOOTING.md` : suppression des credentials réels, guide générique
- Renommage NeoSaaS → NeoSaaS Tech dans les fichiers visibles
