Here is the English translation of your **NeoSaaS - Free Version** documentation:

---

# NeoSaaS - Free Version 🚀

> **Minimalist Free Version** – SaaS platform with authentication, user management, Lago payments, and emails.

## ✅ Included Features

- 🔐 **Complete Authentication** – Registration, login, JWT
- 🔗 **OAuth Social Login** – GitHub & Google (100% database config)
- 👥 **User Management** – Multi-tenant, roles, and permissions
- 💳 **Lago Integration** – Subscriptions and billing
- 📧 **Transactional Emails** – Resend, Scaleway, AWS SES
- 🎨 **Modern Interface** – Tailwind CSS + shadcn/ui (English-only)
- 📞 **Contact Form** – Email support
- ⚙️ **API Manager** – Centralized third-party service configuration

## 🚀 Quick Installation

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# ⚠️ EDIT .env with your values

# Initialize the database
pnpm db:push && pnpm db:seed

# Run in development
pnpm dev
```

Access at: [http://localhost:3000](http://localhost:3000)

## 🛠️ Tech Stack

- Next.js 15+ (App Router)
- PostgreSQL + Drizzle ORM
- Tailwind CSS + shadcn/ui
- OAuth: GitHub & Google (no ENV vars needed)
- Lago Billing
- Emails: Resend / Scaleway / AWS SES

## 📚 Full Documentation

### 📖 [Documentation → docs/00-START-HERE.md](./docs/00-START-HERE.md)

**Comprehensive navigation**, installation guides, architecture, OAuth, deployment, and more.

### Quick Navigation

| For... | Read... |
|--------|---------|
| **Install the project** | [docs/setup/QUICK_START.md](./docs/setup/QUICK_START.md) |
| **⚠️ Migrate OAuth** | [docs/OAUTH_ACTION_REQUIRED.md](./docs/OAUTH_ACTION_REQUIRED.md) |
| **Project status** | [docs/STATUS.md](./docs/STATUS.md) |
| **Deploy on Vercel** | [docs/deployment/VERCEL.md](./docs/deployment/VERCEL.md) |
| **Architecture** | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) |

---

## 🔑🔗 OAuth Configuration

**No environment variables required** – Everything is configured via the admin interface!

1. **Create OAuth App on GitHub/Google**
2. **Admin → API Manager** → Configure GitHub/Google
3. **Copy the callback URL** (copy button available)
4. **Test the configuration** (automatic validation)
5. Social login buttons appear automatically on login/register

✨ **New UX Features**:
- Dynamic and copyable callback URL
- Automatic configuration testing
- Organized interface (OAuth / API sections)
- 3x faster configuration

### ⚠️ REQUIRED ACTION – OAuth Migration

**The OAuth system currently contains duplicates** that require migration.

📖 **Full documentation**: [`docs/OAUTH_ACTION_REQUIRED.md`](./docs/OAUTH_ACTION_REQUIRED.md)

**Summary**:
- 🔴 **7 categories of duplicates** identified (340+ duplicated lines)
- ✅ **Modular system** already created and ready
- 🚀 **Migration required** to eliminate duplicates (95% reduction!)
- ⚡ **Immediate benefit**: Google OAuth in 15 minutes instead of 4 hours

**Files to read** (in order):
1. [`OAUTH_ACTION_REQUIRED.md`](./docs/OAUTH_ACTION_REQUIRED.md) – Overview and actions
2. [`OAUTH_DUPLICATES_AUDIT.md`](./docs/OAUTH_DUPLICATES_AUDIT.md) – Detailed audit
3. [`OAUTH_MIGRATION_PLAN.md`](./docs/OAUTH_MIGRATION_PLAN.md) – Step-by-step migration plan
4. [`OAUTH_ARCHITECTURE.md`](./docs/OAUTH_ARCHITECTURE.md) – Modular architecture

**Navigation index**: [`docs/OAUTH_INDEX.md`](./docs/OAUTH_INDEX.md)

## 🗄️ Database

⚠️ **Auto-Reset Mode Enabled**

The database is **automatically reset** on every deployment:
- 🗑️ Deletes all existing tables
- 🏗️ Recreates the full schema
- 🌱 Seeds admin and config data
- 📧 Resets email templates

**Consequences**:
- ❌ All data is lost on every deployment
- ❌ Created users are deleted
- ✅ Always clean and predictable environment
- ✅ Ideal for development and demos

**Script involved**: `scripts/build-with-db.sh`

## 🔒 Security

⚠️ **CRITICAL**: NEVER commit `.env` – Contains sensitive credentials!