# NeoSaaS - Free Version 🚀

> **Version gratuite minimaliste** - Plateforme SaaS avec authentification, gestion d'utilisateurs, paiements Lago et emails

## ✅ Fonctionnalités Incluses

- 🔐 **Authentification complète** - Inscription, connexion, JWT
- � **OAuth Social Login** - GitHub & Google (100% database config)
- 👥 **Gestion des utilisateurs** - Multi-tenant, rôles et permissions
- 💳 **Intégration Lago** - Abonnements et facturation
- 📧 **Emails transactionnels** - Resend, Scaleway, AWS SES
- 🎨 **Interface moderne** - Tailwind CSS + shadcn/ui (English-only)
- 📞 **Formulaire de contact** - Support par email
- ⚙️ **API Manager** - Configuration centralisée des services tiers

## 🚀 Installation Rapide

```bash
# Installer les dépendances  
pnpm install

# Configurer l'environnement
cp .env.example .env
# ⚠️ ÉDITER .env avec vos valeurs

# Initialiser la base de données
pnpm db:push && pnpm db:seed

# Lancer en développement
pnpm dev
```

Accéder à: http://localhost:3000

## 🛠️ Stack Technique

- Next.js 15+ (App Router)
- PostgreSQL + Drizzle ORM  
- Tailwind CSS + shadcn/ui
- OAuth: GitHub & Google (no ENV vars needed)
- Lago Billing
- Emails: Resend / Scaleway / AWS SES

## � Documentation Complète

### 📖 [Documentation → docs/00-START-HERE.md](./docs/00-START-HERE.md)

**Navigation complète**, guides d'installation, architecture, OAuth, déploiement, et plus.

### Navigation Rapide

| Pour... | Lire... |
|---------|---------|
| **Installer le projet** | [docs/setup/QUICK_START.md](./docs/setup/QUICK_START.md) |
| **⚠️ Migrer OAuth** | [docs/OAUTH_ACTION_REQUIRED.md](./docs/OAUTH_ACTION_REQUIRED.md) |
| **État du projet** | [docs/STATUS.md](./docs/STATUS.md) |
| **Déployer Vercel** | [docs/deployment/VERCEL.md](./docs/deployment/VERCEL.md) |
| **Architecture** | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) |

---

## �🔑 Configuration OAuth

**Aucune variable d'environnement requise** - Tout se configure via l'interface admin !

1. **Créer OAuth App sur GitHub/Google**
2. **Admin → API Manager** → Configurer GitHub/Google
3. **Copier l'URL de callback** (bouton copier disponible)
4. **Tester la configuration** (validation automatique)
5. Les boutons sociaux apparaissent automatiquement sur login/register

✨ **Nouveautés UX** :
- URL callback dynamique et copiable
- Test automatique de configuration
- Interface organisée en sections (OAuth / API)
- Configuration 3x plus rapide

### ⚠️ ACTION REQUISE - Migration OAuth

**Le système OAuth contient actuellement des doublons** qui nécessitent une migration.

📖 **Documentation complète**: [`docs/OAUTH_ACTION_REQUIRED.md`](./docs/OAUTH_ACTION_REQUIRED.md)

**Résumé**:
- 🔴 **7 catégories de doublons** identifiées (340+ lignes dupliquées)
- ✅ **Système modulaire** déjà créé et prêt
- 🚀 **Migration** requise pour éliminer les doublons (95% de réduction!)
- ⚡ **Bénéfice immédiat**: Google OAuth en 15 minutes au lieu de 4 heures

**Fichiers à lire** (dans l'ordre):
1. [`OAUTH_ACTION_REQUIRED.md`](./docs/OAUTH_ACTION_REQUIRED.md) - Vue d'ensemble et actions
2. [`OAUTH_DUPLICATES_AUDIT.md`](./docs/OAUTH_DUPLICATES_AUDIT.md) - Audit détaillé
3. [`OAUTH_MIGRATION_PLAN.md`](./docs/OAUTH_MIGRATION_PLAN.md) - Plan de migration pas à pas
4. [`OAUTH_ARCHITECTURE.md`](./docs/OAUTH_ARCHITECTURE.md) - Architecture modulaire

**Index navigation**: [`docs/OAUTH_INDEX.md`](./docs/OAUTH_INDEX.md)

## � Base de Données

⚠️ **Mode Reset Automatique Activé**

La base de données est **automatiquement réinitialisée** à chaque déploiement :
- 🗑️ Suppression de toutes les tables existantes
- 🏗️ Recréation du schéma complet
- 🌱 Insertion des données de seed (admin, configs)
- 📧 Templates d'email réinitialisés

**Conséquences :**
- ❌ Toutes les données sont perdues à chaque déploiement
- ❌ Les utilisateurs créés sont supprimés
- ✅ Environnement toujours propre et prévisible
- ✅ Idéal pour développement et démo

**Script concerné :** `scripts/build-with-db.sh`

## �🔒 Sécurité

⚠️ **CRITIQUE**: Ne JAMAIS committer `.env` - Contient des credentials sensibles!