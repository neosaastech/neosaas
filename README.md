# NeoSaaS 🚀

> Full-stack multi-tenant SaaS boilerplate — authentication, user management, payments, and transactional emails out of the box.

## Features

- 🔐 **Full authentication** — sign-up, login, JWT
- 🌐 **Social OAuth login** — GitHub & Google (100% database-driven config)
- 👥 **User management** — multi-tenant, roles and permissions
- 💳 **Stripe + Lago billing** — subscriptions and invoicing
- 📧 **Transactional emails** — Resend, Scaleway TEM, AWS SES
- 🎨 **Modern UI** — Tailwind CSS + shadcn/ui
- 📞 **Contact form** — email-based support
- ⚙️ **API Manager** — centralised third-party service configuration

## Quick Start

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

## Tech Stack

| Category | Technology |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 |
| Language | TypeScript 5.7 |
| Database | PostgreSQL (Drizzle ORM) |
| UI | Tailwind CSS 3.4 + shadcn/ui |
| Auth | JWT + OAuth (Google, GitHub, Microsoft, Facebook) |
| Payments | Stripe + Lago |
| Email | Scaleway TEM / AWS SES / Resend |
| Package manager | pnpm |
| Deployment | Vercel / Docker |

## Documentation

Full developer reference: **[docs/PROJECT.md](./docs/PROJECT.md)**

| Topic | File |
|---|---|
| Quick start & setup | [docs/setup/QUICK_START.md](./docs/setup/QUICK_START.md) |
| Architecture | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) |
| Vercel deployment | [docs/deployment/VERCEL.md](./docs/deployment/VERCEL.md) |
| Project status | [docs/STATUS.md](./docs/STATUS.md) |

## OAuth Configuration

No environment variables required — everything is configured through the admin UI:

1. Create an OAuth app on GitHub or Google
2. Go to **Admin → API Manager** → configure GitHub / Google
3. Copy the callback URL (copy button available)
4. Run the automatic configuration test
5. Social login buttons appear automatically on the login / register pages

## Database

> **Auto-reset enabled on each deployment**

Each deployment runs the full build sequence:
1. Schema migrations (no-op if already up to date)
2. Base data seed (roles, permissions, VAT rates, platform config)
3. Email template seed
4. Page permission sync

In demo / preview environments the database is reset on each deploy, so all user-created data is lost. This is intentional for clean, predictable preview environments.

Script: `scripts/build-with-db.sh`

## Security

> **Never commit `.env`** — it contains sensitive credentials.

Security headers enforced on all responses (via `next.config.ts`):
- `Strict-Transport-Security` — forces HTTPS, includes subdomains and preload
- `Content-Security-Policy` — baseline policy (self, Stripe, inline styles for Tailwind)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-DNS-Prefetch-Control: on`
